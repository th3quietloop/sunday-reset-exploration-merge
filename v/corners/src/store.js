/* Sunday Reset storage. Inside claude.ai the board lives in the artifact's database: one document
   for the week template, to dos, recipes, and ideas (app/core), and one per month for what's on
   each date (months/2026-10). Anywhere else it lives in this browser. Writes wait for a pause,
   and changes made in another open copy arrive live, from the database or from another tab.
   Nothing fails quietly: a write this browser refuses says so (status 'error'), a saved board it
   can't read is kept aside instead of looking like a fresh start, and before anything replaces the
   board a rescue copy is kept on this device (sundayreset.rescue), with one copy a day besides. */
(function (root) {
  'use strict';
  const KEY = 'sundayreset.v1', RESCUE = 'sundayreset.rescue', RAW = 'sundayreset.unreadable';

  /* JSON with sorted keys, so the same data always compares equal, whatever order the server keeps. */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  const EMPTY = stable({ dates: {}, dinners: {} });
  function split(st) {
    const core = Object.assign({}, st);
    delete core.dates; delete core.dinners;
    const months = {};
    const bucket = (d) => { const k = d.slice(0, 7); return (months[k] = months[k] || { dates: {}, dinners: {} }); };
    for (const d of Object.keys(st.dates || {})) bucket(d).dates[d] = st.dates[d];
    for (const d of Object.keys(st.dinners || {})) bucket(d).dinners[d] = st.dinners[d];
    return { core, months };
  }
  function join(core, months) {
    const st = Object.assign({}, core, { dates: {}, dinners: {} });
    for (const m of Object.values(months)) { Object.assign(st.dates, m.dates || {}); Object.assign(st.dinners, m.dinners || {}); }
    return JSON.parse(JSON.stringify(st));
  }
  /* what this browser holds: the board, nothing (a fresh start), or something it can't read */
  let lastRaw = null;
  function readLocal() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { Store.blocked = true; return null; }
    if (!raw) return null;
    try { const st = JSON.parse(raw); lastRaw = raw; return st; } catch (e) {
      /* keep it aside, whole, so it can be downloaded or sent for help; never write over it */
      Store.unreadable = raw;
      try { localStorage.setItem(RAW, raw); } catch (e2) { /* it's still in memory */ }
      return null;
    }
  }
  function writeLocal(st) {
    try {
      const raw = JSON.stringify(st);
      localStorage.setItem(KEY, raw);
      lastRaw = raw;
      try { localStorage.setItem(KEY + '.at', String(Date.now())); } catch (e2) { /* the board saved; the time is a nicety */ }
      return true;
    } catch (e) {
      Store.lastError = { at: Date.now(), what: e && e.name === 'QuotaExceededError' ? 'full' : 'blocked' };
      /* rescue copies take room; give it back to the board first and try once more */
      if (e && e.name === 'QuotaExceededError') {
        try { localStorage.removeItem(RESCUE); localStorage.setItem(KEY, JSON.stringify(st)); lastRaw = JSON.stringify(st); return true; } catch (e2) { /* still full */ }
      }
      return false;
    }
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const readRescue = () => { try { return JSON.parse(localStorage.getItem(RESCUE) || '[]') || []; } catch (e) { return []; } };

  const Store = {
    mode: 'local', db: null, last: {}, remote: { core: null, months: {} }, queue: Promise.resolve(), writing: 0,
    pending: null, timer: null, onError: null, onRemote: null, onStatus: null, onKeep: null, loadFailed: false, keepTried: false,
    status: 'saved', savedAt: (() => { try { return +localStorage.getItem(KEY + '.at') || 0; } catch (e) { return 0; } })(), lastError: null, unreadable: null, blocked: false,
    setStatus(st) { if (st === this.status && st !== 'error') return; this.status = st; if (st === 'saved') this.savedAt = Date.now(); if (this.onStatus) this.onStatus(st); },
    /* Resolves the saved board, or null for a fresh one. */
    async open() {
      let db = null;
      if (root.claude && typeof root.claude.use === 'function') {
        try { db = await Promise.race([root.claude.use('db'), wait(10000).then(() => null)]); } catch (e) { db = null; }
      }
      if (db) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const core = await db.doc('app/core').get();
            this.db = db; this.mode = 'db';
            if (!core.exists) return null;
            const snap = await db.collection('months').get();
            const months = {};
            snap.docs.forEach((d) => { if (d.exists) months[d.id] = d.data(); });
            this.remote = { core: core.data(), months };
            this.last.core = stable(core.data());
            for (const k of Object.keys(months)) this.last['m:' + k] = stable(months[k]);
            return join(core.data(), months);
          } catch (e) { this.db = null; this.mode = 'local'; await wait(800); }
        }
        this.loadFailed = true;
      }
      const st = readLocal();
      if (st) this.keepSoon();
      return st;
    },
    /* Pick up changes from another open copy (a second tab, the phone) while nothing here is waiting to save. */
    subscribe() {
      if (this.mode !== 'db' || !this.db) return;
      const idle = () => !this.pending && !this.writing;
      const apply = () => {
        if (!this.remote.core || !this.onRemote) return;
        const st = join(this.remote.core, this.remote.months);
        if (this.onRemote(st) !== false) writeLocal(st);
      };
      try {
        this.db.doc('app/core').onSnapshot((d) => {
          if (!d.exists || d.metadata.hasPendingWrites) return;
          const j = stable(d.data());
          if (j === this.last.core || !idle()) return;
          this.last.core = j; this.remote.core = d.data();
          apply();
        }, () => { /* the page keeps working from what it has */ });
        this.db.collection('months').onSnapshot((snap) => {
          if (snap.metadata.hasPendingWrites) return;
          let changed = false;
          snap.docs.forEach((d) => {
            if (!d.exists) return;
            const j = stable(d.data());
            if (j === this.last['m:' + d.id]) return;
            changed = true;
            this.last['m:' + d.id] = j; this.remote.months[d.id] = d.data();
          });
          if (changed && idle()) apply();
        }, () => { /* same */ });
      } catch (e) { /* live updates are a bonus */ }
    },
    /* Take a board that came from another device: keep it here, without sending it back. */
    adopt(st) { this.pending = null; clearTimeout(this.timer); if (writeLocal(st)) this.setStatus('saved'); else this.failed(); },
    save(st) {
      this.pending = st;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 700);
      this.setStatus('saving');
    },
    failed() {
      this.setStatus('error');
      if (this.onError) this.onError(this.lastError || { what: 'blocked' });
    },
    /* leaving: the page is going away, so what's waiting is written now, whatever the app is doing */
    flush(leaving) {
      let st = this.pending;
      if (!st) return;
      /* another tab saved since this one last read the board: merge with it first, never write over it */
      if (this.mode === 'local' && root.Model && typeof localStorage !== 'undefined') {
        let cur = null;
        try { cur = localStorage.getItem(KEY); } catch (e) { cur = null; }
        if (cur && lastRaw && cur !== lastRaw) {
          let theirs = null, base = null;
          try { theirs = JSON.parse(cur); base = JSON.parse(lastRaw); } catch (e) { theirs = null; }
          if (theirs && base) {
            const next = root.Model.mergeBoards(base, st, theirs).doc;
            if (!leaving && this.onRemote && this.onRemote(next, { tab: true, merged: true }) === false) { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 700); return; }
            lastRaw = cur; st = next;
          }
        }
      }
      this.pending = null;
      clearTimeout(this.timer);
      const prevRaw = lastRaw;
      if (!writeLocal(st) && this.mode !== 'db') { this.failed(); return; }
      this.daily(prevRaw);
      if (this.mode !== 'db') { this.setStatus('saved'); this.keepSoon(); if (root.Cloud) root.Cloud.changed(st); return; }
      const { core, months } = split(st);
      const writes = [];
      const cj = stable(core);
      if (cj !== this.last.core) writes.push(['app/core', core, cj, 'core']);
      for (const k of Object.keys(months)) { const j = stable(months[k]); if (j !== this.last['m:' + k]) writes.push(['months/' + k, months[k], j, 'm:' + k]); }
      for (const key of Object.keys(this.last)) if (key.startsWith('m:') && !months[key.slice(2)] && this.last[key] !== EMPTY) writes.push(['months/' + key.slice(2), { dates: {}, dinners: {} }, EMPTY, key]);
      /* nothing differs from what the database has: it is saved, and says so */
      if (!writes.length) { if (!this.writing) this.setStatus('saved'); return; }
      writes.forEach((w) => { this.last[w[3]] = w[2]; });
      this.writing++;
      let bad = false;
      this.queue = this.queue.then(async () => {
        for (const [path, data, , key] of writes) {
          try {
            await this.db.doc(path).set(JSON.parse(JSON.stringify(data)));
            if (key === 'core') this.remote.core = data; else this.remote.months[key.slice(2)] = data;
          } catch (e) { delete this.last[key]; bad = true; this.lastError = { at: Date.now(), what: 'db' }; }
        }
      }).finally(() => { this.writing--; if (bad) this.failed(); else if (!this.pending && !this.writing) this.setStatus('saved'); });
    },

    /* == rescue copies, on this device only == */
    /* label says what was about to happen ("Before linking to Our household"). Keeps the last six,
       plus one a day for the last week (kind 'day'). A copy never goes to the server. */
    rescue(label, st, kind) {
      if (!st) return false;
      let list = readRescue();
      const doc = JSON.parse(JSON.stringify(st));
      list.unshift({ at: Date.now(), label, kind: kind || 'event', doc });
      const days = list.filter((x) => x.kind === 'day').slice(0, 7), events = list.filter((x) => x.kind !== 'day').slice(0, 6);
      list = list.filter((x) => days.includes(x) || events.includes(x));
      /* copies never take more than about half of what a browser gives a site; the oldest go first */
      while (list.length > 1 && JSON.stringify(list).length > 2.4e6) list.pop();
      for (let tries = 0; tries < 12; tries++) {
        try { localStorage.setItem(RESCUE, JSON.stringify(list)); return true; } catch (e) {
          /* out of room: the oldest copies go first, never the board */
          if (list.length <= 1) return false;
          list.pop();
        }
      }
      return false;
    },
    rescues() { return readRescue().map((x, i) => ({ i, at: x.at, label: x.label, kind: x.kind })); },
    rescueDoc(i) { const x = readRescue()[i]; return x ? JSON.parse(JSON.stringify(x.doc)) : null; },
    /* the first save of each day keeps the board as it was before it: that morning's week */
    daily(prevRaw) {
      const d = new Date(), key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (this.dailyKey === key) return;
      this.dailyKey = key;
      const list = readRescue();
      if (list.some((x) => x.kind === 'day' && x.day === key)) return;
      if (!prevRaw) return;
      let prev = null;
      try { prev = JSON.parse(prevRaw); } catch (e) { return; }
      const ok = this.rescue('Start of ' + d.toDateString().slice(0, 10), prev, 'day');
      if (ok) { const l = readRescue(); if (l[0]) { l[0].day = key; try { localStorage.setItem(RESCUE, JSON.stringify(l)); } catch (e) { /* fine */ } } }
    },
    forgetUnreadable() { this.unreadable = null; try { localStorage.removeItem(RAW); } catch (e) { /* fine */ } },

    /* == keeping the board in this browser == */
    /* A browser can clear a site's storage when it runs short of room. Asking for persistent storage
       lets it promise not to. Asked once there's a board here to keep; Firefox shows the person a
       question for it, so there it waits for a tap (ask). keep.state is kept, not, or unknown (this
       browser can't say), and stays null while the board lives in the artifact's database. Safari's
       week without a visit is a separate rule this can't lift; the app says what to do about it. */
    keep: { state: null, asked: false },
    async keepBoard(ask) {
      if (this.mode !== 'local') return this.keep;
      const nav = root.navigator, s = nav && nav.storage;
      const done = (state, asked) => { this.keep = { state, asked: !!asked }; if (this.onKeep) this.onKeep(this.keep); return this.keep; };
      if (!s || typeof s.persist !== 'function') return done('unknown');
      try {
        if (typeof s.persisted === 'function' && await s.persisted()) return done('kept');
        if (!ask && /Firefox\//.test(nav.userAgent || '')) return done('not');
        return done((await s.persist()) ? 'kept' : 'not', true);
      } catch (e) { return done('unknown'); }
    },
    keepSoon() { if (this.keepTried || this.mode !== 'local') return; this.keepTried = true; this.keepBoard(); },
    /* everything this device keeps: the board, rescue copies, and the view */
    wipeDevice() { try { Object.keys(localStorage).filter((k) => k.startsWith('sundayreset.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* fine */ } },

    /* == another tab in this browser == */
    /* A save from another tab arrives as a storage event. With nothing waiting here, take it; with a
       change waiting here, merge the two from what both started with, then save the merge. */
    listenTabs() {
      if (this.mode !== 'local' || !root.addEventListener) return;
      root.addEventListener('storage', (e) => {
        if (e.key !== KEY || !e.newValue || e.newValue === lastRaw || !this.onRemote) return;
        let theirs = null;
        try { theirs = JSON.parse(e.newValue); } catch (err) { return; }
        let base = null;
        try { base = lastRaw ? JSON.parse(lastRaw) : null; } catch (err) { base = null; }
        this.takeTab(e.newValue, theirs, base);
      });
    },
    /* The app can refuse an update for a moment (a block is in the hand). What this tab believes it
       holds (lastRaw) only moves once the update is taken, and a refused one is offered again until
       it is, so another tab's change is never written over by the next save here. */
    takeTab(raw, theirs, base) {
      clearTimeout(this.tabTimer);
      const mine = this.pending;
      let next = theirs, merged = false;
      if (mine && base && root.Model) { next = root.Model.mergeBoards(base, mine, theirs).doc; merged = true; }
      if (this.onRemote(next, { tab: true, merged }) === false) {
        this.tabTimer = setTimeout(() => {
          let now = null;
          try { now = localStorage.getItem(KEY); } catch (err) { now = null; }
          if (!now || now === lastRaw) return;
          let doc = null, was = null;
          try { doc = JSON.parse(now); was = lastRaw ? JSON.parse(lastRaw) : null; } catch (err) { return; }
          this.takeTab(now, doc, was);
        }, 700);
        return;
      }
      lastRaw = raw;
      if (merged) { this.pending = next; this.flush(); } else { this.pending = null; clearTimeout(this.timer); this.setStatus('saved'); }
    }
  };
  /* a change still waiting is written the moment the page is hidden or left: phones often suspend a
     page without ever saying goodbye */
  root.addEventListener && root.addEventListener('pagehide', () => Store.flush(true));
  root.document && root.document.addEventListener && root.document.addEventListener('visibilitychange', () => { if (root.document.visibilityState === 'hidden') Store.flush(true); });
  root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
