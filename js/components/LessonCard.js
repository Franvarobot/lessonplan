// ============================================================
// LessonCard — the main lesson display component.
// Change: added projectorContent section (for sub lessons).
// Depends on: Icon.js, helpers.js (asLine), storage.js (lessonLibrary, useLibraryVersion)
// ============================================================
const { useState: useState_card, useMemo: useMemo_card } = React;

window.Section = function Section({ icon, label, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <window.Icon name={icon} size={13} style={{ color: "var(--text-tertiary)" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      {children}
    </div>
  );
};

window.LessonCard = function LessonCard({ lesson, t, onPick, isOption, optionLabel, onMarkUsed, onSubmitFeedback }) {
  const compact = isOption;
  const accent = lesson.isSub ? "#E8C547" : "var(--accent)";
  const totalMin = lesson.phases ? lesson.phases.reduce((s, p) => s + (p.minutes || 0), 0) : null;
  const ctx = lesson.ctx || {};
  const hasCtx = ctx.teacher || ctx.className || ctx.day || ctx.time || ctx.room;

  const libTick = window.useLibraryVersion();
  const existingFeedback = useMemo_card(() => {
    if (!lesson.id) return [];
    return window.lessonLibrary.getFeedbackForLesson(lesson.id);
  }, [lesson.id, libTick]);

  const [markedUsedFlash, setMarkedUsedFlash] = useState_card(false);
  const [marking, setMarking] = useState_card(false);
  const [feedbackOpen, setFeedbackOpen] = useState_card(false);
  const [fbSubName, setFbSubName] = useState_card("");
  const [fbText, setFbText] = useState_card("");
  const [fbState, setFbState] = useState_card({ sending: false, sent: false, synced: null });

  const handleMarkUsed = async () => {
    if (!onMarkUsed) return;
    setMarking(true);
    try {
      await onMarkUsed();
      setMarkedUsedFlash(true);
      setTimeout(() => setMarkedUsedFlash(false), 2200);
    } finally {
      setMarking(false);
    }
  };
  const handleSendFeedback = async () => {
    if (!onSubmitFeedback || !fbText.trim()) return;
    setFbState({ sending: true, sent: false, synced: null });
    try {
      const res = await onSubmitFeedback({ subName: fbSubName.trim(), text: fbText.trim() });
      setFbState({ sending: false, sent: true, synced: !!res?.synced });
      setFbText(""); setFbSubName("");
      setTimeout(() => setFbState(s => ({ ...s, sent: false })), 3000);
    } catch (e) {
      setFbState({ sending: false, sent: false, synced: false });
    }
  };

  const Icon = window.Icon;
  const Section = window.Section;
  const Button = window.Button;
  const Input = window.Input;
  const asLine = window.asLine;

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${lesson.isSub ? "#E8C547" : "var(--border-subtle)"}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: "var(--radius-md)",
      padding: "18px 22px",
      position: "relative",
    }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            {isOption && optionLabel && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--accent-bg)", padding: "2px 8px", borderRadius: "var(--radius-sm)", letterSpacing: "0.05em" }}>
                {optionLabel}
              </span>
            )}
            {lesson.isSub && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--warning-text)", background: "var(--warning-bg)", padding: "2px 8px", borderRadius: "var(--radius-sm)", letterSpacing: "0.05em" }}>
                {t.substituteLesson}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {lesson.approach}
            </span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.3 }}>{lesson.title}</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{lesson.summary}</p>
          {lesson.approachReason && (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, marginTop: 4, fontStyle: "italic" }}>↳ {lesson.approachReason}</p>
          )}
        </div>
        {totalMin && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
            <Icon name="clock" size={12} />
            <span>{totalMin} min</span>
          </div>
        )}
      </div>

      {/* Context strip */}
      {!isOption && hasCtx && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 14, rowGap: 6,
          background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 14,
          fontSize: 12, color: "var(--text-secondary)",
        }}>
          {ctx.teacher && <span><strong style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>{t.teacher}:</strong> {ctx.teacher}</span>}
          {ctx.className && <span><strong style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>{t.className}:</strong> {ctx.className}</span>}
          {ctx.day && <span><strong style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>{t.day}:</strong> {ctx.day}</span>}
          {ctx.time && <span><strong style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>{t.time}:</strong> {ctx.time}</span>}
          {ctx.room && <span><strong style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>{t.room}:</strong> {ctx.room}</span>}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {/* AT-A-GLANCE */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={{ background: "var(--accent-bg)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t.objective}</div>
            <p style={{ fontSize: 13, lineHeight: 1.5 }}>{lesson.learningGoal || lesson.objective}</p>
          </div>
          {lesson.priorKnowledge && (
            <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t.priorKnowledge}</div>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>{lesson.priorKnowledge}</p>
            </div>
          )}
          {lesson.successCriteria && lesson.successCriteria.length > 0 && (
            <div style={{ background: "#F0F7F2", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--success-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t.successCriteria}</div>
              <ul style={{ fontSize: 12, lineHeight: 1.5, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
                {lesson.successCriteria.map((c, i) => <li key={i} style={{ display: "flex", gap: 4 }}><span style={{ color: "var(--success-text)" }}>✓</span><span>{asLine(c)}</span></li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Curriculum link */}
        {lesson.lgr22_connection && (
          <Section icon="book" label={t.lgr22}>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{lesson.lgr22_connection}</p>
          </Section>
        )}

        {/* Board layout */}
        {lesson.boardLayout && (
          <Section icon="layers" label={t.boardLayout}>
            <div style={{ background: "#F8F4EB", border: "1px dashed #C9A013", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, lineHeight: 1.6, fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "pre-wrap" }}>
              {lesson.boardLayout}
            </div>
          </Section>
        )}

        {/* ── PROJECTOR CONTENT (sub lessons) ─────────────────────────────── */}
        {lesson.projectorContent && lesson.projectorContent !== "null" && (
          <div style={{
            background: "#EEF2FF",
            border: "1px solid #C7D2FE",
            borderLeft: "3px solid #6366F1",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>📽</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#4338CA", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {lesson._lang === "en" ? "If projector available" : "Om projektor finns"}
              </span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#3730A3", whiteSpace: "pre-wrap" }}>{lesson.projectorContent}</p>
          </div>
        )}
        {/* ─────────────────────────────────────────────────────────────────── */}

        {/* Materials */}
        {(lesson.materialsNeeded || lesson.materials) && (
          <Section icon="file" label={t.materials}>
            <ul style={{ fontSize: 13, lineHeight: 1.7, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0 16px" }}>
              {(lesson.materialsNeeded || lesson.materials || []).map((m, i) => (
                <li key={i} style={{ display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--text-tertiary)" }}>·</span>
                  <span>{asLine(m)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* PHASES */}
        {lesson.phases && lesson.phases.length > 0 && (
          <Section icon="layers" label={t.phases}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              {lesson.phases.map((phase, i) => (
                <div key={i} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--accent-bg)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{phase.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
                      <Icon name="clock" size={11} />
                      {phase.minutes} min
                    </span>
                  </div>

                  {phase.purpose && (
                    <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-tertiary)", marginBottom: 10, lineHeight: 1.5 }}>
                      {t.purposeLabel}: {phase.purpose}
                    </p>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 14 }}>
                    {phase.teacherDoes && phase.teacherDoes.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                          {t.teacherDoes}
                        </div>
                        <ul style={{ fontSize: 13, lineHeight: 1.55, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                          {phase.teacherDoes.map((s, j) => (
                            <li key={j} style={{ display: "flex", gap: 6 }}>
                              <span style={{ color: "var(--accent)", flexShrink: 0 }}>→</span>
                              <span>{asLine(s)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {phase.studentsDo && phase.studentsDo.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                          {t.studentsDo}
                        </div>
                        <ul style={{ fontSize: 13, lineHeight: 1.55, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                          {phase.studentsDo.map((s, j) => (
                            <li key={j} style={{ display: "flex", gap: 6 }}>
                              <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>·</span>
                              <span>{asLine(s)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {phase.teacherScript && phase.teacherScript.length > 0 && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg-surface)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                        💬 {t.teacherScript}
                      </div>
                      <ul style={{ fontSize: 13, lineHeight: 1.55, listStyle: "none", display: "flex", flexDirection: "column", gap: 5, fontStyle: "italic", color: "var(--text-primary)" }}>
                        {phase.teacherScript.map((s, j) => (
                          <li key={j}>"{asLine(s).replace(/^["']|["']$/g, "")}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {phase.anticipatedResponses && phase.anticipatedResponses.length > 0 && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "#FAF6FC", borderLeft: "3px solid #6B3E8E", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#6B3E8E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                        🎯 {t.anticipatedResponses}
                      </div>
                      <ul style={{ fontSize: 12, lineHeight: 1.55, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                        {phase.anticipatedResponses.map((s, j) => (
                          <li key={j} style={{ display: "flex", gap: 6 }}>
                            <span style={{ color: "#6B3E8E", flexShrink: 0 }}>·</span>
                            <span>{asLine(s)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Legacy fallback */}
        {!lesson.phases && lesson.activities && (
          <Section icon="layers" label={t.activities}>
            <ol style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 18 }}>
              {lesson.activities.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{asLine(a)}</li>)}
            </ol>
          </Section>
        )}

        {/* Check for understanding */}
        {lesson.checkForUnderstanding && lesson.checkForUnderstanding.length > 0 && (
          <Section icon="target" label={t.checkForUnderstanding}>
            <ol style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {lesson.checkForUnderstanding.map((q, i) => <li key={i}>{q}</li>)}
            </ol>
          </Section>
        )}

        {/* Embedded content */}
        {lesson.embeddedContent && (
          <Section icon="book" label={t.embeddedContent}>
            {lesson.embeddedContent.description && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, fontStyle: "italic" }}>
                {lesson.embeddedContent.description}
              </p>
            )}

            {lesson.embeddedContent.questions && lesson.embeddedContent.questions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  {t.embeddedQuestions}
                </div>
                <ol style={{ fontSize: 13, lineHeight: 1.55, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  {lesson.embeddedContent.questions.map((q, i) => (
                    <li key={i}>
                      <div>{q.q}</div>
                      <div style={{ fontSize: 12, color: "var(--success-text)", marginTop: 2 }}>✓ {q.expectedAnswer}</div>
                      {q.ifStuck && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontStyle: "italic" }}>↳ Om de fastnar: {q.ifStuck}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {lesson.embeddedContent.problems && lesson.embeddedContent.problems.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  {t.embeddedProblems}
                </div>
                <ol style={{ fontSize: 13, lineHeight: 1.55, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  {lesson.embeddedContent.problems.map((p, i) => (
                    <li key={i}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ flex: 1 }}>{p.problem}</span>
                        {p.difficulty && <span style={{ fontSize: 10, color: "var(--text-tertiary)", whiteSpace: "nowrap", marginTop: 2 }}>[{p.difficulty}]</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--success-text)", marginTop: 2 }}>✓ {p.answer}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {lesson.embeddedContent.texts && lesson.embeddedContent.texts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  {t.embeddedTexts}
                </div>
                {lesson.embeddedContent.texts.map((tx, i) => (
                  <div key={i} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{tx.title}</div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6, whiteSpace: "pre-wrap" }}>{tx.content}</p>
                    {tx.purpose && <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>↳ {tx.purpose}</div>}
                  </div>
                ))}
              </div>
            )}

            {lesson.embeddedContent.exampleAnswers && lesson.embeddedContent.exampleAnswers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  {t.embeddedExamples}
                </div>
                <ul style={{ fontSize: 13, lineHeight: 1.55, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {lesson.embeddedContent.exampleAnswers.map((ex, i) => (
                    <li key={i} style={{ borderLeft: "2px solid var(--border-default)", paddingLeft: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 2 }}>{ex.scenario}</div>
                      <div>→ "{ex.response}"</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* Exit ticket */}
        {(lesson.exitTicket || lesson.exitExercise) && (
          <div style={{ background: "#F0F7F2", border: "1px solid #C5DCC9", borderLeft: "3px solid var(--success-text)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--success-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              ✦ {lesson.exitTicket ? t.exitTicket : t.exitExerciseTitle}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {(lesson.exitTicket || lesson.exitExercise).title}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55 }}>
              {lesson.exitTicket ? lesson.exitTicket.task : lesson.exitExercise.description}
            </p>
            {lesson.exitTicket && lesson.exitTicket.purpose && (
              <p style={{ fontSize: 11, color: "var(--success-text)", fontStyle: "italic", marginTop: 4 }}>↳ {lesson.exitTicket.purpose}</p>
            )}
          </div>
        )}

        {/* Differentiation */}
        {lesson.differentiation && typeof lesson.differentiation === "object" && (lesson.differentiation.stod || lesson.differentiation.utmaning) && (
          <Section icon="users" label={t.differentiationTitle}>
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 12 }}>
              {lesson.differentiation.stod && (
                <div style={{ background: "#F4F8FC", border: "1px solid #D0DEEC", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", marginBottom: 5 }}>🤝 {t.differentiationStod}</div>
                  <ul style={{ fontSize: 13, lineHeight: 1.55, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {lesson.differentiation.stod.map((s, i) => <li key={i}>· {asLine(s)}</li>)}
                  </ul>
                </div>
              )}
              {lesson.differentiation.utmaning && (
                <div style={{ background: "#FAF6FC", border: "1px solid #DBC9E5", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B3E8E", marginBottom: 5 }}>⚡ {t.differentiationUtmaning}</div>
                  <ul style={{ fontSize: 13, lineHeight: 1.55, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {lesson.differentiation.utmaning.map((s, i) => <li key={i}>· {asLine(s)}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Extra activities */}
        {lesson.extraActivities && lesson.extraActivities.length > 0 && (
          <Section icon="plus" label={t.extraActivitiesTitle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lesson.extraActivities.map((act, i) => (
                <div key={i} style={{ borderLeft: "2px solid var(--border-default)", paddingLeft: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{act.title}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>{act.description}</p>
                  {act.answer && <p style={{ fontSize: 12, color: "var(--success-text)", marginTop: 2 }}>✓ {act.answer}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Extra time tiers */}
        {lesson.extraTime && lesson.extraTime.length > 0 && (
          <details style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
            <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", listStyle: "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>+ {t.extraTimeTitle}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.extraTimeDesc}</div>
              </div>
              <Icon name="chevronRight" size={14} style={{ color: "var(--text-tertiary)" }} />
            </summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 12 }}>
              {[...lesson.extraTime].sort((a, b) => a.minutes - b.minutes).map((tier, i) => (
                <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>+{tier.minutes} min</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{tier.title}</div>
                  <p style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{tier.description}</p>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic", lineHeight: 1.4 }}>↳ {tier.linkBack}</p>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Common pitfalls */}
        {lesson.commonPitfalls && lesson.commonPitfalls.length > 0 && (
          <Section icon="alert" label={t.commonPitfalls}>
            <ul style={{ fontSize: 13, lineHeight: 1.6, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
              {lesson.commonPitfalls.map((p, i) => <li key={i} style={{ display: "flex", gap: 6 }}><span style={{ color: "var(--warning-text)" }}>⚠</span><span>{asLine(p)}</span></li>)}
            </ul>
          </Section>
        )}

        {/* Classroom management */}
        {lesson.classroomManagement && lesson.classroomManagement.length > 0 && (
          <Section icon="users" label={t.classroomManagement}>
            <ul style={{ fontSize: 13, lineHeight: 1.6, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
              {lesson.classroomManagement.map((p, i) => <li key={i} style={{ display: "flex", gap: 6 }}><span style={{ color: "var(--text-tertiary)" }}>·</span><span>{asLine(p)}</span></li>)}
            </ul>
          </Section>
        )}

        {/* Teacher / vikarie notes */}
        {(lesson.teacherNotes || lesson.vikarieNotes) && (lesson.teacherNotes || lesson.vikarieNotes).length > 0 && (
          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--warning-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              💡 {lesson.isSub ? t.vikarieNotesTitle : t.teacherNotes}
            </div>
            <ul style={{ fontSize: 13, lineHeight: 1.55, color: "var(--warning-text)", listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {(lesson.teacherNotes || lesson.vikarieNotes).map((n, i) => <li key={i} style={{ display: "flex", gap: 6 }}><span>·</span><span>{asLine(n)}</span></li>)}
            </ul>
          </div>
        )}

        {/* Homework */}
        {lesson.homework && lesson.homework !== "Ingen läxa" && lesson.homework !== "No homework" && (
          <Section icon="file" label={t.homework}>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>{lesson.homework}</p>
          </Section>
        )}

        {/* Assessment */}
        {lesson.assessment && (
          <Section icon="check" label={t.assessment}>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>{lesson.assessment}</p>
          </Section>
        )}

        {/* Sub tip */}
        {lesson.subTip && (
          <div style={{ background: "var(--warning-bg)", border: "2px solid var(--warning-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--warning-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              ⭐ {t.subTip}
            </div>
            <p style={{ fontSize: 13, color: "var(--warning-text)", lineHeight: 1.5, fontWeight: 500 }}>{lesson.subTip}</p>
          </div>
        )}
      </div>

      {/* Mark-as-used + Sub feedback */}
      {!isOption && (onMarkUsed || onSubmitFeedback) && (
        <div className="no-print" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 12 }}>
          {onMarkUsed && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {markedUsedFlash && (
                <span style={{ fontSize: 12, color: "var(--success-text)", fontWeight: 500 }}>✓ {t.markedUsed}</span>
              )}
              <Button variant="secondary" icon={<Icon name="check" size={14} />} onClick={handleMarkUsed} disabled={marking}>
                {t.markUsed}
              </Button>
            </div>
          )}

          {onSubmitFeedback && (
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <button onClick={() => setFeedbackOpen(o => !o)} style={{
                width: "100%", textAlign: "left", padding: "10px 14px",
                background: "var(--bg-secondary)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  💬 {t.feedbackTitle}
                  {existingFeedback.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", background: "var(--bg-surface)", padding: "1px 7px", borderRadius: 10 }}>
                      {existingFeedback.length}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)" }}>
                  {feedbackOpen ? t.feedbackHide : t.feedbackShow} {feedbackOpen ? "▴" : "▾"}
                </span>
              </button>

              {feedbackOpen && (
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {existingFeedback.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>{t.feedbackEmpty}</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {existingFeedback.map((f, i) => (
                        <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4, display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{f.subName || t.substituteName}</span>
                            <span>{f.at ? new Date(f.at).toLocaleString() : ""}</span>
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{f.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 8 }}>
                    <Input value={fbSubName} onChange={(e) => setFbSubName(e.target.value)} placeholder={t.substituteName} />
                    <textarea value={fbText} onChange={(e) => setFbText(e.target.value)}
                      placeholder={t.feedbackPlaceholder} rows={3}
                      style={{
                        width: "100%", padding: "8px 10px", fontSize: 13, lineHeight: 1.5,
                        border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface)", color: "var(--text-primary)",
                        fontFamily: "inherit", resize: "vertical",
                      }} />
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                      {fbState.sent && (
                        <span style={{ fontSize: 12, color: "var(--success-text)", fontWeight: 500 }}>
                          ✓ {t.feedbackSent}{fbState.synced === false ? ` (${t.syncFailedLocal})` : ""}
                        </span>
                      )}
                      <Button variant="primary" onClick={handleSendFeedback} disabled={fbState.sending || !fbText.trim()}>
                        {fbState.sending ? t.feedbackSending : t.feedbackSubmit}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Option pick button */}
      {isOption && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" icon={<Icon name="check" size={14} />} onClick={onPick}>{t.chooseAccept}</Button>
        </div>
      )}
    </div>
  );
};
