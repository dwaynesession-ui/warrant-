/* Warrant — Argument Workbench
 * Vanilla JS, no build step, offline-first. Data lives in IndexedDB on the device.
 */
(function () {
  'use strict';

  const VERSION = '1.0.0';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const filled = (s) => String(s || '').trim().length > 0;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  /* ------------------------------------------------------------------ state */
  const S = {
    args: [], ideas: [], playbook: [], settings: { theme: 'system' },
    route: { view: 'home' },
    ui: {
      search: '', tag: '', present: 'map', card: 0, ttAll: false,
      reviewOpts: { findings: true, playbook: true },
      timer: { total: 180, left: 180, running: false, last: 0, handle: null },
      lastFormula: null, swReady: false, installEvt: null
    }
  };
  const cache = new Map();

  /* ------------------------------------------------------------------ icons */
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    next: '<path d="M9 6l6 6-6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r=".8"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    logic: '<path d="M3 7h5l8 10h5M16 7h5"/>',
    podium: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
    swords: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5L21 18v3h-3"/>',
    wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.4a5 5 0 0 1 7 0M12 20h.01"/>',
    install: '<path d="M12 3v12M7 10l5 5 5-5"/><rect x="3" y="17" width="18" height="4" rx="1"/>'
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* ------------------------------------------------------------------ parts */
  const PARTS = {
    frame: { label: 'Frame & definitions', glyph: 'F', about: 'Set the terms of the debate before you make your case.' },
    claim: { label: 'Claim', glyph: 'C', about: 'The conclusion you want accepted.' },
    qualifier: { label: 'Qualifier', glyph: 'Q', about: 'How strongly the claim holds, and when.' },
    data: { label: 'Data', glyph: 'D', about: 'The grounds: facts, statistics, examples, testimony.' },
    warrant: { label: 'Warrant', glyph: 'W', about: 'The bridge: why the data proves the claim.' },
    backing: { label: 'Backing', glyph: 'B', about: 'Support for the warrant itself.' },
    rebuttals: { label: 'Rebuttals', glyph: 'R', about: 'Objections you anticipate — and your answers.' },
    notes: { label: 'Scratchpad', glyph: '✎', about: 'Brainstorm, collect angles, draft phrasing.' }
  };
  const QUALS = Analyzer.QUALIFIERS;

  /* ------------------------------------------------------------------ model */
  function normalizeArg(a) {
    a = a || {};
    const list = (x, f) => (Array.isArray(x) ? x : []).map(i => Object.assign({ id: uid() }, f, i));
    const out = {
      id: a.id || uid(), title: a.title || '', resolution: a.resolution || '', side: a.side || 'none',
      tags: Array.isArray(a.tags) ? a.tags : [], template: a.template || 'toulmin', mode: a.mode || 'own',
      createdAt: a.createdAt || Date.now(), updatedAt: a.updatedAt || Date.now(), example: !!a.example,
      frame: a.frame || '', burden: a.burden || '',
      claim: a.claim || '',
      qualifier: Object.assign({ level: '', text: '' }, a.qualifier),
      data: list(a.data, { text: '', source: '' }),
      warrant: a.warrant || '',
      backing: list(a.backing, { text: '', source: '' }),
      rebuttals: list(a.rebuttals, { objection: '', response: '' }),
      definitions: list(a.definitions, { term: '', meaning: '' }),
      logic: {
        props: list(a.logic && a.logic.props, { sym: '', text: '' }),
        premises: (a.logic && Array.isArray(a.logic.premises)) ? a.logic.premises.slice() : [],
        conclusion: (a.logic && a.logic.conclusion) || ''
      },
      notes: a.notes || '',
      reviews: list(a.reviews, { date: Date.now(), text: '', parsed: null, applied: {} })
    };
    if (!out.data.length) out.data.push({ id: uid(), text: '', source: '' });
    if (!out.rebuttals.length) out.rebuttals.push({ id: uid(), objection: '', response: '' });
    if (!out.logic.premises.length) out.logic.premises = ['', ''];
    return out;
  }

  function newArg(templateId, extra) {
    const t = Templates.TEMPLATES.find(x => x.id === templateId) || Templates.TEMPLATES[0];
    const a = normalizeArg(Object.assign({ template: t.id, mode: t.mode || 'own' }, t.seed(), extra || {}));
    S.args.unshift(a);
    save('args');
    return a;
  }

  const current = () => S.route.view === 'arg' ? S.args.find(a => a.id === S.route.id) : null;

  function analysisFor(a) {
    const c = cache.get(a.id);
    if (c && c.u === a.updatedAt) return c.r;
    const r = Analyzer.analyze(a);
    cache.set(a.id, { u: a.updatedAt, r });
    return r;
  }

  /* ------------------------------------------------------------------ persistence */
  const timers = {};
  function save(key) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      const val = { args: S.args, ideas: S.ideas, playbook: S.playbook, settings: S.settings }[key];
      Store.set(key, JSON.parse(JSON.stringify(val)));
    }, 250);
  }
  function touch(a) { a.updatedAt = Date.now(); save('args'); }

  async function load() {
    const [args, ideas, playbook, settings, seeded] = await Promise.all([
      Store.get('args'), Store.get('ideas'), Store.get('playbook'), Store.get('settings'), Store.get('seeded')
    ]);
    S.args = (args || []).map(normalizeArg);
    S.ideas = ideas || [];
    S.playbook = playbook || [];
    S.settings = Object.assign({ theme: 'system' }, settings || {});
    if (!seeded) {
      S.args.unshift(normalizeArg(EXAMPLE));
      S.ideas.unshift({ id: uid(), text: 'Capture half-formed ideas here. When one is ready, tap “Develop” to turn it into a full argument.', date: Date.now() });
      save('args'); save('ideas'); Store.set('seeded', true);
    }
  }

  const EXAMPLE = {
    example: true, template: 'policy', title: 'Example — Later school start times',
    resolution: 'Resolved: High schools should start no earlier than 8:30 a.m.', side: 'aff', tags: ['example', 'education'],
    frame: 'This is a health question before it is a scheduling question.',
    burden: 'My opponent must show the logistical costs outweigh daily health and learning effects.',
    definitions: [{ term: 'Later start', meaning: 'First bell at 8:30 a.m. or later for middle and high schools.' }],
    claim: 'High schools should start classes no earlier than 8:30 a.m.',
    qualifier: { level: 'probably', text: 'where districts can fund the transportation changes' },
    data: [
      { text: 'The American Academy of Pediatrics recommends middle and high schools start at 8:30 a.m. or later.', source: 'AAP policy statement, “School Start Times for Adolescents” (2014)' },
      { text: 'Sleep medicine guidelines recommend 8–10 hours of sleep per night for teens aged 13–18.', source: 'American Academy of Sleep Medicine consensus statement (2016)' },
      { text: 'California passed a statewide law in 2019 requiring most public high schools to start no earlier than 8:30 a.m.', source: 'California SB 328 (2019)' }
    ],
    warrant: 'When a school schedule conflicts with the sleep needs that medical authorities recognize for teenagers, changing the schedule to match those needs is justified, because adequate sleep supports both health and learning.',
    backing: [{ text: 'Puberty shifts adolescents’ biological sleep timing later (sleep-phase delay), a well-documented finding in sleep research.', source: 'AAP 2014 policy statement and cited research' }],
    rebuttals: [{ objection: 'Later starts disrupt bus schedules and after-school sports.', response: 'Those are real costs, but they are one-time logistics problems districts can plan around — California is doing it statewide — while sleep loss affects students every school day.' }],
    logic: {
      props: [{ sym: 'A', text: 'The schedule conflicts with teen sleep needs' }, { sym: 'B', text: 'The costs of changing it are manageable' }, { sym: 'R', text: 'We should change the schedule' }],
      premises: ['(A & B) -> R', 'A', 'B'], conclusion: 'R'
    },
    notes: 'Angles to explore: attendance, car accidents among teen drivers, mental health. Find sources before using.'
  };

  /* ------------------------------------------------------------------ routing */
  function parseRoute() {
    const p = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    if (p[0] === 'arg' && p[1]) return { view: 'arg', id: p[1], tab: p[2] || 'build' };
    if (['ideas', 'playbook', 'settings'].includes(p[0])) return { view: p[0] };
    return { view: 'home' };
  }
  const go = (h) => { if (location.hash !== h) location.hash = h; else route(); };
  function route() {
    const prev = S.route;
    S.route = parseRoute();
    if (S.route.view === 'arg' && !current()) { S.route = { view: 'home' }; history.replaceState(null, '', '#/'); }
    if (prev.id !== S.route.id) S.ui.card = 0;
    if (prev.tab === 'present' && S.route.tab !== 'present') stopTimer();
    render();
    if (prev.view !== S.route.view || prev.id !== S.route.id) { const m = $('.main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); }
  }

  /* ------------------------------------------------------------------ helpers */
  function ago(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const sideLabel = (s) => ({ aff: 'Affirmative', neg: 'Negative', none: 'Exploring' })[s] || 'Exploring';
  const tone = (score) => score >= 85 ? 'good' : score >= 70 ? 'ok' : score >= 50 ? 'meh' : 'bad';

  function ring(score, size = 44, stroke = 4, label = true) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(score, 0, 100) / 100);
    return `<svg class="ring tone-${tone(score)}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Score ${score} of 100">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-val" stroke-width="${stroke}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${label ? `<text x="50%" y="50%" dy=".35em" text-anchor="middle" class="ring-txt" style="font-size:${size * 0.32}px">${score}</text>` : ''}
    </svg>`;
  }

  function autosize(el) { if (!el || el.tagName !== 'TEXTAREA') return; el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
  const autosizeAll = (root = document) => $$('textarea', root).forEach(autosize);

  /** Set a value on an argument by path. Segments: "claim", "qualifier.level", "data#id.text", "logic.premises.2" */
  function setPath(obj, path, value) {
    const segs = path.split('.');
    let o = obj;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      if (s.includes('#')) { const [k, id] = s.split('#'); o = (o[k] || []).find(x => x.id === id); }
      else o = o[/^\d+$/.test(s) ? +s : s];
      if (!o) return;
    }
    const last = segs[segs.length - 1];
    o[/^\d+$/.test(last) ? +last : last] = value;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { }
      t.remove(); return ok;
    }
  }
  function download(name, text, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  async function shareText(title, text) {
    if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    if (await copyText(text)) toast('Copied to clipboard'); else toast('Could not share — try Download');
  }
  const slug = (s) => (String(s || 'argument').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'argument');

  /* ------------------------------------------------------------------ toast & modal */
  function toast(msg, opt = {}) {
    const root = $('#toast-root');
    root.innerHTML = ''; // one toast at a time, so “Undo” always refers to the latest action
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${esc(msg)}</span>${opt.action ? `<button class="toast-btn">${esc(opt.action)}</button>` : ''}`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const kill = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); };
    if (opt.action) el.querySelector('button').onclick = () => { opt.onAction && opt.onAction(); kill(); };
    setTimeout(kill, opt.ms || (opt.action ? 6000 : 2600));
  }
  function modal(html, cls = '') {
    const root = $('#modal-root');
    root.innerHTML = `<div class="scrim" data-action="close-modal"></div><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    root.classList.add('open');
    setTimeout(() => { const f = $('.modal [autofocus]', root) || $('.modal button', root); f && f.focus(); }, 30);
  }
  function closeModal() { const r = $('#modal-root'); r.classList.remove('open'); r.innerHTML = ''; }
  function confirmDialog(title, body, okLabel, onOk, danger = true) {
    modal(`<h2 class="modal-title">${esc(title)}</h2><p class="modal-body">${esc(body)}</p>
      <div class="modal-actions"><button class="btn ghost" data-action="close-modal">Cancel</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" id="confirm-ok" autofocus>${esc(okLabel)}</button></div>`, 'small');
    $('#confirm-ok').onclick = () => { closeModal(); onOk(); };
  }

  function templatePicker(extra) {
    modal(`<div class="modal-head"><div><p class="eyebrow">New argument</p><h2 class="modal-title">Choose a structure</h2></div>
      <button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('x')}</button></div>
      <div class="tpl-grid">${Templates.TEMPLATES.map(t => `
        <button class="tpl" data-action="create" data-template="${t.id}">
          <span class="tpl-glyph">${esc(t.glyph)}</span>
          <span class="tpl-name">${esc(t.name)}</span>
          <span class="tpl-blurb">${esc(t.blurb)}</span>
        </button>`).join('')}</div>`, 'wide');
    S.ui.pendingExtra = extra || null;
  }

  /* ------------------------------------------------------------------ render: shell */
  function render() {
    applyTheme();
    const v = S.route.view;
    $('#app').innerHTML = `<div class="shell view-${v}">
      <aside class="side">${renderSide()}</aside>
      <main class="main">${v === 'arg' ? renderArg() : v === 'ideas' ? renderIdeas() : v === 'playbook' ? renderPlaybook() : v === 'settings' ? renderSettings() : renderHome()}</main>
    </div>`;
    autosizeAll();
    if (v === 'arg' && S.route.tab === 'logic') updateLogicLive();
    if (v === 'arg' && S.route.tab === 'build') updateDots();
  }

  function renderSide() {
    const v = S.route.view;
    const navItem = (href, ic, label, active, count) =>
      `<a href="${href}" class="nav-item ${active ? 'active' : ''}">${icon(ic)}<span>${label}</span>${count != null ? `<span class="count">${count}</span>` : ''}</a>`;
    const q = S.ui.search.toLowerCase();
    const tags = [...new Set(S.args.flatMap(a => a.tags))].sort();
    const list = S.args
      .filter(a => !S.ui.tag || a.tags.includes(S.ui.tag))
      .filter(a => !q || [a.title, a.claim, a.resolution, a.notes, a.tags.join(' ')].join(' ').toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return `
      <div class="brand">
        <div class="mark" aria-hidden="true">W</div>
        <div class="brand-text"><div class="brand-name">Warrant</div><div class="brand-sub">Argument workbench</div></div>
        <span class="status-pill ${navigator.onLine ? '' : 'off'}" title="${S.ui.swReady ? 'Cached for offline use' : 'Offline cache not active yet'}">${icon('wifi')}${navigator.onLine ? (S.ui.swReady ? 'Offline-ready' : 'Online') : 'Offline'}</span>
      </div>
      <nav class="nav">
        ${navItem('#/', 'doc', 'Arguments', v === 'home' || v === 'arg', S.args.length)}
        ${navItem('#/ideas', 'bulb', 'Ideas', v === 'ideas', S.ideas.length)}
        ${navItem('#/playbook', 'book', 'Playbook', v === 'playbook', S.playbook.length)}
        ${navItem('#/settings', 'sliders', 'Settings', v === 'settings')}
      </nav>
      <div class="side-head">
        <h2>Arguments</h2>
        <button class="btn primary sm" data-action="new">${icon('plus')}New</button>
      </div>
      <label class="search">${icon('search')}<input type="search" placeholder="Search arguments" value="${esc(S.ui.search)}" data-action="search" aria-label="Search arguments"></label>
      ${tags.length ? `<div class="tagbar">${['', ...tags].map(t => `<button class="chip ${S.ui.tag === t ? 'on' : ''}" data-action="tag-filter" data-tag="${esc(t)}">${t ? '#' + esc(t) : 'All'}</button>`).join('')}</div>` : ''}
      <div class="arg-list">${list.length ? list.map(argItem).join('') : `<div class="empty-mini">${q || S.ui.tag ? 'No matches.' : 'No arguments yet.'}</div>`}</div>
      <div class="side-foot">Stored only on this device · v${VERSION}</div>`;
  }

  function argItem(a) {
    const r = analysisFor(a);
    const active = S.route.id === a.id;
    const t = Templates.TEMPLATES.find(x => x.id === a.template) || Templates.TEMPLATES[0];
    return `<a href="#/arg/${a.id}/${active ? S.route.tab : 'build'}" class="arg-item ${active ? 'active' : ''}" data-arg-item="${a.id}">
      <div class="arg-item-main">
        <div class="arg-item-title">${esc(a.title || a.claim || 'Untitled argument')}</div>
        <div class="arg-item-claim">${esc(a.title && a.claim ? a.claim : (a.resolution || t.name))}</div>
        <div class="arg-item-meta"><span class="glyph-sm">${esc(t.glyph)}</span>${a.mode === 'opponent' ? '<span class="tag-opp">Opponent</span>' : `<span>${sideLabel(a.side)}</span>`}<span>·</span><span>${ago(a.updatedAt)}</span></div>
      </div>
      <div class="arg-item-score">${r.incomplete ? '<span class="dash">—</span>' : ring(r.score, 34, 3)}</div>
    </a>`;
  }

  /* ------------------------------------------------------------------ render: home */
  function renderHome() {
    const parts = ['claim', 'data', 'warrant', 'backing', 'qualifier', 'rebuttals'];
    return `<div class="page home">
      <section class="hero">
        <p class="eyebrow">The Toulmin method</p>
        <h1 class="display">Make arguments<br>that <em>hold.</em></h1>
        <p class="lede">Lay out your case in six parts, test it for gaps and fallacies, check its formal logic, rehearse it, and send it out for review — all offline.</p>
        <div class="hero-actions">
          <button class="btn primary lg" data-action="new">${icon('plus')}New argument</button>
          ${S.args[0] ? `<a class="btn ghost lg" href="#/arg/${S.args.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id}/build">Continue latest</a>` : ''}
        </div>
      </section>
      <section class="anatomy">
        <h2 class="section-title">Anatomy of an argument</h2>
        <div class="anatomy-grid">${parts.map((k, i) => `
          <div class="anat part-${k}"><span class="anat-n">${String(i + 1).padStart(2, '0')}</span><span class="part-glyph">${PARTS[k].glyph}</span>
          <h3>${PARTS[k].label}</h3><p>${PARTS[k].about}</p></div>`).join('')}</div>
      </section>
      <section>
        <h2 class="section-title">Start from a structure</h2>
        <div class="tpl-grid inline">${Templates.TEMPLATES.map(t => `
          <button class="tpl" data-action="create" data-template="${t.id}">
            <span class="tpl-glyph">${esc(t.glyph)}</span><span class="tpl-name">${esc(t.name)}</span><span class="tpl-blurb">${esc(t.blurb)}</span>
          </button>`).join('')}</div>
      </section>
    </div>`;
  }

  /* ------------------------------------------------------------------ render: argument */
  const TABS = [
    { id: 'build', label: 'Build', ic: 'pen' },
    { id: 'analyze', label: 'Analyze', ic: 'target' },
    { id: 'logic', label: 'Logic', ic: 'logic' },
    { id: 'present', label: 'Present', ic: 'podium' },
    { id: 'review', label: 'Review', ic: 'spark' }
  ];

  function renderArg() {
    const a = current();
    const r = analysisFor(a);
    const tab = TABS.some(t => t.id === S.route.tab) ? S.route.tab : 'build';
    return `<div class="editor">
      <header class="ed-head">
        <a href="#/" class="icon-btn back-btn" aria-label="Back to arguments">${icon('back')}</a>
        <input class="ed-title" data-bind="title" value="${esc(a.title)}" placeholder="Untitled argument" aria-label="Title">
        <div class="ed-actions">
          <a href="#/arg/${a.id}/analyze" class="score-badge" id="score-badge" title="Soundness score">${scoreBadge(r)}</a>
          <button class="icon-btn" data-action="arg-menu" aria-label="More actions">${icon('more')}</button>
        </div>
      </header>
      <div class="ed-meta">
        <input class="meta-input" data-bind="resolution" value="${esc(a.resolution)}" placeholder="Resolution or debate topic" aria-label="Resolution">
        <div class="seg sm" role="group" aria-label="Side">
          ${['aff', 'neg', 'none'].map(s => `<button class="${a.side === s ? 'on' : ''}" data-action="side" data-side="${s}">${sideLabel(s)}</button>`).join('')}
        </div>
        <input class="meta-input tags-input" data-action="tags" value="${esc(a.tags.join(', '))}" placeholder="Tags, comma separated" aria-label="Tags">
      </div>
      ${a.mode === 'opponent' ? `<div class="banner opp">${icon('swords')}<div><strong>Opponent mapping.</strong> You’re laying out <em>their</em> argument. The Analyze tab’s attack plan shows where it breaks.</div><button class="btn ghost sm" data-action="toggle-mode">Make it mine</button></div>` : ''}
      ${a.example ? `<div class="banner">${icon('info')}<div>This is an example argument showing every feature. Edit it freely, or delete it from the ••• menu.</div></div>` : ''}
      <nav class="tabs" role="tablist">${TABS.map(t => `<a role="tab" aria-selected="${t.id === tab}" href="#/arg/${a.id}/${t.id}" class="tab ${t.id === tab ? 'on' : ''}">${icon(t.ic)}<span>${t.label}</span></a>`).join('')}</nav>
      <section class="tab-body tab-${tab}">${({ build: renderBuild, analyze: renderAnalyze, logic: renderLogic, present: renderPresent, review: renderReview })[tab](a, r)}</section>
    </div>`;
  }

  function scoreBadge(r) {
    if (r.incomplete) return `<span class="sb-empty">No score</span>`;
    return `${ring(r.score, 38, 3.5)}<span class="sb-text"><span class="sb-verdict tone-${tone(r.score)}">${esc(r.verdict)}</span><span class="sb-sub">Soundness</span></span>`;
  }

  /* ---------- Build ---------- */
  function partCard(key, body, hint) {
    const p = PARTS[key];
    return `<section class="part part-${key}" data-part="${key}">
      <header class="part-head">
        <span class="part-glyph">${p.glyph}</span>
        <div class="part-titles"><h3>${p.label}</h3><p>${p.about}</p></div>
        <span class="dot" data-dot="${key}" aria-hidden="true"></span>
      </header>
      ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
      <div class="part-body">${body}</div>
    </section>`;
  }

  function renderBuild(a) {
    const H = Templates.hintsFor(a.template);
    const ta = (bind, val, ph, cls = '', rows = 2) => `<textarea class="field ${cls}" data-bind="${bind}" rows="${rows}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;
    const inp = (bind, val, ph, cls = '') => `<input class="field ${cls}" data-bind="${bind}" value="${esc(val)}" placeholder="${esc(ph)}">`;
    const rm = (list, id, label) => `<button class="icon-btn subtle" data-action="rm" data-list="${list}" data-id="${id}" aria-label="Remove ${label}">${icon('x')}</button>`;
    const add = (list, label) => `<button class="add-btn" data-action="add" data-list="${list}">${icon('plus')}${label}</button>`;

    const lessons = S.playbook.slice(0, 4);
    const frame = `
      <div class="defs">${a.definitions.map(d => `
        <div class="def-row">
          ${inp(`definitions#${d.id}.term`, d.term, 'Term', 'def-term')}
          ${ta(`definitions#${d.id}.meaning`, d.meaning, 'What it means in this debate', 'def-meaning', 1)}
          ${rm('definitions', d.id, 'definition')}
        </div>`).join('')}
        ${add('definitions', 'Define a term')}
      </div>
      <div class="grid-2">
        <label class="lbl">Frame${ta('frame', a.frame, H.frame, '', 2)}</label>
        <label class="lbl">Burden of proof${ta('burden', a.burden, H.burden, '', 2)}</label>
      </div>`;

    const claim = ta('claim', a.claim, H.claim, 'claim-field', 2);

    const qualifier = `<div class="qual-scale" role="radiogroup" aria-label="Qualifier strength">
        ${QUALS.slice().reverse().map(q => `<button role="radio" aria-checked="${a.qualifier.level === q.id}" class="q-step ${a.qualifier.level === q.id ? 'on' : ''}" data-action="qual" data-level="${q.id}"><span class="q-bar" style="--h:${q.weight * 20}%"></span><span>${q.label}</span></button>`).join('')}
      </div>
      ${inp('qualifier.text', a.qualifier.text, 'Conditions or exceptions — e.g. “in urban districts”, “unless funding is cut”')}`;

    const evidence = (list, items, phText, phSource) => items.map((d, i) => `
        <div class="ev">
          <span class="ev-n">${i + 1}</span>
          <div class="ev-fields">
            ${ta(`${list}#${d.id}.text`, d.text, phText, '', 2)}
            <div class="src">${icon('book')}${inp(`${list}#${d.id}.source`, d.source, phSource, 'src-field')}</div>
          </div>
          ${rm(list, d.id, 'item')}
        </div>`).join('');

    const data = evidence('data', a.data, H.data, 'Source — author, publication, year, link') + add('data', 'Add evidence');
    const warrant = ta('warrant', a.warrant, H.warrant, '', 3) +
      (filled(a.warrant) ? '' : `<button class="add-btn" data-action="warrant-pattern">${icon('pen')}Use the pattern: “When ___, then ___, because ___.”</button>`);
    const backing = evidence('backing', a.backing, H.backing, 'Authority — law, study, precedent') + add('backing', 'Add backing');

    const rebuttals = a.rebuttals.map((r, i) => `
      <div class="rb">
        <div class="rb-row"><span class="rb-tag them">They say</span>${ta(`rebuttals#${r.id}.objection`, r.objection, H.objection, '', 2)}${rm('rebuttals', r.id, 'rebuttal')}</div>
        <div class="rb-row"><span class="rb-tag you">You answer</span>${ta(`rebuttals#${r.id}.response`, r.response, H.response, '', 2)}<span class="rb-spacer"></span></div>
      </div>`).join('') + add('rebuttals', 'Anticipate another objection');

    return `
      ${lessons.length ? `<details class="pb-remind"><summary>${icon('book')}<span>Your playbook · ${S.playbook.length} lesson${S.playbook.length > 1 ? 's' : ''}</span></summary><ul>${lessons.map(l => `<li>${esc(l.text)}</li>`).join('')}</ul>${S.playbook.length > 4 ? '<a href="#/playbook">See all</a>' : ''}</details>` : ''}
      <div class="parts">
        ${partCard('frame', frame)}
        ${partCard('claim', claim)}
        ${partCard('qualifier', qualifier, H.qualifier)}
        ${partCard('data', data)}
        ${partCard('warrant', warrant)}
        ${partCard('backing', backing)}
        ${partCard('rebuttals', rebuttals)}
        ${partCard('notes', ta('notes', a.notes, H.notes, 'notes-field', 4))}
      </div>`;
  }

  function updateDots() {
    const a = current(); if (!a) return;
    const r = analysisFor(a);
    const rank = { fail: 3, warn: 2, info: 1, pass: 0 };
    const worst = {};
    (r.findings || []).forEach(f => {
      const k = f.field === 'definitions' ? 'frame' : f.field;
      if (!(k in worst) || rank[f.level] > rank[worst[k]]) worst[k] = f.level;
    });
    $$('[data-dot]').forEach(d => {
      const k = d.dataset.dot;
      d.className = 'dot ' + (worst[k] || '');
      const msgs = (r.findings || []).filter(f => (f.field === 'definitions' ? 'frame' : f.field) === k && f.level !== 'pass').map(f => f.title);
      d.title = msgs.join(' · ');
    });
  }

  /* ---------- Analyze ---------- */
  function renderAnalyze(a, r) {
    if (r.incomplete) return `<div class="empty">${icon('target', 'xl')}<h3>Nothing to analyze yet</h3><p>Write your claim on the Build tab to get a soundness check.</p><a class="btn primary" href="#/arg/${a.id}/build">Go to Build</a></div>`;
    const order = { fail: 0, warn: 1, info: 2, pass: 3 };
    const lvlIcon = { fail: 'x', warn: 'alert', info: 'info', pass: 'check' };
    const issues = r.findings.filter(f => f.level !== 'pass').sort((x, y) => order[x.level] - order[y.level]);
    const passes = r.findings.filter(f => f.level === 'pass');
    const row = (f) => `<li class="finding lv-${f.level}">
        <span class="f-ic">${icon(lvlIcon[f.level])}</span>
        <div class="f-body">
          <div class="f-title">${esc(f.title)} <span class="f-cat">${esc(f.cat)}</span></div>
          ${f.detail ? `<p>${esc(f.detail)}</p>` : ''}
          ${f.quote ? `<blockquote>${esc(f.quote)}</blockquote>` : ''}
          ${f.items ? `<ul class="f-items">${f.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </div>
        ${f.field && f.level !== 'pass' ? `<button class="btn ghost sm" data-action="goto" data-field="${f.field}">Fix ${icon('next')}</button>` : ''}
      </li>`;
    return `
      <div class="an-hero">
        <div class="an-ring">${ring(r.score, 132, 9)}</div>
        <div class="an-text">
          <p class="eyebrow">Soundness check</p>
          <h2 class="verdict tone-${tone(r.score)}">${esc(r.verdict)}</h2>
          <p class="lede sm">${esc(r.summary)}</p>
          <p class="fine">Heuristic and offline: it checks structure, support, logical connection, calibration, and common fallacy patterns. It can’t verify that your facts are true — use Review for that.</p>
        </div>
      </div>
      <div class="cats">${Object.entries(r.categories).map(([k, c]) => `
        <div class="cat"><div class="cat-top"><span>${c.label}</span><strong>${c.score}</strong></div>
        <div class="bar"><span class="tone-bg-${tone(c.score)}" style="width:${c.score}%"></span></div></div>`).join('')}</div>

      <div class="an-cols">
        <section class="card">
          <h3 class="card-title">Issues <span class="muted">${issues.length}</span></h3>
          ${issues.length ? `<ul class="findings">${issues.map(row).join('')}</ul>` : `<p class="muted">No issues found. Pressure-test it out loud.</p>`}
          ${passes.length ? `<details class="passes"><summary>${passes.length} checks passed</summary><ul class="findings">${passes.map(row).join('')}</ul></details>` : ''}
        </section>
        <section class="card attack">
          <h3 class="card-title">${icon('swords')} ${a.mode === 'opponent' ? 'Where to attack' : 'Where you’ll be attacked'}</h3>
          <p class="muted sm">Ranked from most to least exposed.</p>
          <ol class="attack-list">${r.attack.map(x => `
            <li><div class="atk-head"><span class="atk-part">${esc(x.part)}</span><span class="meter" aria-label="Exposure ${x.weakness} of 10">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.ceil(x.weakness / 2) ? 'on' : ''}"></i>`).join('')}</span></div>
            <p class="atk-q">${esc(x.question)}</p><p class="atk-prep">${esc(a.mode === 'opponent' ? 'Press here: ask this question directly.' : x.prep)}</p></li>`).join('')}</ol>
        </section>
      </div>
      ${S.playbook.length ? `<section class="card"><h3 class="card-title">${icon('book')} From your playbook</h3><p class="muted sm">Lessons from past reviews — check this argument against them.</p><ul class="lessons">${S.playbook.slice(0, 8).map(l => `<li>${esc(l.text)}</li>`).join('')}</ul></section>` : ''}`;
  }

  /* ---------- Logic ---------- */
  const SYMS = [['¬', 'not'], ['∧', 'and'], ['∨', 'or'], ['→', 'if…then'], ['↔', 'if and only if'], ['(', ''], [')', '']];
  const EXAMPLES = [
    { name: 'Modus ponens (valid)', props: [['A', 'It is raining'], ['B', 'The ground is wet']], premises: ['A -> B', 'A'], conclusion: 'B' },
    { name: 'Affirming the consequent (invalid)', props: [['A', 'It is raining'], ['B', 'The ground is wet']], premises: ['A -> B', 'B'], conclusion: 'A' },
    { name: 'Chain / hypothetical syllogism', props: [['A', 'The bill passes'], ['B', 'Funding increases'], ['C', 'Class sizes shrink']], premises: ['A -> B', 'B -> C'], conclusion: 'A -> C' },
    { name: 'Sufficient conditions (A or (B and C))', props: [['A', 'Criterion A is met'], ['B', 'Criterion B is met'], ['C', 'Criterion C is met'], ['R', 'X fits the definition']], premises: ['(A | (B & C)) -> R', 'B', 'C'], conclusion: 'R' },
    { name: 'False dilemma check', props: [['A', 'We ban it'], ['B', 'Harm continues']], premises: ['A | B', '~A'], conclusion: 'B' }
  ];

  function renderLogic(a) {
    const L = a.logic;
    return `
      <div class="lg-intro">
        <p class="lede sm">Translate your case into propositional logic to prove its <strong>form</strong> is valid. A valid form means: <em>if</em> every premise is true, the conclusion <em>must</em> be true. Soundness = valid form + true premises.</p>
        <div class="lg-examples"><label class="lbl inline">Load example
          <select data-action="logic-example"><option value="">Choose…</option>${EXAMPLES.map((e, i) => `<option value="${i}">${esc(e.name)}</option>`).join('')}</select></label>
          <button class="btn ghost sm" data-action="logic-clear">Clear</button></div>
      </div>
      <section class="card">
        <h3 class="card-title">Propositions <span class="muted sm">— name each statement with a letter</span></h3>
        <div class="props">${L.props.map(p => `
          <div class="prop-row">
            <input class="field sym-field" data-bind="logic.props#${p.id}.sym" value="${esc(p.sym)}" placeholder="A" maxlength="12" aria-label="Symbol">
            <span class="eqsign">=</span>
            <input class="field" data-bind="logic.props#${p.id}.text" value="${esc(p.text)}" placeholder="Plain-English statement" aria-label="Statement">
            <button class="icon-btn subtle" data-action="rm" data-list="logic.props" data-id="${p.id}" aria-label="Remove">${icon('x')}</button>
          </div>`).join('')}
          <button class="add-btn" data-action="add-prop">${icon('plus')}Add proposition</button>
        </div>
      </section>
      <section class="card">
        <h3 class="card-title">Argument</h3>
        <div class="premises">${L.premises.map((p, i) => `
          <div class="prem-row">
            <span class="prem-n">P${i + 1}</span>
            <div class="prem-main">
              <input class="field mono formula" data-bind="logic.premises.${i}" data-formula="p${i}" value="${esc(p)}" placeholder="e.g. A -> B" autocomplete="off" autocapitalize="off" spellcheck="false">
              <div class="prem-preview" id="pv-p${i}"></div>
            </div>
            <button class="icon-btn subtle" data-action="rm-premise" data-i="${i}" aria-label="Remove premise">${icon('x')}</button>
          </div>`).join('')}
          <button class="add-btn" data-action="add-premise">${icon('plus')}Add premise</button>
          <div class="prem-row concl">
            <span class="prem-n">∴</span>
            <div class="prem-main">
              <input class="field mono formula" data-bind="logic.conclusion" data-formula="c" value="${esc(L.conclusion)}" placeholder="Conclusion, e.g. B" autocomplete="off" autocapitalize="off" spellcheck="false">
              <div class="prem-preview" id="pv-c"></div>
            </div>
            <span class="rb-spacer"></span>
          </div>
        </div>
        <div class="symkeys" aria-label="Insert symbol">
          ${SYMS.map(([s, t]) => `<button class="symkey" data-action="sym" data-sym="${s}" title="${t}">${s}${t ? `<small>${t}</small>` : ''}</button>`).join('')}
          ${L.props.filter(p => p.sym).map(p => `<button class="symkey var" data-action="sym" data-sym="${esc(p.sym)}">${esc(p.sym)}</button>`).join('')}
        </div>
        <p class="fine">Type with symbols or plain keys: <code>~</code> or <code>not</code>, <code>&amp;</code> or <code>and</code>, <code>|</code> or <code>or</code>, <code>-&gt;</code>, <code>&lt;-&gt;</code>. Uppercase <code>T</code>/<code>F</code> mean true/false.</p>
      </section>
      <section id="lg-result" class="lg-result"></section>`;
  }

  function propLabels(a) { const m = {}; a.logic.props.forEach(p => { if (filled(p.sym)) m[p.sym.trim()] = p.text; }); return m; }

  function updateLogicLive() {
    const a = current(); if (!a) return;
    const labels = propLabels(a);
    const pv = (id, src) => {
      const el = $('#pv-' + id); if (!el) return;
      if (!filled(src)) { el.innerHTML = ''; el.className = 'prem-preview'; return; }
      try {
        const ast = Logic.parse(src);
        const unknown = [...Logic.variables(ast)].filter(v => !(v in labels));
        el.className = 'prem-preview ok';
        el.innerHTML = `<span class="pretty">${esc(Logic.format(ast))}</span><span class="eng">${esc(Logic.toEnglish(ast, labels))}</span>${unknown.length ? `<span class="warnline">Undefined: ${esc(unknown.join(', '))}</span>` : ''}`;
      } catch (e) { el.className = 'prem-preview err'; el.textContent = e.message; }
    };
    a.logic.premises.forEach((p, i) => pv('p' + i, p));
    pv('c', a.logic.conclusion);

    const box = $('#lg-result'); if (!box) return;
    const prem = a.logic.premises.filter(filled);
    if (!prem.length && !filled(a.logic.conclusion)) { box.innerHTML = `<div class="empty sm"><p>Add premises and a conclusion to test validity.</p></div>`; return; }
    const r = Logic.analyze(a.logic.premises, a.logic.conclusion);
    if (!r.ok) { box.innerHTML = `<div class="verdict-card neutral"><h3>${icon('info')} Not ready</h3><p>${esc(r.errors[0].where)}: ${esc(r.errors[0].message)}</p></div>`; return; }

    const lbl = (v) => labels[v] ? `${v} (“${labels[v]}”)` : v;
    let head;
    if (!r.premisesConsistent) head = `<div class="verdict-card bad"><h3>${icon('alert')} Premises contradict each other</h3><p>No possible situation makes every premise true at once. Technically that makes the argument “valid” (vacuously), but an opponent can show your premises can’t all hold.</p></div>`;
    else if (r.valid) head = `<div class="verdict-card good"><h3>${icon('check')} Valid</h3><p>In every case where all ${r.premises.length} premise${r.premises.length > 1 ? 's are' : ' is'} true, the conclusion is true too. If your premises are true, your conclusion is <em>guaranteed</em>.</p>${r.tautology ? '<p class="fine">Note: the conclusion is true in every case on its own (a tautology), so the premises aren’t doing any work.</p>' : ''}</div>`;
    else {
      const ce = r.counterexample;
      const desc = r.vars.map(v => `${lbl(v)} is <strong>${ce[v] ? 'true' : 'false'}</strong>`).join(', ');
      head = `<div class="verdict-card bad"><h3>${icon('x')} Invalid</h3><p>The premises don’t guarantee the conclusion. <strong>Counter-example:</strong> suppose ${desc}. Then every premise is true, but the conclusion is false.</p><p class="fine">This is exactly the move a sharp opponent will make: “Your reasons could all be true and your conclusion still wrong.”</p></div>`;
    }
    const forms = r.forms.length ? `<div class="forms">${r.forms.map(f => `<div class="form ${f.valid ? 'good' : 'bad'}"><span class="form-tag">${f.valid ? 'Valid form' : 'Fallacy'}</span><strong>${esc(f.name)}</strong><p>${esc(f.explain)}</p></div>`).join('')}</div>` : '';

    const rows = S.ui.ttAll ? r.rows : r.rows.filter(x => x.critical || x.counter);
    const T = (b) => `<td class="${b ? 't' : 'f'}">${b ? 'T' : 'F'}</td>`;
    const table = `<div class="tt-head"><h3 class="card-title">Truth table</h3>
      <div class="seg sm"><button class="${!S.ui.ttAll ? 'on' : ''}" data-action="tt" data-all="0">Critical rows</button><button class="${S.ui.ttAll ? 'on' : ''}" data-action="tt" data-all="1">All ${r.rows.length}</button></div></div>
      <p class="fine">${S.ui.ttAll ? 'Every combination of truth values.' : 'Only rows where all premises are true. If the conclusion is T in each, the argument is valid.'}</p>
      <div class="tt-wrap"><table class="tt"><thead><tr>${r.vars.map(v => `<th class="var">${esc(v)}</th>`).join('')}${r.premises.map((p, i) => `<th title="${esc(p.pretty)}">P${i + 1}</th>`).join('')}<th class="cc" title="${esc(r.conclusion.pretty)}">∴</th></tr></thead>
      <tbody>${rows.slice(0, 256).map(x => `<tr class="${x.counter ? 'counter' : x.critical ? 'critical' : ''}">${r.vars.map(v => T(x.env[v])).join('')}${x.premises.map(T).join('')}${T(x.conclusion)}</tr>`).join('') || `<tr><td colspan="99" class="muted">No row makes every premise true.</td></tr>`}</tbody></table></div>
      ${rows.length > 256 ? `<p class="fine">Showing first 256 of ${rows.length} rows.</p>` : ''}`;
    box.innerHTML = head + forms + `<section class="card">${table}</section>`;
  }

  /* ---------- Present ---------- */
  function deck(a) {
    const out = [];
    const q = QUALS.find(x => x.id === a.qualifier.level);
    const defs = a.definitions.filter(d => filled(d.term));
    if (filled(a.frame) || defs.length) out.push({ part: 'frame', label: 'Frame', text: a.frame, sub: defs.map(d => `${d.term}: ${d.meaning}`).join('\n') });
    if (filled(a.claim)) out.push({ part: 'claim', label: 'Claim', text: a.claim, sub: q ? `${q.label}${filled(a.qualifier.text) ? ' — ' + a.qualifier.text : ''}` : '' });
    a.data.filter(d => filled(d.text)).forEach((d, i, arr) => out.push({ part: 'data', label: `Evidence ${i + 1} of ${arr.length}`, text: d.text, sub: d.source }));
    if (filled(a.warrant)) out.push({ part: 'warrant', label: 'Why it matters', text: a.warrant });
    a.backing.filter(d => filled(d.text)).forEach(d => out.push({ part: 'backing', label: 'Backing', text: d.text, sub: d.source }));
    a.rebuttals.filter(r => filled(r.objection)).forEach(r => out.push({ part: 'rebuttals', label: 'They’ll say', text: r.objection, sub: r.response ? 'Answer: ' + r.response : 'No answer prepared' }));
    if (filled(a.claim)) out.push({ part: 'claim', label: 'Close', text: `Therefore${q ? ', ' + q.label.toLowerCase() : ''}: ${a.claim}` });
    return out;
  }

  function script(a) {
    const q = QUALS.find(x => x.id === a.qualifier.level);
    const data = a.data.filter(d => filled(d.text));
    const backing = a.backing.filter(d => filled(d.text));
    const reb = a.rebuttals.filter(r => filled(r.objection));
    const defs = a.definitions.filter(d => filled(d.term) && filled(d.meaning));
    const ord = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'];
    // Lowercase a leading word unless it looks like a proper noun: an acronym, “I”, or a word that also
    // appears capitalized mid-sentence somewhere in this argument (e.g. “California”).
    const corpus = [a.frame, a.burden, a.claim, a.warrant, a.qualifier.text, ...a.data.map(d => d.text + ' ' + d.source), ...a.backing.map(d => d.text + ' ' + d.source), ...a.rebuttals.map(r => r.objection + ' ' + r.response), ...a.definitions.map(d => d.meaning)].join('. ');
    const lowerWords = new Set((corpus.match(/\b[a-z][a-z’']*/g) || []));
    const proper = new Set((corpus.match(/[a-z,;:—–-]\s+([A-Z][a-z]+)/g) || []).map(m => m.replace(/^[^A-Z]+/, '')).filter(w => !lowerWords.has(w.toLowerCase())));
    const lc = (s) => {
      if (!s) return s;
      const w = (s.match(/^[A-Za-z’']+/) || [''])[0];
      if (!w || w === 'I' || /^[A-Z]{2,}/.test(w) || proper.has(w)) return s;
      return s.charAt(0).toLowerCase() + s.slice(1);
    };
    // Remove a trailing period, but keep abbreviations like “a.m.” or “U.S.”
    const stripDot = (s) => { s = String(s || '').trim(); return /(\b[A-Za-z]\.){2,}$/.test(s) ? s : s.replace(/[.\s]+$/, ''); };
    const P = [];
    if (a.mode === 'opponent') {
      if (filled(a.claim)) P.push(`My opponent claims that ${lc(stripDot(a.claim))}.`);
      if (data.length) P.push(`They rest that on ${data.length} piece${data.length > 1 ? 's' : ''} of evidence: ${data.map(d => lc(stripDot(d.text))).join('; ')}.`);
      P.push(filled(a.warrant) ? `But notice the assumption doing all the work: ${lc(stripDot(a.warrant))}. That assumption is never proven.` : 'But notice they never explain why that evidence leads to their conclusion. That missing link is the whole argument.');
      reb.forEach((r, i) => P.push(`${ord[i] || 'Next'}, ${lc(stripDot(r.objection))}.${filled(r.response) ? ` If they reply that ${lc(stripDot(r.response))}, that still doesn’t repair the gap.` : ''}`));
      P.push('So even granting their facts, their conclusion does not follow.');
      return P;
    }
    if (filled(a.frame)) P.push(stripDot(a.frame) + '.');
    if (defs.length) P.push(`Let me define my terms. ${defs.map(d => `By “${d.term},” I mean ${lc(stripDot(d.meaning))}.`).join(' ')}`);
    if (filled(a.claim)) P.push(`My position is this: ${lc(stripDot(a.claim))}${filled(a.qualifier.text) ? ` — ${stripDot(a.qualifier.text)}` : ''}.`);
    if (data.length) P.push(`I’ll support that with ${data.length === 1 ? 'one key piece' : data.length + ' pieces'} of evidence. ` + data.map((d, i) => `${data.length > 1 ? (ord[i] || 'Next') + ', ' : ''}${lc(stripDot(d.text))}${filled(d.source) ? ` (${stripDot(d.source)})` : ''}.`).join(' '));
    if (filled(a.warrant)) P.push(`Why does this matter? Because ${lc(stripDot(a.warrant))}.`);
    if (backing.length) P.push(`And that principle isn’t just my opinion: ${backing.map(b => lc(stripDot(b.text)) + (filled(b.source) ? ` (${stripDot(b.source)})` : '')).join('; ')}.`);
    reb.forEach((r) => P.push(`Now, my opponent may argue that ${lc(stripDot(r.objection))}. ${filled(r.response) ? stripDot(r.response) + '.' : '[Prepare a response.]'}`));
    if (filled(a.claim)) P.push(`Therefore${q ? ', ' + (q.id === 'certainly' ? 'clearly' : q.label.toLowerCase()) : ''}, ${lc(stripDot(a.claim))}.`);
    return P.map(p => p.replace(/(\b[A-Za-z]\.)\.(?!\.)/g, '$1'));
  }

  function renderPresent(a) {
    const mode = S.ui.present;
    const seg = `<div class="seg present-seg">${[['map', 'Map'], ['script', 'Script'], ['cards', 'Cards']].map(([k, l]) => `<button class="${mode === k ? 'on' : ''}" data-action="present-mode" data-mode="${k}">${l}</button>`).join('')}</div>`;
    if (!filled(a.claim)) return seg + `<div class="empty">${icon('podium', 'xl')}<h3>Nothing to present yet</h3><p>Add at least a claim on the Build tab.</p></div>`;
    if (mode === 'script') {
      const P = script(a);
      const words = P.join(' ').split(/\s+/).length;
      const secs = Math.round(words / 150 * 60);
      return seg + `<section class="card script-card">
        <div class="script-head"><div><p class="eyebrow">Speech script · signposted</p><p class="muted sm">${words} words · about ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} at 150 wpm</p></div>
        <button class="btn ghost sm" data-action="copy-script">${icon('copy')}Copy</button></div>
        <div class="script">${P.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>
        <p class="fine">Generated from your Build fields. Signposting (“First… Second… Therefore…”) makes your structure audible to judges.</p>`;
    }
    if (mode === 'cards') {
      const D = deck(a);
      const i = clamp(S.ui.card, 0, D.length - 1); S.ui.card = i;
      const c = D[i];
      return seg + `<div class="cards-stage" id="cards-stage">
        ${timerHTML()}
        <div class="bigcard part-${c.part}" id="bigcard">
          <div class="bc-top"><span class="part-glyph">${PARTS[c.part].glyph}</span><span class="bc-label">${esc(c.label)}</span><span class="bc-count">${i + 1} / ${D.length}</span></div>
          <div class="bc-text">${esc(c.text)}</div>
          ${c.sub ? `<div class="bc-sub">${esc(c.sub).replace(/\n/g, '<br>')}</div>` : ''}
        </div>
        <div class="bc-nav">
          <button class="btn ghost" data-action="card" data-d="-1" ${i === 0 ? 'disabled' : ''}>${icon('back')}Prev</button>
          <div class="pips">${D.map((d, k) => `<i class="${k === i ? 'on' : ''} part-${d.part}"></i>`).join('')}</div>
          <button class="btn primary" data-action="card" data-d="1" ${i === D.length - 1 ? 'disabled' : ''}>Next${icon('next')}</button>
        </div>
        <button class="btn ghost sm fs-btn" data-action="fullscreen">${icon('expand')}Full screen</button>
      </div>`;
    }
    // map
    const q = QUALS.find(x => x.id === a.qualifier.level);
    const data = a.data.filter(d => filled(d.text));
    const backing = a.backing.filter(d => filled(d.text));
    const reb = a.rebuttals.filter(r => filled(r.objection));
    const box = (k, inner, empty) => `<div class="mbox part-${k} ${inner ? '' : 'missing'}"><span class="mbox-label">${PARTS[k].label}</span>${inner || `<span class="missing-txt">${empty}</span>`}</div>`;
    return seg + `<div class="tmap">
      <div class="tm-data">${box('data', data.map(d => `<p>${esc(d.text)}</p>`).join(''), 'No data — what are your grounds?')}</div>
      <div class="tm-arrow"><span class="tm-line"></span><span class="tm-q ${q ? '' : 'missing'}">${q ? esc(q.label) : 'No qualifier'}${filled(a.qualifier.text) ? `<small>${esc(a.qualifier.text)}</small>` : ''}</span><span class="tm-line arrow"></span></div>
      <div class="tm-claim">${box('claim', `<p class="tm-claim-text">${esc(a.claim)}</p>`)}</div>
      <div class="tm-warrant">${box('warrant', filled(a.warrant) ? `<p>${esc(a.warrant)}</p>` : '', 'Missing — why does the data prove the claim?')}</div>
      <div class="tm-backing">${box('backing', backing.map(d => `<p>${esc(d.text)}</p>`).join(''), 'No backing for the warrant')}</div>
      <div class="tm-rebut">${box('rebuttals', reb.map(r => `<p><span class="unless">Unless</span> ${esc(r.objection)}</p>`).join(''), 'No objections anticipated')}</div>
    </div>
    <p class="fine center">Toulmin layout: data leads through the qualifier to the claim; the warrant licenses that step and backing supports the warrant; rebuttals mark where the claim might not hold.</p>`;
  }

  /* ---------- timer ---------- */
  function fmt(s) { const neg = s < 0; s = Math.abs(Math.round(s)); return (neg ? '+' : '') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function timerHTML() {
    const T = S.ui.timer;
    const state = T.left <= 0 ? 'over' : T.left <= 30 ? 'warn' : '';
    return `<div class="timer ${state}" id="timer">
      <span class="tm-time" id="tm-time">${fmt(T.left)}</span>
      <div class="tm-presets">${[60, 120, 180, 240, 300, 480].map(s => `<button class="${T.total === s ? 'on' : ''}" data-action="timer-set" data-s="${s}">${s / 60}m</button>`).join('')}</div>
      <button class="icon-btn" data-action="timer-toggle" aria-label="${T.running ? 'Pause' : 'Start'} timer">${icon(T.running ? 'pause' : 'play')}</button>
      <button class="icon-btn" data-action="timer-reset" aria-label="Reset timer">${icon('reset')}</button>
      <span class="tm-bar"><span style="width:${clamp(T.left / T.total * 100, 0, 100)}%"></span></span>
    </div>`;
  }
  function tick() {
    const T = S.ui.timer; const n = performance.now();
    T.left -= (n - T.last) / 1000; T.last = n;
    const el = $('#timer');
    if (el) {
      $('#tm-time').textContent = fmt(T.left);
      el.className = 'timer ' + (T.left <= 0 ? 'over' : T.left <= 30 ? 'warn' : '');
      $('.tm-bar span', el).style.width = clamp(T.left / T.total * 100, 0, 100) + '%';
    }
  }
  function startTimer() { const T = S.ui.timer; T.running = true; T.last = performance.now(); clearInterval(T.handle); T.handle = setInterval(tick, 200); }
  function stopTimer() { const T = S.ui.timer; T.running = false; clearInterval(T.handle); }
  function refreshTimer() { const el = $('#timer'); if (el) el.outerHTML = timerHTML(); }

  /* ---------- Review ---------- */
  function packet(a, opts) {
    const q = QUALS.find(x => x.id === a.qualifier.level);
    const L = [];
    const data = a.data.filter(d => filled(d.text));
    const backing = a.backing.filter(d => filled(d.text));
    const reb = a.rebuttals.filter(r => filled(r.objection) || filled(r.response));
    const defs = a.definitions.filter(d => filled(d.term));
    L.push(`# Argument review request: ${a.title || 'Untitled argument'}`, '');
    L.push(a.mode === 'opponent'
      ? 'This is my OPPONENT’s argument, mapped into the Toulmin model. Help me find exactly where it is weakest and how to attack it.'
      : 'Please review my argument rigorously using the Toulmin model. I am preparing for a debate. Be direct about weaknesses — I want to find them before my opponent does.');
    L.push('');
    if (filled(a.resolution) || a.side !== 'none') L.push('## Context', filled(a.resolution) ? `- Resolution: ${a.resolution}` : '', a.side !== 'none' ? `- My side: ${sideLabel(a.side)}` : '', '');
    if (filled(a.frame) || filled(a.burden) || defs.length) {
      L.push('## Frame & definitions');
      if (filled(a.frame)) L.push(`- Frame: ${a.frame}`);
      if (filled(a.burden)) L.push(`- Burden of proof: ${a.burden}`);
      defs.forEach(d => L.push(`- **${d.term}**: ${d.meaning || '(undefined)'}`));
      L.push('');
    }
    L.push('## Claim', a.claim || '(none)', '');
    L.push('## Qualifier', q ? q.label + (filled(a.qualifier.text) ? ` — ${a.qualifier.text}` : '') : '(none)', '');
    L.push('## Data');
    data.length ? data.forEach((d, i) => L.push(`${i + 1}. ${d.text}${filled(d.source) ? `  \n   Source: ${d.source}` : '  \n   Source: (none given)'}`)) : L.push('(none)');
    L.push('', '## Warrant', a.warrant || '(none)', '');
    L.push('## Backing');
    backing.length ? backing.forEach((d, i) => L.push(`${i + 1}. ${d.text}${filled(d.source) ? ` — ${d.source}` : ''}`)) : L.push('(none)');
    L.push('', '## Anticipated rebuttals');
    reb.length ? reb.forEach((r, i) => L.push(`${i + 1}. They say: ${r.objection || '(blank)'}  \n   I answer: ${r.response || '(no answer yet)'}`)) : L.push('(none)');
    L.push('');
    const prem = a.logic.premises.filter(filled);
    if (prem.length && filled(a.logic.conclusion)) {
      L.push('## Formal logic');
      a.logic.props.filter(p => filled(p.sym)).forEach(p => L.push(`- ${p.sym} = ${p.text}`));
      prem.forEach((p, i) => L.push(`- P${i + 1}: \`${p}\``));
      L.push(`- Therefore: \`${a.logic.conclusion}\``);
      const r = Logic.analyze(a.logic.premises, a.logic.conclusion);
      if (r.ok) L.push(`- Truth-table result: ${r.valid ? 'VALID' : 'INVALID'}${r.forms.length ? ' (' + r.forms.map(f => f.name).join(', ') + ')' : ''}`);
      L.push('');
    }
    if (opts.findings) {
      const an = analysisFor(a);
      if (!an.incomplete) {
        L.push(`## My app’s self-check: ${an.score}/100 (${an.verdict})`);
        an.findings.filter(f => f.level === 'fail' || f.level === 'warn').forEach(f => L.push(`- [${f.level}] ${f.title}`));
        L.push('');
      }
    }
    if (opts.playbook && S.playbook.length) {
      L.push('## Lessons I’m working on (from past reviews)');
      S.playbook.slice(0, 12).forEach(l => L.push(`- ${l.text}`));
      L.push('');
    }
    L.push('## What I need from you',
      '1. Is the structure logically valid? Is it sound (are the premises actually true and well-sourced)?',
      '2. What is the single weakest link, and why?',
      '3. The 2–3 strongest counter-arguments an opponent would make, and how I should answer each.',
      '4. Any fallacies, overclaiming, or loaded language.',
      '5. Concrete rewrites of the claim and warrant if they can be stronger.',
      '6. Flag any factual claims you believe are inaccurate or need verification.', '');
    L.push('## Reply format',
      'Write your review in plain prose first. Then END your reply with one fenced JSON block in exactly this shape so my app can import it (omit any key you have no suggestion for):',
      '```json',
      '{',
      '  "score": 0,',
      '  "verdict": "one short sentence",',
      '  "lessons": ["A general, reusable lesson about my argumentation habits (not specific to this topic)"],',
      '  "suggestions": {',
      '    "claim": "rewritten claim",',
      '    "warrant": "rewritten warrant",',
      '    "qualifier": "certainly | very-likely | probably | plausibly | possibly",',
      '    "data": ["additional evidence I should find or add"],',
      '    "rebuttals": [{ "objection": "...", "response": "..." }]',
      '  }',
      '}',
      '```');
    return L.filter((x, i, arr) => !(x === '' && arr[i - 1] === '')).join('\n');
  }

  function extractJSON(text) {
    const blocks = [...String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m => m[1]).reverse();
    for (const b of blocks) { try { const o = JSON.parse(b.trim()); if (o && typeof o === 'object') return o; } catch (e) { } }
    // Fallback: find a balanced {...} that contains "lessons" or "suggestions"
    const s = String(text);
    for (const key of ['"lessons"', '"suggestions"', '"score"']) {
      const k = s.lastIndexOf(key); if (k < 0) continue;
      for (let start = s.lastIndexOf('{', k); start >= 0; start = s.lastIndexOf('{', start - 1)) {
        let depth = 0, inStr = false, escp = false;
        for (let i = start; i < s.length; i++) {
          const c = s[i];
          if (inStr) { if (escp) escp = false; else if (c === '\\') escp = true; else if (c === '"') inStr = false; continue; }
          if (c === '"') inStr = true;
          else if (c === '{') depth++;
          else if (c === '}') { depth--; if (depth === 0) { try { const o = JSON.parse(s.slice(start, i + 1)); if (o && (o.lessons || o.suggestions || o.score != null)) return o; } catch (e) { } break; } }
        }
        if (start === 0) break;
      }
    }
    return null;
  }

  function cleanParsed(o) {
    if (!o) return null;
    const str = (x, n = 2000) => typeof x === 'string' ? x.trim().slice(0, n) : '';
    const sg = o.suggestions && typeof o.suggestions === 'object' ? o.suggestions : {};
    const out = {
      score: Number.isFinite(+o.score) ? clamp(Math.round(+o.score), 0, 100) : null,
      verdict: str(o.verdict, 300),
      lessons: (Array.isArray(o.lessons) ? o.lessons : []).map(x => str(x, 400)).filter(Boolean).slice(0, 20),
      suggestions: {
        claim: str(sg.claim), warrant: str(sg.warrant),
        qualifier: QUALS.some(q => q.id === str(sg.qualifier)) ? str(sg.qualifier) : (QUALS.find(q => q.label.toLowerCase() === str(sg.qualifier).toLowerCase()) || {}).id || '',
        data: (Array.isArray(sg.data) ? sg.data : []).map(x => str(typeof x === 'object' && x ? x.text : x)).filter(Boolean).slice(0, 10),
        backing: (Array.isArray(sg.backing) ? sg.backing : []).map(x => str(typeof x === 'object' && x ? x.text : x)).filter(Boolean).slice(0, 10),
        rebuttals: (Array.isArray(sg.rebuttals) ? sg.rebuttals : []).filter(x => x && typeof x === 'object').map(x => ({ objection: str(x.objection), response: str(x.response) })).filter(x => x.objection).slice(0, 10)
      }
    };
    return out;
  }

  function renderReview(a) {
    const P = packet(a, S.ui.reviewOpts);
    const latest = a.reviews.slice().sort((x, y) => y.date - x.date)[0];
    const sugg = latest && latest.parsed ? latest.parsed.suggestions : null;
    const sugRow = (key, label, value, idx) => {
      const k = idx != null ? `${key}.${idx}` : key;
      const done = latest.applied && latest.applied[k];
      return `<div class="sugg ${done ? 'done' : ''}"><div><span class="sugg-k">${label}</span><p>${esc(value)}</p></div>
        <button class="btn ${done ? 'ghost' : 'primary'} sm" data-action="apply" data-key="${key}" ${idx != null ? `data-idx="${idx}"` : ''} ${done ? 'disabled' : ''}>${done ? icon('check') + 'Applied' : (key === 'claim' || key === 'warrant' || key === 'qualifier' ? 'Replace' : 'Add')}</button></div>`;
    };
    let suggHTML = '';
    if (sugg) {
      const rows = [];
      if (sugg.claim) rows.push(sugRow('claim', 'Claim', sugg.claim));
      if (sugg.warrant) rows.push(sugRow('warrant', 'Warrant', sugg.warrant));
      if (sugg.qualifier) rows.push(sugRow('qualifier', 'Qualifier', (QUALS.find(q => q.id === sugg.qualifier) || {}).label));
      sugg.data.forEach((d, i) => rows.push(sugRow('data', 'Evidence to add', d, i)));
      sugg.backing.forEach((d, i) => rows.push(sugRow('backing', 'Backing to add', d, i)));
      sugg.rebuttals.forEach((r, i) => rows.push(sugRow('rebuttals', 'Objection to prepare', r.objection + (r.response ? ' → ' + r.response : ''), i)));
      if (rows.length) suggHTML = `<section class="card"><h3 class="card-title">${icon('spark')} Suggested edits <span class="muted sm">from ${ago(latest.date)}</span></h3>${latest.parsed.verdict ? `<p class="review-verdict">${latest.parsed.score != null ? `<strong>${latest.parsed.score}/100</strong> · ` : ''}${esc(latest.parsed.verdict)}</p>` : ''}<div class="suggs">${rows.join('')}</div></section>`;
    }
    return `
      <section class="card step">
        <div class="step-n">1</div>
        <div class="step-body">
          <h3 class="card-title">Send it for review</h3>
          <p class="muted">Creates a review packet with your full argument and a request for structured feedback. Paste it to Claude — or share it with a coach or teammate.</p>
          <div class="opts">
            <label class="check"><input type="checkbox" data-action="ropt" data-k="findings" ${S.ui.reviewOpts.findings ? 'checked' : ''}><span>Include self-check results</span></label>
            <label class="check"><input type="checkbox" data-action="ropt" data-k="playbook" ${S.ui.reviewOpts.playbook ? 'checked' : ''}><span>Include my playbook lessons</span></label>
          </div>
          <details class="packet-wrap"><summary>Preview packet · ${P.split(/\s+/).length} words</summary><pre class="packet">${esc(P)}</pre></details>
          <div class="btn-row">
            <button class="btn primary" data-action="copy-packet">${icon('copy')}Copy packet</button>
            <button class="btn ghost" data-action="share-packet">${icon('share')}Share</button>
            <button class="btn ghost" data-action="download-packet">${icon('download')}.md</button>
          </div>
        </div>
      </section>
      <section class="card step">
        <div class="step-n">2</div>
        <div class="step-body">
          <h3 class="card-title">Bring the review back</h3>
          <p class="muted">Paste the full reply. Warrant pulls out the JSON block, adds general lessons to your <a href="#/playbook">Playbook</a> so future arguments learn from this one, and lets you apply suggested edits.</p>
          <textarea class="field" id="review-paste" rows="5" placeholder="Paste the reviewer’s full reply here…"></textarea>
          <div class="btn-row"><button class="btn primary" data-action="save-review">${icon('check')}Save review</button></div>
        </div>
      </section>
      ${suggHTML}
      ${a.reviews.length ? `<section class="card"><h3 class="card-title">Review history <span class="muted">${a.reviews.length}</span></h3>
        ${a.reviews.slice().sort((x, y) => y.date - x.date).map(rv => `<details class="rv"><summary><span>${new Date(rv.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>${rv.parsed && rv.parsed.score != null ? `<span class="rv-score tone-${tone(rv.parsed.score)}">${rv.parsed.score}</span>` : ''}<button class="icon-btn subtle" data-action="rm-review" data-id="${rv.id}" aria-label="Delete review">${icon('trash')}</button></summary><div class="rv-text">${esc(rv.text)}</div></details>`).join('')}</section>` : ''}`;
  }

  /* ------------------------------------------------------------------ render: ideas / playbook / settings */
  function pageHead(title, sub, eyebrow) {
    return `<header class="page-head"><a href="#/" class="icon-btn back-btn" aria-label="Back">${icon('back')}</a><div><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></header>`;
  }

  function renderIdeas() {
    return `<div class="page">
      ${pageHead('Ideas', 'Capture angles, hunches, and questions. Develop the good ones into full arguments.', 'Brainstorm')}
      <section class="card capture">
        <textarea class="field lg" id="idea-input" rows="3" placeholder="What if… / Someone could argue… / Question to research…"></textarea>
        <div class="btn-row"><span class="fine">Ctrl/⌘ + Enter to save</span><button class="btn primary" data-action="add-idea">${icon('plus')}Capture</button></div>
      </section>
      <div class="ideas">${S.ideas.length ? S.ideas.map(i => `
        <article class="idea">
          <p>${esc(i.text)}</p>
          <footer><span class="fine">${ago(i.date)}</span>
            <div class="btn-row tight">
              <button class="btn ghost sm" data-action="develop" data-id="${i.id}">Develop ${icon('next')}</button>
              <button class="icon-btn subtle" data-action="rm-idea" data-id="${i.id}" aria-label="Delete idea">${icon('trash')}</button>
            </div></footer>
        </article>`).join('') : `<div class="empty sm"><p>No ideas yet.</p></div>`}</div>
    </div>`;
  }

  function renderPlaybook() {
    return `<div class="page">
      ${pageHead('Playbook', 'General lessons about how you argue — collected from reviews and your own notes. They appear while you build and are sent along with future review requests, so feedback compounds.', 'What you’ve learned')}
      <section class="card capture">
        <div class="inline-add"><input class="field" id="lesson-input" placeholder="Add a lesson, e.g. “Always source the statistic before the debate.”"><button class="btn primary" data-action="add-lesson">${icon('plus')}Add</button></div>
      </section>
      <ol class="playbook">${S.playbook.length ? S.playbook.map((l, i) => `
        <li class="lesson"><span class="lesson-n">${String(i + 1).padStart(2, '0')}</span><div><p>${esc(l.text)}</p><span class="fine">${esc(l.source || 'Added manually')} · ${ago(l.date)}</span></div>
        <button class="icon-btn subtle" data-action="rm-lesson" data-id="${l.id}" aria-label="Delete lesson">${icon('trash')}</button></li>`).join('') : `<div class="empty sm"><p>Lessons appear here after you save a review, or add your own above.</p></div>`}</ol>
    </div>`;
  }

  function renderSettings() {
    const th = S.settings.theme;
    return `<div class="page">
      ${pageHead('Settings', '', 'Preferences & data')}
      <section class="card">
        <h3 class="card-title">Appearance</h3>
        <div class="seg">${[['system', 'System'], ['light', 'Paper'], ['dark', 'Ink']].map(([k, l]) => `<button class="${th === k ? 'on' : ''}" data-action="theme" data-theme="${k}">${l}</button>`).join('')}</div>
      </section>
      <section class="card">
        <h3 class="card-title">Offline & install</h3>
        <p class="muted">${S.ui.swReady ? 'Warrant is cached on this device and works without a connection.' : 'The offline cache activates when Warrant is served over HTTPS (e.g. GitHub Pages) and loaded once.'}</p>
        ${S.ui.installEvt ? `<button class="btn primary" data-action="install">${icon('install')}Install app</button>` : `<p class="fine">To install: in Safari, Share → Add to Home Screen. In Chrome, menu → Install app.</p>`}
      </section>
      <section class="card">
        <h3 class="card-title">Your data</h3>
        <p class="muted">Everything is stored only on this device. Export a backup regularly, or to move to another device.</p>
        <div class="btn-row">
          <button class="btn ghost" data-action="export-all">${icon('download')}Export backup</button>
          <label class="btn ghost">${icon('upload')}Import<input type="file" accept=".json,application/json" data-action="import" hidden></label>
        </div>
        <p class="fine">${S.args.length} arguments · ${S.ideas.length} ideas · ${S.playbook.length} lessons. Import accepts a full backup or a single shared argument.</p>
      </section>
      <section class="card danger-zone">
        <h3 class="card-title">Danger zone</h3>
        <button class="btn danger" data-action="erase">${icon('trash')}Erase all data</button>
      </section>
      <p class="fine center">Warrant v${VERSION} · No accounts, no tracking, no server.</p>
    </div>`;
  }

  /* ------------------------------------------------------------------ theme */
  function applyTheme() {
    const t = S.settings.theme;
    const dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', dark ? '#0e1015' : '#f5f2eb'));
  }

  /* ------------------------------------------------------------------ live refresh */
  let liveT = null;
  function scheduleLive() {
    clearTimeout(liveT);
    liveT = setTimeout(() => {
      const a = current(); if (!a) return;
      const r = analysisFor(a);
      const sb = $('#score-badge'); if (sb) sb.innerHTML = scoreBadge(r);
      const it = $(`[data-arg-item="${a.id}"]`); if (it) it.outerHTML = argItem(a);
      if (S.route.tab === 'build') updateDots();
    }, 220);
  }

  function rerenderTab() {
    const body = $('.tab-body'); if (!body) return;
    const a = current(); const r = analysisFor(a);
    const y = window.scrollY, my = $('.main') ? $('.main').scrollTop : 0;
    body.innerHTML = ({ build: renderBuild, analyze: renderAnalyze, logic: renderLogic, present: renderPresent, review: renderReview })[S.route.tab](a, r);
    autosizeAll(body);
    if (S.route.tab === 'logic') updateLogicLive();
    if (S.route.tab === 'build') updateDots();
    window.scrollTo(0, y); if ($('.main')) $('.main').scrollTop = my;
    scheduleLive();
  }

  /* ------------------------------------------------------------------ events */
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('textarea')) autosize(el);
    const a = current();
    if (el.dataset.bind && a) {
      setPath(a, el.dataset.bind, el.value);
      touch(a);
      if (el.dataset.bind.startsWith('logic.')) updateLogicLive();
      scheduleLive();
      return;
    }
    if (el.dataset.action === 'search') {
      S.ui.search = el.value;
      const list = $('.arg-list');
      const tmp = document.createElement('div'); tmp.innerHTML = renderSide();
      list.innerHTML = $('.arg-list', tmp).innerHTML;
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target; const a = current();
    const act = el.dataset.action;
    if (act === 'tags' && a) {
      a.tags = [...new Set(el.value.split(',').map(t => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
      touch(a); $('.side').innerHTML = renderSide();
    }
    if (act === 'logic-example' && a && el.value !== '') {
      const ex = EXAMPLES[+el.value];
      a.logic = { props: ex.props.map(([s, t]) => ({ id: uid(), sym: s, text: t })), premises: ex.premises.slice(), conclusion: ex.conclusion };
      touch(a); rerenderTab();
    }
    if (act === 'ropt') { S.ui.reviewOpts[el.dataset.k] = el.checked; rerenderTab(); }
    if (act === 'import' && el.files && el.files[0]) importFile(el.files[0]);
  });

  document.addEventListener('focusin', (e) => {
    if (e.target.matches && e.target.matches('input.formula')) S.ui.lastFormula = e.target.dataset.bind;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#modal-root').classList.contains('open')) { closeModal(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (e.target.id === 'idea-input') { e.preventDefault(); addIdea(); }
      if (e.target.id === 'review-paste') { e.preventDefault(); saveReview(); }
    }
    if (e.key === 'Enter' && e.target.id === 'lesson-input') { e.preventDefault(); addLesson(); }
    if (S.route.tab === 'present' && S.ui.present === 'cards' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); moveCard(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); moveCard(-1); }
    }
  });

  let touchX = null;
  document.addEventListener('touchstart', (e) => { if (e.target.closest && e.target.closest('#bigcard')) touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) moveCard(dx < 0 ? 1 : -1);
  }, { passive: true });

  function moveCard(d) {
    const a = current(); if (!a) return;
    const n = deck(a).length;
    const nx = clamp(S.ui.card + d, 0, n - 1);
    if (nx === S.ui.card) return;
    S.ui.card = nx;
    const stage = $('#cards-stage');
    rerenderTab();
    const bc = $('#bigcard'); if (bc) { bc.classList.add(d > 0 ? 'enter-r' : 'enter-l'); }
    if (stage && document.fullscreenElement) { /* keep fullscreen on re-render */ }
  }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const act = t.dataset.action;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT') return; // handled by change/input
    const a = current();

    switch (act) {
      case 'close-modal': closeModal(); break;
      case 'new': templatePicker(); break;
      case 'create': {
        const extra = S.ui.pendingExtra; S.ui.pendingExtra = null;
        const n = newArg(t.dataset.template, extra);
        if (extra && extra._ideaId) { S.ideas = S.ideas.filter(i => i.id !== extra._ideaId); delete n._ideaId; save('ideas'); }
        closeModal(); go(`#/arg/${n.id}/build`);
        setTimeout(() => { const f = $(filled(n.claim) ? '.ed-title' : '[data-bind="claim"]'); f && f.focus(); }, 60);
        break;
      }
      case 'tag-filter': S.ui.tag = t.dataset.tag; $('.side').innerHTML = renderSide(); break;
      case 'side': a.side = t.dataset.side; touch(a); $$('.ed-meta .seg button').forEach(b => b.classList.toggle('on', b.dataset.side === a.side)); scheduleLive(); break;
      case 'qual': {
        a.qualifier.level = a.qualifier.level === t.dataset.level ? '' : t.dataset.level; touch(a);
        $$('.q-step').forEach(b => { const on = b.dataset.level === a.qualifier.level; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        scheduleLive(); break;
      }
      case 'add': {
        const list = t.dataset.list;
        const blank = { data: { text: '', source: '' }, backing: { text: '', source: '' }, rebuttals: { objection: '', response: '' }, definitions: { term: '', meaning: '' } }[list];
        const item = Object.assign({ id: uid() }, blank);
        a[list].push(item); touch(a); rerenderTab();
        const f = $(`[data-bind^="${list}#${item.id}."]`); f && f.focus();
        break;
      }
      case 'rm': {
        const list = t.dataset.list;
        const arr = list === 'logic.props' ? a.logic.props : a[list];
        const idx = arr.findIndex(x => x.id === t.dataset.id);
        if (idx < 0) break;
        const [removed] = arr.splice(idx, 1);
        touch(a); rerenderTab();
        const hasContent = Object.entries(removed).some(([k, v]) => k !== 'id' && filled(v));
        if (hasContent) toast('Removed', { action: 'Undo', onAction: () => { arr.splice(idx, 0, removed); touch(a); rerenderTab(); } });
        break;
      }
      case 'warrant-pattern': {
        a.warrant = 'When ___, then ___, because ___.'; touch(a); rerenderTab();
        const f = $('[data-bind="warrant"]'); if (f) { f.focus(); f.setSelectionRange(5, 8); }
        break;
      }
      case 'goto': {
        const field = t.dataset.field === 'definitions' ? 'frame' : t.dataset.field;
        if (field === 'logic') { go(`#/arg/${a.id}/logic`); break; }
        go(`#/arg/${a.id}/build`);
        setTimeout(() => {
          const sec = $(`[data-part="${field}"]`); if (!sec) return;
          sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sec.classList.add('flash'); setTimeout(() => sec.classList.remove('flash'), 1400);
          const f = $('textarea, input', sec); f && f.focus({ preventScroll: true });
        }, 50);
        break;
      }
      case 'toggle-mode': a.mode = a.mode === 'opponent' ? 'own' : 'opponent'; touch(a); render(); break;
      case 'arg-menu': argMenu(a); break;
      case 'duplicate': {
        const copy = normalizeArg(JSON.parse(JSON.stringify(Object.assign({}, a, { id: uid(), title: (a.title || 'Untitled') + ' (copy)', createdAt: Date.now(), updatedAt: Date.now(), example: false, reviews: [] }))));
        S.args.unshift(copy); save('args'); closeModal(); go(`#/arg/${copy.id}/build`); toast('Duplicated'); break;
      }
      case 'export-arg': download(`${slug(a.title)}.warrant.json`, JSON.stringify({ type: 'warrant-argument', version: VERSION, argument: a }, null, 2), 'application/json'); closeModal(); break;
      case 'share-arg': closeModal(); shareText(a.title || 'Argument', packet(a, { findings: false, playbook: false }).split('## What I need from you')[0].trim()); break;
      case 'delete-arg': {
        closeModal();
        const idx = S.args.indexOf(a); S.args.splice(idx, 1); save('args'); go('#/');
        toast('Argument deleted', { action: 'Undo', onAction: () => { S.args.splice(idx, 0, a); save('args'); go(`#/arg/${a.id}/build`); } });
        break;
      }
      // logic
      case 'add-prop': {
        const used = new Set(a.logic.props.map(p => p.sym));
        const sym = 'ABCDEGHJKLMNPQRSUVWXYZ'.split('').find(c => !used.has(c)) || '';
        a.logic.props.push({ id: uid(), sym, text: '' }); touch(a); rerenderTab();
        const f = $$('.prop-row input:not(.sym-field)').pop(); f && f.focus();
        break;
      }
      case 'add-premise': a.logic.premises.push(''); touch(a); rerenderTab(); { const f = $(`[data-bind="logic.premises.${a.logic.premises.length - 1}"]`); f && f.focus(); } break;
      case 'rm-premise': a.logic.premises.splice(+t.dataset.i, 1); if (!a.logic.premises.length) a.logic.premises.push(''); touch(a); rerenderTab(); break;
      case 'logic-clear': a.logic = { props: [], premises: ['', ''], conclusion: '' }; touch(a); rerenderTab(); break;
      case 'sym': {
        const bind = S.ui.lastFormula || 'logic.premises.0';
        const f = $(`[data-bind="${bind}"]`); if (!f) break;
        const s = t.dataset.sym, st = f.selectionStart ?? f.value.length, en = f.selectionEnd ?? f.value.length;
        const pad = /[A-Za-z0-9)]$/.test(f.value.slice(0, st)) && s !== ')' ? ' ' : '';
        const ins = pad + s + (/^[¬(]$/.test(s) ? '' : ' ');
        f.value = f.value.slice(0, st) + ins + f.value.slice(en);
        f.focus(); f.setSelectionRange(st + ins.length, st + ins.length);
        f.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
      case 'tt': S.ui.ttAll = t.dataset.all === '1'; updateLogicLive(); break;
      // present
      case 'present-mode': S.ui.present = t.dataset.mode; rerenderTab(); break;
      case 'card': moveCard(+t.dataset.d); break;
      case 'copy-script': if (await copyText(script(a).join('\n\n'))) toast('Script copied'); break;
      case 'fullscreen': {
        const st = $('#cards-stage');
        if (document.fullscreenElement) document.exitFullscreen();
        else if (st && st.requestFullscreen) st.requestFullscreen().catch(() => toast('Full screen not available here'));
        else toast('Full screen not available here');
        break;
      }
      case 'timer-set': stopTimer(); S.ui.timer.total = S.ui.timer.left = +t.dataset.s; refreshTimer(); break;
      case 'timer-toggle': S.ui.timer.running ? stopTimer() : startTimer(); refreshTimer(); break;
      case 'timer-reset': stopTimer(); S.ui.timer.left = S.ui.timer.total; refreshTimer(); break;
      // review
      case 'copy-packet': if (await copyText(packet(a, S.ui.reviewOpts))) toast('Packet copied — paste it into Claude'); else toast('Copy failed — use Download'); break;
      case 'share-packet': shareText(`Review: ${a.title || 'argument'}`, packet(a, S.ui.reviewOpts)); break;
      case 'download-packet': download(`${slug(a.title)}-review.md`, packet(a, S.ui.reviewOpts), 'text/markdown'); break;
      case 'save-review': saveReview(); break;
      case 'apply': applySuggestion(a, t.dataset.key, t.dataset.idx); break;
      case 'rm-review': e.preventDefault(); a.reviews = a.reviews.filter(r => r.id !== t.dataset.id); touch(a); rerenderTab(); break;
      // ideas & playbook
      case 'add-idea': addIdea(); break;
      case 'rm-idea': {
        const idx = S.ideas.findIndex(i => i.id === t.dataset.id); const [rem] = S.ideas.splice(idx, 1); save('ideas'); render();
        toast('Idea deleted', { action: 'Undo', onAction: () => { S.ideas.splice(idx, 0, rem); save('ideas'); render(); } });
        break;
      }
      case 'develop': {
        const idea = S.ideas.find(i => i.id === t.dataset.id);
        templatePicker({ claim: idea.text.length < 240 ? idea.text : '', notes: idea.text.length >= 240 ? idea.text : '', _ideaId: idea.id });
        break;
      }
      case 'add-lesson': addLesson(); break;
      case 'rm-lesson': {
        const idx = S.playbook.findIndex(l => l.id === t.dataset.id); const [rem] = S.playbook.splice(idx, 1); save('playbook'); render();
        toast('Lesson removed', { action: 'Undo', onAction: () => { S.playbook.splice(idx, 0, rem); save('playbook'); render(); } });
        break;
      }
      // settings
      case 'theme': S.settings.theme = t.dataset.theme; save('settings'); render(); break;
      case 'install': if (S.ui.installEvt) { S.ui.installEvt.prompt(); S.ui.installEvt = null; render(); } break;
      case 'export-all': download(`warrant-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'warrant', version: VERSION, exportedAt: new Date().toISOString(), arguments: S.args, ideas: S.ideas, playbook: S.playbook, settings: S.settings }, null, 2), 'application/json'); break;
      case 'erase': confirmDialog('Erase everything?', 'This permanently deletes every argument, idea, and lesson on this device. Export a backup first if you might need them.', 'Erase all', () => {
        S.args = []; S.ideas = []; S.playbook = []; save('args'); save('ideas'); save('playbook'); cache.clear(); go('#/'); toast('All data erased');
      }); break;
    }
  });

  function argMenu(a) {
    modal(`<div class="modal-head"><h2 class="modal-title">${esc(a.title || 'Untitled argument')}</h2><button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('x')}</button></div>
      <div class="menu">
        <button data-action="share-arg">${icon('share')}<span>Share as text<small>Send the argument outline to someone</small></span></button>
        <button data-action="export-arg">${icon('download')}<span>Export file<small>A .warrant.json others can import</small></span></button>
        <button data-action="duplicate">${icon('copy')}<span>Duplicate<small>Try a variation without losing this one</small></span></button>
        <button data-action="toggle-mode">${icon('swords')}<span>${a.mode === 'opponent' ? 'Mark as my argument' : 'Mark as opponent’s argument'}<small>Changes the attack plan and script</small></span></button>
        <button data-action="delete-arg" class="danger">${icon('trash')}<span>Delete<small>You can undo right after</small></span></button>
      </div>`, 'small');
    $$('.menu [data-action="toggle-mode"]').forEach(b => b.addEventListener('click', () => closeModal()));
  }

  function addIdea() {
    const el = $('#idea-input'); if (!el || !filled(el.value)) return;
    S.ideas.unshift({ id: uid(), text: el.value.trim(), date: Date.now() }); save('ideas'); render();
    const f = $('#idea-input'); f && f.focus();
  }
  function addLesson() {
    const el = $('#lesson-input'); if (!el || !filled(el.value)) return;
    S.playbook.unshift({ id: uid(), text: el.value.trim(), date: Date.now(), source: 'Added manually' }); save('playbook'); render();
    const f = $('#lesson-input'); f && f.focus();
  }

  function saveReview() {
    const a = current(); const el = $('#review-paste');
    if (!a || !el || !filled(el.value)) { toast('Paste a review first'); return; }
    const parsed = cleanParsed(extractJSON(el.value));
    const rv = { id: uid(), date: Date.now(), text: el.value.trim(), parsed, applied: {} };
    a.reviews.push(rv); touch(a);
    let added = [];
    if (parsed && parsed.lessons.length) {
      const existing = new Set(S.playbook.map(l => l.text.toLowerCase()));
      added = parsed.lessons.filter(l => !existing.has(l.toLowerCase())).map(text => ({ id: uid(), text, date: Date.now(), source: `Review of “${a.title || 'Untitled'}”` }));
      S.playbook.unshift(...added); save('playbook');
    }
    rerenderTab(); $('.side').innerHTML = renderSide();
    if (!parsed) toast('Review saved. No JSON block found — suggestions and lessons need it.', { ms: 4500 });
    else if (added.length) toast(`Review saved · ${added.length} lesson${added.length > 1 ? 's' : ''} added to your playbook`, { action: 'Undo lessons', onAction: () => { const ids = new Set(added.map(x => x.id)); S.playbook = S.playbook.filter(l => !ids.has(l.id)); save('playbook'); $('.side').innerHTML = renderSide(); } });
    else toast('Review saved');
  }

  function applySuggestion(a, key, idx) {
    const rv = a.reviews.slice().sort((x, y) => y.date - x.date)[0];
    if (!rv || !rv.parsed) return;
    const s = rv.parsed.suggestions;
    const before = JSON.parse(JSON.stringify(a));
    if (key === 'claim') a.claim = s.claim;
    else if (key === 'warrant') a.warrant = s.warrant;
    else if (key === 'qualifier') a.qualifier.level = s.qualifier;
    else if (key === 'data') { const t = s.data[+idx]; const blank = a.data.find(d => !filled(d.text)); blank ? (blank.text = t) : a.data.push({ id: uid(), text: t, source: '' }); }
    else if (key === 'backing') { const t = s.backing[+idx]; const blank = a.backing.find(d => !filled(d.text)); blank ? (blank.text = t) : a.backing.push({ id: uid(), text: t, source: '' }); }
    else if (key === 'rebuttals') { const r = s.rebuttals[+idx]; const blank = a.rebuttals.find(d => !filled(d.objection) && !filled(d.response)); blank ? Object.assign(blank, r) : a.rebuttals.push({ id: uid(), ...r }); }
    rv.applied[idx != null ? `${key}.${idx}` : key] = true;
    touch(a); rerenderTab();
    toast('Applied', { action: 'Undo', onAction: () => { const i = S.args.findIndex(x => x.id === a.id); S.args[i] = normalizeArg(before); save('args'); render(); } });
  }

  async function importFile(file) {
    try {
      const o = JSON.parse(await file.text());
      if (o && o.type === 'warrant-argument' && o.argument) {
        const arg = normalizeArg(o.argument);
        if (S.args.some(x => x.id === arg.id)) arg.id = uid();
        arg.updatedAt = Date.now(); S.args.unshift(arg); save('args');
        toast('Argument imported'); go(`#/arg/${arg.id}/build`); return;
      }
      if (o && o.app === 'warrant') {
        let n = 0;
        (o.arguments || []).forEach(x => {
          const arg = normalizeArg(x); const i = S.args.findIndex(y => y.id === arg.id);
          if (i < 0) { S.args.push(arg); n++; } else if (arg.updatedAt > S.args[i].updatedAt) { S.args[i] = arg; n++; }
        });
        const ideaIds = new Set(S.ideas.map(i => i.id)); (o.ideas || []).forEach(i => { if (!ideaIds.has(i.id)) S.ideas.push(i); });
        const lessonTxt = new Set(S.playbook.map(l => l.text)); (o.playbook || []).forEach(l => { if (!lessonTxt.has(l.text)) S.playbook.push(l); });
        save('args'); save('ideas'); save('playbook'); cache.clear(); render();
        toast(`Imported · ${n} argument${n === 1 ? '' : 's'} added or updated`); return;
      }
      toast('That file isn’t a Warrant backup or argument');
    } catch (e) { toast('Could not read that file'); }
  }

  /* ------------------------------------------------------------------ boot */
  window.addEventListener('hashchange', route);
  window.addEventListener('online', () => $('.side') && ($('.side').innerHTML = renderSide()));
  window.addEventListener('offline', () => $('.side') && ($('.side').innerHTML = renderSide()));
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.ui.installEvt = e; if (S.route.view === 'settings') render(); });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S.settings.theme === 'system' && applyTheme());
  let rsT; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => autosizeAll(), 150); });

  async function boot() {
    await load();
    route();
    Store.persist();
    try {
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        const reg = await navigator.serviceWorker.register('sw.js');
        const ready = () => { S.ui.swReady = true; const s = $('.side'); if (s) s.innerHTML = renderSide(); };
        if (reg.active) ready(); else navigator.serviceWorker.ready.then(ready);
      }
    } catch (e) { /* offline cache unavailable in this context */ }
  }
  boot();
})();
