// ============================================================
// BankView + BankLessonDetail + PoolIndicator + PoolFullModal +
// SavedCountInline + VersionBadge — everything bank-related.
// Teacher lessons (blue) and substitute lessons (yellow) are shown
// as separate labelled pools inside each subject cell.
// Depends on: Icon.js, bankAPI.js, storage.js (useBankVersion),
//             lessonLibrary (from storage.js), constants.js (ACTIVE_POOL_LIMIT, APP_VERSION)
// ============================================================
const { useState: useState_bank, useMemo: useMemo_bank } = React;

// ---- BankView: top-level grid grouped by stage > grade > subject ----
window.BankView = function BankView({ onClose, onOpen, onArchive, onRefresh, loading, error, t }) {
  window.useBankVersion();
  const lessons = window.bankAPI.active();

  // Group: stage → grade → subject → { teacher: [], sub: [] }
  const grouped = useMemo_bank(() => {
    const tree = {};
    for (const l of lessons) {
      const s  = l.stage   || "—";
      const g  = l.grade   || "—";
      const sb = l.subject || "—";
      tree[s]       = tree[s]       || {};
      tree[s][g]    = tree[s][g]    || {};
      tree[s][g][sb] = tree[s][g][sb] || { teacher: [], sub: [] };
      if (l.is_sub) tree[s][g][sb].sub.push(l);
      else          tree[s][g][sb].teacher.push(l);
    }
    return tree;
  }, [lessons.length, lessons.map(l => l.lesson_id + l.is_sub).join(",")]);

  const [selectedLesson, setSelectedLesson] = useState_bank(null);
  const stages = Object.keys(grouped);

  const isSv = !!(t.bankTitle && t.bankTitle.includes("bank") || t.bankTitle?.toLowerCase().includes("bank"));

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 1000, width: "100%", maxHeight: "92vh", overflowY: "auto",
        padding: 24, position: "relative",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>📚 {t.bankTitle}</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{t.bankDesc}</p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {loading && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.bankLoading}</span>}
            <button onClick={onRefresh} style={window.smallBtn}>↻ {t.bankRefresh}</button>
            <button onClick={onClose} style={{ ...window.smallBtn, padding: "5px 9px" }}>✕</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)", display: "inline-block" }} />
            {t.language === "en" ? "Teacher lesson" : "Lärarlektion"}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#C9A013", display: "inline-block" }} />
            {t.language === "en" ? "Substitute lesson" : "Vikarielektion"}
          </span>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--warning-bg)", color: "var(--warning-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
            {t.bankError}: {error}
          </div>
        )}

        {stages.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontStyle: "italic" }}>
            {loading ? t.bankLoading : t.bankEmpty}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {stages.map(stage => {
              const grades = Object.keys(grouped[stage]).sort();
              return (
                <div key={stage}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid var(--border-subtle)",
                  }}>{stage}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {grades.map(grade => {
                      const subjects = Object.keys(grouped[stage][grade]).sort();
                      return (
                        <div key={grade}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                            {grade}
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                            gap: 8,
                          }}>
                            {subjects.map(subject => {
                              const { teacher, sub } = grouped[stage][grade][subject];
                              return (
                                <SubjectCell
                                  key={subject}
                                  subject={subject}
                                  teacher={teacher}
                                  sub={sub}
                                  t={t}
                                  onSelect={setSelectedLesson}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedLesson && (
        <window.BankLessonDetail lesson={selectedLesson} t={t}
          alreadyUsed={window.lessonLibrary.hasUsed(selectedLesson.lesson_id)}
          onClose={() => setSelectedLesson(null)}
          onOpen={() => { onOpen(selectedLesson.lesson_id); setSelectedLesson(null); }}
          onArchive={() => { onArchive(selectedLesson.lesson_id); setSelectedLesson(null); }}
        />
      )}
    </div>
  );
};

// ---- SubjectCell: one card per subject, teacher pool on top (blue), sub pool below (yellow) ----
function SubjectCell({ subject, teacher, sub, t, onSelect }) {
  const hasTeacher = teacher.length > 0;
  const hasSub     = sub.length > 0;
  const isSv = t.bankEmptySlot === "Tomt";

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      background: "var(--bg-surface)",
    }}>
      {/* Subject header */}
      <div style={{
        padding: "7px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{subject}</span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600 }}>
          {teacher.length + sub.length}/{window.ACTIVE_POOL_LIMIT * 2}
        </span>
      </div>

      {/* Teacher pool — blue */}
      <PoolSection
        slots={teacher}
        kind="teacher"
        label={isSv ? "📋 Lärare" : "📋 Teacher"}
        accentBg="var(--accent-bg)"
        accentColor="var(--accent)"
        accentBorder="var(--accent)"
        slotBg="#EBF2F9"
        slotColor="var(--accent)"
        t={t}
        onSelect={onSelect}
      />

      {/* Substitute pool — yellow */}
      <PoolSection
        slots={sub}
        kind="sub"
        label={isSv ? "☕ Vikarie" : "☕ Substitute"}
        accentBg="#FFF8E1"
        accentColor="#7A5800"
        accentBorder="#E8C547"
        slotBg="#FFFDE7"
        slotColor="#6B5410"
        t={t}
        onSelect={onSelect}
      />
    </div>
  );
}

// ---- PoolSection: labelled list of slots (filled or empty) ----
function PoolSection({ slots, kind, label, accentBg, accentColor, accentBorder, slotBg, slotColor, t, onSelect }) {
  const filled = slots.length;
  const full   = filled >= window.ACTIVE_POOL_LIMIT;

  return (
    <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
      {/* Pool label row */}
      <div style={{
        padding: "5px 10px",
        background: accentBg,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: full ? (kind === "sub" ? "#7A5800" : "var(--accent-hover)") : "var(--text-tertiary)",
        }}>
          {filled}/{window.ACTIVE_POOL_LIMIT}
        </span>
      </div>

      {/* Slot list */}
      <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
        {Array.from({ length: window.ACTIVE_POOL_LIMIT }).map((_, i) => {
          const slot = slots[i];
          if (!slot) {
            return (
              <div key={i} style={{
                fontSize: 11, color: "var(--text-tertiary)",
                padding: "5px 8px",
                border: "1px dashed var(--border-default)",
                borderRadius: "var(--radius-sm)",
                fontStyle: "italic",
              }}>{t.bankEmptySlot}</div>
            );
          }
          const used = window.lessonLibrary.hasUsed(slot.lesson_id);
          return (
            <button key={i} onClick={() => onSelect(slot)} style={{
              textAlign: "left",
              padding: "5px 8px", fontSize: 11,
              background: used ? "var(--bg-secondary)" : slotBg,
              color: used ? "var(--text-tertiary)" : slotColor,
              border: `1px solid ${used ? "var(--border-subtle)" : accentBorder}`,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer", fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              opacity: used ? 0.75 : 1,
            }} title={slot.lesson?.title || slot.topic}>
              {used ? "✓ " : ""}{slot.lesson?.title || slot.topic || "—"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- BankLessonDetail: lightweight modal shown over BankView ----
window.BankLessonDetail = function BankLessonDetail({ lesson, t, onClose, onOpen, onArchive, alreadyUsed }) {
  const l      = lesson.lesson || {};
  const isSub  = !!lesson.is_sub;
  const accent = isSub ? "#C9A013" : "var(--accent)";
  const accentBg = isSub ? "#FFF8E1" : "var(--accent-bg)";
  const tag    = isSub
    ? (t.substituteLesson || "Vikarielektion")
    : (t.language === "en" ? "Teacher lesson" : "Lärarlektion");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 120,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto",
        padding: 22,
        borderTop: `4px solid ${accent}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 700,
              color: isSub ? "#7A5800" : "var(--accent)",
              background: accentBg,
              padding: "2px 8px", borderRadius: "var(--radius-sm)",
              textTransform: "uppercase", letterSpacing: "0.04em",
              marginBottom: 6,
            }}>
              {isSub ? "☕" : "📋"} {tag}
            </span>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{l.title || lesson.topic || "—"}</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-tertiary)", flexShrink: 0 }}>×</button>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>
          {lesson.stage} · {lesson.grade} · {lesson.subject} · {lesson.topic || "—"}
        </div>

        {l.summary && <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>{l.summary}</p>}

        {l.learningGoal && (
          <div style={{ fontSize: 12, padding: "8px 10px", background: accentBg, color: accent, borderRadius: "var(--radius-sm)", marginBottom: 10 }}>
            <strong>{t.objective}:</strong> {l.learningGoal}
          </div>
        )}

        {alreadyUsed && (
          <div style={{ fontSize: 11, padding: "5px 9px", background: "var(--bg-secondary)", color: "var(--text-tertiary)", borderRadius: "var(--radius-sm)", marginBottom: 10, display: "inline-block" }}>
            ✓ {t.alreadyUsedHere}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 14 }}>
          <button onClick={onArchive} style={{ ...window.smallBtn, color: "var(--warning-text)" }}>{t.archive}</button>
          <button onClick={onOpen} style={{
            ...window.smallBtn,
            background: accent, color: isSub ? "#3A2C00" : "#fff",
            borderColor: accent,
          }}>↗ {t.open}</button>
        </div>
      </div>
    </div>
  );
};

// ---- PoolIndicator: small chip near generate buttons ----
window.PoolIndicator = function PoolIndicator({ stage, grade, subject, isSub = false, t, onOpen }) {
  window.useBankVersion();
  const pool = window.bankAPI.getActivePool({ stage, grade, subject, isSub });
  const full  = pool.length >= window.ACTIVE_POOL_LIMIT;
  if (pool.length === 0) return <span />;

  const isSubStyle = isSub;
  return (
    <button onClick={onOpen} title={full ? t.poolFullTitle : ""} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", fontSize: 11, fontWeight: 600,
      background: full
        ? (isSubStyle ? "#FFF8E1" : "var(--warning-bg)")
        : (isSubStyle ? "#FFFDE7" : "var(--bg-secondary)"),
      color: full
        ? (isSubStyle ? "#7A5800" : "var(--warning-text)")
        : (isSubStyle ? "#6B5410" : "var(--text-secondary)"),
      border: "1px solid " + (full
        ? (isSubStyle ? "#E8C547" : "var(--warning-border)")
        : (isSubStyle ? "#E8C547" : "var(--border-default)")),
      borderRadius: 999, cursor: "pointer",
    }}>
      <span style={{ fontSize: 13 }}>{isSubStyle ? "☕" : "📚"}</span>
      {pool.length}/{window.ACTIVE_POOL_LIMIT} {t.poolBadge}
    </button>
  );
};

// ---- PoolFullModal ----
window.PoolFullModal = function PoolFullModal({ stage, grade, subject, isSub = false, onClose, onOpen, onArchiveAndGenerate, t }) {
  window.useBankVersion();
  const pool = useMemo_bank(
    () => window.bankAPI.getActivePool({ stage, grade, subject, isSub }),
    [stage, grade, subject, isSub]
  );

  const accent   = isSub ? "#C9A013" : "var(--accent)";
  const accentBg = isSub ? "#FFF8E1" : "var(--accent-bg)";
  const label    = isSub
    ? (t.language === "en" ? "Substitute" : "Vikarie")
    : (t.language === "en" ? "Teacher" : "Lärare");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 110,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto",
        padding: 24, position: "relative",
        borderTop: `4px solid ${accent}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: isSub ? "#7A5800" : "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              {isSub ? "☕" : "📋"} {label}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>⚠ {t.poolFullTitle}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-tertiary)" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          {t.poolFullDesc}
        </p>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, fontWeight: 600 }}>
          {stage} · {grade} · {subject}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pool.map(rec => (
            <div key={rec.lesson_id} style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {rec.lesson?.title || rec.topic || "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {rec.topic || "—"} · {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => onOpen(rec.lesson_id)} style={window.smallBtn}>↗ {t.open}</button>
                <button onClick={() => onArchiveAndGenerate(rec.lesson_id)} style={{
                  ...window.smallBtn,
                  background: accent,
                  color: isSub ? "#3A2C00" : "#fff",
                  borderColor: accent,
                }} title={t.archiveAndGenerate}>📦 {t.archive}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---- SavedCountInline ----
window.SavedCountInline = function SavedCountInline() {
  window.useBankVersion();
  const total = window.bankAPI.active().length;
  if (total === 0) return null;
  return (
    <span style={{
      marginLeft: 6, fontSize: 11, fontWeight: 600,
      background: "var(--accent-bg)", color: "var(--accent)",
      padding: "1px 7px", borderRadius: 10,
    }}>{total}</span>
  );
};

// ---- VersionBadge ----
window.VersionBadge = function VersionBadge({ providerLabel, savedCount, onOpenLibrary }) {
  return (
    <div className="no-print" style={{
      position: "fixed", bottom: 10, right: 10, zIndex: 40,
      display: "flex", alignItems: "center", gap: 6,
      pointerEvents: "auto",
    }}>
      {savedCount > 0 && (
        <button onClick={onOpenLibrary} style={{
          fontSize: 10, fontWeight: 500,
          padding: "3px 8px",
          background: "var(--bg-surface)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10, cursor: "pointer",
          opacity: 0.7,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
        title="Sparade lektioner / Saved lessons"
        >
          {savedCount} ✓
        </button>
      )}
      <span style={{
        fontSize: 10, fontWeight: 500,
        padding: "3px 8px",
        background: "var(--bg-surface)",
        color: "var(--text-tertiary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        opacity: 0.55,
        userSelect: "none",
      }}
      title={providerLabel}
      >
        v{window.APP_VERSION}
      </span>
    </div>
  );
};
