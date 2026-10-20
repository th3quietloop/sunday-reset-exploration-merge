/* Sunday Reset sync. One household shares one board across every device linked to it. The board
   always saves in this browser first; a moment later it goes to the server with the version it
   started from. If someone saved in between, the two are merged piece by piece (Model.mergeBoards)
   and saved again. Other devices check every 20 seconds while open and when you come back.
   Sync details live in their own keys, never in the board, and without a server (inside claude.ai,
   or opened as a file) this stays off and the desk works as it always has. */
(function (root) {
  'use strict';
  const KEY = 'sundayreset.cloud', BASE = 'sundayreset.cloud.base', DIRTY = 'sundayreset.cloud.dirty';
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const stable = (v) => JSON.stringify(sortKeys(v));
  const storedMe = read(KEY), storedDirty = read(DIRTY);
  const storedAttempt = storedDirty && storedDirty.attempt;
  const recoverAttempt = storedMe && storedAttempt && storedAttempt.hid === storedMe.hid && storedAttempt.did === storedMe.did &&
    Number.isInteger(storedAttempt.version) && storedAttempt.version > 0 && storedAttempt.doc && typeof storedAttempt.doc === 'object' && !Array.isArray(storedAttempt.doc) &&
    (storedAttempt.origin == null || (typeof storedAttempt.origin === 'object' && !Array.isArray(storedAttempt.origin))) ? storedAttempt : null;
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach((k) => { if (v[k] !== undefined) o[k] = sortKeys(v[k]); }); return o; }
    return v;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* A name for this device that people will recognize in a list. */
  function deviceName() {
    const ua = navigator.userAgent || '';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows computer';
    return 'This browser';
  }

  const Cloud = {
    cfg: null, me: storedMe, base: null, status: 'off', note: '', sentAt: 0,
    pending: null, sending: false, timer: null, retry: 0, polling: null, session: 0,
    uncertain: !!storedDirty, attempt: recoverAttempt, rawLocal: null,
    onRemote: null, onStatus: null, onRemoved: null, onBack: null, reprobe: null,
    get on() { return !!(this.me && this.me.token && this.cfg); },
    /* linked to a household, whether or not the server can be reached right now */
    get linked() { return !!(this.me && this.me.token); },
    get deviceName() { return deviceName(); },
    /* a change was made here that hasn't reached the household yet; kept across a reload */
    get dirty() { return !!read(DIRTY); },
    /* Only local sync metadata: keep unanswered attempts and unresolved merged work with their
       raw local origin, so old local absence isn't deletion after a reload. */
    markDirty() { write(DIRTY, this.attempt ? { at: Date.now(), attempt: this.attempt } : Date.now()); },

    /* Is there a server? Not inside claude.ai, and not from a file. */
    async probe() {
      if (root.claude || location.protocol === 'file:' || root.self !== root.top) return null;
      try {
        const r = await Promise.race([fetch('/api/config', { cache: 'no-store' }), wait(4000).then(() => null)]);
        this.cfg = r && r.ok ? await r.json() : null;
      } catch (e) { this.cfg = null; }
      if (this.cfg && this.me) { this.base = read(BASE); this.set('saved'); }
      /* a linked device that opened with no connection keeps working, says so, and keeps asking */
      if (!this.cfg && this.linked && !root.claude && location.protocol !== 'file:') {
        this.set('offline', 'Offline. Changes wait on this device and go when you’re back.');
        clearTimeout(this.reprobe);
        this.reprobe = setTimeout(async () => { if (await this.probe()) { this.poll(); if (this.onBack) this.onBack(); } }, 15000);
      }
      return this.cfg;
    },
    /* every request gives up after 15 seconds, so one that never answers can't hold the queue: it
       fails like any lost connection, and what was waiting goes again later */
    async api(method, path, body) {
      const session = this.session;
      const headers = { 'Content-Type': 'application/json' };
      if (this.me && this.me.token) headers.Authorization = 'Device ' + this.me.token;
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timer;
      const deadline = new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          if (ctrl) ctrl.abort();
          const error = new Error('Request timed out'); error.name = 'TimeoutError'; reject(error);
        }, 15000);
      });
      try {
        /* Fetch resolves at the headers. Keep the deadline through the body too, even if a
           stalled body ignores abort, and apply session effects only to a timely response. */
        const result = await Promise.race([deadline, (async () => {
          const r = await fetch(path, { method, headers, body: body == null ? undefined : JSON.stringify(body), cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
          let json = null;
          try { json = await r.json(); } catch (e) { if (ctrl && ctrl.signal.aborted) throw e; }
          return { status: r.status, json: json || {} };
        })()]);
        if (session !== this.session) return { status: 0, json: { error: 'session-changed' }, stale: true };
        if (result.status === 401 && this.me && path !== '/api/link' && path !== '/api/household') this.removed();
        return result;
      } finally { clearTimeout(timer); }
    },
    set(status, note) { this.status = status; this.note = note || ''; if (this.onStatus) this.onStatus(status, note); },
    remember(me, doc) {
      this.session++; clearTimeout(this.timer); this.pending = null; this.sending = false; this.retry = 0; this.uncertain = false; this.attempt = null; write(DIRTY, null);
      this.me = me; write(KEY, me);
      this.base = doc ? JSON.parse(JSON.stringify(doc)) : null; write(BASE, this.base);
      this.rawLocal = doc ? JSON.parse(JSON.stringify(doc)) : null;
    },

    /* Start a household with this device's board. (V11-2, the unhappy gate: a connection lost on the way, or a server
       that never answers in 15 seconds, is an answer like any other, { error: 'offline' }, so the page says so;
       it was a promise nobody caught, and nothing was said) */
    async start(doc, name, device) {
      let r;
      try { r = await this.api('POST', '/api/household', { name, doc, device: { name: device || deviceName() } }); } catch (e) { return { error: 'offline' }; }
      if (r.status !== 200) return { error: r.json.error || 'failed' };
      this.remember({ hid: r.json.household.id, did: r.json.device.id, token: r.json.token, name: r.json.household.name, version: r.json.version }, doc);
      this.set('saved');
      this.poll();
      return { key: r.json.key, household: r.json.household };
    },
    /* Link this device with a code from another device, or with the household key. Resolves the
       household's board, which replaces what's on this device. */
    async link(what, device) {
      let r;
      try { r = await this.api('POST', '/api/link', Object.assign({ device: { name: device || deviceName() } }, what)); } catch (e) { return { error: 'offline' }; }
      if (r.status !== 200) return { error: r.json.error || 'failed' };
      this.remember({ hid: r.json.household.id, did: r.json.device.id, token: r.json.token, name: r.json.household.name, version: r.json.version }, r.json.doc);
      this.set('saved');
      this.poll();
      return { doc: r.json.doc, household: r.json.household };
    },
    async makeCode() { try { const r = await this.api('POST', '/api/link/start', {}); return r.status === 200 ? r.json : { error: r.json.error || 'failed' }; } catch (e) { return { error: 'offline' }; } },
    async devices() { try { const r = await this.api('GET', '/api/devices'); return r.status === 200 ? r.json : null; } catch (e) { return null; } },
    async removeDevice(id) { try { return (await this.api('DELETE', '/api/devices?id=' + encodeURIComponent(id))).status === 200; } catch (e) { return false; } },
    async renameDevice(id, name) { try { const r = await this.api('PATCH', '/api/devices', { id, name }); return r.status === 200 ? r.json : { error: r.json.error || 'failed' }; } catch (e) { return { error: 'offline' }; } },
    /* earlier saves of the household's board, kept by the server */
    async history(v) { try { const r = await this.api('GET', '/api/history' + (v ? '?v=' + encodeURIComponent(v) : '')); return r.status === 200 ? r.json : { error: r.json.error || 'failed' }; } catch (e) { return { error: 'offline' }; } },
    async deleteHousehold(confirm) { try { const r = await this.api('DELETE', '/api/household', { confirm }); if (r.status === 200) this.forget(); return r.status === 200 ? r.json : { error: r.json.error || 'failed' }; } catch (e) { return { error: 'offline' }; } },
    async testReminder() { try { const r = await this.api('POST', '/api/push/test', {}); return r.status === 200 ? r.json : { error: r.json.error || 'failed' }; } catch (e) { return { error: 'offline' }; } },
    async feedback(body) { try { const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }); const j = await r.json().catch(() => ({})); return r.ok ? j : { error: j.error || 'failed' }; } catch (e) { return { error: 'offline' }; } },
    /* Unlink this device. The board stays here, on its own. */
    async leave() {
      const session = this.session;
      try { await this.api('DELETE', '/api/devices?id=me'); } catch (e) { /* offline: forget it here anyway */ }
      if (session === this.session) this.forget();
    },
    forget() { this.session++; clearTimeout(this.timer); clearTimeout(this.reprobe); clearInterval(this.polling); this.polling = null; this.me = null; this.base = null; write(KEY, null); write(BASE, null); write(DIRTY, null); this.pending = null; this.sending = false; this.retry = 0; this.uncertain = false; this.attempt = null; this.rawLocal = null; this.set('off'); },
    removed() { this.forget(); if (this.onRemoved) this.onRemoved(); },

    /* The board changed here. Send it a moment after the changes stop. */
    changed(doc) {
      this.rawLocal = JSON.parse(JSON.stringify(doc));
      /* Undo can cancel an unsent edit. Once a request might have reached the server, the
         same board is a correction that must be sent and acknowledged like any other edit. */
      if (this.base && stable(doc) === stable(this.base) && !this.sending && !this.retry && !this.uncertain) {
        this.pending = null; clearTimeout(this.timer); write(DIRTY, null);
        if (this.on) this.set('saved', 'Saved');
        return;
      }
      /* linked but out of reach: remember there's something to send */
      if (!this.on) { if (this.linked) this.markDirty(); return; }
      this.pending = this.attempt ? root.Model.mergeBoards(this.attempt.origin || this.attempt.doc, this.rawLocal, this.attempt.doc).doc : JSON.parse(JSON.stringify(doc));
      this.markDirty();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.send(), 1200);
      this.set('saving');
    },
    async send() {
      if (this.sending || !this.pending || !this.on) return;
      const session = this.session;
      this.sending = true;
      let doc = this.pending;
      /* Freeze the actual local input for every retry in this send. The merged queue can contain
         work not yet adopted locally, and a newer local edit may arrive during any request. */
      const origin = JSON.parse(JSON.stringify(this.rawLocal || (this.attempt && (this.attempt.origin || this.attempt.doc)) || doc));
      if (this.attempt) doc = root.Model.mergeBoards(this.attempt.origin || this.attempt.doc, origin, this.attempt.doc).doc;
      let merged = stable(doc) !== stable(origin) ? { by: '', clashes: [] } : null, saved = false;
      /* A new local edit can arrive while this request loses a race. Rebase that newer queue on
         everything this request learned, instead of retrying it without the other device's work. */
      const rebasePending = () => { if (this.pending) this.pending = root.Model.mergeBoards(origin, this.rawLocal || this.pending, doc).doc; };
      this.pending = null;
      try {
        for (let round = 0; round < 3; round++) {
          const priorAttempt = this.attempt;
          this.attempt = { hid: this.me.hid, did: this.me.did, version: this.me.version, doc: JSON.parse(JSON.stringify(doc)), origin: JSON.parse(JSON.stringify(origin)) };
          this.uncertain = true; this.markDirty();
          const r = await this.api('PUT', '/api/board', { base: this.me.version, doc });
          if (session !== this.session || r.stale) return;
          if (r.status === 200) {
            rebasePending();
            this.me.version = r.json.version; write(KEY, this.me);
            this.base = doc; write(BASE, doc);
            this.retry = 0; saved = true; this.sentAt = Date.now();
            this.uncertain = false; this.attempt = null;
            if (this.pending) this.markDirty(); else write(DIRTY, null);
            this.set(this.pending ? 'saving' : 'saved', this.pending ? 'Saving changes' : 'Saved');
            /* the board here becomes the merged one, with anything changed since laid over it */
            if (merged && this.onRemote) this.onRemote(doc, { from: origin, by: merged.by, merged: true, clashes: merged.clashes });
            break;
          }
          if (r.status === 409 && r.json.doc) {
            /* someone saved first: keep both people's changes and try again from theirs */
            const confirmed = this.base || r.json.doc;
            /* An unanswered earlier PUT may already be there. Fields edited since that attempt
               use its baseline; unchanged fields keep the ordinary confirmed-base merge. */
            const from = priorAttempt ? root.Model.mergeBoards(doc, priorAttempt.doc, confirmed).doc : confirmed;
            const m = root.Model.mergeBoards(from, doc, r.json.doc);
            this.me.version = r.json.version; write(KEY, this.me);
            this.base = r.json.doc; write(BASE, this.base);
            doc = m.doc;
            /* The learned merge must survive even when this is the final conflict and no next
               PUT follows. Its frozen origin still distinguishes local edits from unlearned work. */
            this.attempt = { hid: this.me.hid, did: this.me.did, version: this.me.version, doc: JSON.parse(JSON.stringify(doc)), origin: JSON.parse(JSON.stringify(origin)) };
            this.markDirty();
            rebasePending();
            merged = { by: r.json.by, clashes: (merged ? merged.clashes : []).concat(m.clashes) };
            continue;
          }
          if (r.status === 401) return;
          /* the server answered, so this isn't Offline: say what it said */
          throw Object.assign(new Error(r.json.error || 'failed'), { status: r.status, why: r.json.error || '' });
        }
        if (!saved) {
          /* three saves in a row lost the race: the merged board waits here and goes a moment later */
          if (!this.pending) this.pending = doc;
          this.retry = Math.min(6, this.retry + 1);
          this.set('saving', 'Busy with another device. Trying again.');
          setTimeout(() => { if (session === this.session) this.send(); }, 1500 * this.retry);
        }
      } catch (e) {
        if (session !== this.session) return;
        rebasePending();
        if (!this.pending) this.pending = doc;
        const status = e && e.status, why = e && e.why;
        const again = (ms) => setTimeout(() => { if (session === this.session) this.send(); }, ms);
        /* refused: the household won't take this board as it is, so trying again won't help until it
           changes here; the next change tries again */
        if (status === 400 || status === 413 || why === 'household-deleting') {
          this.retry = 0;
          this.set('refused', why === 'household-deleting' ? 'Your household is being deleted. This board stays on this device.' : 'The household didn’t take this board. It’s saved on this device.');
          return;
        }
        this.retry = Math.min(6, this.retry + 1);
        /* busy: another save holds the household for a moment */
        if (status === 409 || status === 429 || status === 503) { this.set('saving', 'The household is busy for a moment. Trying again.'); again(1500 * this.retry); return; }
        /* the server had a problem: try again, a little later each time */
        if (status) { this.set('saving', 'The household’s server had a problem. Trying again.'); again(2000 * Math.pow(2, this.retry)); return; }
        /* offline: keep it and try again, a little later each time */
        this.set('offline', 'Offline. Changes wait on this device and go when you’re back.');
        again(2000 * Math.pow(2, this.retry));
      } finally {
        if (session === this.session) {
          this.sending = false;
          if (this.pending && saved) this.send();
        }
      }
    },
    /* Check for someone else's changes. */
    async pull() {
      /* A reload can have dirty local work before changed() rebuilds the queue. Reconcile that
         work first, so a boot or reconnect pull cannot replace it in the meantime. */
      if (!this.on || this.sending || this.pending || this.dirty) return;
      const session = this.session;
      try {
        const r = await this.api('GET', '/api/board?have=' + this.me.version);
        if (session !== this.session || r.stale) return;
        if (this.pending || this.sending || this.dirty) return;
        if (r.status !== 200 || r.json.same || !r.json.doc) { if (r.status === 200 && this.status === 'offline') this.set('saved'); return; }
        const from = this.base;
        this.me.version = r.json.version; write(KEY, this.me);
        this.base = r.json.doc; write(BASE, this.base);
        this.set('saved');
        if (this.onRemote && !r.json.mine) this.onRemote(r.json.doc, { from, by: r.json.by });
      } catch (e) { if (session === this.session) this.set('offline', 'Offline. Changes go when you’re back.'); }
    },
    poll() {
      if (this.polling || !this.on) return;
      this.polling = setInterval(() => { if (document.visibilityState === 'visible') this.pull(); }, 20000);
    },
    /* Web push: turn reminders on or off for this device. */
    async remind(on, prefs) {
      if (!this.on || !this.cfg || !this.cfg.push || !('serviceWorker' in navigator) || !('PushManager' in root)) return { error: 'unsupported' };
      /* with no worker registered this promise never settles, so it gets five seconds and then says so */
      const reg = await Promise.race([navigator.serviceWorker.ready, wait(5000).then(() => null)]);
      if (!reg) return { error: 'no-worker' };
      /* (V11-2, the unhappy gate: with no connection it says so, { error: 'offline' }, instead of a promise nobody
         caught. Off still works: this device's subscription is gone at once, and the server lets go of one that
         no longer answers) */
      if (!on) {
        const sub = await reg.pushManager.getSubscription().catch(() => null);
        if (sub) await sub.unsubscribe().catch(() => {});
        try { await this.api('DELETE', '/api/push'); } catch (e) { /* offline: the subscription above is gone already */ }
        return { on: false };
      }
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return { error: 'denied' };
        const raw = atob(this.cfg.vapid.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - this.cfg.vapid.length % 4) % 4));
        const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const r = await this.api('POST', '/api/push', { sub: sub.toJSON(), prefs, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
        return r.status === 200 ? { on: true } : { error: r.json.error || 'failed' };
      } catch (e) { return { error: navigator.onLine === false || (e && e.name === 'TimeoutError') || e instanceof TypeError ? 'offline' : 'failed' }; }
    },
    /* A calendar someone subscribed to, fetched by the server. Its address can be a secret (Google's
       and Outlook's private links are), so it travels in the body, never in the address the server logs. */
    async calendar(url) {
      try {
        let r = await fetch('/api/ics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), cache: 'no-store' });
        /* a server from before this only knows the old way of asking */
        if (r.status === 404) r = await fetch('/api/ics?url=' + encodeURIComponent(url), { cache: 'no-store' });
        const json = await r.json().catch(() => ({}));
        return r.ok ? json : { error: json.error || 'unreachable' };
      } catch (e) { return { error: 'offline' }; }
    }
  };
  root.addEventListener && root.addEventListener('online', () => { if (Cloud.on) { Cloud.send(); Cloud.pull(); } });
  root.document && document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Cloud.on) Cloud.pull(); });
  root.Cloud = Cloud;
})(typeof window !== 'undefined' ? window : globalThis);
