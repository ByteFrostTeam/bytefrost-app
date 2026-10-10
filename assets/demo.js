/* Improve "try it" demo. Motion values mirror the app:
   GoalRow.tsx, CelebrationLayer.tsx, ConfettiBurst.tsx, HabitPal.tsx,
   HabitPalHatch.tsx, HabitPalEvolution.tsx and app/(tabs)/index.tsx. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- easing + drivers (reanimated equivalents) ----------
  const E = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inOutSin: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };
  const SPRING = { settle: { damping: 26, stiffness: 220 }, gentle: { damping: 20, stiffness: 200 }, pop: { damping: 16, stiffness: 300 } };

  const timers = new Set();
  const after = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

  function timing({ from = 0, to = 1, duration, easing = E.linear, delay = 0, update, end }) {
    let raf, start;
    const run = () => {
      start = performance.now();
      const step = (now) => {
        const p = duration ? clamp((now - start) / duration, 0, 1) : 1;
        update(lerp(from, to, easing(p)), p);
        if (p < 1) raf = requestAnimationFrame(step); else end && end();
      };
      raf = requestAnimationFrame(step);
    };
    const t = delay ? after(delay, run) : (run(), null);
    return () => { cancelAnimationFrame(raf); if (t) clearTimeout(t); };
  }

  function spring({ from, to, velocity = 0, damping, stiffness, mass = 1, delay = 0, update, end }) {
    let raf, x = from, v = velocity, last;
    const run = () => {
      last = performance.now();
      const step = (now) => {
        let dt = Math.min(0.064, (now - last) / 1000); last = now;
        const h = 1 / 1000;
        while (dt > 0) {
          const s = Math.min(h, dt); dt -= s;
          const a = (-stiffness * (x - to) - damping * v) / mass;
          v += a * s; x += v * s;
        }
        if (Math.abs(v) < 0.02 && Math.abs(x - to) < 0.02) { update(to, 1); end && end(); return; }
        update(x, 0);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const t = delay ? after(delay, run) : (run(), null);
    return () => { cancelAnimationFrame(raf); if (t) clearTimeout(t); };
  }

  // A linear clock from 0..duration ms that calls draw(t) each frame
  function clock(duration, draw, end) {
    const start = performance.now();
    let raf;
    const step = (now) => {
      const t = Math.min(duration, now - start);
      draw(t);
      if (t < duration) raf = requestAnimationFrame(step); else end && end();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const bez = (p0, p1, p2, t) => ({
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
  });
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, r }; };

  // ---------- data ----------
  const GOALS = [
    { icon: 'drinkwater', name: 'Drink water', sub: '8 glasses · Easy', pts: 10, grad: ['#0284C7', '#38BDF8'] },
    { icon: 'meditate', name: 'Meditate', sub: '10 minutes · Moderate', pts: 25, grad: ['#7C3AED', '#A78BFA'] },
    { icon: 'read', name: 'Read daily', sub: '15 minutes · Moderate', pts: 25, grad: ['#0E7490', '#06B6D4'] },
    { icon: 'run', name: 'Daily run', sub: '20 minutes · Challenging', pts: 40, grad: ['#E11D48', '#FB7185'] },
  ];
  const TIERS = [
    { at: 0, key: 'none', label: 'Egg', next: 'Bronze', metal: ['#33323D', '#98949F', '#55525F', '#25242D'], face: '#E9EDF3', back: '#ADB5C0', bar: ['#CD7F32', '#B87333'], glow: 'rgba(200,115,35,0.18)', sparks: ['#FFFFFF', '#D9DEE6', '#ADB5C0'] },
    { at: 30, key: 'bronze', label: 'Bronze habit pal', next: 'Silver', metal: ['#864522', '#F6C29A', '#B77342', '#774122'], face: '#CD7F32', back: '#B87333', bar: ['#C0C0C0', '#A8A8A8'], glow: 'rgba(200,115,35,0.45)', palette: ['#CD7F32', '#B87333', '#FFE3B3'], dim: 0.88, size: 106, hold: 2700, sats: 2, burst: 44, bloom: ['rgba(150,85,35,.32)', 'rgba(10,6,3,.5)'], title: 'Bronze.', sub: 'Your habit pal has arrived.' },
    { at: 60, key: 'silver', label: 'Silver habit pal', next: 'Gold', metal: ['#666F7E', '#F4F7FF', '#ACB6C7', '#606A79'], face: '#C0C0C0', back: '#A8A8A8', bar: ['#FFD700', '#B8860B'], glow: 'rgba(110,140,180,0.58)', palette: ['#C0C0C0', '#A8A8A8', '#E8EEF6'], dim: 0.91, size: 120, hold: 3100, sats: 3, burst: 64, bloom: ['rgba(150,165,185,.24)', 'rgba(8,10,14,.5)'], title: 'Silver.', sub: 'Almost there. Gold is within reach.', evo: { total: 1700, rise: 420, set: 640, gloss: 760, flash: 1020, reveal: 1100, fade: 400, grow: 620, bounce: 0.08, shards: 9, shardMs: 700, colors: ['#6F8199', '#C3D3E6', '#FFFFFF'] } },
    { at: 90, key: 'gold', label: 'Gold habit pal', next: null, metal: ['#96671A', '#FFE7A0', '#D4A444', '#8B5B12'], face: '#FFD700', back: '#B8860B', bar: ['#FFD700', '#B8860B'], glow: 'rgba(220,170,0,0.5)', palette: ['#FFD700', '#B8860B', '#FFF4C2'], dim: 0.94, size: 140, hold: 3900, sats: 3, burst: 28, bloom: ['rgba(205,150,30,.32)', 'rgba(12,9,2,.55)'], title: 'Gold.', sub: "That's a perfect day.", evo: { total: 2000, rise: 480, set: 740, gloss: 900, flash: 1200, reveal: 1290, fade: 520, grow: 760, bounce: 0.12, shards: 12, shardMs: 900, colors: ['#A0681C', '#E8BD4B', '#FFF4C2'] } },
  ];
  const HATCH_MS = 2400;
  const sprite = (tier, blink) => `assets/pals/ember-stage-${tier}${blink ? '-blink' : ''}.webp`;
  const TROPHY = '<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M448 64h-64V48a16 16 0 0 0-16-16H144a16 16 0 0 0-16 16v16H64a16 16 0 0 0-16 16v64c0 44.11 36.5 80.3 80 83.73v.27C128 282.3 181.53 336 240 336h16v48h-48a32 32 0 0 0-32 32v32h160v-32a32 32 0 0 0-32-32h-48v-48h16c58.47 0 112-53.7 112-108v-.27c43.5-3.43 80-39.62 80-83.73V80a16 16 0 0 0-16-16zM80 144v-48h48v96c-26.47-3.84-48-24.36-48-48zm352 0c0 23.64-21.53 44.16-48 48V96h48z"/></svg>';
  const SCALE = clamp(Math.min(innerWidth, innerHeight) / 420, 1, 1.5); // phone px -> this viewport

  // ---------- DOM ----------
  const goalsEl = $('goals'), doneEl = $('goals-done'), stage = $('stage'), palBox = $('pal'), palImg = $('pal-img'), palBlink = $('pal-blink');
  const base = $('base'), ptsEl = $('pts'), tierEl = $('tier'), nextEl = $('next'), barEl = $('bar'), msgEl = $('msg');
  const fx = $('fx'), ctx = fx.getContext('2d'), fly = $('fly'), cer = $('ceremony');

  goalsEl.innerHTML = GOALS.map((g, i) => `
    <button class="goal" type="button" data-i="${i}" aria-pressed="false">
      <span class="goal-fill" style="background:linear-gradient(90deg,${g.grad[0]},${g.grad[1]})"></span>
      <span class="goal-shine"></span>
      <span class="goal-iconwrap"><img class="goal-icon" src="assets/icons/${g.icon}.webp" alt="" width="44" height="44"><span class="goal-done-dot"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></span>
      <span class="goal-text"><b>${g.name}</b><small>${g.sub}</small></span>
      <span class="goal-badge"><span class="goal-badge-tint"></span><span class="goal-badge-shimmer"></span><span class="goal-badge-icon">${TROPHY}</span><span class="goal-badge-n">0/${g.pts}</span></span>
    </button>`).join('');
  ['bronze', 'silver', 'gold'].forEach((t) => { new Image().src = sprite(t); new Image().src = sprite(t, true); });

  // ---------- state ----------
  const done = new Set();
  let tierIdx = 0, shown = 0, busy = false;
  const pendingPoof = [];
  const total = () => [...done].reduce((s, i) => s + GOALS[i].pts, 0);
  const tierFor = (p) => { let t = 0; TIERS.forEach((x, i) => { if (p >= x.at) t = i; }); return t; };

  // ---------- canvas confetti (ConfettiBurst.tsx) ----------
  const parts = [];
  let fxRaf = null;
  function sizeCanvas() { const d = devicePixelRatio || 1; fx.width = innerWidth * d; fx.height = innerHeight * d; fx.style.width = innerWidth + 'px'; fx.style.height = innerHeight + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0); }
  sizeCanvas(); addEventListener('resize', sizeCanvas);
  function spawn(p) { if (parts.length >= 150 * SCALE) return; parts.push(p); if (!fxRaf) fxRaf = requestAnimationFrame(drawFx); }
  function piece(i, palette, slow) {
    const circle = Math.random() < 0.25;
    return { circle, w: circle ? 6 : rand(3, 5), h: 2.4, color: palette[i % palette.length], scale: (slow ? 2.2 : 1) * SCALE };
  }
  function burst(x, y, count, palette, slow) {
    if (reduced) return;
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      const up = Math.random() < 0.7;
      const ang = (up ? rand(-18, -162) : rand(0, 180)) * Math.PI / 180;
      const sp = rand(120, 300) * SCALE;
      spawn({ ...piece(i, palette, slow), x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 120 * rand(1.1, 1.9) * SCALE, rot: rand(-360, 360), t0: t0 + rand(0, 120), life: slow ? rand(1400, 2200) : rand(550, 900) });
    }
  }
  function rain(count, palette, slow, area) {
    if (reduced) return;
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      spawn({ ...piece(i, palette, slow), x: rand(area.x, area.x + area.w), y: area.y - 12, vx: rand(-30, 30) * SCALE, vy: (slow ? rand(320, 480) : rand(180, 300)) * SCALE, g: 120 * SCALE, rot: rand(-270, 270), t0: t0 + (slow ? rand(0, 600) : rand(0, 250)), life: slow ? rand(1800, 2500) : rand(450, 600) });
    }
  }
  function drawFx(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      const raw = (now - p.t0) / p.life;
      if (raw >= 1) { parts.splice(i, 1); continue; }
      if (raw < 0) continue;
      const q = E.outQuad(raw);
      const x = p.x + p.vx * q, y = p.y + p.vy * q + p.g * q * q;
      ctx.globalAlpha = Math.min(raw / 0.08, 1) * (1 - raw * raw);
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot * q * Math.PI / 180); ctx.scale(p.scale, p.scale);
      if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 1.5); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    fxRaf = parts.length ? requestAnimationFrame(drawFx) : null;
  }

  // ---------- pal idle (HabitPal.tsx) ----------
  let palTier = 'none', idleOn = true;
  (function breathe() {
    const start = performance.now();
    const step = (now) => {
      if (idleOn) {
        const b = E.inOutSin(((now - start) / 1400) % 2 < 1 ? ((now - start) / 1400) % 1 : 1 - ((now - start) / 1400) % 1);
        const s = palBox.offsetWidth;
        palBox.style.transform = palTier === 'none'
          ? `translateY(${-b * s * 0.012}px) rotate(${b * 5 - 2.5}deg)`
          : `translateY(${-b * s * 0.022}px) rotate(${b * 2 - 1}deg) scale(${1 - 0.012 * b}, ${1 + 0.045 * b})`;
      }
      requestAnimationFrame(step);
    };
    if (!reduced) requestAnimationFrame(step);
  })();
  (function blink() {
    after(2400 + Math.random() * 1800, () => {
      if (palTier !== 'none' && idleOn) { palBox.classList.add('blinking'); after(145, () => palBox.classList.remove('blinking')); }
      blink();
    });
  })();
  function setPalSprite(tier) {
    palTier = tier;
    palImg.src = sprite(tier);
    palBlink.src = sprite(tier === 'none' ? 'bronze' : tier, true);
    palImg.alt = tier === 'none' ? "Today's habit pal, still an egg" : `Ember, ${tier} habit pal`;
  }
  function setBase(tier, crossfade) {
    const m = TIERS.find((t) => t.key === tier).metal;
    const g = `linear-gradient(90deg, ${m[0]} 0%, ${m[1]} 22%, ${m[2]} 62%, ${m[3]} 100%)`;
    if (!crossfade) { base.style.background = g; return; }
    const top = document.createElement('div'); top.className = 'dome-base-swap'; top.style.background = g; base.appendChild(top);
    timing({ duration: 320, update: (v) => { top.style.opacity = v; }, end: () => { base.style.background = g; top.remove(); } });
  }
  setBase('none');

  // ---------- counter, bar, labels ----------
  function renderNumbers(pts, animateBar) {
    const t = tierFor(pts), tier = TIERS[t];
    tierEl.textContent = tier.label;
    ptsEl.style.setProperty('--tier-color', t ? tier.face : 'var(--ink)');
    const nextT = TIERS[t + 1];
    nextEl.textContent = nextT ? `${nextT.at - pts} pts to ${nextT.at === 30 ? 'Bronze' : nextT.at === 60 ? 'Silver' : 'Gold'}` : 'Gold achieved!';
    const lo = tier.at, hi = nextT ? nextT.at : 90;
    const ratio = nextT ? clamp((pts - lo) / (hi - lo), 0, 1) : 1;
    const band = nextT ? tier.bar : TIERS[3].bar;
    barEl.style.background = `linear-gradient(90deg, ${band[0]}, ${band[1]})`;
    document.querySelectorAll('.bar-mark').forEach((m) => m.classList.toggle('hit', pts >= +m.dataset.at));
    if (!animateBar || reduced) { barEl.style.width = ratio * 100 + '%'; return; }
    const from = parseFloat(barEl.style.width) || 0;
    if (from > ratio * 100 || t !== tierFor(shown)) { barEl.style.width = ratio * 100 + '%'; return; } // snap across a boundary
    timing({ from, to: ratio * 100, duration: 150, easing: E.outQuad, update: (v) => { barEl.style.width = v + '%'; } });
  }
  function countTo(target) {
    const from = shown;
    timing({ duration: reduced ? 0 : 400, easing: E.outCubic, update: (v, p) => { shown = Math.round(lerp(from, target, p)); ptsEl.innerHTML = shown + '<small>pts</small>'; } });
  }
  function counterLand() {
    // 10-piece gold burst, scale 1 -> 1.24 (110ms outQuad) then gentle spring, wobble -7 / +4 / 0
    const c = center(ptsEl);
    burst(c.x, c.y, 10, ['#FFD700', '#FFB800', '#B8860B']);
    let sc = 1, rot = 0;
    const paint = () => { ptsEl.style.transform = `scale(${sc}) rotate(${rot}deg)`; };
    timing({ from: 1, to: 1.24, duration: 110, easing: E.outQuad, update: (v) => { sc = v; paint(); }, end: () => spring({ from: 1.24, to: 1, ...SPRING.gentle, update: (v) => { sc = v; paint(); } }) });
    timing({ from: 0, to: -7, duration: 70, update: (v) => { rot = v; paint(); }, end: () => timing({ from: -7, to: 4, duration: 90, easing: E.inOutQuad, update: (v) => { rot = v; paint(); }, end: () => timing({ from: 4, to: 0, duration: 160, update: (v) => { rot = v; paint(); } }) }) });
  }

  // ---------- flying "+n" chip (FlyingChip) ----------
  function chip(from, to, n, onLand) {
    const el = document.createElement('div'); el.className = 'fly-chip'; el.textContent = `+${n}`;
    const dots = [6, 5, 4, 3].map((s) => { const d = document.createElement('i'); d.className = 'fly-dot'; d.style.width = d.style.height = s + 'px'; fly.appendChild(d); return d; });
    fly.appendChild(el);
    const ctl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 100 * SCALE };
    const pos = (t) => bez(from, ctl, to, E.inCubic(t));
    const scaleAt = (t) => (t < 0.1 ? lerp(0, 1.25, t / 0.1) : t < 0.28 ? lerp(1.25, 1, (t - 0.1) / 0.18) : t < 0.7 ? 1 : lerp(1, 0.55, (t - 0.7) / 0.3));
    let landed = false;
    clock(620 + 40, (ms) => {
      const t = clamp((ms - 40) / 620, 0, 1);
      const p = pos(t);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${scaleAt(t)})`;
      el.style.opacity = t > 0.92 ? 1 - (t - 0.92) / 0.08 : 1;
      dots.forEach((d, k) => { const q = clamp(t - (k + 1) * 0.06, 0, 1); const dp = pos(q); d.style.transform = `translate(${dp.x}px, ${dp.y}px) translate(-50%, -50%)`; d.style.opacity = (0.45 - 0.09 * k) * (1 - q); });
      if (!landed && ms >= 40 + 620 - 30) { landed = true; onLand(); }
    }, () => { el.remove(); dots.forEach((d) => d.remove()); });
  }

  // ---------- trophy volley (CelebrationLayer.tsx) ----------
  function volley(from, target, count, oldTier, newTier, onFirst) {
    const n = clamp(count, 7, 20);
    for (let i = 0; i < n; i++) {
      const fan = i - (n - 1) / 2;
      const tier = TIERS[newTier !== oldTier && i >= 3 ? newTier : oldTier];
      const size = [22, 27, 32][i % 3] * SCALE;
      const el = document.createElement('div'); el.className = 'fly-trophy'; el.style.width = el.style.height = size + 'px';
      el.innerHTML = `<span class="tr-back" style="color:${tier.back}">${TROPHY}</span><span class="tr-face" style="color:${tier.face}">${TROPHY}</span><span class="tr-glint">${TROPHY}</span>`;
      const ghost = document.createElement('div'); ghost.className = 'fly-trophy ghost'; ghost.style.width = ghost.style.height = size + 'px'; ghost.innerHTML = `<span class="tr-face" style="color:${tier.face}">${TROPHY}</span>`;
      fly.appendChild(ghost); fly.appendChild(el);
      const back = el.querySelector('.tr-back'), glint = el.querySelector('.tr-glint'), face = el.querySelector('.tr-face');
      const ctl = { x: (from.x + target().x) / 2 + fan * 20 * SCALE, y: Math.min(from.y, target().y) - (70 + i * 9) * SCALE };
      after(i * 70, () => {
        let first = i === 0;
        clock(560, (ms) => {
          const t = ms / 560, e = E.inQuad(t), to = target();
          const p = bez(from, ctl, to, e);
          const p2 = bez(from, ctl, to, E.inQuad(Math.min(1, t + 0.01)));
          const bank = Math.atan2(p2.y - p.y, p2.x - p.x) * Math.min(3 * t, 1) * 0.35 * 180 / Math.PI + fan * 6 * t;
          const rotY = (fan >= 0 ? 360 : -360) * t + fan * 14;
          const rotX = 14 * Math.sin(2 * Math.PI * t + i * 0.9);
          const sc = (t < 0.12 ? lerp(0, 1.3, t / 0.12) : t < 0.7 ? lerp(1.3, 1, (t - 0.12) / 0.58) : lerp(1, 0.55, (t - 0.7) / 0.3)) * (1 + 0.12 * Math.sin(Math.PI * t));
          const cos = Math.cos(rotY * Math.PI / 180);
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) perspective(320px) rotateZ(${bank}deg) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${sc * (1 + 0.3 * t * t)}, ${sc})`;
          el.style.opacity = t < 0.06 ? t / 0.06 : t > 0.92 ? (1 - t) / 0.08 : 1;
          back.style.transform = `translateX(${3 * Math.sin(rotY * Math.PI / 180)}px)`;
          face.style.filter = `brightness(${1 - 0.55 * Math.pow(1 - Math.abs(cos), 1.5)})`;
          glint.style.opacity = 0.24 * Math.pow(Math.max(0, cos), 6);
          const gt = clamp(t - 0.055, 0, 1), gp = bez(from, ctl, to, E.inQuad(gt));
          ghost.style.transform = `translate(${gp.x}px, ${gp.y}px) translate(-50%, -50%) scale(${sc * 0.9})`;
          ghost.style.opacity = gt > 0.15 && gt < 0.9 ? 0.22 * (gt - 0.15) : 0;
        }, () => { el.remove(); ghost.remove(); if (first) { first = false; onFirst(); } });
      });
    }
  }
  function palHop() {
    // translateY -9 over 130ms outQuad, then spring back (damping 12, stiffness 300)
    idleOn = false;
    timing({ from: 0, to: -9 * SCALE, duration: 130, easing: E.outQuad, update: (v) => { palBox.style.transform = `translateY(${v}px)`; }, end: () => spring({ from: -9 * SCALE, to: 0, damping: 12, stiffness: 300, update: (v) => { palBox.style.transform = `translateY(${v}px)`; }, end: () => { idleOn = true; } }) });
  }

  // ---------- goal row completion (GoalRow.tsx) ----------
  function completeRow(btn, g, i) {
    const fill = btn.querySelector('.goal-fill'), shine = btn.querySelector('.goal-shine'), badge = btn.querySelector('.goal-badge'), tint = btn.querySelector('.goal-badge-tint'), shimmer = btn.querySelector('.goal-badge-shimmer'), n = btn.querySelector('.goal-badge-n');
    btn.classList.add('done'); btn.setAttribute('aria-pressed', 'true');
    btn.style.opacity = 0.8; after(100, () => { btn.style.opacity = ''; });
    // fill: 500ms out-cubic (fast flick)
    timing({ from: parseFloat(fill.style.width) || 0, to: 100, duration: reduced ? 0 : 500, easing: E.outCubic, update: (v) => { fill.style.width = v + '%'; } });
    // shine sweep: 300ms delay, 520ms inOutQuad, opacity triangle peaking 0.5
    const w = btn.offsetWidth;
    timing({ delay: 300, duration: 520, easing: E.inOutQuad, update: (v, p) => { shine.style.transform = `translateX(${lerp(-80, w + 80, v)}px) rotate(18deg)`; shine.style.opacity = 0.5 * (1 - Math.abs(p - 0.5) * 2); } });
    // badge: tint 450ms, pop 1.16 (120ms) then gentle spring, shimmer at 160ms for 680ms
    timing({ duration: 450, easing: E.outCubic, update: (v) => { tint.style.opacity = v; badge.style.borderColor = `rgba(52,199,89,${0.12 + 0.58 * v})`; } });
    timing({ from: 1, to: 1.16, duration: 120, easing: E.outQuad, update: (v) => { badge.style.transform = `scale(${v})`; }, end: () => spring({ from: 1.16, to: 1, ...SPRING.gentle, update: (v) => { badge.style.transform = `scale(${v})`; } }) });
    timing({ delay: 160, duration: 680, easing: E.outCubic, update: (v) => { shimmer.style.transform = `translateX(${lerp(-60, 130, v)}px)`; shimmer.style.opacity = 1 - v; } });
    n.textContent = `${g.pts}/${g.pts}`;
    // burst at the row (40 pieces, goal gradient + white) and the icon flying out as 3 copies
    const ic = center(btn.querySelector('.goal-icon'));
    burst(ic.x, ic.y, 40, [g.grad[0], g.grad[1], '#FFFFFF']);
    if (!reduced) [[-90, 120], [-140, 95], [-45, 100]].forEach(([ang, sp], k) => {
      const img = document.createElement('img'); img.src = `assets/icons/${g.icon}.webp`; img.className = 'fly-icon'; fly.appendChild(img);
      const a = ang * Math.PI / 180, rot = (k % 2 ? -1 : 1) * (140 + k * 60);
      after(k * 50, () => clock(750, (ms) => {
        const p = E.outQuad(ms / 750), t = ms / 750;
        const x = ic.x + Math.cos(a) * sp * SCALE * p, y = ic.y + Math.sin(a) * sp * SCALE * p + 90 * SCALE * t * t;
        img.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rot * p}deg) scale(${t < 0.15 ? lerp(0.7, 1.2, t / 0.15) : 1.2})`;
        img.style.opacity = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
      }, () => img.remove()));
    });
  }
  function poof(btn) {
    // scale only: hold 380ms, swell 1.04 (70ms), implode to 0 (190ms inCubic), then move to Completed
    if (reduced) { moveToDone(btn); return; }
    timing({ delay: 380, from: 1, to: 1.04, duration: 70, easing: E.outQuad, update: (v) => { btn.style.transform = `scale(${v})`; }, end: () => timing({ from: 1.04, to: 0, duration: 190, easing: E.inCubic, update: (v) => { btn.style.transform = `scale(${v})`; }, end: () => moveToDone(btn) }) });
  }
  function moveToDone(btn) {
    const h = btn.offsetHeight;
    btn.style.height = h + 'px'; btn.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      btn.classList.add('collapsing'); btn.style.height = '0px'; btn.style.marginBottom = '0px';
      after(300, () => {
        btn.classList.remove('collapsing'); btn.style.cssText = ''; btn.classList.add('entering');
        doneEl.appendChild(btn); doneEl.parentElement.classList.add('has-done');
        requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.remove('entering')));
      });
    });
  }
  function undoRow(btn, g) {
    btn.classList.remove('done'); btn.setAttribute('aria-pressed', 'false');
    btn.querySelector('.goal-fill').style.width = '0%'; btn.querySelector('.goal-badge-tint').style.opacity = 0; btn.querySelector('.goal-badge').style.borderColor = ''; btn.querySelector('.goal-badge-n').textContent = `0/${g.pts}`;
    goalsEl.appendChild(btn); btn.style.transform = 'scale(0.9)';
    spring({ from: 0.9, to: 1, damping: 15, stiffness: 260, update: (v) => { btn.style.transform = `scale(${v})`; }, end: () => { btn.style.transform = ''; } });
    if (!doneEl.children.length) doneEl.parentElement.classList.remove('has-done');
  }

  // ---------- tier ceremony (takeover) ----------
  function ceremony(oldT, newT, volleyFrom, trophies) {
    busy = true; idleOn = false;
    const tier = TIERS[newT];
    const palRect = palBox.getBoundingClientRect();
    const domeSize = palRect.width;
    const size = Math.min(domeSize * (tier.size / 84), innerWidth * 0.62, 320);
    const centerPt = { x: innerWidth / 2, y: innerHeight / 2 - 40 };
    const from = { x: palRect.left + palRect.width / 2, y: palRect.top + palRect.height / 2 };

    cer.innerHTML = `<div class="cer-dim"></div><div class="cer-bloom"></div><div class="cer-flight"><img class="cer-pal" src="${sprite(TIERS[oldT].key)}" alt=""></div><div class="cer-caption"><div class="cer-title">${tier.title}</div><div class="cer-sub">${tier.sub}</div></div><div class="cer-hint">Tap anywhere to continue</div>`;
    cer.hidden = false;
    const dim = cer.querySelector('.cer-dim'), bloom = cer.querySelector('.cer-bloom'), flight = cer.querySelector('.cer-flight'), cap = cer.querySelector('.cer-caption'), hint = cer.querySelector('.cer-hint');
    dim.style.background = `rgba(0,0,0,${tier.dim})`;
    bloom.style.background = `radial-gradient(circle at 50% calc(50% - 40px), ${tier.bloom[0]} 0%, ${tier.bloom[1]} 72%)`;
    flight.style.width = flight.style.height = size + 'px';
    cap.style.top = Math.min(centerPt.y + size / 2 + 20, innerHeight - 150) + 'px';
    palBox.style.visibility = 'hidden';
    timing({ duration: 380, easing: E.outQuad, update: (v) => { dim.style.opacity = v; } });
    timing({ delay: 650, duration: 500, update: (v) => { bloom.style.opacity = v; } });
    document.querySelector('main').classList.add('receded');

    // hero flight along a bezier, driven by a spring (damping 15, stiffness 120, mass 0.9) after 120ms
    let fp = 0, fs = domeSize / size, dip = 0, dock = 1, bob = 0;
    const ctl = { x: (from.x + centerPt.x) / 2 + (from.x < centerPt.x ? 70 : -70), y: Math.min(from.y, centerPt.y) - 40 };
    const paint = () => { const p = bez(from, ctl, centerPt, fp); flight.style.transform = `translate(${p.x}px, ${p.y + dip + bob}px) translate(-50%, -50%) scale(${fs * dock})`; };
    paint();
    spring({ from: 0, to: 1, damping: 15, stiffness: 120, mass: 0.9, delay: 120, update: (v) => { fp = v; fs = lerp(domeSize / size, 1, v); paint(); } });
    timing({ from: 0, to: 7, duration: 90, update: (v) => { dip = v; paint(); }, end: () => timing({ from: 7, to: 0, duration: 140, update: (v) => { dip = v; paint(); } }) });
    after(500, () => spring({ from: 1, to: 1.14, ...SPRING.pop, update: (v) => { dock = v; paint(); }, end: () => spring({ from: 1.14, to: 1, ...SPRING.settle, update: (v) => { dock = v; paint(); } }) }));
    let bobStop = null;
    after(1650, () => { const s0 = performance.now(); const step = (now) => { const u = ((now - s0) / 1400) % 2; bob = -4 * E.inOutSin(u < 1 ? u : 2 - u); paint(); bobStop = requestAnimationFrame(step); }; bobStop = requestAnimationFrame(step); });

    // volley chases the flight
    volley(volleyFrom, () => { const r = flight.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, trophies, oldT, newT, () => {});

    // pal transition at 650ms
    const stages = []; for (let k = oldT + 1; k <= newT; k++) stages.push(k);
    const transition = stages.reduce((sum, k) => sum + (k === 1 ? HATCH_MS : TIERS[k].evo.total), 0);
    let revealed = false;
    const onReveal = () => {
      revealed = true;
      cap.classList.add('show');
      const c = center(flight);
      burst(c.x, c.y, tier.burst, tier.palette);
      for (let k = 0; k < tier.sats; k++) after(300 + k * 260, () => burst(rand(0.15, 0.85) * innerWidth, rand(0.16, 0.44) * innerHeight, 30, tier.palette));
      const area = { x: 0, y: 0, w: innerWidth };
      if (newT === 2) after(400, () => rain(28, tier.palette, false, area));
      if (newT === 3) { after(400, () => rain(48, tier.palette, false, area)); after(950, () => rain(32, tier.palette, true, area)); }
      setBase(tier.key, true);
      after(900, () => hint.classList.add('show'));
    };
    const runStage = (idx) => {
      const k = stages[idx], last = idx === stages.length - 1;
      const next = () => { if (!last) runStage(idx + 1); };
      const reveal = last ? onReveal : () => {};
      if (k === 1) hatch(flight, size, reveal, next); else evolve(flight, size, TIERS[k - 1].key, TIERS[k], reveal, next);
    };
    after(650, () => runStage(0));

    // dismiss
    const hold = Math.max(tier.hold, 650 + transition + 1100);
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return; dismissed = true;
      cer.removeEventListener('click', dismiss);
      cap.classList.remove('show'); hint.classList.remove('show');
      if (bobStop) cancelAnimationFrame(bobStop);
      const back = palBox.getBoundingClientRect(); const to = { x: back.left + back.width / 2, y: back.top + back.height / 2 };
      const start = center(flight);
      setPalSprite(tier.key);
      timing({ duration: 420, easing: E.inOutCubic, update: (v) => { flight.style.transform = `translate(${lerp(start.x, to.x, v)}px, ${lerp(start.y, to.y, v)}px) translate(-50%, -50%) scale(${lerp(1, domeSize / size, v)})`; } });
      timing({ delay: 200, duration: 240, update: (v) => { dim.style.opacity = 1 - v; bloom.style.opacity = 1 - v; } });
      document.querySelector('main').classList.remove('receded');
      after(430, () => { palBox.style.visibility = ''; palBox.style.transform = ''; idleOn = true; });
      after(490, () => { cer.hidden = true; cer.innerHTML = ''; busy = false; tierIdx = newT; renderNumbers(total(), false); pendingPoof.splice(0).forEach(poof); });
    };
    after(hold, dismiss);
    after(650 + transition * 0.5, () => cer.addEventListener('click', dismiss));
  }

  // ---------- hatch, egg -> bronze (HabitPalHatch.tsx), one 2400ms clock ----------
  function hatch(host, S, onReveal, onEnd) {
    host.innerHTML = `
      <div class="h-glow"></div>
      <img class="h-egg" src="${sprite('none')}" alt="">
      ${[...Array(8)].map((_, k) => `<img class="h-wedge" src="${sprite('none')}" alt="" style="clip-path:polygon(50% 50%, ${50 + 60 * Math.cos(k * Math.PI / 4)}% ${50 + 60 * Math.sin(k * Math.PI / 4)}%, ${50 + 60 * Math.cos((k + 0.5) * Math.PI / 4)}% ${50 + 60 * Math.sin((k + 0.5) * Math.PI / 4)}%, ${50 + 60 * Math.cos((k + 1) * Math.PI / 4)}% ${50 + 60 * Math.sin((k + 1) * Math.PI / 4)}%)">`).join('')}
      <div class="h-ring" style="border-width:${Math.max(1.5, S * 0.012)}px"></div>
      ${[...Array(8)].map(() => '<i class="h-spark"></i>').join('')}
      <img class="h-pal" src="${sprite('bronze')}" alt="Ember, bronze habit pal">`;
    const glow = host.querySelector('.h-glow'), egg = host.querySelector('.h-egg'), wedges = [...host.querySelectorAll('.h-wedge')], ring = host.querySelector('.h-ring'), sparks = [...host.querySelectorAll('.h-spark')], pal = host.querySelector('.h-pal');
    let revealed = false;
    clock(HATCH_MS, (t) => {
      // egg wobble, hidden at 1030
      egg.style.transform = `rotate(${Math.sin(t / 42) * Math.pow(clamp(t / 1030, 0, 1), 1.4) * 7}deg)`;
      egg.style.opacity = t < 1030 ? 1 : 0;
      glow.style.opacity = t > 620 && t < 1920 ? Math.sin(Math.PI * (t - 620) / 1300) * 0.7 : 0;
      // shell wedges fly out from 1030 over 660ms
      const wp = seg(t, 1030, 1690);
      wedges.forEach((w, k) => {
        const a = (k + 0.5) * Math.PI / 4;
        w.style.opacity = t < 1030 ? 0 : 1 - Math.pow(wp, 2);
        w.style.transform = `translate(${Math.cos(a) * 0.27 * S * E.outCubic(wp)}px, ${(Math.sin(a) * 0.24 * S) * E.outCubic(wp) + 0.09 * S * wp * wp}px) rotate(${(k % 2 ? -0.85 : 0.85) * wp}rad)`;
      });
      // ring and sparks from 1040 over 910ms
      const rp = seg(t, 1040, 1950);
      ring.style.opacity = t < 1040 ? 0 : 0.8 * (1 - rp);
      ring.style.transform = `translate(-50%, -50%) scale(${lerp(0.2, 1, E.outCubic(rp))})`;
      sparks.forEach((s, k) => { const a = k * Math.PI / 4 + 0.3; const r = (0.1 + 0.24 * E.outCubic(rp)) * S; s.style.opacity = t < 1040 ? 0 : 1 - rp; s.style.transform = `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)`; });
      // bronze pal
      const op = seg(t, 1050, 1130), grow = E.outCubic(seg(t, 1050, 1430)), bs = seg(t, 1260, 1910);
      const bounce = Math.sin(2 * Math.PI * bs) * Math.exp(-3 * bs) * 0.13 * (t > 1260 && t < 1910 ? 1 : 0);
      const lift = Math.sin(Math.PI * seg(t, 1050, 1770)) * 0.05 * S;
      pal.style.opacity = op;
      pal.style.transform = `translateY(${-lift}px) scale(${lerp(0.62, 1, grow) + bounce}) rotate(${lerp(-7, 0, grow) + bounce * 5}deg)`;
      if (!revealed && t >= 1060) { revealed = true; onReveal(); }
    }, onEnd);
  }

  // ---------- evolution, bronze -> silver -> gold (HabitPalEvolution.tsx) ----------
  function evolve(host, S, oldKey, tier, onReveal, onEnd) {
    const v = tier.evo, [shadow, body, hi] = v.colors;
    const mask = (src) => `-webkit-mask:url(${src}) center/contain no-repeat;mask:url(${src}) center/contain no-repeat;`;
    host.innerHTML = `
      <div class="e-halo" style="background:radial-gradient(circle, ${body} 0%, transparent 65%)"></div>
      <img class="e-old" src="${sprite(oldKey)}" alt="">
      <div class="e-coat" style="${mask(sprite(oldKey))}background:${body}"></div>
      <div class="e-gloss" style="${mask(sprite(oldKey))}background:${hi}"></div>
      <div class="e-white" style="${mask(sprite(oldKey))}background:${hi}"></div>
      <img class="e-new" src="${sprite(tier.key)}" alt="Ember, ${tier.key} habit pal">
      ${[...Array(v.shards)].map(() => `<i class="e-shard" style="background:${hi}"></i>`).join('')}`;
    const halo = host.querySelector('.e-halo'), old = host.querySelector('.e-old'), coat = host.querySelector('.e-coat'), gloss = host.querySelector('.e-gloss'), white = host.querySelector('.e-white'), nu = host.querySelector('.e-new'), shards = [...host.querySelectorAll('.e-shard')];
    const shardAng = shards.map((_, k) => (k / shards.length) * Math.PI * 2 + rand(-0.2, 0.2)), shardR = shards.map(() => rand(0.55, 0.91));
    let revealed = false;
    const total = v.total + v.fade;
    clock(total, (t) => {
      const rise = 1 - Math.pow(1 - seg(t, 0, v.rise), 2);
      coat.style.clipPath = `inset(${(1 - rise) * 100}% 0 0 0)`;
      const pulse = t > v.rise && t < v.set ? 1 + Math.sin(Math.PI * seg(t, v.rise, v.set)) * 0.045 : 1;
      const tremor = t > v.flash - 160 && t < v.reveal ? Math.sin(t / 9) * S * 0.006 : 0;
      const statue = `translateX(${tremor}px) scale(${pulse})`;
      old.style.transform = coat.style.transform = gloss.style.transform = white.style.transform = statue;
      gloss.style.opacity = t > v.set ? Math.sin(Math.PI * seg(t, v.set, v.gloss + 120)) * 0.75 : 0;
      white.style.opacity = t < v.reveal ? seg(t, v.flash, v.reveal) : 1 - seg(t, v.reveal, v.reveal + v.fade);
      if (t >= v.reveal) { old.style.opacity = coat.style.opacity = gloss.style.opacity = 0; white.style.cssText += mask(sprite(tier.key)); }
      const charge = seg(t, 0, v.rise), bl = seg(t, v.flash, v.flash + 300), rel = seg(t, v.reveal + 200, v.reveal + 200 + (tier.key === 'gold' ? 1100 : 800));
      halo.style.opacity = Math.max(charge * 0.45, bl * 0.9) * (1 - rel);
      halo.style.transform = `translate(-50%, -50%) scale(${0.7 + 0.3 * charge + 0.5 * bl + 0.6 * rel})`;
      const g = seg(t, v.reveal, v.reveal + v.grow);
      nu.style.opacity = t >= v.reveal ? 1 : 0;
      nu.style.transform = `scale(${0.78 + 0.22 * E.outCubic(g) + Math.sin(Math.PI * g) * v.bounce})`;
      const sp = seg(t, v.reveal - 40, v.reveal - 40 + v.shardMs), se = E.outCubic(sp);
      shards.forEach((s, k) => { const r = S * (0.12 + se * shardR[k]); s.style.opacity = t < v.reveal - 40 ? 0 : 1 - sp; s.style.transform = `translate(${Math.cos(shardAng[k]) * r}px, ${Math.sin(shardAng[k]) * r}px) rotate(${2.4 * sp}rad) scale(${lerp(1.3, 0.4, sp)})`; });
      if (!revealed && t >= v.reveal) { revealed = true; onReveal(); }
    }, onEnd);
  }

  // ---------- interaction ----------
  goalsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.goal'); if (!btn || busy) return;
    const i = +btn.dataset.i, g = GOALS[i];
    if (done.has(i)) return;
    const before = total(), afterPts = before + g.pts;
    done.add(i);
    const oldT = tierIdx, newT = tierFor(afterPts);
    completeRow(btn, g, i);
    const rowC = center(btn.querySelector('.goal-badge'));
    const trophies = Math.round(4 + g.pts * 0.36);
    // "+n" chip to the counter; on landing: burst, counter pop, count-up, bar
    chip({ x: rowC.x, y: rowC.y }, center(ptsEl), g.pts, () => { counterLand(); countTo(afterPts); if (newT === oldT) renderNumbers(afterPts, true); });
    if (newT > oldT) {
      ceremony(oldT, newT, rowC, trophies);
      pendingPoof.push(btn);
    } else {
      volley(rowC, () => center(palBox), trophies, oldT, oldT, () => { const c = center(palBox); burst(c.x, c.y, 12, TIERS[oldT].sparks || TIERS[oldT].palette); palHop(); });
      poof(btn);
    }
  });
  doneEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.goal'); if (!btn || busy) return;
    const i = +btn.dataset.i; done.delete(i); undoRow(btn, GOALS[i]);
    const p = total(); tierIdx = tierFor(p); shown = p; ptsEl.innerHTML = p + '<small>pts</small>';
    setPalSprite(TIERS[tierIdx].key); setBase(TIERS[tierIdx].key); renderNumbers(p, false);
  });
  $('reset').addEventListener('click', () => {
    if (busy) return;
    done.clear(); timers.forEach(clearTimeout); timers.clear(); fly.innerHTML = ''; parts.length = 0;
    [...doneEl.children, ...goalsEl.children].forEach((b) => undoRow(b, GOALS[+b.dataset.i]));
    tierIdx = 0; shown = 0; ptsEl.innerHTML = '0<small>pts</small>'; ptsEl.style.transform = '';
    setPalSprite('none'); setBase('none'); renderNumbers(0, false);
  });

  setPalSprite('none'); renderNumbers(0, false);
})();
