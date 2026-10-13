/* Optional desk kit motion. The host owns time, visibility, rendering and source geometry.
   Attach one controller per decoded object, update with seconds, and dispose before removal.
   Motion owns only wrapper groups and cloned bulb materials. It never mutates baked buffers. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
  const fraction = (n) => ((n % 1) + 1) % 1;
  const unit = (n) => clamp(finite(n, 0), 0, 1);
  const ease = (n) => n * n * (3 - 2 * n);
  const safeDelta = (n) => clamp(finite(n, 0), 0, 0.1);

  /* Both fractions sum to one. Height is a readable stylized transfer, not a fluid solver. */
  function sandState(progress) {
    const lower = unit(progress), upper = 1 - lower;
    return { lower, upper, flowing: lower > 0.00001 && upper > 0.00001 };
  }
  function snowPoint(index, seconds, center, radius, floorY) {
    const t = Math.max(0, finite(seconds, 0)) % 86400;
    const r = Math.max(0.001, finite(radius, 1)) * 0.88;
    const seed = fraction(Math.sin((index + 1) * 91.73) * 43758.5453);
    const phase = index * 2.399963229728653;
    const radial = r * (0.26 + fraction(seed * 7.13) * 0.49);
    const angle = phase + Math.sin(t * 0.19 + phase) * 0.2;
    const x = Math.cos(angle) * radial, z = Math.sin(angle) * radial;
    const cap = Math.sqrt(Math.max(0, r * r - x * x - z * z));
    const bottom = Math.min(center[1] + cap - r * 0.15, Math.max(center[1] - cap, finite(floorY, center[1] - r * 0.7)));
    const top = center[1] + cap;
    const fall = fraction(seed + t * (0.032 + seed * 0.026));
    return [center[0] + x, top - fall * (top - bottom), center[2] + z];
  }

  function create(T) {
    if (!T || !T.Group || !T.Vector3) throw new TypeError('DeskKitMotion needs THREE');
    const controllers = new Set();
    let paused = false, calm = false;
    const palAPI = root.DeskKitLightPalettes || (typeof require === 'function' ? require('./light-palettes.js') : null);
    const palettes = palAPI ? palAPI.palettes : { warm: { colors: ['#FFD397'], spill: '#FFD8A8', strength: 0.65 } };

    function attach(group, data, options) {
      const opts = options || {}, source = data || {}, anchors = source.anchors || {};
      const id = opts.id || (source.meta && source.meta.motion) || group.userData.id;
      if (!['globe', 'hourglass', 'snow_globe', 'string_lights'].includes(id)) return null;
      if (group.userData.kitMotion) return group.userData.kitMotion;
      const baked = group.children.filter((o) => o.isMesh);
      const items = baked.map((object, index) => {
        const spec = source.groups && source.groups[index] || {};
        return { object, part: object.userData.part || spec.part || '', role: object.userData.role || spec.n || '' };
      });
      const originals = baked.map((o) => ({ object: o, parent: o.parent, position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone(), visible: o.visible }));
      const wrappers = [], materials = [];
      const vec = (name, fallback) => new T.Vector3().fromArray(anchors[name] || fallback);
      const duration = clamp(finite(opts.duration, finite(source.meta && source.meta.motionDuration, 60)), 1, 86400);
      let elapsed = Math.max(0, finite(opts.elapsed, id === 'hourglass' ? duration * 0.35 : 0));
      let stopped = !!opts.paused, still = !!opts.calm, disposed = false;
      let palette = palettes[opts.palette] ? opts.palette : 'warm';
      let turn = 0, flipping = null, body = null, contents = null;
      let bodyRestY = 0, bodyHalfHeight = 0, bodyHalfDepth = 0;
      let spin = null, spinAxis = null, flipAxis = null, lower = null, upper = null, stream = null;
      let streamTop = 0, streamHeight = 1, lowerFloor = 0, lowerHeight = 1;
      let bulbEntries = [], flakeEntries = [];
      let snowCenter = [0, 1.45, 0], snowRadius = 0.95, snowFloor = 0.78;

      function wrapper(parent, at) {
        const o = new T.Group(); o.name = 'Desk kit motion'; o.position.copy(at);
        parent.add(o); wrappers.push(o); return o;
      }
      function move(object, parent, offset) {
        if (object.parent) object.parent.remove(object);
        parent.add(object); object.position.sub(offset);
      }
      function bounds(objects) {
        const box = new T.Box3();
        objects.forEach((o) => {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          box.union(o.geometry.boundingBox);
        });
        return box;
      }
      function subset(part) { return items.filter((item) => item.part === part).map((item) => item.object); }
      function makeSand(part, anchor, parentCenter) {
        const objects = subset(part); if (!objects.length) return null;
        const at = vec(anchor, [0, 0, 0]);
        const pivot = wrapper(contents, at.clone().sub(parentCenter));
        objects.forEach((o) => { o.position.set(0, 0, 0); move(o, pivot, at); });
        return { pivot, objects, box: bounds(objects) };
      }

      if (id === 'globe') {
        const a = vec('axis0', [0, 0.8, 0]), b = vec('axis1', [0, 3.1, 0]);
        const center = a.clone().add(b).multiplyScalar(0.5);
        spinAxis = b.clone().sub(a).normalize();
        if (!spinAxis.lengthSq()) spinAxis.set(0, 1, 0);
        spin = wrapper(group, center);
        subset('globe').forEach((o) => move(o, spin, center));
      }
      if (id === 'hourglass') {
        const center = vec('pivot', [0, 1.57, 0]);
        flipAxis = vec('flipAxis', [1, 1.57, 0]).sub(center).normalize();
        if (!flipAxis.lengthSq()) flipAxis.set(1, 0, 0);
        const box = bounds(baked);
        bodyRestY = center.y;
        bodyHalfHeight = Math.max(Math.abs(box.min.y - center.y), Math.abs(box.max.y - center.y));
        bodyHalfDepth = Math.max(Math.abs(box.min.z - center.z), Math.abs(box.max.z - center.z));
        body = wrapper(group, center);
        items.forEach(({ object }) => move(object, body, center));
        contents = wrapper(body, new T.Vector3());
        /* Contents receive the completed inverse turn to keep gravity pointing down. */
        for (const part of ['sand_lower', 'sand_upper', 'sand_stream']) {
          subset(part).forEach((o) => { body.remove(o); contents.add(o); o.position.copy(center).multiplyScalar(-1); });
        }
        lower = makeSand('sand_lower', 'sandLower', center);
        upper = makeSand('sand_upper', 'sandUpper', center);
        const streamObjects = subset('sand_stream');
        if (lower) { lowerFloor = lower.box.min.y; lowerHeight = lower.box.max.y - lowerFloor; }
        if (streamObjects.length) {
          const box = bounds(streamObjects); streamTop = box.max.y; streamHeight = Math.max(0.001, box.max.y - box.min.y);
          const top = new T.Vector3(0, streamTop, 0);
          stream = wrapper(contents, top.clone().sub(center));
          streamObjects.forEach((o) => { o.position.set(0, 0, 0); move(o, stream, top); });
        }
      }
      if (id === 'snow_globe') {
        snowCenter = anchors.snowCenter || snowCenter;
        snowRadius = anchors.snowRadius ? Math.abs(anchors.snowRadius[0]) : snowRadius;
        snowFloor = anchors.snowFloor ? anchors.snowFloor[1] : snowCenter[1] - snowRadius * 0.62;
        flakeEntries = items.filter(({ part }) => /^snow_\d+$/.test(part)).map(({ object, part }) => {
          const box = bounds([object]);
          return { object, index: Number(part.slice(5)), center: box.getCenter(new T.Vector3()), original: object.position.clone() };
        });
      }
      if (id === 'string_lights') {
        bulbEntries = items.filter(({ part }) => /^bulb_\d+$/.test(part)).map(({ object, part }) => {
          const original = object.material, owned = original.clone();
          materials.push({ object, original, owned, glow: object.userData.glow }); object.material = owned;
          return { object, index: Number(part.slice(5)), material: owned };
        });
      }
      function isStill() { return paused || calm || stopped || still; }
      function paintBulbs() {
        const p = palettes[palette];
        bulbEntries.forEach(({ object, index, material }) => {
          const color = p.colors[index % p.colors.length];
          material.color.set(color);
          if (material.emissive) material.emissive.set(color);
          material.emissiveIntensity = p.strength;
          object.userData.glow = p.strength / 1.6;
        });
        group.traverse((o) => { if (o.isPointLight) o.color.set(p.spill); });
      }
      function render() {
        if (disposed) return;
        if (spin) spin.quaternion.setFromAxisAngle(spinAxis, (elapsed % 90) / 90 * TAU);
        if (body) {
          const localAngle = (flipping ? ease(unit(flipping.time / flipping.duration)) : 0) * Math.PI;
          const a = turn * Math.PI + localAngle;
          const rise = bodyHalfHeight * Math.abs(Math.cos(localAngle)) + bodyHalfDepth * Math.abs(Math.sin(localAngle)) - bodyHalfHeight;
          body.position.y = bodyRestY + Math.max(0, rise) + Math.sin(localAngle) * 0.035;
          body.quaternion.setFromAxisAngle(flipAxis, a);
          contents.quaternion.setFromAxisAngle(flipAxis, -turn * Math.PI);
          const s = sandState(elapsed / duration);
          if (lower) { lower.pivot.scale.setScalar(Math.max(0.001, Math.cbrt(s.lower))); lower.pivot.visible = s.lower > 0.00001; }
          if (upper) { upper.pivot.scale.setScalar(Math.max(0.001, Math.cbrt(s.upper))); upper.pivot.visible = s.upper > 0.00001; }
          if (stream) {
            stream.visible = s.flowing && !flipping && !isStill();
            stream.scale.y = Math.max(0.001, (streamTop - lowerFloor - lowerHeight * Math.cbrt(s.lower)) / streamHeight);
          }
        }
        flakeEntries.forEach(({ object, index, center, original }) => {
          const p = snowPoint(index, elapsed, snowCenter, snowRadius, snowFloor);
          object.position.set(p[0] - center.x + original.x, p[1] - center.y + original.y, p[2] - center.z + original.z);
        });
      }
      function finishFlip() { turn = (turn + 1) % 2; elapsed = duration - clamp(elapsed, 0, duration); flipping = null; }
      const controller = {
        id,
        refresh() { render(); return this; },
        update(dt) {
          if (disposed || isStill()) return;
          const step = safeDelta(dt);
          if (flipping) { flipping.time += step; if (flipping.time >= flipping.duration) finishFlip(); }
          else elapsed = id === 'hourglass' ? Math.min(duration, elapsed + step) : elapsed + step;
          render();
        },
        setElapsed(seconds) { elapsed = Math.max(0, finite(seconds, 0)); flipping = null; render(); return this; },
        setProgress(progress) { if (id === 'hourglass') { elapsed = unit(progress) * duration; render(); } return this; },
        setPaused(value) { stopped = !!value; render(); return this; },
        setCalm(value) { still = !!value; render(); return this; },
        setPalette(value) { if (!disposed && palettes[value]) { palette = value; paintBulbs(); } return this; },
        flip() {
          if (id !== 'hourglass' || flipping || disposed) return false;
          flipping = { time: 0, duration: 0.9 };
          if (isStill()) finishFlip();
          render(); return true;
        },
        shake() { if (id !== 'snow_globe' || disposed) return false; elapsed = 0; render(); return true; },
        reset() { elapsed = 0; turn = 0; flipping = null; render(); return this; },
        get state() { return { id, elapsed, progress: id === 'hourglass' ? unit(elapsed / duration) : null, paused: paused || stopped, calm: calm || still, palette, paletteLight: palettes[palette].spill, flipping: !!flipping, disposed }; },
        dispose() {
          if (disposed) return;
          disposed = true;
          originals.forEach(({ object, parent, position, quaternion, scale, visible }) => {
            if (object.parent) object.parent.remove(object);
            parent.add(object); object.position.copy(position); object.quaternion.copy(quaternion); object.scale.copy(scale); object.visible = visible;
          });
          materials.forEach(({ object, original, owned, glow }) => {
            object.material = original;
            if (glow === undefined) delete object.userData.glow; else object.userData.glow = glow;
            owned.dispose();
          });
          wrappers.forEach((o) => { if (o.parent) o.parent.remove(o); });
          controllers.delete(controller); delete group.userData.kitMotion;
        }
      };
      controllers.add(controller); group.userData.kitMotion = controller;
      if (id === 'string_lights') paintBulbs();
      render();
      return controller;
    }
    return {
      attach,
      update(dt) { controllers.forEach((c) => c.update(dt)); },
      setPaused(value) { paused = !!value; controllers.forEach((c) => c.refresh()); },
      setCalm(value) { calm = !!value; controllers.forEach((c) => c.refresh()); },
      setPalette(value) { controllers.forEach((c) => { if (c.id === 'string_lights') c.setPalette(value); }); },
      dispose() { Array.from(controllers).forEach((c) => c.dispose()); },
      get size() { return controllers.size; }
    };
  }
  const api = Object.freeze({ create, sandState, snowPoint, safeDelta });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DeskKitMotion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
