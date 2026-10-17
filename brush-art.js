/* Original, dependency-free canvas marks. No timers or ambient randomness. */
(function (root) {
  'use strict';

  const kinds = Object.freeze(['pen', 'ink', 'pencil', 'dry', 'watercolor']);
  const TAU = Math.PI * 2;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const numeric = (n, fallback) => Number.isFinite(Number(n)) ? Number(n) : fallback;

  function random(seed) {
    let h = 2166136261;
    const text = String(seed);
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return function () {
      h = (h + 0x6D2B79F5) | 0;
      let n = Math.imul(h ^ (h >>> 15), h | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }

  function validPath(path) {
    if (!path || !['x1', 'y1', 'cx', 'cy', 'x2', 'y2'].every(key => Number.isFinite(path[key]))) {
      throw new TypeError('BrushArt requires six finite quadratic Bezier coordinates.');
    }
  }

  // Pure geometry helper. Each sample also supplies a unit tangent and normal.
  function samples(path, steps = 40) {
    validPath(path);
    const count = clamp(Math.round(numeric(steps, 40)), 2, 256);
    const points = new Array(count + 1);
    for (let i = 0; i <= count; i++) {
      const t = i / count, u = 1 - t;
      let dx = 2 * (u * (path.cx - path.x1) + t * (path.x2 - path.cx));
      let dy = 2 * (u * (path.cy - path.y1) + t * (path.y2 - path.cy));
      let length = Math.hypot(dx, dy);
      if (length < 1e-9) {
        dx = path.x2 - path.x1; dy = path.y2 - path.y1;
        length = Math.hypot(dx, dy);
      }
      const tx = length > 1e-9 ? dx / length : 1;
      const ty = length > 1e-9 ? dy / length : 0;
      points[i] = {
        x: u * u * path.x1 + 2 * u * t * path.cx + t * t * path.x2,
        y: u * u * path.y1 + 2 * u * t * path.cy + t * t * path.y2,
        t, tx, ty, nx: -ty, ny: tx
      };
    }
    return points;
  }

  function trace(ctx, points, offset, wobble, rand) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const d = offset + (wobble ? (rand() - .5) * wobble : 0);
      const x = p.x + p.nx * d, y = p.y + p.ny * d;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }

  function pen(ctx, path, points, width, texture, alpha, rand) {
    // A continuous, even-width technical pen; texture only roughens its tiny edge.
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha * (1 - texture * .06);
    ctx.beginPath();
    if (texture > .01) trace(ctx, points, 0, width * texture * .055, rand);
    else {
      ctx.moveTo(path.x1, path.y1);
      ctx.quadraticCurveTo(path.cx, path.cy, path.x2, path.y2);
    }
    ctx.stroke();
  }

  function ink(ctx, points, width, texture, alpha, rand) {
    // A light entry swells under pressure, then releases into a fine pointed tip.
    const phase = rand() * TAU;
    const edges = points.map(p => {
      const pressure = (.15 + 1.09 * Math.pow(Math.sin(Math.PI * p.t), .68)) * Math.pow(1 - p.t, .22);
      const flutter = 1 + texture * (.045 * Math.sin(p.t * 25 + phase) + (rand() - .5) * .055);
      return Math.max(.014, pressure * flutter) * width * .58;
    });
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i], edge = edges[i];
      if (!i) ctx.moveTo(p.x + p.nx * edge, p.y + p.ny * edge);
      else ctx.lineTo(p.x + p.nx * edge, p.y + p.ny * edge);
    }
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i], edge = edges[i];
      ctx.lineTo(p.x - p.nx * edge, p.y - p.ny * edge);
    }
    ctx.closePath(); ctx.fill();
    // A small wet heel rounds the light onset without rounding the released tip.
    const p = points[0];
    ctx.beginPath(); ctx.arc(p.x, p.y, edges[0], 0, TAU); ctx.fill();
  }

  function pencil(ctx, points, width, texture, alpha, rand) {
    const passes = 4 + Math.round(texture * 3);
    ctx.lineCap = 'round';
    for (let pass = 0; pass < passes; pass++) {
      const lane = (pass / (passes - 1) - .5) * width * .94;
      ctx.lineWidth = width * (.075 + rand() * .055);
      ctx.globalAlpha = alpha * (.30 + rand() * .18);
      ctx.beginPath();
      let down = false;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const rough = (rand() - .5) * width * (.11 + texture * .18);
        const pressure = .72 + .28 * Math.sin(Math.PI * p.t);
        const x = p.x + p.nx * (lane * pressure + rough);
        const y = p.y + p.ny * (lane * pressure + rough);
        if (rand() < texture * .12) { down = false; continue; }
        if (down) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        down = true;
      }
      ctx.stroke();
    }
    // Short graphite flecks sit between the fine passes, never a solid fill.
    const grains = 3 + Math.round(texture * 7);
    ctx.globalAlpha = alpha * .40;
    ctx.lineWidth = width * .09;
    ctx.beginPath();
    for (let i = 0; i < grains; i++) {
      const p = points[1 + Math.floor(rand() * (points.length - 2))];
      const d = (rand() - .5) * width, length = width * (.12 + rand() * .30);
      const x = p.x + p.nx * d, y = p.y + p.ny * d;
      ctx.moveTo(x, y); ctx.lineTo(x + p.tx * length, y + p.ty * length);
    }
    ctx.stroke();
  }

  function dry(ctx, points, width, texture, alpha, rand) {
    // Separate flat-ended bristles retain paper channels all the way through.
    const bristles = 4 + Math.round(texture * 3);
    ctx.lineCap = 'butt';
    for (let pass = 0; pass < bristles; pass++) {
      const lane = (pass / (bristles - 1) - .5) * width * 1.15;
      const phase = rand() * TAU;
      ctx.lineWidth = width * (.09 + rand() * .065);
      ctx.globalAlpha = alpha * (.59 + rand() * .30);
      ctx.beginPath();
      let down = false;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // Clumps break independently instead of sharing one dashed outline.
        const skip = rand() < .13 + texture * .28 || (p.t > .86 && rand() < .35);
        const d = lane * (1 - p.t * .19) + Math.sin(p.t * 19 + phase) * width * texture * .055;
        const x = p.x + p.nx * d, y = p.y + p.ny * d;
        if (skip) { down = false; continue; }
        if (down) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        down = true;
      }
      ctx.stroke();
    }
  }

  function watercolor(ctx, points, width, texture, alpha, rand) {
    // Broad translucent deposits overlap, leaving a pale core and pooled edges.
    const washWidths = [1.62, 1.27, .91];
    for (let pass = 0; pass < washWidths.length; pass++) {
      ctx.lineWidth = width * washWidths[pass];
      ctx.globalAlpha = alpha * [.105, .13, .14][pass];
      ctx.beginPath();
      trace(ctx, points, (rand() - .5) * width * .19, width * texture * .11, rand);
      ctx.stroke();
    }
    // Two irregular pigment rims, with incomplete pooling along either edge.
    ctx.lineWidth = width * (.055 + texture * .055);
    for (const side of [-1, 1]) {
      ctx.globalAlpha = alpha * (.20 + texture * .12);
      ctx.beginPath();
      let down = false;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const d = side * width * (.66 + Math.sin(p.t * 13 + side) * texture * .07);
        if (rand() < .10 + texture * .15) { down = false; continue; }
        const x = p.x + p.nx * d, y = p.y + p.ny * d;
        if (down) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        down = true;
      }
      ctx.stroke();
    }
    // Bounded translucent pigment blooms; all dimensions follow stem width.
    const pools = 2 + Math.round(texture * 3);
    ctx.globalAlpha = alpha * (.07 + texture * .06);
    ctx.beginPath();
    for (let i = 0; i < pools; i++) {
      const p = points[Math.floor(rand() * points.length)];
      const d = (rand() - .5) * width * .75;
      const x = p.x + p.nx * d, y = p.y + p.ny * d;
      const radius = width * (.13 + rand() * .21);
      ctx.moveTo(x + radius, y); ctx.arc(x, y, radius, 0, TAU);
    }
    ctx.fill();
  }

  /**
   * Draw one quadratic mark in the context's current coordinate system.
   * width is the nominal stem width in canvas units, texture/opacity are 0..1.
   * At most 29 geometry samples, 8 strokes and 5 small pigment pools per mark.
   * Context drawing properties and transforms are restored even after an error.
   */
  function draw(ctx, kind, path, options = {}) {
    validPath(path);
    if (!ctx || typeof ctx.save !== 'function' || typeof ctx.restore !== 'function') {
      throw new TypeError('BrushArt.draw requires a CanvasRenderingContext2D.');
    }
    if (!kinds.includes(kind)) kind = 'pen';
    options = options || {};
    const width = clamp(numeric(options.width, 2), 0, 96);
    const opacity = clamp(numeric(options.opacity, .8), 0, 1);
    const texture = clamp(numeric(options.texture, .6), 0, 1);
    if (!width || !opacity) return;
    const length = Math.hypot(path.cx - path.x1, path.cy - path.y1) + Math.hypot(path.x2 - path.cx, path.y2 - path.cy);
    if (length < 1e-9) return;
    const points = samples(path, clamp(Math.ceil(length / 7), 16, 28));
    const rand = random(String(options.seed === undefined ? 'seed' : options.seed) + '|' + kind);
    ctx.save();
    try {
      const inheritedAlpha = Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1;
      const alpha = inheritedAlpha * opacity;
      ctx.strokeStyle = options.color || '#526b43';
      ctx.fillStyle = options.color || '#526b43';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.shadowColor = 'rgba(0,0,0,0)';
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
      if ('filter' in ctx) ctx.filter = 'none';
      if (kind === 'pen') pen(ctx, path, points, width, texture, alpha, rand);
      else if (kind === 'ink') ink(ctx, points, width, texture, alpha, rand);
      else if (kind === 'pencil') pencil(ctx, points, width, texture, alpha, rand);
      else if (kind === 'dry') dry(ctx, points, width, texture, alpha, rand);
      else watercolor(ctx, points, width, texture, alpha, rand);
    } finally {
      ctx.restore();
    }
  }

  const api = Object.freeze({ kinds, samples, draw });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BrushArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
