/* =============================================================
   store.js - 진도 저장과 SRS 간격 계산
   localStorage 키 'suneung_munhak_progress_v1'
   ============================================================= */

(function (root) {
  "use strict";

  const STORAGE_KEY = "suneung_munhak_progress_v1";
  const LEGACY_KEY  = "suneung_munhak_progress_v0";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_INTERVAL = { mastered: 7, studying: 2, review: 0 };

  function load() {
    let data = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) { data = {}; }

    // v1 -> v2 마이그레이션 (한 번만)
    try {
      if (Object.keys(data).length === 0) {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const old = JSON.parse(legacy);
          for (const id in old) {
            data[id] = {
              lastStep: 3,
              eval: old[id].eval || null,
              evalAt: old[id].evalAt || Date.now(),
              history: old[id].eval ? [{ at: old[id].evalAt || Date.now(), eval: old[id].eval }] : [],
              examScore: {}
            };
          }
          save(data);
        }
      }
    } catch (e) { /* ignore */ }

    return data;
  }

  let _quotaWarned = false;
  function save(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      // quota 초과 / 디스크 가득 — 한 번만 사용자에게 안내
      const isQuota = e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014);
      if (isQuota && !_quotaWarned) {
        _quotaWarned = true;
        try {
          const banner = document.createElement("div");
          banner.setAttribute("role", "alert");
          banner.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#a83a4a;color:#fff;padding:12px 18px;font:600 13px Pretendard,sans-serif;border-radius:4px;box-shadow:0 4px 18px rgba(0,0,0,0.25);z-index:9999;max-width:90vw;";
          banner.textContent = "⚠ 저장 공간이 부족해 진도 저장에 실패했어요. 브라우저 데이터를 정리해 주세요.";
          document.body.appendChild(banner);
          setTimeout(() => banner.remove(), 6000);
        } catch (_) {}
      }
    }
  }

  function getEntry(progress, id) {
    return progress[id] || null;
  }

  function ensureEntry(progress, id) {
    if (!progress[id]) {
      progress[id] = {
        lastStep: 0, eval: null, evalAt: 0,
        history: [], examScore: {}
      };
    }
    return progress[id];
  }

  function getStatus(progress, id, intervals, now) {
    now = now || Date.now();
    intervals = intervals || DEFAULT_INTERVAL;
    const p = progress[id];
    if (!p || !p.eval) {
      if (p && p.lastStep > 0) return "studying";
      return "untouched";
    }
    if (p.eval === "review") return "review";
    const days = intervals[p.eval] != null ? intervals[p.eval] : DEFAULT_INTERVAL[p.eval];
    const due = p.evalAt + days * DAY_MS;
    if (now > due) return "review";
    return p.eval; // mastered or studying
  }

  function statusLabel(s) {
    if (s === "untouched") return "미학습";
    if (s === "studying")  return "학습 중";
    if (s === "mastered")  return "이해 완료";
    if (s === "review")    return "복습 권장";
    return "";
  }

  function recordStep(progress, id, step) {
    const e = ensureEntry(progress, id);
    if (step > e.lastStep) e.lastStep = step;
    save(progress);
  }

  function recordEval(progress, id, evalKey, now) {
    now = now || Date.now();
    const e = ensureEntry(progress, id);
    e.eval = evalKey;
    e.evalAt = now;
    e.lastStep = Math.max(e.lastStep, 3);
    e.history = e.history || [];
    e.history.push({ at: now, eval: evalKey });
    save(progress);
  }

  function recordExam(progress, id, qid, result) {
    const e = ensureEntry(progress, id);
    e.examScore = e.examScore || {};
    e.examScore[`${id}::${qid}`] = result;
    save(progress);
  }

  function saveRecallNote(progress, id, note) {
    const e = ensureEntry(progress, id);
    e.recallNote = note || "";
    e.recallAt = Date.now();
    save(progress);
  }

  // ---- 3분류 학습 상태 (자동 + 수동 override) ----
  // 값: "completed" | "studying" | "untouched"
  function getStatus3(progress, id, intervals, now) {
    const p = progress[id];
    if (p && p.userStatus) return p.userStatus;        // 수동 지정이 있으면 우선
    const s = getStatus(progress, id, intervals, now); // 없으면 자동 판정
    if (s === "mastered")  return "completed";
    if (s === "untouched") return "untouched";
    return "studying";                                  // studying / review
  }
  function statusLabel3(s) {
    if (s === "completed") return "학습 완료";
    if (s === "studying")  return "학습 중";
    return "미학습";
  }
  // status: "completed" | "studying" | "untouched" | null(자동으로 되돌림)
  function setUserStatus(progress, id, status) {
    const e = ensureEntry(progress, id);
    if (status) { e.userStatus = status; e.userStatusAt = Date.now(); }
    else { delete e.userStatus; delete e.userStatusAt; }
    save(progress);
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  root.Store = {
    STORAGE_KEY, DEFAULT_INTERVAL,
    load, save, getEntry, ensureEntry,
    getStatus, statusLabel,
    getStatus3, statusLabel3, setUserStatus,
    recordStep, recordEval, recordExam, saveRecallNote,
    reset
  };
})(window);
