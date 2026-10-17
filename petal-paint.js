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
      matte: mix(light, paper, daisy ? .35 : .48),
      pale: mix(light, paper, .64),
      basal: mix(base, paper, .20),
      graphite: mix(base, rgb('#596761', '#596761'), daisy ? .76 : .48)
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
    ctx.fillStyle = color; ctx.globalAlpha = clamp(alpha, 0, 1); ctx.beginPath();
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

  function ground(ctx, shape, m, c, kind) {
    // Material coverage changes before its marks: paper remains a visible surface.
    // Every layer still uses the same opacity/strength and the botanical clip.
    const g = ctx.createLinearGradient(0, -.12, m.bend, -m.length);
    const coverage = m.alpha * (m.folded ? .76 : 1);
    if (kind === 'pen') {
      g.addColorStop(0, c.basal); g.addColorStop(.38, c.pale); g.addColorStop(1, c.pale);
      ctx.globalAlpha = coverage * .96; ctx.fillStyle = g; ctx.fill(shape);
    } else if (kind === 'pencil') {
      g.addColorStop(0, c.basal); g.addColorStop(.30, c.tooth); g.addColorStop(1, c.tooth);
      ctx.globalAlpha = coverage * .82; ctx.fillStyle = g;
      ctx.fill(shape); ctx.fill(shape);
    } else {
      g.addColorStop(0, c.basal); g.addColorStop(.35, c.tooth); g.addColorStop(1, c.pale);
      ctx.globalAlpha = coverage * .92; ctx.fillStyle = g; ctx.fill(shape);
    }
  }

  function pen(ctx, shape, m, c, rand) {
    // Pale tint, occasional contour pieces and sparse even lines are a pen illustration.
    ground(ctx, shape, m, c, 'pen');
    const count = m.small ? (m.species === 'daisy' ? 1 : 3) : (m.species === 'daisy' ? 2 : 5);
    const edgeWidth = Math.max(m.hair * 1.8, (m.small ? 1.22 : .78) / m.pixelRadius) * Math.pow(m.widthScale, .32);
    const edgeDash = [m.length * (.035 + rand() * .035), m.length * (.24 + rand() * .20),
      m.length * (.055 + rand() * .055), m.length * (.35 + rand() * .24)];
    ctx.lineDashOffset = rand() * m.length * 1.7;
    outline(ctx, shape, c.dark, edgeWidth * .84, m.alpha * .83, edgeDash);
    ctx.lineDashOffset = 0;
    for (let i = 0; i < count; i++) {
      const u = (i + .5) / count * 1.72 - .86;
      curve(ctx, m, u, .24 + rand() * .09, .88 + rand() * .07, c.dark,
        Math.max(m.hair * .76, .29 / m.pixelRadius * Math.sqrt(m.widthScale)), m.alpha * .66, .015 + m.texture * .035);
    }
    const hatches = Math.round((m.small ? (m.species === 'daisy' ? 2 : 4) : (m.species === 'daisy' ? 3 : 9)) * (.55 + m.texture * .45));
    for (let i = 0; i < hatches; i++) {
      const u = (rand() < .5 ? -1 : 1) * (.45 + rand() * .46);
      const t = .25 + rand() * .52;
      curve(ctx, m, u, t, Math.min(.98, t + .10 + rand() * .14), c.dark,
        Math.max(m.hair * .70, .27 / m.pixelRadius * Math.sqrt(m.widthScale)), m.alpha * (.43 + m.texture * .18), -u * (.10 + m.texture * .08));
    }
  }

  function ink(ctx, shape, m, c, rand) {
    // The original saturated ground carries a few pressure-controlled deposits.
    const count = m.species === 'daisy' ? (m.small ? 1 : 2) : m.small ? 3 : 4;
    const smallDaisy = m.small && m.species === 'daisy';
    const inkColor = mix(rgb(c.dark, '#90305e'), rgb(c.color, '#d7609d'), smallDaisy ? .12 : .36);
    for (let i = 0; i < count; i++) {
      const u = (i + .5) / count * 1.58 - .79 + (rand() - .5) * .065;
      ribbon(ctx, m, u, .06 + rand() * .12, .92 + rand() * .075,
        Math.min(m.width * (smallDaisy ? .58 : .36), Math.max(m.width * .12, (smallDaisy ? 1.12 : m.small ? .86 : .50) / m.pixelRadius)) * Math.sqrt(m.widthScale),
        i % 3 === 1 ? c.middle : inkColor,
        m.alpha * (smallDaisy ? .89 + m.texture * .06 + rand() * .04 : .65 + m.texture * .12 + rand() * .10),
        rand, .05 + m.texture * .10, true);
    }
    curve(ctx, m, -.90, .24, .94, inkColor, m.hair * 1.5, m.alpha * .40, .025);
    curve(ctx, m, .90, .56, .96, c.middle, m.hair * 1.1, m.alpha * .28, -.025);
    outline(ctx, shape, c.middle, m.hair * 1.1, m.alpha * .22);
  }

  function pencil(ctx, shape, m, c, rand) {
    ground(ctx, shape, m, c, 'pencil');
    outline(ctx, shape, c.graphite, Math.max(m.hair, .46 / m.pixelRadius), m.alpha * .57,
      [m.length * .027, m.length * .016, m.length * .047, m.length * .023]);
    const grains = m.small ? (m.species === 'daisy' ? 9 : 17) : m.species === 'daisy' ? 31 : 47;
    ctx.lineCap = 'butt';
    // Unequal curved graphite runs follow the fibers instead of becoming round grain.
    for (let i = 0; i < grains; i++) {
      const u = ((i + .2 + rand() * .6) / grains * 2 - 1) * .94, start = .13 + rand() * .52;
      const end = Math.min(.98, start + (m.small ? .17 : .10) + rand() * .27 * (.65 + m.texture * .65));
      const tooth = i % 8 === 0;
      curve(ctx, m, u, start, end, tooth ? c.tooth : i % 4 === 0 ? c.middle : c.graphite,
        Math.min(m.width * .18, Math.max(m.hair * (.66 + rand() * .42), .30 / m.pixelRadius)) * Math.sqrt(m.widthScale),
        m.alpha * (tooth ? .62 + m.texture * .25 : .64 + rand() * .24), (rand() - .5) * .065);
    }
    curve(ctx, m, -.34, .23, .88, c.dark, m.hair * .7, m.alpha * .29, .08);
    curve(ctx, m, .38, .37, .95, c.light, m.hair, m.alpha * .40, -.06);
  }

  function paperSkip(ctx, m, color, u, start, end, width, alpha, rand) {
    // A narrow torn bristle deposit (or exposed fiber), never a rectangular dash.
    const points = [], steps = 11, phase = rand() * TAU;
    for (let i = 0; i <= steps; i++) {
      const s = i / steps, t = start + (end - start) * s;
      const p = frame(m, u + Math.sin(s * Math.PI) * Math.sin(phase) * .018, t);
      const taper = Math.pow(Math.sin(Math.PI * s), .58);
      const radius = width * taper * (.15 + rand() * .38);
      points.push({p, radius, drift: (rand() - .5) * width * .26});
    }
    ctx.fillStyle = color; ctx.globalAlpha = clamp(alpha, 0, 1); ctx.beginPath();
    for (let side = 1; side >= -1; side -= 2) {
      for (let i = 0; i < points.length; i++) {
        const q = points[side === 1 ? i : points.length - 1 - i];
        const d = q.drift + q.radius * side;
        const x = q.p.x + q.p.nx * d, y = q.p.y + q.p.ny * d;
        if (side === 1 && !i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.closePath(); ctx.fill();
  }

  function dry(ctx, shape, m, c, rand) {
    // A little matte body first; the pigment then catches in related, torn fibers.
    ctx.fillStyle = c.matte; ctx.globalAlpha = m.alpha * .74; ctx.fill(shape);
    const bundles = m.species === 'daisy' ? 2 : (m.small ? 3 : 4), lanes = [];
    const hairs = m.small ? 2 : 3;
    const pigment = mix(rgb(c.middle, '#bf467c'), rgb(c.dark, '#782650'), .28);
    for (let i = 0; i < bundles; i++) {
      const u = (i + .08 + rand() * .84) / bundles * 1.86 - .93;
      lanes.push(u);
      const start = .14 + rand() * .23, end = .71 + rand() * .27;
      for (let j = 0; j < hairs; j++) {
        const lane = u + (j - (hairs - 1) / 2) * (.025 + rand() * .045);
        const a = start + rand() * .12, b = end - rand() * .11;
        const gap = a + (b - a) * (.22 + rand() * .50);
        const gapEnd = Math.min(b - .015, gap + .035 + rand() * (.035 + m.texture * .14));
        // At radius23 a daisy ray is only a few pixels wide. A .24*half-width
        // cap erased the pixel floor after tapering, turning contact into scratches.
        const width = Math.min(m.width * .66, Math.max(m.hair * (3.4 + rand() * 2.1), 1.65 / m.pixelRadius)) * Math.pow(m.widthScale, .24);
        const color = j % 4 === 0 ? c.dark : pigment;
        const alpha = m.alpha * (.45 + m.texture * .18 + rand() * .22);
        paperSkip(ctx, m, color, lane, a, gap, width, alpha, rand);
        paperSkip(ctx, m, color, lane + (rand() - .5) * .016, gapEnd, b, width * (.52 + rand() * .36), alpha, rand);
      }
    }
    // Pale fibers carry the flower's own light pigment, with soft contrast to the body.
    const gaps = m.small ? (m.species === 'daisy' ? 1 : 3) : m.species === 'daisy' ? 3 : 6;
    const lifted = mix(rgb(c.light, '#eaa3bf'), rgb(c.tooth, '#f0dfd9'), .74);
    for (let i = 0; i < gaps; i++) {
      const u = lanes[i % lanes.length] + (rand() - .5) * .26, start = .19 + rand() * .47;
      const end = Math.min(.98, start + .16 + Math.pow(rand(), 1.2) * (.27 + m.texture * .17));
      paperSkip(ctx, m, lifted, u, start, end,
        Math.min(m.width * .62, Math.max(m.hair * (3.2 + rand() * 1.8), 1.35 / m.pixelRadius)) * Math.pow(m.widthScale, .24),
        m.alpha * (.69 + m.texture * .23 + rand() * .17), rand);
    }
  }

  function washPatch(ctx, m, color, pass, alpha, rand) {
    // Low concentration fields extend beyond the clip; there is no inner panel edge.
    const u = (pass ? .44 : -.34) + (rand() - .5) * .34;
    const t = (pass ? .68 : .39) + (rand() - .5) * .20;
    const p = frame(m, u, t), scale = Math.pow(m.widthScale, .30);
    ctx.save();
    try {
      ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.ty, p.tx));
      ctx.scale(m.length * (pass ? .60 : .72), m.width * (1.45 + rand() * .42) * scale);
      const g = ctx.createRadialGradient(0, 0, 0, .12, -.08, 1);
      g.addColorStop(0, color + 'e0'); g.addColorStop(.25, color + 'bc');
      g.addColorStop(.53, color + '74'); g.addColorStop(.79, color + '25'); g.addColorStop(1, color + '00');
      ctx.fillStyle = g; ctx.globalAlpha = alpha; ctx.fillRect(-1.15, -1.15, 2.4, 2.4);
    } finally { ctx.restore(); }
  }

  function watercolor(ctx, shape, m, c, rand) {
    ground(ctx, shape, m, c, 'watercolor');
    const wetColor = mix(rgb(c.dark, '#90305e'), rgb(c.middle, '#d7609d'), .52);
    washPatch(ctx, m, wetColor, 0, m.alpha * (.44 + m.texture * .12 + rand() * .07), rand);
    washPatch(ctx, m, c.color, 1, m.alpha * (.22 + m.texture * .11 + rand() * .05), rand);
    // Tiny local deposits cluster in one drying area rather than dotting every petal.
    const side = rand() < .5 ? -1 : 1;
    const grains = m.small ? 3 : 18, grainU = side * (.26 + rand() * .38), grainT = .43 + rand() * .27;
    for (let i = 0; i < grains; i++) {
      const u = grainU + (rand() - .5) * .40, t = grainT + (rand() - .5) * .17;
      curve(ctx, m, u, t, t + .004 + rand() * .012, wetColor,
        Math.min(m.width * .045, .34 / m.pixelRadius) * Math.sqrt(m.widthScale),
        m.alpha * m.texture * (.17 + rand() * .22), (rand() - .5) * .025);
    }
    // A fading fragment of one drying front, separate from the botanical contour.
    const a = point(m, grainU - .34, grainT - .05), b = point(m, grainU + .20, grainT + .018);
    const q = point(m, grainU - .02, grainT + .045 + rand() * .04);
    const edge = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    edge.addColorStop(0, wetColor + '00'); edge.addColorStop(.32, wetColor + '90');
    edge.addColorStop(.65, wetColor + '68'); edge.addColorStop(1, wetColor + '00');
    ctx.strokeStyle = edge; ctx.lineWidth = Math.max(m.hair * .85, .48 / m.pixelRadius) * Math.pow(m.widthScale, .18);
    ctx.globalAlpha = m.alpha * (.20 + m.texture * .12); ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(q.x, q.y, b.x, b.y); ctx.stroke();
    curve(ctx, m, side * .93, .50 + rand() * .12, .74 + rand() * .13,
      wetColor, Math.max(m.hair * .65, .26 / m.pixelRadius), m.alpha * (.13 + m.texture * .10), side * .025);
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
