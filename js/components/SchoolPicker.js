// ============================================================
// SchoolPickerModal — pick existing or create new, with fuzzy-match
// guard to prevent accidental duplicates.
// Depends on: Icon.js (Input/Select/smallBtn), helpers.js (similarityRatio),
//             bankAPI.js (schoolsAPI), storage.js (useSchoolsVersion)
// ============================================================
const { useState: useState_school, useMemo: useMemo_school } = React;

window.SchoolPickerModal = function SchoolPickerModal({ onClose, onSelect, onCreate, t, currentSchoolId, requireSelection }) {
  window.useSchoolsVersion();
  const schools = window.schoolsAPI.all();
  const [mode, setMode] = useState_school("pick"); // 'pick' | 'create'
  const [newName, setNewName] = useState_school("");
  const [creating, setCreating] = useState_school(false);
  const [confirmAnyway, setConfirmAnyway] = useState_school(false);
  const [error, setError] = useState_school("");

  // Top 3 near-duplicate suggestions for the typed name (similarity >= 0.85).
  const suggestions = useMemo_school(() => {
    const q = newName.trim();
    if (!q) return [];
    return schools
      .map(s => ({ ...s, ratio: window.similarityRatio(q, s.name) }))
      .filter(s => s.ratio >= 0.85 && s.ratio < 1)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3);
  }, [newName, schools]);

  const exactMatch = useMemo_school(() => {
    const q = newName.trim().toLowerCase();
    return schools.find(s => String(s.name || "").trim().toLowerCase() === q);
  }, [newName, schools]);

  async function handleCreate() {
    setError("");
    if (!newName.trim()) return;
    if (exactMatch) {
      onSelect(exactMatch);
      return;
    }
    if (suggestions.length > 0 && !confirmAnyway) {
      setConfirmAnyway(true);
      return;
    }
    setCreating(true);
    try {
      const res = await onCreate(newName.trim());
      onSelect({ school_id: res.schoolId, name: res.name });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div onClick={requireSelection ? undefined : onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 150,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        maxWidth: 480, width: "100%", padding: 22, maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>🏫 {t.schoolPickerTitle}</h2>
          {!requireSelection && (
            <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-tertiary)" }}>×</button>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          {requireSelection ? t.schoolPickerWelcome : t.schoolPickerDesc}
        </p>

        {mode === "pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {schools.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12, fontStyle: "italic", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)" }}>
                {t.schoolNoneYet}
              </div>
            ) : (
              <window.Select value={currentSchoolId || ""} onChange={(e) => {
                const found = schools.find(s => s.school_id === e.target.value);
                if (found) onSelect(found);
              }}>
                <option value="">{t.schoolPickPrompt}</option>
                {schools.map(s => (
                  <option key={s.school_id} value={s.school_id}>{s.name}</option>
                ))}
              </window.Select>
            )}
            <div style={{ borderTop: "1px dashed var(--border-default)", paddingTop: 10 }}>
              <button onClick={() => { setMode("create"); setError(""); }} style={{
                width: "100%", padding: "9px 12px", fontSize: 13, fontWeight: 500,
                background: "var(--accent-bg)", color: "var(--accent)",
                border: "1px solid var(--accent-bg)", borderRadius: "var(--radius-md)", cursor: "pointer",
              }}>
                + {t.schoolCreateNew}
              </button>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <window.Field label={t.schoolNameLabel} hint={t.schoolNameHint}>
              <window.Input value={newName} onChange={(e) => { setNewName(e.target.value); setConfirmAnyway(false); }}
                placeholder="Bromma Skola" autoFocus />
            </window.Field>

            {exactMatch && (
              <div style={{ padding: "8px 12px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                ℹ {t.schoolAlreadyExists}: <strong>{exactMatch.name}</strong>
              </div>
            )}

            {!exactMatch && suggestions.length > 0 && (
              <div style={{ padding: "10px 12px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--warning-text)", marginBottom: 6 }}>
                  ⚠ {t.schoolMaybeDuplicate}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {suggestions.map(s => (
                    <button key={s.school_id} onClick={() => onSelect(s)} style={{
                      textAlign: "left", padding: "5px 8px", fontSize: 12,
                      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-primary)",
                    }}>
                      ↗ {s.name} <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>({Math.round(s.ratio * 100)}% {t.schoolSimilar})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: "8px 12px", background: "var(--warning-bg)", color: "var(--warning-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <button onClick={() => { setMode("pick"); setNewName(""); setError(""); }} style={window.smallBtn}>← {t.back}</button>
              <button onClick={handleCreate} disabled={!newName.trim() || creating} style={{
                ...window.smallBtn,
                padding: "7px 14px",
                background: "var(--accent)", color: "#fff", borderColor: "var(--accent)",
                opacity: (!newName.trim() || creating) ? 0.5 : 1,
                cursor: (!newName.trim() || creating) ? "not-allowed" : "pointer",
              }}>
                {creating ? t.schoolCreating
                  : exactMatch ? t.schoolUseExisting
                  : (suggestions.length > 0 && !confirmAnyway) ? t.schoolConfirmCreate
                  : t.schoolCreateButton}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
