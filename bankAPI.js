// ============================================================
// Data APIs — Bank (shared lesson pool) and Schools (registry).
// Reads are synchronous from local cache. Writes go remote first,
// then optimistically update the cache (refresh reconciles later).
// Depends on: storage.js, api.js, constants.js
// ============================================================

window.bankAPI = {
  // ---- Read (synchronous, from cache) ----
  all() { return window.loadBankCache().lessons; },
  active() { return this.all().filter(l => l.status === "active"); },
  byId(id) { return this.all().find(l => l.lesson_id === id) || null; },
  getActivePool({ stage, grade, subject }) {
    return this.active().filter(l =>
      l.stage === stage &&
      String(l.grade) === String(grade) &&
      l.subject === subject
    );
  },
  // Group active by (stage, grade) → subject map. Used by BankView grid.
  matrixForStage(stage) {
    const lessons = this.active().filter(l => l.stage === stage);
    const map = new Map();
    for (const l of lessons) {
      const k = `${l.grade}|${l.subject}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(l);
    }
    return map;
  },

  cacheUpsert(lesson) {
    const cache = window.loadBankCache();
    const idx = cache.lessons.findIndex(l => l.lesson_id === lesson.lesson_id);
    if (idx >= 0) cache.lessons[idx] = lesson;
    else cache.lessons.push(lesson);
    window.saveBankCache(cache);
  },

  cacheMarkArchived(id) {
    const cache = window.loadBankCache();
    const rec = cache.lessons.find(l => l.lesson_id === id);
    if (rec) {
      rec.status = "archived";
      rec.archived_at = new Date().toISOString();
    }
    window.saveBankCache(cache);
  },

  // ---- Remote ----
  async refresh(url) {
    const r = await window.getFromAppsScript(url, { type: "bank" });
    if (r.ok && Array.isArray(r.lessons)) {
      window.saveBankCache({ lessons: r.lessons, fetchedAt: Date.now() });
      return r.lessons;
    }
    throw new Error(r.error || "bank fetch failed");
  },

  async addLesson(url, { schoolId, stage, grade, subject, topic, title, duration, lesson }) {
    const r = await window.postToAppsScript(url, {
      type: "newLesson",
      schoolId, stage, grade, subject, topic, title, duration, lesson,
    });
    if (!r.ok) {
      const err = new Error(r.error || "newLesson failed");
      err.code = r.error;
      err.activeCount = r.activeCount;
      throw err;
    }
    // Optimistic cache write (server-driven refresh will reconcile).
    const lessonRec = {
      lesson_id: r.lessonId,
      created_at: new Date().toISOString(),
      created_by_school: schoolId,
      status: "active",
      stage, grade, subject, topic, title,
      duration,
      lesson,
      archived_at: "",
    };
    this.cacheUpsert(lessonRec);
    return lessonRec;
  },

  async archive(url, lessonId, schoolId) {
    await window.postToAppsScript(url, { type: "archiveLesson", lessonId, schoolId });
    this.cacheMarkArchived(lessonId);
  },
};

window.schoolsAPI = {
  all() { return window.loadSchoolsCache(); },

  async refresh(url) {
    const r = await window.getFromAppsScript(url, { type: "schools" });
    if (r.ok && Array.isArray(r.schools)) {
      window.saveSchoolsCache(r.schools);
      return r.schools;
    }
    throw new Error(r.error || "schools fetch failed");
  },

  async create(url, name) {
    const r = await window.postToAppsScript(url, { type: "createSchool", name });
    if (!r.ok) throw new Error(r.error || "createSchool failed");
    // Optimistic cache write so the dropdown sees the new school immediately.
    const list = window.loadSchoolsCache();
    if (!list.some(s => s.school_id === r.schoolId)) {
      list.push({
        school_id: r.schoolId,
        name: r.name,
        created_at: new Date().toISOString(),
      });
      window.saveSchoolsCache(list);
    }
    return r;
  },
};
