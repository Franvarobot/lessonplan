// ============================================================
// App — top-level component. Owns all state, glues everything
// together, and mounts to #root.
// Depends on: every other file (loaded earlier in index.html)
// ============================================================
const { useState: useState_app, useEffect: useEffect_app, useMemo: useMemo_app, useRef: useRef_app } = React;

function App() {
  const Icon = window.Icon;
  const Button = window.Button;
  const Field = window.Field;
  const Input = window.Input;
  const Select = window.Select;
  const LangToggle = window.LangToggle;
  const asLine = window.asLine;

  // ---- State ----
  const [config, setConfig] = useState_app(window.DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState_app(false);
  const [showBank, setShowBank] = useState_app(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState_app(false);
  const [bankLoading, setBankLoading] = useState_app(false);
  const [bankError, setBankError] = useState_app("");
  const [showPoolFull, setShowPoolFull] = useState_app(false);

  // Lesson form
  const [stage, setStage] = useState_app("");
  const [grade, setGrade] = useState_app("");
  const [subject, setSubject] = useState_app("");
  const [topic, setTopic] = useState_app("");
  const [duration, setDuration] = useState_app(60);

  // Lesson context (optional)
  const [ctxTeacher, setCtxTeacher] = useState_app("");
  const [ctxClass, setCtxClass] = useState_app("");
  const [ctxDay, setCtxDay] = useState_app("");
  const [ctxTime, setCtxTime] = useState_app("");
  const [ctxRoom, setCtxRoom] = useState_app("");

  const [detailLevel, setDetailLevel] = useState_app("standard");
  const [extrasEnabled, setExtrasEnabled] = useState_app({
    worksheet: true,
    anchorChart: true,
    badges: false,
    flashcards: false,
    discussionCards: false,
    diagram: false,
    imageSearch: false,
  });

  // Extras cache keyed by `${lessonId}:${kind}`
  const [extrasCache, setExtrasCache] = useState_app({});
  const [loadingExtras, setLoadingExtras] = useState_app({});
  const [activeTab, setActiveTab] = useState_app({}); // { lessonId: 'plan' | extra }

  // Lessons
  const [acceptedLesson, setAcceptedLesson] = useState_app(null);
  const [subLesson, setSubLesson] = useState_app(null);
  const [loadingChoices, setLoadingChoices] = useState_app(false);
  const [loadingSub, setLoadingSub] = useState_app(false);
  const [translating, setTranslating] = useState_app(false);

  // Topic suggestions
  const [topicSuggestions, setTopicSuggestions] = useState_app([]);
  const [loadingTopics, setLoadingTopics] = useState_app(false);

  const [error, setError] = useState_app("");

  const t = window.LANG[config.language] || window.LANG.sv;

  // ---- Config rehydration ----
  useEffect_app(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(window.STORAGE_KEY) || "{}");
      if (saved && typeof saved === "object") setConfig((c) => ({ ...c, ...saved }));
    } catch {}
  }, []);

  const saveConfig = (next) => {
    setConfig(next);
    try { localStorage.setItem(window.STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  // ---- Bank refresh on mount ----
  const refreshBank = async () => {
    setBankLoading(true); setBankError("");
    try {
      await window.bankAPI.refresh();
    } catch (e) {
      console.error("Bank refresh failed", e);
      setBankError(String(e.message || e));
    } finally {
      setBankLoading(false);
    }
  };
  useEffect_app(() => {
    refreshBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Schools refresh; force-show picker if no school set yet ----
  const refreshSchools = async () => {
    try { await window.schoolsAPI.refresh(); } catch (e) { console.error("Schools refresh failed", e); }
  };
  useEffect_app(() => {
    (async () => {
      await refreshSchools();
      const known = window.schoolsAPI.all().some(s => s.school_id === config.schoolId);
      if (!known) setShowSchoolPicker(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectSchool = (school) => {
    saveConfig({ ...config, schoolId: school.school_id, schoolName: school.name });
    setShowSchoolPicker(false);
  };
  const handleCreateSchool = async (name) => {
    return await window.schoolsAPI.create(null, name);
  };

  // ---- Reset cascading inputs ----
  useEffect_app(() => { setGrade(""); setSubject(""); setTopicSuggestions([]); }, [stage]);
  useEffect_app(() => { setTopicSuggestions([]); }, [grade, subject]);
  // Clear stale suggestions on language switch
  useEffect_app(() => { setTopicSuggestions([]); }, [config.language]);

  // ---- Translate current lesson when language toggles ----
  const translateRef = useRef_app(null);
  const firstLangRender = useRef_app(true);
  useEffect_app(() => {
    if (firstLangRender.current) {
      firstLangRender.current = false;
      return;
    }
    // Clear extras cache and loading flags - extras are language-specific.
    setExtrasCache({});
    setLoadingExtras({});
    if (acceptedLesson) {
      if (config.language === "sv") {
        // Toggling back to Swedish: pull from bank cache directly, no LLM call.
        const rec = window.bankAPI.byId(acceptedLesson.id);
        const svLesson = rec?.lesson?.translations?.sv || rec?.lesson;
        if (svLesson) {
          setAcceptedLesson(prev => prev ? { ...svLesson, id: prev.id, isSub: prev.isSub, ctx: prev.ctx } : prev);
        }
      } else if (translateRef.current) {
        translateRef.current(acceptedLesson.id, config.language);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.language]);

  // ---- Computed ----
  const hasKey = useMemo_app(() => {
    if (config.provider === "gemini") return !!config.geminiKey;
    if (config.provider === "anthropic") return !!config.anthropicKey;
    if (config.provider === "openai") return !!config.openaiKey;
    if (config.provider === "grok") return !!config.grokKey;
    if (config.provider === "local") return !!config.localUrl;
    return false;
  }, [config]);

  const grades = stage ? window.STAGES[stage] : [];
  const subjects = stage ? window.SUBJECTS_BY_STAGE[stage] : [];
  const canGenerate = stage && grade && subject && topic.trim() && hasKey;
  const canSuggestTopics = stage && grade && subject && hasKey;

  // ---- Helper: get current provider/model ----
  const currentProviderModel = () => {
    const p = config.provider;
    let model = "";
    if (p === "gemini") model = config.geminiModel;
    else if (p === "anthropic") model = config.anthropicModel;
    else if (p === "openai") model = config.openaiModel;
    else if (p === "grok") model = config.grokModel;
    else if (p === "local") model = config.localModel;
    return { provider: p, model };
  };

  // ---- Topic suggestions ----
  const suggestTopics = async (append = false) => {
    if (!canSuggestTopics) return;
    setError(""); setLoadingTopics(true);
    try {
      const result = await window.runLLM(config,
        window.topicSuggestionsPrompt({
          stage, grade, subject, language: config.language,
          exclude: append ? topicSuggestions : [],
        })
      );
      const next = Array.isArray(result?.topics) ? result.topics : [];
      setTopicSuggestions(append ? [...topicSuggestions, ...next] : next);
    } catch (e) {
      setError(`${t.error}: ${e.message}`);
    } finally {
      setLoadingTopics(false);
    }
  };

  // ---- Generate main lesson ----
  // Always generates in Swedish (source of truth). UI translates on demand.
  const generateLesson = async () => {
    if (!canGenerate) return;
    const activePool = window.bankAPI.getActivePool({ stage, grade, subject });
    if (activePool.length >= window.ACTIVE_POOL_LIMIT) {
      setShowPoolFull(true);
      return;
    }
    setError(""); setLoadingChoices(true);
    setAcceptedLesson(null); setSubLesson(null);
    try {
      const result = await window.runLLM(config,
        window.lessonPrompt({ stage, grade, subject, topic, duration, branchIndex: 0, totalBranches: 1, language: "sv", detailLevel })
      );
      result.translations = { sv: { ...result } };
      const { provider, model } = currentProviderModel();
      let record;
      try {
        record = await window.bankAPI.addLesson(null, {
          schoolId: config.schoolId || "school-1",
          stage, grade, subject, topic, title: result.title || topic,
          duration, lesson: result, provider, model,
        });
      } catch (e) {
        if (e.code === "pool_full") {
          await refreshBank();
          setShowPoolFull(true);
          return;
        }
        throw e;
      }
      const ctx = { teacher: ctxTeacher, className: ctxClass, day: ctxDay, time: ctxTime, room: ctxRoom };
      const accepted = { ...result, id: record.lesson_id, isSub: false, ctx };
      setAcceptedLesson(accepted);
      setActiveTab(tabs => ({ ...tabs, [accepted.id]: "plan" }));
      if (config.language !== "sv") {
        translateAndApplyLesson(record.lesson_id, config.language);
      }
    } catch (e) {
      setError(`${t.error}: ${e.message}`);
      console.error(e);
    } finally {
      setLoadingChoices(false);
    }
  };

  // ---- Generate one extra (check DB first, then generate and cache) ----
  const generateExtra = async (lesson, kind) => {
    if (!lesson || !hasKey) return;
    const cacheKey = `${lesson.id}:${kind}`;
    if (extrasCache[cacheKey]) return;
    if (loadingExtras[cacheKey]) return;
    setLoadingExtras(s => ({ ...s, [cacheKey]: true }));
    try {
      // Check DB first
      const cached = await window.extrasAPI.get({ lessonId: lesson.id, kind, language: config.language });
      if (cached) {
        setExtrasCache(c => ({ ...c, [cacheKey]: cached }));
        return;
      }
      // Generate via LLM
      const result = await window.runLLM(config,
        window.extrasPrompt({ kind, lesson, stage, grade, subject, topic, duration, language: config.language })
      );
      setExtrasCache(c => ({ ...c, [cacheKey]: result }));
      // Persist to DB
      const { provider, model } = currentProviderModel();
      window.extrasAPI.save({ lessonId: lesson.id, kind, language: config.language, content: result, provider, model });
    } catch (e) {
      setExtrasCache(c => ({ ...c, [cacheKey]: { _error: e.message } }));
    } finally {
      setLoadingExtras(s => { const next = { ...s }; delete next[cacheKey]; return next; });
    }
  };

  // ---- Open a lesson from the bank ----
  const loadLessonFromBank = (id) => {
    const rec = window.bankAPI.byId(id);
    if (!rec) return;
    setStage(rec.stage); setGrade(String(rec.grade)); setSubject(rec.subject);
    setTopic(rec.topic || "");
    if (rec.duration) setDuration(Number(rec.duration));
    const view = (rec.lesson?.translations?.[config.language]) || rec.lesson?.translations?.sv || rec.lesson;
    setAcceptedLesson({
      ...view, id: rec.lesson_id, isSub: !!rec.lesson?.isSub,
      ctx: { teacher: ctxTeacher, className: ctxClass, day: ctxDay, time: ctxTime, room: ctxRoom },
    });
    setSubLesson(null);
    setShowPoolFull(false); setShowBank(false);
    if (config.language !== "sv" && !rec.lesson?.translations?.[config.language]) {
      translateAndApplyLesson(id, config.language);
    }
  };

  // ---- Mark lesson as used — logs locally and archives in bank (frees slot) ----
  const markLessonUsed = async () => {
    if (!acceptedLesson?.id) return { ok: false, reason: "no-id" };
    const rec = window.bankAPI.byId(acceptedLesson.id);
    const used = {
      teacher: acceptedLesson.ctx?.teacher || ctxTeacher,
      className: acceptedLesson.ctx?.className || ctxClass,
      day: acceptedLesson.ctx?.day || ctxDay,
      time: acceptedLesson.ctx?.time || ctxTime,
      room: acceptedLesson.ctx?.room || ctxRoom,
    };
    window.lessonLibrary.addUsage({ lessonId: acceptedLesson.id, used });
    try {
      await window.bankAPI.archive(null, acceptedLesson.id, config.schoolId || "school-1");
      return { ok: true, synced: true };
    } catch (e) {
      console.error("Archive failed", e);
      return { ok: true, synced: false };
    }
  };

  // ---- Submit sub feedback ----
  const submitLessonFeedback = async ({ subName, text }) => {
    if (!acceptedLesson?.id) return { ok: false };
    window.lessonLibrary.addFeedback({ lessonId: acceptedLesson.id, feedback: { subName, text } });
    // No remote sync needed — Supabase archive handles this via usage_log
    return { ok: true, synced: false };
  };

  // ---- Manual archive (bank-wide) ----
  const archiveLessonInBank = async (id) => {
    try {
      await window.bankAPI.archive(null, id, config.schoolId || "school-1");
    } catch (e) {
      console.error("Archive failed", e);
    }
    if (acceptedLesson?.id === id) setAcceptedLesson(null);
  };

  const openPoolLesson = (id) => loadLessonFromBank(id);

  // ---- Translate lesson on-demand and cache result ----
  const translateAndApplyLesson = async (lessonId, targetLang) => {
    if (!lessonId) return;
    const rec = window.bankAPI.byId(lessonId);
    if (!rec) return;
    const fullLesson = rec.lesson?.translations?.sv || rec.lesson;
    const { translations: _drop, ...sourceLesson } = fullLesson;

    const existing = rec.lesson?.translations?.[targetLang];
    if (existing) {
      setAcceptedLesson(prev => prev && prev.id === lessonId
        ? { ...existing, id: lessonId, isSub: prev.isSub, ctx: prev.ctx }
        : prev);
      return;
    }
    setTranslating(true);
    try {
      const result = await window.runLLM(config, window.translateLessonPrompt({ lesson: sourceLesson, targetLanguage: targetLang }));
      // Cache on the bank record so subsequent toggles are instant.
      const cache = window.loadBankCache();
      const cached = cache.lessons.find(l => l.lesson_id === lessonId);
      if (cached) {
        cached.lesson = cached.lesson || {};
        cached.lesson.translations = cached.lesson.translations || { sv: sourceLesson };
        cached.lesson.translations[targetLang] = result;
        window.saveBankCache(cache);
      }
      setAcceptedLesson(prev => prev && prev.id === lessonId
        ? { ...result, id: lessonId, isSub: prev.isSub, ctx: prev.ctx }
        : prev);
    } catch (e) {
      console.error("Translate failed", e);
      setError(`${t.error}: ${e.message}`);
    } finally {
      setTranslating(false);
    }
  };
  translateRef.current = (id, lang) => translateAndApplyLesson(id, lang);

  // ---- Generate substitute lesson ----
  const generateSub = async ({ standalone = false } = {}) => {
    if (!hasKey) return;
    if (!standalone && !acceptedLesson) return;
    if (standalone && !canGenerate) return;
    if (standalone) {
      const activePool = window.bankAPI.getActivePool({ stage, grade, subject });
      if (activePool.length >= window.ACTIVE_POOL_LIMIT) {
        setShowPoolFull(true);
        return;
      }
    }
    setError("");
    setLoadingSub(true);
    if (standalone) { setLoadingChoices(true); setAcceptedLesson(null); setSubLesson(null); }
    try {
      const result = await window.runLLM(config,
        window.subPrompt({
          stage, grade, subject, topic, duration,
          baseLesson: standalone ? null : acceptedLesson,
          language: "sv",
        })
      );
      if (standalone) {
        result.translations = { sv: { ...result } };
        const { provider, model } = currentProviderModel();
        let record;
        try {
          record = await window.bankAPI.addLesson(null, {
            schoolId: config.schoolId || "school-1",
            stage, grade, subject, topic, title: result.title || topic,
            duration, lesson: { ...result, isSub: true }, provider, model,
          });
        } catch (e) {
          if (e.code === "pool_full") {
            await refreshBank();
            setShowPoolFull(true);
            return;
          }
          throw e;
        }
        const ctx = { teacher: ctxTeacher, className: ctxClass, day: ctxDay, time: ctxTime, room: ctxRoom };
        const accepted = { ...result, id: record.lesson_id, isSub: true, ctx };
        setAcceptedLesson(accepted);
        setActiveTab(tabs => ({ ...tabs, [accepted.id]: "plan" }));
        if (config.language !== "sv") {
          translateAndApplyLesson(record.lesson_id, config.language);
        }
      } else {
        setSubLesson({ ...result, id: `sub-${Date.now()}`, isSub: true });
      }
    } catch (e) {
      setError(`${t.error}: ${e.message}`);
    } finally {
      setLoadingSub(false);
      if (standalone) setLoadingChoices(false);
    }
  };

  const reset = () => {
    setAcceptedLesson(null);
    setSubLesson(null);
    setError("");
  };

  // ---- Export to Markdown ----
  const exportMd = () => {
    const lessons = [acceptedLesson, subLesson].filter(Boolean);
    const lines = [
      `# ${t.mdTitle}`, ``,
      `**${t.mdStage}:** ${stage}  `,
      `**${t.mdGrade}:** ${grade}  `,
      `**${t.mdSubject}:** ${subject}  `,
      `**${t.mdTopic}:** ${topic}  `,
      `**${t.mdDuration}:** ${duration} min  `,
      ``, `---`, ``,
    ];
    lessons.forEach((l) => {
      lines.push(`## ${l.title}${l.isSub ? ` 🟡 (${t.mdSubTag})` : ""}`);
      lines.push(`*${l.approach}*`, ``);
      if (l.summary) lines.push(`${l.summary}`, ``);
      if (l.learningGoal || l.objective) lines.push(`**${t.mdLearningGoal}:** ${l.learningGoal || l.objective}`);
      if (l.lgr22_connection) lines.push(`**${t.mdCurriculumLink}:** ${l.lgr22_connection}`);
      lines.push(``);

      if (l.materialsNeeded || l.materials) {
        lines.push(`### ${t.materials}`);
        (l.materialsNeeded || l.materials || []).forEach((m) => lines.push(`- ${asLine(m)}`));
        lines.push(``);
      }

      if (l.phases && l.phases.length) {
        lines.push(`### ${t.phases}`);
        l.phases.forEach((p, i) => {
          lines.push(`#### ${i + 1}. ${p.name} (${p.minutes} min)`);
          if (p.teacherDoes && p.teacherDoes.length) {
            lines.push(`**${t.teacherDoes}:**`);
            p.teacherDoes.forEach((s) => lines.push(`- ${asLine(s)}`));
          }
          if (p.studentsDo && p.studentsDo.length) {
            lines.push(`**${t.studentsDo}:**`);
            p.studentsDo.forEach((s) => lines.push(`- ${asLine(s)}`));
          }
          lines.push(``);
        });
      } else if (l.activities) {
        lines.push(`### ${t.activities}`);
        l.activities.forEach((a) => lines.push(`- ${asLine(a)}`));
        lines.push(``);
      }

      if (l.exitExercise) {
        lines.push(`### ${t.exitExerciseTitle} (${l.exitExercise.durationMinutes} min)`);
        lines.push(`**${l.exitExercise.title}**`);
        lines.push(l.exitExercise.description, ``);
      }

      if (l.differentiation && typeof l.differentiation === "object") {
        lines.push(`### ${t.differentiationTitle}`);
        if (l.differentiation.stod) {
          lines.push(`**${t.differentiationStod}:**`);
          l.differentiation.stod.forEach((s) => lines.push(`- ${asLine(s)}`));
        }
        if (l.differentiation.utmaning) {
          lines.push(`**${t.differentiationUtmaning}:**`);
          l.differentiation.utmaning.forEach((s) => lines.push(`- ${asLine(s)}`));
        }
        lines.push(``);
      } else if (typeof l.differentiation === "string") {
        lines.push(`**${t.differentiationTitle}:** ${l.differentiation}`, ``);
      }

      if (l.extraActivities && l.extraActivities.length) {
        lines.push(`### ${t.extraActivitiesTitle}`);
        l.extraActivities.forEach((a) => lines.push(`- **${a.title}** — ${a.description}`));
        lines.push(``);
      }

      if (l.extraTime && l.extraTime.length) {
        lines.push(`### ${t.extraTimeTitle}`);
        l.extraTime.sort((a,b) => a.minutes - b.minutes).forEach((tier) => {
          lines.push(`- **+${tier.minutes} min · ${tier.title}** — ${tier.description} (${tier.linkBack})`);
        });
        lines.push(``);
      }

      if (l.vikarieNotes && l.vikarieNotes.length) {
        lines.push(`### ${t.vikarieNotesTitle}`);
        l.vikarieNotes.forEach((n) => lines.push(`- ${asLine(n)}`));
        lines.push(``);
      }

      if (l.assessment) lines.push(`**${t.mdAssessment}:** ${l.assessment}`);
      if (l.subTip) lines.push(`**${t.mdSubTip}:** ${l.subTip}`);
      lines.push(``, `---`, ``);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filePrefix = config.language === "sv" ? "lektion" : "lesson";
    a.download = `${filePrefix}-${subject}-${grade}.md`.replace(/\s+/g, "-").replace(/\//g, "-");
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Render ----
  return (
    <div style={{ minHeight: "100vh" }}>
      {showSettings && <window.SettingsModal config={config} onSave={saveConfig} onClose={() => setShowSettings(false)} t={t} onOpenSchoolPicker={() => setShowSchoolPicker(true)} />}
      {showSchoolPicker && (
        <window.SchoolPickerModal
          t={t}
          currentSchoolId={config.schoolId}
          requireSelection={!window.schoolsAPI.all().some(s => s.school_id === config.schoolId)}
          onClose={() => setShowSchoolPicker(false)}
          onSelect={handleSelectSchool}
          onCreate={handleCreateSchool}
        />
      )}
      {showBank && (
        <window.BankView
          t={t}
          loading={bankLoading}
          error={bankError}
          onClose={() => setShowBank(false)}
          onOpen={(id) => loadLessonFromBank(id)}
          onArchive={(id) => archiveLessonInBank(id)}
          onRefresh={refreshBank}
        />
      )}
      {showPoolFull && (
        <window.PoolFullModal
          stage={stage} grade={grade} subject={subject}
          t={t}
          onClose={() => setShowPoolFull(false)}
          onOpen={(id) => openPoolLesson(id)}
          onArchiveAndGenerate={async (id) => {
            try { await window.bankAPI.archive(null, id, config.schoolId || "school-1"); } catch (e) { console.error(e); }
            setShowPoolFull(false);
            setTimeout(() => generateLesson(), 0);
          }}
        />
      )}

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* HEADER */}
        <header className="no-print" style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "var(--accent)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <Icon name="book" size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{t.title}</h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{t.subtitle}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="key" size={12} />
              <span>{window.providerDisplayName(config.provider, config.language)}</span>
              {!hasKey && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8C547" }} />}
              {hasKey && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success-text)" }} />}
            </div>
            <LangToggle value={config.language} onChange={(lng) => saveConfig({ ...config, language: lng })} />
            {config.schoolName && (
              <button onClick={() => setShowSchoolPicker(true)}
                title={t.changeSchool}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 10px", fontSize: 12, fontWeight: 500,
                  background: "var(--bg-secondary)", color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", cursor: "pointer",
                }}>
                🏫 {config.schoolName}
              </button>
            )}
            <Button variant="secondary" icon={<Icon name="settings" size={14} />} onClick={() => setShowSettings(true)}>
              {t.apiSettings}
            </Button>
            <Button variant="secondary" icon={<Icon name="book" size={14} />} onClick={() => setShowBank(true)} title={t.bankTitle}>
              {t.bankButton} <window.SavedCountInline />
            </Button>
          </div>
        </header>

        {/* API KEY WARNING */}
        {!hasKey && (
          <div className="no-print" style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--radius-md)", padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ color: "var(--warning-text)", flexShrink: 0, marginTop: 2 }}>
              <Icon name="alert" size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--warning-text)", marginBottom: 2 }}>{t.apiKeyMissing}</div>
              <div style={{ fontSize: 12, color: "var(--warning-text)" }}>{t.apiKeyMissingDesc}</div>
            </div>
            <Button variant="primary" onClick={() => setShowSettings(true)}>{t.openSettings}</Button>
          </div>
        )}

        {/* INPUT FORM */}
        <div className="no-print" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="file" size={14} />
            {t.lessonDetails}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <Field label={t.stage}>
              <Select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="">{t.chooseStage}</option>
                {Object.keys(window.STAGES).map((s) => <option key={s} value={s}>{window.localizeLabel(s, config.language)}</option>)}
              </Select>
            </Field>
            <Field label={t.grade}>
              <Select value={grade} onChange={(e) => setGrade(e.target.value)} disabled={!stage}>
                <option value="">{stage ? t.chooseGrade : t.chooseStageFirst}</option>
                {grades.map((g) => <option key={g} value={g}>{window.localizeLabel(g, config.language)}</option>)}
              </Select>
            </Field>
            <Field label={t.subject}>
              <Select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!stage}>
                <option value="">{stage ? t.chooseSubject : t.chooseStageFirst}</option>
                {subjects.map((s) => <option key={s} value={s}>{window.localizeLabel(s, config.language)}</option>)}
              </Select>
            </Field>
            <Field label={t.duration}>
              <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[30, 40, 45, 60, 80, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
              </Select>
            </Field>
          </div>

          {/* Lesson context */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--border-default)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t.contextHeader}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>{t.contextOptional}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <Field label={t.teacher}><Input value={ctxTeacher} onChange={(e) => setCtxTeacher(e.target.value)} placeholder="—" /></Field>
              <Field label={t.className}><Input value={ctxClass} onChange={(e) => setCtxClass(e.target.value)} placeholder="—" /></Field>
              <Field label={t.day}><Input value={ctxDay} onChange={(e) => setCtxDay(e.target.value)} placeholder="—" type="date" /></Field>
              <Field label={t.time}><Input value={ctxTime} onChange={(e) => setCtxTime(e.target.value)} placeholder="—" /></Field>
              <Field label={t.room}><Input value={ctxRoom} onChange={(e) => setCtxRoom(e.target.value)} placeholder="—" /></Field>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label={t.topic}>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.topicPlaceholder} />
            </Field>

            {canSuggestTopics && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t.topicSuggestions}
                  </span>
                  {topicSuggestions.length === 0 ? (
                    <button onClick={() => suggestTopics(false)} disabled={loadingTopics} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 10px", fontSize: 12, fontWeight: 500,
                      background: "transparent", color: "var(--accent)",
                      border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                      cursor: loadingTopics ? "wait" : "pointer",
                    }}>
                      <Icon name={loadingTopics ? "refresh" : "sparkles"} size={12} style={loadingTopics ? { animation: "spin 0.8s linear infinite" } : {}} />
                      {loadingTopics ? t.suggestingTopics : t.suggestTopics}
                    </button>
                  ) : (
                    <button onClick={() => suggestTopics(true)} disabled={loadingTopics} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 10px", fontSize: 12, fontWeight: 500,
                      background: "transparent", color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                      cursor: loadingTopics ? "wait" : "pointer",
                    }}>
                      <Icon name={loadingTopics ? "refresh" : "plus"} size={12} style={loadingTopics ? { animation: "spin 0.8s linear infinite" } : {}} />
                      {loadingTopics ? t.suggestingTopics : t.moreSuggestions}
                    </button>
                  )}
                </div>

                {topicSuggestions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {topicSuggestions.map((s, i) => {
                      const selected = topic === s;
                      return (
                        <button key={i} onClick={() => setTopic(s)} style={{
                          padding: "6px 12px", fontSize: 12, fontWeight: 500,
                          background: selected ? "var(--accent)" : "var(--bg-surface)",
                          color: selected ? "#fff" : "var(--text-primary)",
                          border: `1px solid ${selected ? "var(--accent)" : "var(--border-default)"}`,
                          borderRadius: 999,
                          cursor: "pointer", transition: "all 0.12s",
                        }}>{s}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--border-default)" }}>
            <window.DetailAndExtrasControls
              detailLevel={detailLevel}
              setDetailLevel={setDetailLevel}
              extrasEnabled={extrasEnabled}
              setExtrasEnabled={setExtrasEnabled}
              t={t}
            />
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {stage && grade && subject ? (
              <window.PoolIndicator stage={stage} grade={grade} subject={subject} t={t} onOpen={() => setShowPoolFull(true)} />
            ) : <span />}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {acceptedLesson && (
                <Button variant="secondary" icon={<Icon name="refresh" size={14} />} onClick={reset}>{t.reset}</Button>
              )}
              <Button variant="yellow" icon={loadingSub ? <Icon name="refresh" size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Icon name="coffee" size={14} />}
                onClick={() => generateSub({ standalone: true })} disabled={!canGenerate || loadingChoices || loadingSub}
                title={t.createStandaloneSubHint}>
                {loadingSub ? t.creating : t.createStandaloneSub}
              </Button>
              <Button variant="primary" icon={loadingChoices ? <Icon name="refresh" size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Icon name="sparkles" size={14} />}
                onClick={generateLesson} disabled={!canGenerate || loadingChoices || loadingSub}>
                {loadingChoices ? t.generating : t.generateChoices}
              </Button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-text)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--danger-text)", display: "flex", gap: 10 }}>
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ACCEPTED LESSON */}
        {acceptedLesson && (
          <div style={{ marginBottom: 16 }}>
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                {t.yourLesson}
                {translating && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="refresh" size={11} style={{ animation: "spin 0.8s linear infinite" }} />
                    {t.translating}
                  </span>
                )}
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="ghost" icon={<Icon name="refresh" size={13} />} onClick={generateLesson}>{t.addAnother}</Button>
                <Button variant="ghost" icon={<Icon name="print" size={13} />} onClick={() => window.print()}>{t.print}</Button>
                <Button variant="ghost" icon={<Icon name="download" size={13} />} onClick={exportMd}>{t.download}</Button>
              </div>
            </div>
            <window.LessonCardWithTabs
              lesson={acceptedLesson}
              t={t}
              extrasEnabled={extrasEnabled}
              extrasCache={extrasCache}
              loadingExtras={loadingExtras}
              onGenerateExtra={(kind) => generateExtra(acceptedLesson, kind)}
              onForceRegenerate={(kind) => {
                const cacheKey = `${acceptedLesson.id}:${kind}`;
                setExtrasCache(c => { const next = { ...c }; delete next[cacheKey]; return next; });
                generateExtra(acceptedLesson, kind);
              }}
              activeTab={activeTab[acceptedLesson.id] || "plan"}
              setActiveTab={(tab) => setActiveTab(s => ({ ...s, [acceptedLesson.id]: tab }))}
              onMarkUsed={markLessonUsed}
              onSubmitFeedback={submitLessonFeedback}
            />

            {!subLesson && (
              <div className="no-print" style={{ marginTop: 14, padding: 16, background: "var(--bg-secondary)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: "#FFF8E1", border: "1px solid #E8C547", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--warning-text)" }}>
                    <Icon name="coffee" size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.createSub}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.subDesc}</div>
                  </div>
                </div>
                <Button variant="yellow" icon={loadingSub ? <Icon name="refresh" size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Icon name="coffee" size={14} />} onClick={() => generateSub()} disabled={loadingSub}>
                  {loadingSub ? t.creating : t.createSub}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* SUB LESSON (attached, not standalone) */}
        {subLesson && (
          <div style={{ marginBottom: 16 }}>
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="coffee" size={16} />
                {t.substituteLesson}
              </h2>
              <Button variant="ghost" icon={<Icon name="refresh" size={13} />} onClick={() => generateSub()} disabled={loadingSub}>
                {loadingSub ? t.creating : t.addAnother}
              </Button>
            </div>
            <window.LessonCard lesson={subLesson} t={t} />
          </div>
        )}

        <div className="no-print" style={{ marginTop: 40, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.6 }}>
          {t.print_warning}
        </div>
      </div>

      <AppVersionBadgeMount providerLabel={window.providerDisplayName(config.provider, config.language)} onOpenLibrary={() => setShowBank(true)} />
    </div>
  );
}

function AppVersionBadgeMount({ providerLabel, onOpenLibrary }) {
  window.useBankVersion();
  const savedCount = window.bankAPI.active().length;
  return <window.VersionBadge providerLabel={providerLabel} savedCount={savedCount} onOpenLibrary={onOpenLibrary} />;
}

// ---- Mount ----
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
