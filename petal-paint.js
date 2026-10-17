/* Petal-local drawing materials. The supplied botanical silhouette remains authoritative. */
(function (root) {
  'use strict';

  const kinds = Object.freeze(['pen', 'ink', 'pencil', 'dry', 'watercolor']);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const number = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const TAU = Math.PI * 2;

  function random(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return function () {
      h = (h + 0x6D2B79F5) | 0;
      let n = Math.imul(h ^ (h >>> 15), h | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rgb(color, fallback) {
    const text = typeof color === 'string' ? color : fallback;
    if (/^#[0-9a-f]{3}$/i.test(text)) return text.slice(1).split('').map(x => parseInt(x + x, 16));
    if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(text)) {
      return [1, 3, 5].map(i => parseInt(text.slice(i, i + 2), 16));
    }
    return rgb(fallback, '#808080');
  }

  function mix(a, b, t) {
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  function palette(m) {
    const daisy = m.species === 'daisy', poppy = m.species === 'poppy';
    const base = rgb(m.base, daisy ? '#9ca7a1' : poppy ? '#a31332' : '#952363');
    const mid = rgb(m.mid, daisy ? '#e2e7e1' : poppy ? '#e52642' : '#d24b9d');
    const light = rgb(m.light, daisy ? '#fffef7' : poppy ? '#fa5769' : '#ed8dc5');
    const pigment = rgb(daisy ? '#667c75' : poppy ? '#81162e' : '#74235f', '#74235f');
    const paper = rgb('#f5f1e7', '#f5f1e7');
    return {
      dark: mix(base, pigment, daisy ? .68 : .40),
      middle: mix(mid, pigment, .18),
      color: mix(mid, light, .22),
      light: mix(light, paper, daisy ? .20 : .12),
      tooth: mix(paper, light, daisy ? .08 : .21),
      matte: mix(light, paper, daisy ? .35 : .48)
    };
  }

  // A fan of curved longitudinal fibers, from the narrow root toward the petal rim.
  // The clip retains actual serrations, curls and the broad poppy cup shape.
  function point(m, u, t) {
    const s = clamp(t, 0, 1), ease = s * s * (3 - 2 * s);
    let spread;
    if (m.species === 'daisy') spread = .06 + .90 * Math.pow(Math.sin(Math.PI * (.02 + s * .94)), .67);
    else if (m.species === 'poppy') spread = .075 + .94 * Math.pow(Math.sin(Math.PI * s * .84), .77);
    else spread = .075 + .89 * Math.sin(s * Math.PI * .5);
    const rootY = m.species === 'daisy' ? -.16 : -.12;
    return {
      x: m.bend * ease + u * m.width * spread + m.width * .08 * u * (1 - u * u) * Math.sin(Math.PI * s),
      y: rootY - (m.length + rootY) * s + Math.abs(u) * m.length * .035 * s * s
    };
  }

  function frame(m, u, t) {
    const p = point(m, u, t), a = point(m, u, Math.max(0, t - .004));
    const b = point(m, u, Math.min(1, t + .004));
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {x: p.x, y: p.y, tx: (b.x - a.x) / d, ty: (b.y - a.y) / d,
      nx: -(b.y - a.y) / d, ny: (b.x - a.x) / d};
  }

  function curve(ctx, m, u, start, end, color, width, alpha, sway) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
    ctx.beginPath();
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const t = start + (end - start) * i / steps;
      const p = point(m, u + (sway || 0) * Math.sin(Math.PI * i / steps), t);
      if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function ribbon(ctx, m, u, start, end, width, color, alpha, rand, roughness, pressure) {
    const contour = [], steps = 11;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, p = frame(m, u, start + (end - start) * t);
      const taper = pressure ? .08 + Math.pow(Math.sin(Math.PI * t), .70) * Math.pow(1 - t, .12) : .58 + .42 * Math.sin(Math.PI * t);
      const radius = width * taper * (.82 + rand() * roughness) / 2;
      const drift = (rand() - .5) * width * roughness * .3;
      contour.push({p, radius, drift});
    }
    ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.beginPath();
    for (let side = 1; side >= -1; side -= 2) {
      for (let j = 0; j < contour.length; j++) {
        const q = contour[side === 1 ? j : contour.length - 1 - j];
        const x = q.p.x + q.p.nx * (q.drift + side * q.radius);
        const y = q.p.y + q.p.ny * (q.drift + side * q.radius);
        if (side === 1 && !j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.closePath(); ctx.fill();
  }

  function outline(ctx, silhouette, color, width, alpha, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash(dash || []);
    ctx.stroke(silhouette);
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
  }

  function pen(ctx, shape, m, c, rand) {
    // Colored contour ink and disciplined curved hatching remain readable at garden size.
    const count = m.small ? (m.species === 'daisy' ? 2 : 5) : (m.species === 'daisy' ? 3 : 9);
    outline(ctx, shape, c.dark, m.hair * 2.1, m.alpha * .86);
    for (let i = 0; i < count; i++) {
      const u = (i + .5) / count * 1.72 - .86;
      curve(ctx, m, u, .16 + rand() * .14, .86 + rand() * .11, c.dark,
        m.hair * (.66 + rand() * .38), m.alpha * (.43 + rand() * .20), .035);
    }
    const hatches = Math.round((m.small ? (m.species === 'daisy' ? 3 : 8) : (m.species === 'daisy' ? 6 : 19)) * (.55 + m.texture * .45));
    for (let i = 0; i < hatches; i++) {
      const u = (rand() < .5 ? -1 : 1) * (.45 + rand() * .46);
      const t = .25 + rand() * .52;
      curve(ctx, m, u, t, Math.min(.98, t + .10 + rand() * .14), c.dark,
        m.hair * .80, m.alpha * (.36 + rand() * .22), -u * .16);
    }
  }

  function ink(ctx, shape, m, c, rand) {
    // Pressure forms opaque tapered sweeps; bright interstices prevent a flat dark petal.
    const count = m.species === 'daisy' ? 2 : m.small ? 4 : 6;
    for (let i = 0; i < count; i++) {
      const u = (i + .5) / count * 1.65 - .825 + (rand() - .5) * .11;
      ribbon(ctx, m, u, .07 + rand() * .13, .88 + rand() * .11,
        Math.min(m.width * .56, m.width * (m.species === 'daisy' ? .48 : .36) * m.widthScale),
        i % 3 === 1 ? c.color : c.dark, m.alpha * (.64 + rand() * .30), rand, .12 + m.texture * .13, true);
    }
    ribbon(ctx, m, -.22, .25, .95, m.width * .18, c.light, m.alpha * .48, rand, .09, true);
    curve(ctx, m, -.92, .32, .89, c.dark, m.hair * 2.7, m.alpha * .54, .055);
    curve(ctx, m, .92, .64, .94, c.middle, m.hair * 1.9, m.alpha * .37, -.04);
    outline(ctx, shape, c.middle, m.hair * 1.3, m.alpha * .18);
  }

  function pencil(ctx, shape, m, c, rand) {
    ctx.fillStyle = c.matte; ctx.globalAlpha = m.alpha * .43; ctx.fill(shape);
    outline(ctx, shape, c.dark, m.hair * 1.5, m.alpha * .55,
      [m.length * .013, m.length * .009, m.length * .037, m.length * .012]);
    const grains = m.small ? 22 : m.species === 'daisy' ? 42 : 67;
    ctx.lineCap = 'butt';
    // Independent positions and lengths avoid a repeating dash lattice on the paper.
    for (let i = 0; i < grains; i++) {
      const u = (rand() * 2 - 1) * .97, t = .11 + rand() * .83;
      const p = frame(m, u, t);
      const length = m.length * (.008 + rand() * (m.small ? .055 : .039) * (.65 + m.texture * .65));
      const tooth = i % 7 === 0;
      ctx.strokeStyle = tooth ? c.tooth : i % 3 === 0 ? c.middle : c.dark;
      ctx.globalAlpha = m.alpha * (tooth ? .45 + m.texture * .35 : .40 + rand() * .48);
      ctx.lineWidth = Math.min(m.width * .17, m.hair * (.70 + rand() * 1.35) * m.widthScale);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.tx * length + p.nx * (rand() - .5) * m.width * .065,
        p.y + p.ty * length + p.ny * (rand() - .5) * m.width * .065);
      ctx.stroke();
    }
    curve(ctx, m, -.34, .23, .88, c.dark, m.hair * .7, m.alpha * .29, .08);
    curve(ctx, m, .38, .37, .95, c.light, m.hair, m.alpha * .40, -.06);
  }

  function dry(ctx, shape, m, c, rand) {
    const bundles = m.small ? (m.species === 'daisy' ? 3 : 5) : (m.species === 'daisy' ? 5 : 10);
    for (let i = 0; i < bundles; i++) {
      const u = (i + .3 + rand() * .4) / bundles * 1.85 - .925;
      const start = .12 + rand() * .30, end = .72 + rand() * .27;
      ribbon(ctx, m, u, start, end, m.width * (.14 + rand() * .15) * Math.sqrt(m.widthScale),
        i % 3 === 0 ? c.light : c.dark, m.alpha * (.50 + rand() * .41), rand, .86 + m.texture * .72, true);
    }
    // Narrow paper exposures follow bristle travel. No erasing or canvas-wide speckle.
    const gaps = m.small ? 8 : m.species === 'daisy' ? 12 : 18;
    for (let i = 0; i < gaps; i++) {
      const u = rand() * 1.92 - .96, start = .16 + rand() * .59;
      const end = Math.min(.99, start + .08 + rand() * .24);
      curve(ctx, m, u, start, end, c.tooth,
        Math.min(m.width * .12, m.hair * (1 + rand() * 1.9)),
        m.alpha * (.31 + m.texture * .31 + rand() * .16), (rand() - .5) * .12);
    }
    const hairs = m.small ? 3 : 7;
    for (let i = 0; i < hairs; i++) {
      const start = .19 + rand() * .34;
      curve(ctx, m, rand() * 1.8 - .9, start, Math.min(.99, start + .25 + rand() * .35),
        i % 2 ? c.color : c.dark, m.hair * .66, m.alpha * .65, (rand() - .5) * .12);
    }
    outline(ctx, shape, c.dark, m.hair * 2.2, m.alpha * .52,
      [m.length * .071, m.length * .042, m.length * .019, m.length * .063]);
  }

  function localWash(ctx, m, c, u, t, length, width, alpha, rand) {
    const p = frame(m, u, t), phase = rand() * TAU;
    ctx.save();
    try {
      ctx.transform(p.nx * width, p.ny * width, p.tx * length, p.ty * length, p.x, p.y);
      const g = ctx.createRadialGradient(-.14, -.12, .06, 0, 0, 1.12);
      g.addColorStop(0, c); g.addColorStop(.48, c); g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.globalAlpha = alpha; ctx.beginPath();
      const rim = [];
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        const r = 1 + m.texture * (.08 * Math.sin(a * 3 + phase) + .05 * Math.sin(a * 5 - phase));
        rim.push({x: Math.cos(a) * r, y: Math.sin(a) * r});
      }
      ctx.moveTo((rim[11].x + rim[0].x) / 2, (rim[11].y + rim[0].y) / 2);
      for (let i = 0; i < 12; i++) {
        const a = rim[i], b = rim[(i + 1) % 12];
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      ctx.closePath(); ctx.fill();
    } finally {
      ctx.restore();
    }
  }

  function watercolor(ctx, shape, m, c, rand) {
    ctx.fillStyle = c.matte; ctx.globalAlpha = m.alpha * .50; ctx.fill(shape);
    const count = m.small ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const t = .26 + (i + rand() * .7) / count * .57;
      localWash(ctx, m, i % 3 === 0 ? c.light : c.middle,
        (rand() - .5) * 1.12, t, m.length * (.13 + rand() * .11),
        m.width * (.27 + rand() * .28), m.alpha * (.25 + rand() * .18), rand);
    }
    // Pigment settles along a few pieces of the rim, with soft unpainted intervals.
    const side = rand() < .5 ? -1 : 1;
    curve(ctx, m, side * .91, .42 + rand() * .11, .76 + rand() * .14,
      c.dark, m.hair * 2, m.alpha * .31, side * .035);
    curve(ctx, m, -side * .91, .69, .92, c.middle, m.hair * 1.3, m.alpha * .23, 0);
    outline(ctx, shape, c.middle, m.hair * 1.5, m.alpha * .12);
    localWash(ctx, m, c.tooth, .24, .66, m.length * .17,
      m.width * .20, m.alpha * .26, rand);
  }

  /** Paint a material over an existing petal underdrawing in flower-local units.
   * m.width is petal half width; pixelRadius controls detail, never geometry.
   * The small (<=35px) path emits at most 28 marks; close views stay under 80.
   * Silhouette, transform, clip and drawing properties survive. Uses the current path.
   * No timers, caches or ambient random.
   */
  function paint(ctx, silhouette, options) {
    if (!ctx || typeof ctx.save !== 'function' || typeof ctx.restore !== 'function' ||
        typeof ctx.clip !== 'function' || !silhouette) {
      throw new TypeError('PetalPaint.paint requires a 2D context and a petal Path2D.');
    }
    const source = options || {}, species = ['cosmos', 'daisy', 'poppy'].includes(source.species) ? source.species : 'cosmos';
    const m = Object.assign({}, source, {
      species,
      brush: kinds.includes(source.brush) ? source.brush : 'pen',
      length: clamp(number(source.length, 1), .08, 3),
      width: clamp(number(source.width, species === 'daisy' ? .09 : species === 'poppy' ? .75 : .37), .008, 2),
      bend: clamp(number(source.bend, 0), -1, 1),
      texture: clamp(number(source.texture, .6), 0, 1),
      widthScale: clamp(number(source.widthScale, 1), .35, 2.8),
      pixelRadius: clamp(number(source.pixelRadius, 64), 1, 2000)
    });
    const opacity = clamp(number(source.opacity, .85), 0, 1);
    const strength = clamp(number(source.strength, .65), 0, 1);
    if (!opacity || !strength) return;
    m.small = m.pixelRadius <= 35;
    m.hair = Math.max(.0031, .23 / m.pixelRadius) * Math.sqrt(m.widthScale);
    m.alpha = (Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1) * opacity * strength;
    const c = palette(m), rand = random(String(source.seed === undefined ? 'petal' : source.seed) + '|' + species + '|' + m.brush);
    ctx.save();
    try {
      ctx.clip(silhouette);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.shadowColor = 'rgba(0,0,0,0)';
      if ('filter' in ctx) ctx.filter = 'none';
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
      if (m.brush === 'pen') pen(ctx, silhouette, m, c, rand);
      else if (m.brush === 'ink') ink(ctx, silhouette, m, c, rand);
      else if (m.brush === 'pencil') pencil(ctx, silhouette, m, c, rand);
      else if (m.brush === 'dry') dry(ctx, silhouette, m, c, rand);
      else watercolor(ctx, silhouette, m, c, rand);
    } finally {
      ctx.restore();
    }
  }

  const api = Object.freeze({kinds, paint});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PetalPaint = api;
})(typeof window !== 'undefined' ? window : globalThis);
