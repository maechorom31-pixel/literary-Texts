/* =============================================================
   app.js - 라우팅과 화면 렌더링
   ============================================================= */

(function () {
  "use strict";

  const state = {
    index: null,
    progress: {},
    filter: "all",
    statusFilter: "all",
    scopeFilter: "all",
    currentId: null,
    currentPassage: null,
    currentSvg: null,
    step: 0
  };

  // --------- 유틸 ---------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const escapeHtml = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function fmtSource(src) {
    if (!src) return "";
    const parts = [];
    if (src.book)    parts.push(src.book);
    if (src.section) parts.push(src.section);
    if (src.page)    parts.push(src.page + "쪽");
    return parts.join(" · ");
  }

  function categoryColor(cat) {
    return (state.index && state.index.categories[cat] && state.index.categories[cat].color) || "var(--ink-2)";
  }
  function categoryLabel(cat) {
    return (state.index && state.index.categories[cat] && state.index.categories[cat].label) || cat;
  }

  // --------- 부트 ---------
  async function boot() {
    document.getElementById("app").innerHTML = renderShell();
    initTheme();

    state.progress = window.Store.load();

    // file:// 환경에서는 fetch가 막힘 → 로컬 서버 안내
    if (location.protocol === "file:") {
      $("#app").innerHTML = renderLocalServerNotice();
      return;
    }

    try {
      const res = await fetch("data/index.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("매니페스트 로드 실패 (HTTP " + res.status + ")");
      state.index = await res.json();
    } catch (err) {
      $("#app").innerHTML = `
        <div style="padding:40px;max-width:680px;margin:0 auto;color:var(--ink-2);line-height:1.7;">
          <h2 style="font-family:'Noto Serif KR',serif;color:var(--accent);margin:0 0 12px;">데이터 매니페스트를 불러오지 못했습니다</h2>
          <p>오류: <code style="background:var(--paper-2);padding:2px 6px;border-radius:2px;">${escapeHtml(err.message)}</code></p>
          <p>이 사이트는 정적 호스팅(예: GitHub Pages) 또는 로컬 HTTP 서버를 통해서만 동작합니다. 로컬에서 미리 보려면 폴더에서 다음 중 한 가지를 실행하세요.</p>
          <pre style="background:var(--paper-2);padding:14px 16px;border-left:3px solid var(--gold);font-size:13px;line-height:1.6;overflow:auto;">python3 -m http.server 8000</pre>
          <p>그런 다음 브라우저에서 <code>http://localhost:8000/</code> 주소로 접속하시면 됩니다.</p>
        </div>`;
      return;
    }

    renderHub();
    bindHubInteractions();
    bindGlobalKeys();
    handleHash(); // deep link
    window.addEventListener("hashchange", handleHash);
  }

  function renderLocalServerNotice() {
    return `
      <div style="padding:48px 24px;max-width:720px;margin:0 auto;color:var(--ink-2);line-height:1.75;">
        <div style="font-family:'Noto Serif KR',serif;font-weight:900;font-size:32px;color:var(--ink);letter-spacing:-0.02em;margin-bottom:6px;">수능특강 문학 도식 자율학습</div>
        <div style="font-size:13px;color:var(--ink-3);letter-spacing:0.04em;border-bottom:2px solid var(--ink);padding-bottom:18px;margin-bottom:24px;">로컬 실행 안내</div>

        <p>이 페이지를 <strong>파일에서 직접 더블클릭</strong>으로 열 경우, 보안 제약(<code>file://</code> 프로토콜)으로 데이터 파일을 불러올 수 없습니다. 다음 두 가지 중 한 가지 방법을 사용해 주세요.</p>

        <h3 style="font-family:'Noto Serif KR',serif;color:var(--ink);margin:24px 0 8px;font-size:16px;">방법 1 · macOS에서 한 번 실행</h3>
        <p>저장소 폴더 안의 <code>serve.command</code> 파일을 더블클릭하면 자동으로 로컬 서버가 뜨고 브라우저가 열립니다.</p>

        <h3 style="font-family:'Noto Serif KR',serif;color:var(--ink);margin:24px 0 8px;font-size:16px;">방법 2 · 터미널에서 직접 실행</h3>
        <p>저장소 폴더에서 다음 명령을 실행한 뒤, 브라우저에서 <code>http://localhost:8000/</code> 으로 접속합니다.</p>
        <pre style="background:var(--paper-2);padding:14px 18px;border-left:3px solid var(--gold);font-size:13px;line-height:1.6;overflow:auto;">python3 -m http.server 8000</pre>

        <h3 style="font-family:'Noto Serif KR',serif;color:var(--ink);margin:24px 0 8px;font-size:16px;">학생 배포 시</h3>
        <p>이 사이트를 GitHub Pages에 올리면 학생들은 일반 웹 주소로 바로 접속하므로 별도 절차가 필요 없습니다.</p>
      </div>
    `;
  }

  function renderShell() {
    return `
      <header class="masthead">
        <div class="masthead-top">
          <span>나주고등학교 · 자율학습</span>
          <span class="mono-num" id="todayLine"></span>
        </div>
        <h1 class="masthead-title">수능특강 문학 도식 자율학습</h1>
        <div class="masthead-sub">EBS 2027 수능특강 국어영역 문학 · 능동 회상과 분산 반복 원칙</div>
      </header>

      <div class="hub" id="hub">
        <div class="hub-actions">
          <button class="btn-dash" id="btnDash" type="button">📊 학습 대시보드</button>
          <span class="hub-actions-spacer"></span>
          <button class="btn-theme" id="btnTheme" type="button" title="다크 모드 토글">🌙</button>
        </div>
        <div class="hub-stats" id="hubStats"></div>
        <div class="hub-section-title">시험 범위</div>
        <div class="cat-filter" id="scopeFilter"></div>
        <div class="hub-section-title">학습 상태</div>
        <div class="cat-filter" id="statusFilter"></div>
        <div class="hub-section-title">갈래별 필터</div>
        <div class="cat-filter" id="catFilter"></div>
        <div class="hub-section-title">작품 목록</div>
        <div id="cardArea"></div>
        <div class="hub-footer">
          <p><strong>사용 안내</strong> · 카드를 누르면 학습 모드로 들어갑니다. 사전 예측 → 정독과 도식 확인 → 핵심 개념 회상 → 자기평가의 4단계로 진행됩니다. 자기평가 결과에 따라 다음 복습 시점이 결정됩니다.</p>
          <p><strong>진도 저장</strong> · 모든 학습 기록은 사용 중인 브라우저에 저장됩니다. 브라우저 데이터를 삭제하면 진도가 초기화됩니다.</p>
        </div>
      </div>

      <div class="dashboard" id="dashboard">
        <button class="btn-back" id="btnDashBack" type="button">← 홈으로</button>
        <div class="dashboard-header">
          <span class="dashboard-title">학습 대시보드</span>
          <span class="dashboard-sub" id="dashUpdatedAt"></span>
        </div>
        <div id="dashContent"></div>
      </div>

      <div class="dashboard" id="gallery">
        <button class="btn-back" id="btnGalleryBack" type="button">← 홈으로</button>
        <div class="dashboard-header">
          <span class="dashboard-title">🖼 도식 갤러리</span>
          <span class="dashboard-sub">72편 전체 시각 자료</span>
        </div>
        <div class="cat-filter" id="galleryFilter" style="margin-bottom:18px;"></div>
        <div id="galleryContent"></div>
      </div>

      <div class="study" id="study" aria-hidden="true">
        <header class="study-header">
          <button class="btn-back" id="btnBack">← 목록</button>
          <div class="study-meta">
            <div class="study-cat" id="studyCat"></div>
            <div class="study-title" id="studyTitle"></div>
            <div class="study-source" id="studySource"></div>
          </div>
          <div class="step-indicator">
            <span id="stepText">1 / 4</span>
            <span class="step-dots" id="stepDots"></span>
          </div>
        </header>
        <div class="study-body">
          <div class="study-stage" id="studyStage"></div>
        </div>
        <aside class="study-nav" id="studyNav" aria-label="작품 바로 이동"></aside>
        <footer class="study-footer">
          <button class="btn" id="btnPrev">이전</button>
          <button class="btn btn-primary" id="btnNext">다음 단계</button>
          <span class="btn-spacer"></span>
          <span class="kbd-hint"><span class="kbd">←</span> <span class="kbd">→</span> 이동 &nbsp; <span class="kbd">Esc</span> 나가기</span>
        </footer>
      </div>

      <div class="lightbox" id="lightbox" aria-hidden="true">
        <div class="lightbox-inner" id="lightboxInner"></div>
      </div>

      <div class="gallery-viewer" id="galleryViewer" aria-hidden="true">
        <div class="gv-card">
          <div class="gv-head">
            <span class="gv-cat" id="gvCat"></span>
            <span class="gv-title" id="gvTitle"></span>
            <span class="gv-count" id="gvCount"></span>
          </div>
          <div class="gv-stage" id="gvStage"></div>
          <div class="gv-controls">
            <button class="gv-btn" id="gvPrev" type="button">← 이전</button>
            <button class="gv-btn gv-btn-primary" id="gvStudy" type="button">📖 이 글 학습하기</button>
            <button class="gv-btn" id="gvNext" type="button">다음 →</button>
            <span class="gv-spacer"></span>
            <button class="gv-btn gv-btn-close" id="gvClose" type="button">✕ 닫기 (Esc)</button>
          </div>
        </div>
      </div>
    `;
  }

  // --------- HUB ---------
  function renderHub() {
    const today = new Date();
    $("#todayLine").textContent = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,"0")}.${String(today.getDate()).padStart(2,"0")}`;

    // 통계
    const items = state.index.passages;
    let started = 0, mastered = 0, reviewN = 0;
    items.forEach(it => {
      const s = window.Store.getStatus(state.progress, it.id);
      if (s !== "untouched") started++;
      if (s === "mastered") mastered++;
      if (s === "review")   reviewN++;
    });
    $("#hubStats").innerHTML = `
      <div class="hub-stat"><div class="hub-stat-label">전체 지문</div><div><span class="hub-stat-value mono-num">${items.length}</span><span class="hub-stat-suffix"> 편</span></div></div>
      <div class="hub-stat"><div class="hub-stat-label">학습 시작</div><div><span class="hub-stat-value mono-num">${started}</span><span class="hub-stat-suffix"> 편</span></div></div>
      <div class="hub-stat"><div class="hub-stat-label">이해 완료</div><div><span class="hub-stat-value mono-num">${mastered}</span><span class="hub-stat-suffix"> 편</span></div></div>
      <div class="hub-stat"><div class="hub-stat-label">복습 권장</div><div><span class="hub-stat-value mono-num">${reviewN}</span><span class="hub-stat-suffix"> 편</span></div></div>
    `;

    // 시험 범위 필터 (기말고사 = 시험범위 태그)
    const scf = state.scopeFilter || "all";
    const inScope = (it) => (it.tags || []).includes("시험범위");
    const scCounts = { all: items.length, exam: items.filter(inScope).length };
    $("#scopeFilter").innerHTML = [
      ["all", "전체"], ["exam", "기말고사 범위"]
    ].map(([k, label]) => `<button class="cat-pill ${scf === k ? "active" : ""}" data-scope="${k}">${label} (${scCounts[k]})</button>`).join("");

    // 범위 적용 후 기준 집합
    const base = scf === "exam" ? items.filter(inScope) : items;

    // 학습 상태 필터 (3분류: 학습 완료 / 학습 중 / 미학습 — 자동+수동)
    const sf = state.statusFilter || "all";
    const st3 = (it) => window.Store.getStatus3(state.progress, it.id);
    const sCounts = {
      all: base.length,
      completed: base.filter(it => st3(it) === "completed").length,
      studying:  base.filter(it => st3(it) === "studying").length,
      untouched: base.filter(it => st3(it) === "untouched").length
    };
    $("#statusFilter").innerHTML = [
      ["all", "전체"], ["completed", "학습 완료"], ["studying", "학습 중"], ["untouched", "미학습"]
    ].map(([k, label]) => `<button class="cat-pill ${sf === k ? "active" : ""}" data-status="${k}">${label} (${sCounts[k]})</button>`).join("");

    // 갈래 필터
    const cats = state.index.categories;
    const catKeys = Object.keys(cats).sort((a,b) => (cats[a].order||0) - (cats[b].order||0));
    const counts = { all: base.length };
    catKeys.forEach(k => counts[k] = base.filter(it => it.category === k).length);
    $("#catFilter").innerHTML =
      `<button class="cat-pill ${state.filter === "all" ? "active" : ""}" data-cat="all">전체 (${counts.all})</button>` +
      catKeys.map(k => `<button class="cat-pill ${state.filter === k ? "active" : ""}" data-cat="${k}">${escapeHtml(cats[k].label)} (${counts[k]})</button>`).join("");

    // 카드 (범위 + 갈래 + 상태 동시 적용)
    let filtered = state.filter === "all" ? base : base.filter(it => it.category === state.filter);
    if (sf !== "all") filtered = filtered.filter(it => st3(it) === sf);
    if (!filtered.length) {
      $("#cardArea").innerHTML = `<div class="hub-empty">조건에 맞는 작품이 없습니다.</div>`;
    } else {
      $("#cardArea").innerHTML = '<div class="card-grid">' +
        filtered.map(renderCard).join("") + '</div>';
    }
  }

  function renderCard(it) {
    const s3 = window.Store.getStatus3(state.progress, it.id);
    const cat = state.index.categories[it.category] || {};
    return `
      <button class="card" data-id="${escapeHtml(it.id)}">
        <div class="card-num serif">No. ${String(it.order || "").padStart(2, "0")}</div>
        <div class="card-cat" style="background:${cat.color || "var(--ink-2)"}">${escapeHtml(cat.label || it.category)}</div>
        <div class="card-title">${escapeHtml(it.title)}</div>
        <div class="card-sub">${escapeHtml(it.subtitle || "")}</div>
        <span class="card-status s3-${s3}" data-status-cycle="${escapeHtml(it.id)}" title="클릭해 학습 상태 변경">
          <span class="status-dot s3dot-${s3}"></span>
          <span class="card-status-label">${escapeHtml(window.Store.statusLabel3(s3))}</span>
        </span>
      </button>
    `;
  }

  function bindHubInteractions() {
    document.addEventListener("click", (e) => {
      // 확대 버튼은 가장 먼저 잡아서 라이트박스 열기
      const zoom = e.target.closest("#diagramZoom");
      if (zoom) {
        e.preventDefault(); e.stopPropagation();
        openLightbox();
        return;
      }
      // 대시보드/갤러리 진입·복귀
      if (e.target.closest("#btnDash"))         { openDashboard();  return; }
      if (e.target.closest("#btnDashBack"))     { closeDashboard(); return; }
      if (e.target.closest("#btnGallery"))      { openGallery();    return; }
      if (e.target.closest("#btnGalleryBack"))  { closeGallery();   return; }
      if (e.target.closest("#btnTheme"))        { toggleTheme();    return; }
      // 갤러리 도식 클릭 → 도식 라이트박스 (학습 페이지로는 가지 않음)
      const galleryItem = e.target.closest(".gallery-item");
      if (galleryItem && galleryItem.dataset.id) {
        openGalleryViewer(galleryItem.dataset.id);
        return;
      }
      // 갤러리 라이트박스 컨트롤
      if (e.target.closest("#gvNext"))      { gvNav(1);             return; }
      if (e.target.closest("#gvPrev"))      { gvNav(-1);            return; }
      if (e.target.closest("#gvClose"))     { closeGalleryViewer(); return; }
      if (e.target.closest("#gvStudy"))     {
        const id = state.galleryViewerId;
        closeGalleryViewer(); closeGallery();
        if (id) openStudy(id);
        return;
      }
      if (e.target.closest("#galleryViewer") && !e.target.closest(".gv-card")) {
        closeGalleryViewer();
        return;
      }
      // 대시보드 안의 항목 클릭
      const dueItem = e.target.closest(".due-item, .note-item, .wrong-item");
      if (dueItem && dueItem.dataset.id) {
        closeDashboard(); closeGallery();
        openStudy(dueItem.dataset.id);
        return;
      }
      // 갤러리 카테고리 칩
      const gpill = e.target.closest("#galleryFilter .cat-pill");
      if (gpill) {
        state.galleryFilter = gpill.dataset.cat;
        renderGallery();
        return;
      }
      const scpill = e.target.closest("#scopeFilter .cat-pill");
      if (scpill) {
        state.scopeFilter = scpill.dataset.scope;
        renderHub();
        return;
      }
      const spill = e.target.closest("#statusFilter .cat-pill");
      if (spill) {
        state.statusFilter = spill.dataset.status;
        renderHub();
        return;
      }
      const pill = e.target.closest(".cat-pill");
      if (pill) {
        state.filter = pill.dataset.cat;
        renderHub();
        return;
      }
      // 학습 상태 수동 변경 — 카드의 상태 배지 클릭 시 순환
      const cyc = e.target.closest("[data-status-cycle]");
      if (cyc) {
        e.preventDefault(); e.stopPropagation();
        const id = cyc.getAttribute("data-status-cycle");
        const order = ["untouched", "studying", "completed"];
        const cur = window.Store.getStatus3(state.progress, id);
        const next = order[(order.indexOf(cur) + 1) % order.length];
        window.Store.setUserStatus(state.progress, id, next);
        renderHub();
        return;
      }
      // 학습 화면의 상태 버튼(미학습/학습 중/학습 완료)
      const setBtn = e.target.closest("[data-set-status]");
      if (setBtn) {
        const id = setBtn.getAttribute("data-id");
        const status = setBtn.getAttribute("data-set-status");
        window.Store.setUserStatus(state.progress, id, status);
        document.querySelectorAll("#unitStatus .seg-btn").forEach(b =>
          b.classList.toggle("active", b.getAttribute("data-set-status") === status));
        renderStudyNav(state.currentId);
        return;
      }
      const navItem = e.target.closest(".study-nav-item");
      if (navItem) {
        if (navItem.dataset.id !== state.currentId) openStudy(navItem.dataset.id);
        return;
      }
      const card = e.target.closest(".card");
      if (card) { openStudy(card.dataset.id); return; }
      const back = e.target.closest("#btnBack");
      if (back) { closeStudy(); return; }
      const lb = e.target.closest("#lightbox");
      if (lb && !e.target.closest("#lightboxInner")) closeLightbox();
    });
  }

  // --------- STUDY ---------
  async function openStudy(id) {
    // 잘못된 id 방어 — index 에 없으면 학습 모드 진입 자체를 차단
    const idxItem = state.index && state.index.passages.find(p => p.id === id);
    if (!idxItem) {
      // 해시 청소 후 허브로 복귀
      history.replaceState(null, "", location.pathname + location.search);
      return false;
    }
    let passage = state.currentPassage;
    if (!passage || passage.id !== id) {
      try {
        const res = await fetch(`data/passages/${id}.json`, { cache: "no-cache" });
        if (!res.ok) throw new Error("지문 데이터 로드 실패: " + id);
        passage = await res.json();
      } catch (err) {
        // 인라인 에러 표시 + 자동 복귀
        state.currentPassage = null;
        const stage = document.getElementById("studyStage");
        if (stage) {
          stage.innerHTML = `
            <div style="padding:48px 24px;text-align:center;color:var(--ink-2);">
              <div style="font-family:'Noto Serif KR',serif;font-size:18px;color:var(--accent);margin-bottom:10px;">⚠ 지문을 불러오지 못했습니다</div>
              <div style="font-size:13px;line-height:1.7;color:var(--ink-3);margin-bottom:18px;">${escapeHtml(err.message || "")}</div>
              <button class="btn" type="button" id="errBackBtn">← 목록으로 돌아가기</button>
            </div>`;
          const btn = document.getElementById("errBackBtn");
          if (btn) btn.addEventListener("click", closeStudy, { once: true });
        }
        return false;
      }
    }
    state.currentId = id;
    state.currentPassage = passage;
    state.currentSvg = null;
    state.revealHigh = 0;
    state.step = 0;

    $("#hub").style.display = "none";
    $("#study").classList.add("active");
    $("#study").setAttribute("aria-hidden", "false");

    const cat = state.index.categories[passage.category] || {};
    const studyCatEl = $("#studyCat");
    studyCatEl.textContent = cat.label || passage.category;
    studyCatEl.style.color = cat.color || "var(--ink-2)";
    $("#studyTitle").textContent = passage.title;
    $("#studySource").textContent = fmtSource(passage.source);

    if (location.hash !== `#/p/${id}/0`) {
      history.replaceState(null, "", `#/p/${id}/0`);
    }
    renderStudyNav(id);
    renderStudy();
    bindStudyFooter();
    return true;
  }

  // 우측 작품 이동 패널 (데스크톱·태블릿 전용, CSS 로 폭에 따라 노출)
  function renderStudyNav(currentId) {
    const nav = document.getElementById("studyNav");
    if (!nav || !state.index) return;
    const cats = state.index.categories;
    const inScope = (it) => (it.tags || []).includes("시험범위");
    let items = state.index.passages.slice();
    if (state.scopeFilter === "exam") items = items.filter(inScope);
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    // 갈래별 그룹
    const groups = {};
    items.forEach(it => (groups[it.category] = groups[it.category] || []).push(it));
    const catKeys = Object.keys(cats).sort((a, b) => (cats[a].order || 0) - (cats[b].order || 0));
    const body = catKeys.filter(k => groups[k]).map(k => {
      const lis = groups[k].map(it => {
        const st = window.Store.getStatus3(state.progress, it.id);
        const dot = st === "completed" ? "●" : st === "studying" ? "◐" : "·";
        const active = it.id === currentId ? " active" : "";
        return `<button class="study-nav-item${active}" data-id="${escapeHtml(it.id)}" type="button">
          <span class="sn-dot sn-${st}">${dot}</span>
          <span class="sn-title">${escapeHtml(it.title)}</span></button>`;
      }).join("");
      return `<div class="study-nav-group">
        <div class="study-nav-cat" style="color:${cats[k].color || "var(--ink-2)"}">${escapeHtml(cats[k].label)}</div>
        ${lis}</div>`;
    }).join("");
    nav.innerHTML = `<div class="study-nav-head">작품 이동</div><div class="study-nav-list">${body}</div>`;
    // 현재 작품으로 스크롤
    const cur = nav.querySelector(".study-nav-item.active");
    if (cur) cur.scrollIntoView({ block: "center" });
  }

  function closeStudy() {
    $("#study").classList.remove("active");
    $("#study").setAttribute("aria-hidden", "true");
    $("#hub").style.display = "";
    state.currentId = null;
    state.currentPassage = null;
    state.currentSvg = null;
    state.revealHigh = 0;
    // URL 의 # 잔재 제거
    history.replaceState(null, "", location.pathname + location.search);
    renderHub();
  }

  function bindStudyFooter() {
    // 새 2부 형식: 단계 네비게이션 미사용 → 푸터 숨김
    const ft = document.querySelector(".study-footer");
    if (ft) ft.style.display = "none";
  }

  function renderStudy() {
    const it = state.currentPassage;
    const si = document.querySelector(".step-indicator");
    if (si) si.style.display = "none";
    const ft = document.querySelector(".study-footer");
    if (ft) ft.style.display = "none";
    $("#studyTitle").textContent = it.author ? `${it.title} · ${it.author}` : it.title;

    const stage = $("#studyStage");
    stage.innerHTML = renderUnit(it);
    bindUnit(it);
    document.querySelector(".study-body").scrollTop = 0;
    window.Store.recordStep(state.progress, state.currentId, 0);
  }

  function goStep() { /* no-op (2부 형식) */ }

  // O/X 선지 한 항목
  function renderOXItem(j, idx, prefix) {
    const trap = j.trap ? `<span class="trap-chip">함정 · ${escapeHtml(j.trap)}</span>` : "";
    return `
      <div class="judge-block" data-jid="${prefix}-${idx}" data-correct="${j.correct ? "1" : "0"}">
        <div class="judge-statement">${escapeHtml(j.statement)}</div>
        <div class="judge-btns">
          <button class="judge-btn" type="button" data-pick="1">◯ 옳다</button>
          <button class="judge-btn" type="button" data-pick="0">✕ 틀리다</button>
        </div>
        <div class="judge-why">
          <span class="judge-verdict"></span>${trap}
          ${j.why ? `<div class="judge-why-text">${escapeHtml(j.why)}</div>` : ""}
        </div>
      </div>`;
  }

  function renderUnit(it) {
    const focus = (it.focusPoints || []).map((c, i) => `
      <div class="concept-card" data-idx="${i}">
        <div class="concept-key">
          ${c.chip ? `<span class="chip">${escapeHtml(c.chip)}</span>` : ""}
          <span class="focus-head">${escapeHtml(c.head || "")}</span>
          <span class="concept-toggle">눌러서 확인 ▾</span>
        </div>
        <div class="concept-val">${escapeHtml(c.body || "")}</div>
      </div>`).join("");

    const gichul = (it.gichul || []).map((g, gi) => {
      const bogi = g.bogi ? `
        <div class="bogi-box">
          <div class="bogi-label">&lt;보기&gt; 읽어보기</div>
          <div class="bogi-text">${escapeHtml(g.bogi)}</div>
        </div>` : "";
      const items = (g.items || []).map((j, i) => renderOXItem(j, i, `gi${gi}`)).join("");
      return `
        <div class="gichul-block">
          <div class="gichul-exam">📜 ${escapeHtml(g.exam || "기출")}</div>
          ${bogi}${items}
        </div>`;
    }).join("");

    const judges = (it.judgments || []).map((j, i) => renderOXItem(j, i, "jb")).join("");

    const cruxItems = (it.crux || []).map(c =>
      `<li class="crux-item"><span class="crux-axis">${escapeHtml(c.axis || "")}</span><span class="crux-point">${escapeHtml(c.point || "")}</span></li>`).join("");
    const cruxBox = cruxItems ? `
      <div class="crux-box">
        <div class="crux-title">🎯 크럭스 · 이 작품의 급소</div>
        <p class="crux-hint">이 작품의 이해를 가르는 결정적 지점입니다. 아래 O/X는 이 급소에서 출제됩니다.</p>
        <ul class="crux-list">${cruxItems}</ul>
      </div>` : "";

    const s3 = window.Store.getStatus3(state.progress, it.id);
    const segBtn = (k, label) => `<button class="seg-btn ${s3 === k ? "active" : ""}" data-set-status="${k}" data-id="${escapeHtml(it.id)}" type="button">${label}</button>`;
    const statusBar = `
      <div class="unit-status" id="unitStatus">
        <span class="unit-status-label">학습 상태</span>
        <div class="seg">${segBtn("untouched", "미학습")}${segBtn("studying", "학습 중")}${segBtn("completed", "학습 완료")}</div>
      </div>`;

    return `
      <div class="unit-progress" id="unitProgress">
        <div class="unit-progress-track"><div class="unit-progress-fill" id="unitProgressFill"></div></div>
        <span class="unit-progress-label" id="unitProgressLabel">진행 0%</span>
      </div>
      ${statusBar}
      ${it.oneLine ? `<div class="oneline-banner">${escapeHtml(it.oneLine)}</div>` : ""}
      ${cruxBox}

      <div class="unit-section">
        <div class="unit-section-title">Ⅰ. 작품 안내·이해</div>
        <p class="unit-hint">핵심은 ‘생각 → 눌러 확인’. 카드를 눌러 펼쳐 보세요.</p>
        <div class="concept-list">${focus}</div>
      </div>

      ${gichul ? `
      <div class="unit-section">
        <div class="unit-section-title">🔎 기출의 시선</div>
        <p class="unit-hint">실제 기출이 이 작품을 본 관점입니다. &lt;보기&gt;는 읽고, 선지는 ◯/✕ 로 판단하세요.</p>
        ${gichul}
      </div>` : ""}

      <div class="unit-section">
        <div class="unit-section-title">Ⅱ. 선지 판단 (O/X) <span class="ox-score" id="oxScore"></span></div>
        <p class="unit-hint">먼저 ◯/✕ 를 누른 뒤 근거·함정을 확인하세요.</p>
        ${judges}
      </div>

      <div class="unit-section">${renderEval(it)}</div>`;
  }

  function bindUnit(it) {
    const cards  = $$(".concept-card");
    const blocks = $$(".judge-block");
    const total  = cards.length + blocks.length;
    const seen   = new Set();
    let oxDone = 0, oxRight = 0;
    const fill = $("#unitProgressFill"), plabel = $("#unitProgressLabel"), scoreEl = $("#oxScore");

    const update = () => {
      const done = seen.size + oxDone;
      const pct  = total ? Math.round(done / total * 100) : 0;
      if (fill)   fill.style.width = pct + "%";
      if (plabel) plabel.textContent = pct >= 100 ? "학습 완료 ✓" : `진행 ${pct}%`;
      if (plabel) plabel.classList.toggle("done", pct >= 100);
      if (scoreEl) {
        scoreEl.textContent = oxDone === 0
          ? `총 ${blocks.length}문항`
          : `${oxRight} / ${oxDone} 정답 (전체 ${blocks.length})`;
        scoreEl.classList.toggle("done", oxDone === blocks.length && blocks.length > 0);
      }
    };
    update();

    cards.forEach((c, i) => {
      c.addEventListener("click", () => {
        c.classList.toggle("revealed");
        const t = c.querySelector(".concept-toggle");
        if (t) t.textContent = c.classList.contains("revealed") ? "확인 완료" : "눌러서 확인 ▾";
        if (c.classList.contains("revealed")) { seen.add(i); update(); }
      });
    });

    blocks.forEach(block => {
      const jid = block.dataset.jid;
      const correct = block.dataset.correct === "1";
      const verdict = block.querySelector(".judge-verdict");
      $$(".judge-btn", block).forEach(btn => {
        btn.addEventListener("click", () => {
          if (block.classList.contains("answered")) return;
          const pick = btn.dataset.pick === "1";
          const right = (pick === correct);
          block.classList.add("answered", "revealed");
          btn.classList.add(right ? "picked-right" : "picked-wrong");
          if (verdict) {
            verdict.textContent = correct ? "◯ 옳은 선지입니다" : "✕ 틀린 선지입니다";
            verdict.classList.add(correct ? "is-correct" : "is-incorrect");
          }
          oxDone++; if (right) oxRight++;
          update();
          window.Store.recordExam(state.progress, state.currentId, jid, right ? "correct" : "wrong");
        });
      });
    });
    bindEval(it);
  }

  // --------- Step 1: 예측 ---------
  function renderPredict(it) {
    const pr = it.predict || {};
    return `
      <div>
        <div class="stage-label">Step 1 · 사전 예측</div>
        <h2 class="predict-question serif">${escapeHtml(pr.question || "")}</h2>
        <div class="predict-hint">
          <div class="predict-hint-title">생각해 보기</div>
          ${escapeHtml(pr.hint || "도식을 보기 전에 잠깐 멈춰서, 위 질문에 대해 머릿속에 가설을 세워 봅시다.")}
        </div>
        ${pr.tip ? `<p class="predict-tip">${escapeHtml(pr.tip)}</p>` : ""}
      </div>
    `;
  }

  // --------- Step 2: 정독 + 도식 ---------
  function renderPassageStage(it) {
    const paragraphsHtml = (it.passage.paragraphs || []).map((p, i) => {
      const text = applyVocab(p.text, p.vocab);
      const sumPrompt = escapeHtml(p.summaryPrompt || "이 문단을 한 줄로 요약해 보세요.");
      const sumAnswer = escapeHtml(p.summaryAnswer || "");
      return `
        <article class="paragraph" data-pi="${i}" data-pid="${escapeHtml(p.id)}">
          ${p.role ? `<div class="paragraph-role">단락 ${i+1} · ${escapeHtml(p.role)}</div>` : ""}
          <div class="paragraph-text">${text}</div>
          ${sumAnswer ? `
            <div class="summary-block">
              <div class="summary-prompt">한 줄 요약</div>
              <div class="summary-text">${sumPrompt}</div>
              <button class="summary-toggle" type="button">정답 확인</button>
              <div class="summary-answer">${sumAnswer}</div>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");

    return `
      <div>
        <div class="stage-label">Step 2 · 정독과 도식</div>
        <div class="passage-grid">
          <div>
            <p style="font-size:13px;color:var(--ink-3);line-height:1.6;margin:0 0 14px;max-width:640px;">단락을 차례로 읽고, 각 단락 끝에서 한 줄로 요약을 떠올려 보세요. 어휘에 점선이 있으면 가볍게 눌러 정의를 확인할 수 있습니다. 단락마다 우측 도식이 한 단계씩 채워집니다.</p>
            <div id="paragraphs">${paragraphsHtml}</div>
          </div>
          <div>
            <div class="diagram-pane" id="diagramPane">
              <button class="diagram-zoom" type="button" id="diagramZoom">확대</button>
              <div id="diagramHost" style="aspect-ratio: 1200/760; background: white;"></div>
              ${it.diagram && it.diagram.caption ? `<div class="diagram-caption">${escapeHtml(it.diagram.caption)}</div>` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function applyVocab(text, vocab) {
    if (!vocab || !vocab.length) return escapeHtml(text);
    // 긴 용어부터 매칭해 부분 매칭 충돌 회피
    const list = vocab.slice().sort((a,b) => b.term.length - a.term.length);
    // 토큰 단위로 처리 — 정규식 lookbehind 미사용 (Safari 구버전 호환)
    // 1) 원문을 escape, 2) 각 용어의 첫 등장만 span 으로 교체, 이미 처리된 영역은 PLACEHOLDER 로 보호
    let safe = escapeHtml(text);
    const placeholders = [];
    list.forEach(v => {
      const term = escapeHtml(v.term);
      const def  = escapeHtml(v.def);
      if (!term) return;
      const idx = safe.indexOf(term);
      if (idx === -1) return;
      const ph = `\x00VOCAB${placeholders.length}\x00`;
      placeholders.push(`<span class="vocab" data-def="${def}" tabindex="0">${term}<span class="vocab-tip">${def}</span></span>`);
      safe = safe.slice(0, idx) + ph + safe.slice(idx + term.length);
    });
    placeholders.forEach((html, i) => {
      safe = safe.replace(`\x00VOCAB${i}\x00`, html);
    });
    return safe;
  }

  async function bindPassageStage(it) {
    // Diagram inject
    const host = $("#diagramHost");
    if (it.diagram && it.diagram.file) {
      // 재시도 콜백: 다시 시도 성공 시 currentSvg 갱신
      const onLoaded = (svg) => {
        if (svg) {
          state.currentSvg = svg;
          window.Diagram.bindLightbox(svg, openLightbox);
        }
      };
      try {
        const svg = await window.Diagram.inject(host, it.diagram.file, onLoaded);
        state.currentSvg = svg;
        window.Diagram.bindLightbox(svg, openLightbox);
        // initial reveal: paragraph 1's reveals
        applyParagraphReveal(it, 0);
        // observe paragraph visibility - reveal as user scrolls/reads
        const paragraphs = $$("#paragraphs .paragraph");
        const io = new IntersectionObserver((entries) => {
          entries.forEach(en => {
            if (en.isIntersecting) {
              const i = parseInt(en.target.dataset.pi, 10);
              applyParagraphReveal(it, i);
            }
          });
        }, { threshold: 0.5 });
        paragraphs.forEach(p => io.observe(p));
      } catch (err) {
        host.innerHTML = `<div style="padding:24px;color:var(--accent);font-size:13px;">${escapeHtml(err.message)}</div>`;
      }
    }

    // 어휘 hover/tap
    document.addEventListener("click", vocabClickHandler, { once: false });

    // 한 줄 요약 toggle
    $$("#paragraphs .summary-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".summary-block").classList.add("revealed");
      });
    });

    // 확대 (버튼 + 다이어그램 호스트 클릭 모두 트리거)
    const zoomBtn = $("#diagramZoom");
    if (zoomBtn) {
      zoomBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openLightbox();
      });
    }
  }

  function applyParagraphReveal(it, paraIdx) {
    if (!state.currentSvg) return;
    const paragraphs = it.passage.paragraphs || [];
    // 누적 reveal: 0..paraIdx 단락이 켜는 모든 step
    const stepIds = new Set();
    for (let i = 0; i <= paraIdx; i++) {
      (paragraphs[i].revealsDiagram || []).forEach(id => stepIds.add(id));
    }
    // step 번호로 변환
    const steps = (it.diagram.reveal && it.diagram.reveal.steps) || [];
    let maxStep = 0;
    steps.forEach((s, i) => {
      if (stepIds.has(s.id)) maxStep = Math.max(maxStep, i + 1);
    });
    // 한 번 켜진 step은 사용자가 위로 스크롤해도 다시 끄지 않음 (누적 보존)
    state.revealHigh = Math.max(state.revealHigh || 0, maxStep);
    window.Diagram.setRevealStep(state.currentSvg, state.revealHigh);
  }

  function vocabClickHandler(e) {
    const vc = e.target.closest(".vocab");
    if (!vc) {
      // close any open
      $$(".vocab.show").forEach(v => v.classList.remove("show"));
      return;
    }
    e.preventDefault();
    $$(".vocab.show").forEach(v => { if (v !== vc) v.classList.remove("show"); });
    vc.classList.toggle("show");
  }

  // --------- Step 3: 회상 + 객관식 ---------
  function renderRecall(it) {
    const tierClass = (t) => t === 2 ? "tier-2" : (t === 3 ? "tier-3" : "tier-1");
    const concepts = (it.concepts || []).map((c, i) => `
      <div class="concept-card" data-idx="${i}">
        <div class="concept-key">
          <span class="concept-num">${String(i+1).padStart(2,"0")}</span>
          <span>${escapeHtml(c.k)}</span>
          ${c.src ? `<span class="concept-src ${tierClass(c.tier)}">${escapeHtml(c.src)}</span>` : ""}
          <span class="concept-toggle">눌러서 확인 ▾</span>
        </div>
        <div class="concept-val">${escapeHtml(c.v)}</div>
      </div>
    `).join("");

    const examHtml = (it.examPoints || [])
      .filter(q => q.type === "mcq")
      .map(q => `
        <div class="exam-block" data-qid="${escapeHtml(q.id)}" data-answer="${q.answer}">
          <div class="exam-stem">[문제] ${escapeHtml(q.stem)}</div>
          <div class="exam-choices">
            ${(q.choices||[]).map((ch, i) => `
              <button class="exam-choice" type="button" data-idx="${i}">
                <span class="num">${"①②③④⑤".charAt(i) || (i+1)}</span>
                <span>${escapeHtml(ch)}</span>
              </button>
            `).join("")}
          </div>
          ${q.rationale ? `<div class="exam-rationale"><strong>해설</strong> · ${escapeHtml(q.rationale)}</div>` : ""}
        </div>
      `).join("");

    // O/X 선지 판단 — 새 문항을 풀지 않고, 이 작품 대상 선지의 정오를 스스로 판단
    const judges = it.judgments || [];
    const judgmentsHtml = judges.length ? `
      <div class="judge-wrap">
        <div class="judge-head">선지 판단 <span class="judge-head-sub">— 각 선지가 이 작품에 대해 <b>옳은지(◯)·틀린지(✕)</b> 먼저 판단한 뒤, 근거를 확인하세요</span></div>
        ${judges.map(j => `
          <div class="judge-block" data-jid="${escapeHtml(j.id)}" data-correct="${j.correct ? "1" : "0"}">
            ${j.target ? `<span class="judge-target">${escapeHtml(j.target)}</span>` : ""}
            <div class="judge-statement">${escapeHtml(j.statement)}</div>
            <div class="judge-btns">
              <button class="judge-btn" type="button" data-pick="1">◯ 옳다</button>
              <button class="judge-btn" type="button" data-pick="0">✕ 틀리다</button>
            </div>
            <div class="judge-why">
              <span class="judge-verdict"></span>
              ${j.why ? `<div class="judge-why-text"><strong>근거</strong> · ${escapeHtml(j.why)}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    ` : "";

    // 저장된 회상 메모 불러오기
    const prog = state.progress[state.currentId] || {};
    const savedNote = prog.recallNote || "";
    const savedAt = prog.recallAt || 0;
    const savedLabel = savedAt ? ` · 마지막 저장 ${new Date(savedAt).toLocaleString("ko-KR", {month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit"})}` : "";

    return `
      <div>
        <div class="stage-label">Step 3 · 핵심 개념 회상</div>
        <p class="recall-intro">아래 키워드만 보고 머릿속으로 설명을 떠올려 본 다음, 카드를 눌러 정답과 비교해 봅시다.</p>
        <div class="recall-note-block">
          <label class="recall-note-label" for="recallNote">내 회상 메모<span class="recall-note-meta">${savedLabel}<span id="recallNoteStatus"></span></span></label>
          <textarea class="recall-textarea" id="recallNote" placeholder="떠오른 핵심 개념·설명을 자유롭게 써 보세요. 자동 저장됩니다.">${escapeHtml(savedNote)}</textarea>
        </div>
        <div class="concept-list">${concepts}</div>
        ${judgmentsHtml}
        ${examHtml}
      </div>
    `;
  }

  function bindRecall(it) {
    // 회상 메모 자동 저장
    const noteEl = $("#recallNote");
    const statusEl = $("#recallNoteStatus");
    if (noteEl) {
      let saveTimer = null;
      noteEl.addEventListener("input", () => {
        if (statusEl) statusEl.textContent = " · 입력 중…";
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          window.Store.saveRecallNote(state.progress, state.currentId, noteEl.value);
          if (statusEl) {
            statusEl.textContent = " · 저장됨 ✓";
            setTimeout(() => { if (statusEl && statusEl.textContent.includes("저장됨")) statusEl.textContent = ""; }, 1800);
          }
        }, 600);
      });
    }

    $$(".concept-card").forEach(c => {
      c.addEventListener("click", () => {
        c.classList.toggle("revealed");
        const t = c.querySelector(".concept-toggle");
        t.textContent = c.classList.contains("revealed") ? "확인 완료" : "눌러서 확인 ▾";
      });
    });

    $$(".judge-block").forEach(block => {
      const jid = block.dataset.jid;
      const correct = block.dataset.correct === "1";
      const verdict = block.querySelector(".judge-verdict");
      $$(".judge-btn", block).forEach(btn => {
        btn.addEventListener("click", () => {
          if (block.classList.contains("answered")) return;
          const pick = btn.dataset.pick === "1";
          block.classList.add("answered");
          const right = (pick === correct);
          btn.classList.add(right ? "picked-right" : "picked-wrong");
          block.classList.add("revealed");
          if (verdict) {
            verdict.textContent = correct ? "◯ 옳은 선지입니다" : "✕ 틀린 선지입니다";
            verdict.classList.add(correct ? "is-correct" : "is-incorrect");
          }
          window.Store.recordExam(state.progress, state.currentId, jid, right ? "correct" : "wrong");
        });
      });
    });

    $$(".exam-block").forEach(block => {
      const qid = block.dataset.qid;
      const ans = parseInt(block.dataset.answer, 10);
      $$(".exam-choice", block).forEach(btn => {
        btn.addEventListener("click", () => {
          if (block.classList.contains("answered")) return;
          const idx = parseInt(btn.dataset.idx, 10);
          block.classList.add("answered");
          if (idx === ans) {
            btn.classList.add("correct");
            window.Store.recordExam(state.progress, state.currentId, qid, "correct");
          } else {
            btn.classList.add("wrong");
            $$(".exam-choice", block).forEach((b, i) => {
              if (i === ans) b.classList.add("correct");
            });
            window.Store.recordExam(state.progress, state.currentId, qid, "wrong");
          }
        });
      });
    });
  }

  // --------- Step 4: 자기평가 ---------
  function renderEval(it) {
    const intervals = (it.selfEval && it.selfEval.intervals) || window.Store.DEFAULT_INTERVAL;
    const dueLabel = (n) => n === 0 ? "즉시 복습" : `${n}일 뒤 복습`;
    return `
      <div>
        <div class="stage-label">복습 · 자기평가</div>
        <h2 class="eval-intro">이 작품, 얼마나 이해했나요?</h2>
        <p class="eval-sub">선택에 따라 다음 복습 시점이 자동으로 정해집니다. 솔직한 게 가장 효율적이에요.</p>
        <div class="eval-grid">
          <button class="eval-card mastered" data-eval="mastered" type="button">
            <div class="eval-glyph">완전히 이해</div>
            <div class="eval-desc">설명할 수 있고 핵심 개념도 다 떠올랐습니다.</div>
            <div class="eval-next">다음 복습 · ${dueLabel(intervals.mastered)}</div>
          </button>
          <button class="eval-card studying" data-eval="studying" type="button">
            <div class="eval-glyph">대체로 이해</div>
            <div class="eval-desc">큰 흐름은 잡았지만 세부가 흐립니다.</div>
            <div class="eval-next">다음 복습 · ${dueLabel(intervals.studying)}</div>
          </button>
          <button class="eval-card review" data-eval="review" type="button">
            <div class="eval-glyph">다시 보기</div>
            <div class="eval-desc">아직 정리가 안 된 부분이 많습니다.</div>
            <div class="eval-next">다음 복습 · ${dueLabel(intervals.review)}</div>
          </button>
        </div>
        <div class="eval-done" id="evalDone" style="display:none;">
          평가가 저장되었습니다. <strong>목록</strong>으로 돌아가면 카드 상태가 갱신됩니다.
        </div>
      </div>
    `;
  }

  function bindEval(it) {
    $$(".eval-card").forEach(card => {
      card.addEventListener("click", () => {
        const evalKey = card.dataset.eval;
        window.Store.recordEval(state.progress, state.currentId, evalKey);
        $("#evalDone").style.display = "block";
        $$(".eval-card").forEach(c => c.disabled = true);
      });
    });
  }

  // --------- Lightbox ---------
  let _toastTimer = null;
  function showToast(msg) {
    let t = document.getElementById("appToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "appToast";
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:rgba(26,22,18,0.92);color:#f5f1e8;padding:10px 16px;font:600 13px Pretendard,sans-serif;border-radius:4px;z-index:9999;pointer-events:none;transition:opacity 0.2s;";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 1800);
  }
  function openLightbox() {
    // 가능한 한 최신 DOM에서 SVG를 찾고, 없으면 캐시된 참조를 사용
    const liveSvg = document.querySelector("#diagramHost svg");
    const svg = liveSvg || state.currentSvg;
    if (!svg) {
      showToast("도식이 아직 로딩 중입니다…");
      return;
    }
    const inner = $("#lightboxInner");
    if (!inner) return;
    // outerHTML 복제 - cloneNode 보다 SVG 네임스페이스에 안전
    inner.innerHTML = svg.outerHTML;
    const cloned = inner.querySelector("svg");
    if (cloned) {
      // 라이트박스는 전체 도식을 한 번에 보여줌 (단독 보기와 동일)
      cloned.removeAttribute("data-app");
      cloned.querySelectorAll("[data-reveal-step]").forEach(g => g.classList.add("on"));
      cloned.style.maxWidth = "100%";
      cloned.style.maxHeight = "calc(100vh - 80px)";
      cloned.style.cursor = "default";
    }
    const lb = $("#lightbox");
    lb.classList.add("active");
    lb.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    const lb = $("#lightbox");
    lb.classList.remove("active");
    lb.setAttribute("aria-hidden", "true");
    $("#lightboxInner").innerHTML = "";
  }

  // --------- 다크 모드 ---------
  const THEME_KEY = "suneung_munhak_theme";
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    const btn = $("#btnTheme");
    if (btn) btn.textContent = theme === "dark" ? "☀" : "🌙";
  }
  function toggleTheme() {
    const cur = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    const next = cur === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    // 기본은 항상 라이트. 사용자가 토글했을 때만 다크로 저장됨.
    applyTheme(saved === "dark" ? "dark" : "light");
  }

  // --------- 학습 대시보드 ---------
  function openDashboard() {
    $("#hub").style.display = "none";
    $("#dashboard").classList.add("active");
    renderDashboard();
    window.scrollTo(0, 0);
  }
  function closeDashboard() {
    $("#dashboard").classList.remove("active");
    $("#hub").style.display = "";
  }
  function renderDashboard() {
    const items = state.index.passages || [];
    const prog = state.progress || {};
    const intervals = window.Store.DEFAULT_INTERVAL;
    const now = Date.now();
    const DAY_MS = 86400000;

    // 영역별 진척
    const cats = state.index.categories;
    const catKeys = Object.keys(cats);
    const catStats = {};
    catKeys.forEach(k => catStats[k] = { total: 0, mastered: 0, studying: 0, review: 0, untouched: 0 });
    items.forEach(it => {
      const k = it.category;
      if (!catStats[k]) return;
      catStats[k].total++;
      const s = window.Store.getStatus(prog, it.id, intervals, now);
      catStats[k][s] = (catStats[k][s] || 0) + 1;
    });
    let progressHtml = '';
    catKeys.forEach(k => {
      const c = catStats[k];
      if (c.total === 0) return;
      const masteredPct = Math.round((c.mastered / c.total) * 100);
      const studyingPct = Math.round((c.studying / c.total) * 100);
      const reviewPct = Math.round((c.review / c.total) * 100);
      progressHtml += `
        <div class="progress-row">
          <div class="progress-row-label">${escapeHtml(cats[k].label)}</div>
          <div class="progress-row-bar">
            <div class="progress-row-fill mastered" style="width:${masteredPct}%"></div>
          </div>
          <div class="progress-row-num">${c.mastered}/${c.total}</div>
        </div>
      `;
    });

    // 복습 예정 (오늘 또는 지난 due)
    const due = [];
    items.forEach(it => {
      const p = prog[it.id];
      if (!p || !p.eval) return;
      const days = intervals[p.eval] != null ? intervals[p.eval] : 0;
      const dueAt = (p.evalAt || 0) + days * DAY_MS;
      if (now >= dueAt) {
        due.push({ it, dueAt, p });
      }
    });
    due.sort((a, b) => a.dueAt - b.dueAt);
    const dueHtml = due.length === 0
      ? '<div class="dash-empty">오늘 복습 예정인 지문이 없어요.</div>'
      : `<div class="due-list">${due.slice(0, 20).map(d => {
          const cat = cats[d.it.category] || {};
          const overdueDays = Math.floor((now - d.dueAt) / DAY_MS);
          const when = overdueDays === 0 ? "오늘" : (overdueDays > 0 ? `${overdueDays}일 지남` : "예정");
          return `<div class="due-item" data-id="${escapeHtml(d.it.id)}">
            <span class="due-item-cat" style="background:${cat.color}">${escapeHtml(cat.label)}</span>
            <span class="due-item-title">${escapeHtml(d.it.title)}</span>
            <span class="due-item-when">${when}</span>
          </div>`;
        }).join('')}</div>`;

    // 회상 메모 타임라인
    const notes = [];
    Object.keys(prog).forEach(id => {
      const p = prog[id];
      if (p && p.recallNote && p.recallNote.trim() && p.recallAt) {
        const it = items.find(x => x.id === id);
        if (it) notes.push({ it, p });
      }
    });
    notes.sort((a, b) => b.p.recallAt - a.p.recallAt);
    const notesHtml = notes.length === 0
      ? '<div class="dash-empty">아직 회상 메모가 없어요. Step 3에서 회상한 내용을 적어 보세요.</div>'
      : `<div class="note-timeline">${notes.slice(0, 30).map(n => {
          const cat = cats[n.it.category] || {};
          const when = new Date(n.p.recallAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return `<div class="note-item" data-id="${escapeHtml(n.it.id)}" style="border-left-color:${cat.color}">
            <div class="note-item-head">
              <span class="note-item-title">${escapeHtml(n.it.title)}</span>
              <span class="note-item-when">${when}</span>
            </div>
            <div class="note-item-body">${escapeHtml(n.p.recallNote)}</div>
          </div>`;
        }).join('')}</div>`;

    // 오답 노트
    const wrong = [];
    Object.keys(prog).forEach(id => {
      const p = prog[id];
      if (!p || !p.examScore) return;
      const it = items.find(x => x.id === id);
      if (!it) return;
      Object.keys(p.examScore).forEach(key => {
        if (p.examScore[key] === "wrong") {
          // key 형식: "id::qid"
          const qid = key.split("::")[1];
          wrong.push({ it, qid });
        }
      });
    });
    // 실제 examPoint stem을 가져오려면 passage JSON이 필요. 캐시된 currentPassage는 없을 수 있어 제목만 표기.
    const wrongHtml = wrong.length === 0
      ? '<div class="dash-empty">아직 틀린 문항이 없어요.</div>'
      : `<div class="wrong-list">${wrong.slice(0, 30).map(w => {
          return `<div class="wrong-item" data-id="${escapeHtml(w.it.id)}">
            <div class="wrong-item-title">${escapeHtml(w.it.title)} <span style="color:var(--ink-3);font-weight:400;font-size:11px;">(${escapeHtml(w.qid)})</span></div>
            <div class="wrong-item-stem">클릭하여 다시 풀기 → Step 3에서 문항 확인</div>
          </div>`;
        }).join('')}</div>`;

    $("#dashUpdatedAt").textContent = `마지막 갱신 · ${new Date().toLocaleString("ko-KR", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" })}`;

    $("#dashContent").innerHTML = `
      <div class="dash-grid">
        <div class="dash-card">
          <div class="dash-card-title">영역별 이해 완료 진척
            <span class="dash-card-count">${items.length}편 기준</span>
          </div>
          ${progressHtml || '<div class="dash-empty">데이터 없음</div>'}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">오늘 복습 예정
            <span class="dash-card-count">${due.length}편</span>
          </div>
          ${dueHtml}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">📝 회상 메모 타임라인
            <span class="dash-card-count">${notes.length}편 기록</span>
          </div>
          ${notesHtml}
        </div>
        <div class="dash-card">
          <div class="dash-card-title">⚠ 오답 노트
            <span class="dash-card-count">${wrong.length}건</span>
          </div>
          ${wrongHtml}
        </div>
      </div>
    `;
  }

  // --------- 도식 갤러리 ---------
  function openGallery() {
    $("#hub").style.display = "none";
    $("#gallery").classList.add("active");
    renderGallery();
    window.scrollTo(0, 0);
  }
  function closeGallery() {
    $("#gallery").classList.remove("active");
    $("#hub").style.display = "";
  }
  function renderGallery() {
    const items = state.index.passages || [];
    const cats = state.index.categories;
    const catKeys = Object.keys(cats);
    state.galleryFilter = state.galleryFilter || "all";
    const f = state.galleryFilter;

    // 필터 칩
    const counts = { all: items.length };
    catKeys.forEach(k => counts[k] = items.filter(it => it.category === k).length);
    $("#galleryFilter").innerHTML =
      `<button class="cat-pill ${f === "all" ? "active" : ""}" data-cat="all">전체 (${counts.all})</button>` +
      catKeys.map(k => `<button class="cat-pill ${f === k ? "active" : ""}" data-cat="${k}">${escapeHtml(cats[k].label)} (${counts[k]})</button>`).join("");

    const filtered = f === "all" ? items : items.filter(it => it.category === f);
    $("#galleryContent").innerHTML = filtered.length === 0
      ? '<div class="dash-empty">해당 영역에 도식이 없어요.</div>'
      : `<div class="gallery-grid">${filtered.map(it => {
          const cat = cats[it.category] || {};
          return `<div class="gallery-item" data-id="${escapeHtml(it.id)}" style="border-color:${cat.color}">
            <div class="gallery-item-head">
              <span class="gallery-item-num mono-num">${String(it.order || '').padStart(2,'0')}</span>
              <span class="gallery-item-cat" style="color:${cat.color}">${escapeHtml(cat.label)}</span>
            </div>
            <div class="gallery-item-title">${escapeHtml(it.title)}</div>
            <div class="gallery-item-svg">
              <img src="diagrams/${escapeHtml(it.id)}.svg?v=7" alt="${escapeHtml(it.title)} 도식" loading="lazy" />
            </div>
          </div>`;
        }).join('')}</div>`;
  }

  // --------- 도식 갤러리 라이트박스 (큰 보기) ---------
  function getGalleryFilteredItems() {
    const items = state.index.passages || [];
    const f = state.galleryFilter || "all";
    return f === "all" ? items : items.filter(it => it.category === f);
  }
  function openGalleryViewer(id) {
    state.galleryViewerId = id;
    renderGalleryViewer();
    const gv = $("#galleryViewer");
    gv.classList.add("active");
    gv.setAttribute("aria-hidden", "false");
  }
  function closeGalleryViewer() {
    const gv = $("#galleryViewer");
    gv.classList.remove("active");
    gv.setAttribute("aria-hidden", "true");
    state.galleryViewerId = null;
    const stage = $("#gvStage");
    if (stage) stage.innerHTML = "";
  }
  function gvNav(direction) {
    const list = getGalleryFilteredItems();
    if (!list.length || !state.galleryViewerId) return;
    const idx = list.findIndex(it => it.id === state.galleryViewerId);
    if (idx === -1) return;
    const nextIdx = (idx + direction + list.length) % list.length;
    state.galleryViewerId = list[nextIdx].id;
    renderGalleryViewer();
  }
  function renderGalleryViewer() {
    const id = state.galleryViewerId;
    if (!id) return;
    const list = getGalleryFilteredItems();
    const idx = list.findIndex(it => it.id === id);
    const it = list[idx];
    if (!it) return;
    const cats = state.index.categories || {};
    const cat = cats[it.category] || {};
    $("#gvCat").textContent = cat.label || it.category;
    $("#gvCat").style.color = cat.color || "var(--ink-2)";
    $("#gvTitle").textContent = it.title;
    $("#gvCount").textContent = `${idx + 1} / ${list.length}`;
    $("#gvStage").innerHTML =
      `<img src="diagrams/${escapeHtml(it.id)}.svg?v=7" alt="${escapeHtml(it.title)} 도식" />`;
  }

  // --------- 키보드 / 해시 ---------
  function bindGlobalKeys() {
    document.addEventListener("keydown", (e) => {
      // 갤러리 라이트박스 우선 처리
      if ($("#galleryViewer").classList.contains("active")) {
        if (e.key === "Escape")     { e.preventDefault(); closeGalleryViewer(); return; }
        if (e.key === "ArrowRight") { e.preventDefault(); gvNav(1);  return; }
        if (e.key === "ArrowLeft")  { e.preventDefault(); gvNav(-1); return; }
        return;
      }
      if (!$("#study").classList.contains("active")) return;
      if (e.key === "Escape") {
        if ($("#lightbox").classList.contains("active")) { closeLightbox(); return; }
        closeStudy(); return;
      }
      if (e.target.matches("input, textarea")) return;
      if (e.key === "ArrowRight") { goStep(state.step + 1); }
      else if (e.key === "ArrowLeft") { goStep(state.step - 1); }
    });
  }

  function handleHash() {
    const h = location.hash || "";
    const m = h.match(/^#\/p\/([\w-]+)(?:\/(\d))?$/);
    if (m) {
      const id = m[1];
      let step = m[2] ? parseInt(m[2], 10) : 0;
      // step 범위 검증
      if (!(step >= 0 && step <= 3)) step = 0;
      if (state.currentId !== id) {
        openStudy(id).then((ok) => {
          if (ok) { state.step = step; renderStudy(); }
        });
      } else {
        if (state.step !== step) { state.step = step; renderStudy(); }
      }
    } else {
      if ($("#study").classList.contains("active")) closeStudy();
    }
  }

  // --------- 시작 ---------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
