// ============================================================
// Data APIs — Bank (shared lesson pool) and Schools (registry).
// Reads are synchronous from local cache. Writes go to Supabase.
// Depends on: storage.js, constants.js
// ============================================================

// ---- Supabase REST helpers ----
function _sbUrl(table, params = "") {
  return `${window.SUPABASE_URL}/rest/v1/${table}${params}`;
}

function _sbHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "apikey": window.SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
    "Prefer": "return=representation",
    ...extra,
  };
}

async function _sbGet(table, query = "") {
  const r = await fetch(_sbUrl(table, query ? `?${query}` : ""), {
    headers: _sbHeaders(),
  });
  if (!r.ok) throw new Error(`Supabase GET ${table} failed: ${r.status}`);
  return r.json();
}

async function _sbPost(table, body) {
  const r = await fetch(_sbUrl(table), {
    method: "POST",
    headers: _sbHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Supabase POST ${table} failed: ${r.status} ${err}`);
  }
  return r.json();
}

async function _sbPatch(table, query, body) {
  const r = await fetch(_sbUrl(table, `?${query}`), {
    method: "PATCH",
    headers: _sbHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Supabase PATCH ${table} failed: ${r.status} ${err}`);
  }
  return r.json();
}

// ---- bankAPI ----
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
  async refresh(_url) {
    // _url ignored — we use Supabase directly
    const rows = await _sbGet("lessons", "status=eq.active&order=created_at.desc");
    // Normalize: Supabase returns lesson_json, not lesson
    const lessons = rows.map(r => ({
      ...r,
      lesson: r.lesson_json,
    }));
    window.saveBankCache({ lessons, fetchedAt: Date.now() });
    return lessons;
  },

  async addLesson(_url, { schoolId, stage, grade, subject, topic, title, duration, lesson, provider, model }) {
    // Server-side pool check
    const poolRows = await _sbGet("lessons",
      `stage=eq.${encodeURIComponent(stage)}&grade=eq.${encodeURIComponent(grade)}&subject=eq.${encodeURIComponent(subject)}&status=eq.active&select=lesson_id`
    );
    if (poolRows.length >= window.ACTIVE_POOL_LIMIT) {
      const err = new Error("pool_full");
      err.code = "pool_full";
      err.activeCount = poolRows.length;
      throw err;
    }

    const row = {
      created_by_school: schoolId || null,
      stage,
      grade: String(grade),
      subject,
      topic: topic || null,
      title: title || topic || null,
      duration: duration ? Number(duration) : null,
      is_sub: !!(lesson && lesson.isSub),
      provider: provider || null,
      model: model || null,
      lesson_json: lesson,
      translations_json: lesson?.translations || {},
    };

    const [created] = await _sbPost("lessons", row);

    const lessonRec = {
      lesson_id: created.lesson_id,
      created_at: created.created_at,
      created_by_school: schoolId,
      status: "active",
      stage, grade: String(grade), subject, topic, title,
      duration,
      lesson,
      archived_at: "",
    };
    this.cacheUpsert(lessonRec);
    return lessonRec;
  },

  async archive(_url, lessonId, schoolId) {
    await _sbPatch("lessons", `lesson_id=eq.${lessonId}`, {
      status: "archived",
      archived_at: new Date().toISOString(),
    });
    // Log usage
    try {
      await _sbPost("usage_log", {
        lesson_id: lessonId,
        school_id: schoolId || null,
      });
    } catch (e) {
      console.warn("Usage log failed", e);
    }
    this.cacheMarkArchived(lessonId);
  },
};

// ---- schoolsAPI ----
window.schoolsAPI = {
  all() { return window.loadSchoolsCache(); },

  async refresh(_url) {
    const rows = await _sbGet("schools", "order=created_at.desc");
    window.saveSchoolsCache(rows);
    return rows;
  },

  async create(_url, name) {
    const [created] = await _sbPost("schools", { name });
    const list = window.loadSchoolsCache();
    if (!list.some(s => s.school_id === created.school_id)) {
      list.push(created);
      window.saveSchoolsCache(list);
    }
    return { ok: true, schoolId: created.school_id, name: created.name };
  },
};

// ---- extrasAPI ----
window.extrasAPI = {
  async get({ lessonId, kind, language }) {
    try {
      const rows = await _sbGet("extras",
        `lesson_id=eq.${lessonId}&kind=eq.${encodeURIComponent(kind)}&language=eq.${language}&limit=1`
      );
      return rows.length > 0 ? rows[0].content_json : null;
    } catch {
      return null;
    }
  },

  async save({ lessonId, kind, language, content, provider, model }) {
    try {
      await _sbPost("extras", {
        lesson_id: lessonId,
        kind,
        language: language || "sv",
        content_json: content,
        provider: provider || null,
        model: model || null,
      });
    } catch (e) {
      console.warn("extrasAPI.save failed", e);
    }
  },
};

// ---- qualityAPI ----
window.qualityAPI = {
  async rate({ lessonId, schoolId, rating, notes }) {
    await _sbPost("quality_ratings", {
      lesson_id: lessonId,
      school_id: schoolId || null,
      rating,
      notes: notes || null,
    });
  },

  async topRated() {
    // Fetch active lessons with avg rating via a view-style query
    // Using a simple join workaround via separate calls
    const lessons = await _sbGet("lessons", "status=eq.active&order=created_at.desc");
    const ratings = await _sbGet("quality_ratings", "select=lesson_id,rating");
    const ratingMap = {};
    for (const r of ratings) {
      if (!ratingMap[r.lesson_id]) ratingMap[r.lesson_id] = [];
      ratingMap[r.lesson_id].push(r.rating);
    }
    return lessons
      .map(l => {
        const rs = ratingMap[l.lesson_id] || [];
        const avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
        return { ...l, lesson: l.lesson_json, avg_rating: avg, rating_count: rs.length };
      })
      .sort((a, b) => (b.avg_rating ?? -1) - (a.avg_rating ?? -1));
  },
};
