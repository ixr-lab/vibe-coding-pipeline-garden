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
    const steps = 10, points = [];
    for (let i = 0; i <= steps; i++) {
      const t = start + (end - start) * i / steps;
      points.push(point(m, u + (sway || 0) * Math.sin(Math.PI * i / steps), t));
    }
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i], q = points[i + 1];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    }
    const last = points[points.length - 1];
    ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);
    ctx.stroke();
  }

  function ribbon(ctx, m, u, start, end, width, color, alpha, rand, roughness, pressure) {
    const contour = [], steps = 14, phase = rand() * TAU;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, p = frame(m, u, start + (end - start) * t);
      const taper = pressure ? .025 + Math.pow(Math.sin(Math.PI * t), .76) * Math.pow(1 - t, .12) : .20 + .80 * Math.pow(Math.sin(Math.PI * t), .36);
      const radius = width * taper * (1 + Math.sin(t * 11 + phase) * roughness * .13) / 2;
      const drift = Math.sin(t * 8 + phase) * width * roughness * .07;
      contour.push({p, radius, drift});
    }
    const rim = [];
    for (let side = 1; side >= -1; side -= 2) {
      for (let j = 0; j < contour.length; j++) {
        const q = contour[side === 1 ? j : contour.length - 1 - j];
        rim.push({x: q.p.x + q.p.nx * (q.drift + side * q.radius),
          y: q.p.y + q.p.ny * (q.drift + side * q.radius)});
      }
    }
    ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.beginPath();
    ctx.moveTo((rim[rim.length - 1].x + rim[0].x) / 2, (rim[rim.length - 1].y + rim[0].y) / 2);
    for (let i = 0; i < rim.length; i++) {
      const a = rim[i], b = rim[(i + 1) % rim.length];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
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
        m.hair * (.66 + rand() * .38), m.alpha * (.43 + rand() * .20), .02 + m.texture * .045);
    }
    const hatches = Math.round((m.small ? (m.species === 'daisy' ? 3 : 8) : (m.species === 'daisy' ? 6 : 19)) * (.55 + m.texture * .45));
    for (let i = 0; i < hatches; i++) {
      const u = (rand() < .5 ? -1 : 1) * (.45 + rand() * .46);
      const t = .25 + rand() * .52;
      curve(ctx, m, u, t, Math.min(.98, t + .10 + rand() * .14), c.dark,
        m.hair * .80, m.alpha * (.28 + m.texture * .18 + rand() * .22), -u * (.10 + m.texture * .10));
    }
  }

  function ink(ctx, shape, m, c, rand) {
    // Long, smooth pressure lines use a third of v6's width and much less contrast.
    const count = m.species === 'daisy' ? 2 : m.small ? 3 : 5;
    const inkColor = mix(rgb(c.dark, '#90305e'), rgb(c.color, '#d7609d'), .56);
    for (let i = 0; i < count; i++) {
      const u = (i + .5) / count * 1.58 - .79 + (rand() - .5) * .065;
      ribbon(ctx, m, u, .06 + rand() * .12, .92 + rand() * .075,
        Math.min(m.width * .24, m.width * (m.species === 'daisy' ? .16 : .12) * Math.sqrt(m.widthScale)),
        i % 3 === 1 ? c.middle : inkColor, m.alpha * (.32 + m.texture * .10 + rand() * .10), rand, .05 + m.texture * .10, true);
    }
    curve(ctx, m, -.90, .24, .94, inkColor, m.hair * 1.5, m.alpha * .40, .025);
    curve(ctx, m, .90, .56, .96, c.middle, m.hair * 1.1, m.alpha * .28, -.025);
    outline(ctx, shape, c.middle, m.hair * 1.1, m.alpha * .22);
  }

  function pencil(ctx, shape, m, c, rand) {
    ctx.fillStyle = c.matte; ctx.globalAlpha = m.alpha * .30; ctx.fill(shape);
    outline(ctx, shape, c.dark, m.hair * 1.5, m.alpha * .55,
      [m.length * .013, m.length * .009, m.length * .037, m.length * .012]);
    const grains = m.small ? 17 : m.species === 'daisy' ? 31 : 47;
    ctx.lineCap = 'butt';
    // Unequal curved graphite runs follow the fibers instead of becoming round grain.
    for (let i = 0; i < grains; i++) {
      const u = (rand() * 2 - 1) * .94, start = .13 + rand() * .65;
      const end = Math.min(.98, start + .09 + rand() * .24 * (.65 + m.texture * .65));
      const tooth = i % 8 === 0;
      curve(ctx, m, u, start, end, tooth ? c.tooth : i % 4 === 0 ? c.middle : c.dark,
        Math.min(m.width * .14, m.hair * (.50 + rand() * .65) * Math.sqrt(m.widthScale)),
        m.alpha * (tooth ? .55 + m.texture * .25 : .40 + rand() * .35), (rand() - .5) * .09);
    }
    curve(ctx, m, -.34, .23, .88, c.dark, m.hair * .7, m.alpha * .29, .08);
    curve(ctx, m, .38, .37, .95, c.light, m.hair, m.alpha * .40, -.06);
  }

  function dry(ctx, shape, m, c, rand) {
    const bundles = m.small ? 3 : (m.species === 'daisy' ? 3 : 5), hairs = m.small ? 3 : 5;
    for (let i = 0; i < bundles; i++) {
      const u = (i + .35 + rand() * .3) / bundles * 1.7 - .85;
      const start = .12 + rand() * .16, end = .87 + rand() * .12;
      const gap = .39 + rand() * .22, gapEnd = gap + .035 + rand() * m.texture * .12;
      for (let j = 0; j < hairs; j++) {
        const lane = u + (j - (hairs - 1) / 2) * (.035 + m.texture * .035);
        const width = Math.min(m.width * .16, m.hair * (.65 + rand() * .55));
        const color = j % 3 === 0 ? c.middle : c.dark;
        const alpha = m.alpha * (.39 + rand() * .24);
        const sway = (rand() - .5) * .035;
        curve(ctx, m, lane, start + rand() * .035, gap, color, width, alpha, sway);
        curve(ctx, m, lane, gapEnd, end - rand() * .035, color, width * .78, alpha * .92, sway);
      }
    }
    // Long hairline paper slits sit between related bristles; no torn paint polygons.
    const gaps = m.small ? 5 : 9;
    for (let i = 0; i < gaps; i++) {
      const u = rand() * 1.8 - .9, start = .20 + rand() * .22;
      const end = Math.min(.98, start + .32 + rand() * .25);
      curve(ctx, m, u, start, end, c.tooth,
        Math.min(m.width * .10, m.hair * (.60 + rand() * .55)),
        m.alpha * (.44 + m.texture * .24), (rand() - .5) * .04);
    }
    outline(ctx, shape, c.middle, m.hair * 1.8, m.alpha * .44,
      [m.length * .11, m.length * .07, m.length * .025, m.length * .09]);
  }

  function wetBand(ctx, m, color, u, start, end, width, alpha, rand) {
    const p = frame(m, u, (start + end) / 2), half = width * .5;
    const g = ctx.createLinearGradient(p.x - p.nx * half, p.y - p.ny * half,
      p.x + p.nx * half, p.y + p.ny * half);
    g.addColorStop(0, color + '00'); g.addColorStop(.22, color);
    g.addColorStop(.61, color); g.addColorStop(1, color + '00');
    ribbon(ctx, m, u, start, end, width, g, alpha, rand, .12 + m.texture * .25, false);
  }

  function watercolor(ctx, shape, m, c, rand) {
    ctx.fillStyle = c.matte; ctx.globalAlpha = m.alpha * .22; ctx.fill(shape);
    const count = m.small ? 3 : 4;
    const wetColor = mix(rgb(c.dark, '#90305e'), rgb(c.middle, '#d7609d'), .52);
    for (let i = 0; i < count; i++) {
      const u = (i + .28 + rand() * .42) / count * 1.5 - .75;
      wetBand(ctx, m, i % 3 === 1 ? c.light : wetColor, u,
        .08 + rand() * .13, .86 + rand() * .13,
        m.width * (.44 + rand() * .24) * Math.sqrt(m.widthScale),
        m.alpha * (.19 + m.texture * .10 + rand() * .07), rand);
    }
    // Sparse pigment follows the rim; no radial clouds or bright circular centers.
    const side = rand() < .5 ? -1 : 1;
    curve(ctx, m, side * .91, .46 + rand() * .08, .80 + rand() * .10,
      wetColor, m.hair * 1.6, m.alpha * .31, side * .025);
    curve(ctx, m, -side * .91, .72, .96, c.middle, m.hair * 1.1, m.alpha * .22, 0);
    outline(ctx, shape, c.middle, m.hair * 1.1, m.alpha * .08);
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
