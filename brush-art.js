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
    ctx.globalAlpha=alpha*(.065+(1-texture)*.09);ctx.lineWidth=width*.88;
    ctx.beginPath();trace(ctx,points,0,width*.14,rand);ctx.stroke();
    let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    const grains=clamp(Math.ceil(length/Math.max(width*.10,1)),24,220);
    ctx.lineCap='butt';
    // Aperiodic graphite fragments across the full paper footprint, not repeating dashes.
    for(let group=0;group<4;group++){
      ctx.globalAlpha=alpha*(.24+group*.13);ctx.lineWidth=width*(.085+rand()*.08);ctx.beginPath();
      for(let i=group;i<grains;i+=4){
        const q=pointAt(points,(i+rand())/grains),d=(rand()-.5)*width*(.76+.24*Math.sin(Math.PI*i/grains));
        const x=q.x+q.nx*d,y=q.y+q.ny*d,len=width*(.055+rand()*(.20+texture*.23));
        ctx.moveTo(x,y);ctx.lineTo(x+q.tx*len+q.nx*(rand()-.5)*width*.08,y+q.ty*len+q.ny*(rand()-.5)*width*.08);
      }ctx.stroke();
    }
  }

  function dry(ctx, points, width, texture, alpha, rand) {
    // Correlated paper skips interrupt several bristle bundles together.
    const holes = points.map(() => rand());
    const bundles = 3 + Math.round(texture * 2);
    for (let pass = 0; pass < bundles; pass++) {
      const lane = ((pass + .3 + rand() * .4) / bundles - .5) * 1.12;
      const fatness = (.46 + rand() * .34) / bundles;
      const phase = rand() * TAU, end = .90 + rand() * .10;
      let run = [];
      const deposit = () => {
        if (run.length < 2) { run = []; return; }
        ctx.globalAlpha = alpha * (.53 + rand() * .39);
        ctx.beginPath();
        for (let side = 1; side >= -1; side -= 2) {
          for (let j = 0; j < run.length; j++) {
            const k = side === 1 ? j : run.length - 1 - j;
            const s = run[k], p = s.p;
            const fringe = (k === 0 || k === run.length - 1) ? .25 + rand() * .60 : 1;
            const d = s.lane + side * s.radius * fringe;
            const x = p.x + p.nx * d, y = p.y + p.ny * d;
            if (side === 1 && !j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
        }
        ctx.closePath(); ctx.fill(); run = [];
      };
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const taper = (.68 + .32 * Math.sin(Math.PI * p.t)) * Math.pow(1 - p.t, .42) + .025;
        const skip = (holes[i] < texture * .18 && i > 1) || rand() < texture * .09 || p.t > end;
        if (skip) { deposit(); continue; }
        run.push({ p, lane: width * taper * (lane + Math.sin(p.t * 23 + phase) * texture * .045),
          radius: width * taper * fatness * (.65 + rand() * .68) });
      }
      deposit();
    }
    // A few wiry fibers bridge only portions of the broad, ragged clumps.
    ctx.lineCap = 'butt'; ctx.lineWidth = width * .035;
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = alpha * (.42 + rand() * .23);
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([width * (1 + rand() * 3), width * (.4 + texture * 3), width * .7, width * (1 + texture * 2)]);
      ctx.lineDashOffset = rand() * width * 8;
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const p = points[i], taper = Math.pow(1 - p.t, .55);
        const d = (pass ? 1 : -1) * width * (.36 + rand() * .11) * taper;
        if (!i) ctx.moveTo(p.x + p.nx * d, p.y + p.ny * d);
        else ctx.lineTo(p.x + p.nx * d, p.y + p.ny * d);
      }
      ctx.stroke();
    }
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
  }

  function pointAt(points, t) {
    const f = clamp(t, 0, 1) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f));
    const a = points[i], b = points[i + 1], u = f - i;
    const tx = a.tx + (b.tx - a.tx) * u, ty = a.ty + (b.ty - a.ty) * u;
    const length = Math.hypot(tx, ty) || 1;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u,
      tx: tx / length, ty: ty / length, nx: -ty / length, ny: tx / length };
  }

  function watercolor(ctx, points, width, texture, alpha, rand) {
    // Only a faint irregular wet bed remains continuous. Most color is in local washes.
    for (let pass = 0; pass < 2; pass++) {
      const phase = rand() * TAU, center = (rand() - .5) * width * .25;
      const radii = points.map(p => width * (pass ? .36 : .64) *
        (.88 + Math.sin(p.t * 17 + phase) * texture * .15 + (rand() - .5) * texture * .28));
      ctx.globalAlpha = alpha * (pass ? .055 : .045);
      ctx.beginPath();
      for (let side = 1; side >= -1; side -= 2) {
        for (let j = 0; j < points.length; j++) {
          const i = side === 1 ? j : points.length - 1 - j, p = points[i];
          const d = center + side * radii[i];
          if (side === 1 && !j) ctx.moveTo(p.x + p.nx * d, p.y + p.ny * d);
          else ctx.lineTo(p.x + p.nx * d, p.y + p.ny * d);
        }
      }
      ctx.closePath(); ctx.fill();
    }
    let length = 0;
    for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    const pigment=ctx.fillStyle;
    const pools = clamp(Math.ceil(length / Math.max(width * 2.8, 1)), 6, 14);
    for (let i = 0; i < pools; i++) {
      const t = clamp((i + .30 + rand() * .40) / pools, .01, .99), p = pointAt(points, t);
      const offset = (rand() - .5) * width * (.30 + texture * .42);
      const x = p.x + p.nx * offset, y = p.y + p.ny * offset;
      const rx = length / pools * (.55 + rand() * .75), ry = width * (.35 + rand() * .43);
      const phase = rand() * TAU, contour = [];
      for (let j = 0; j < 10; j++) {
        const a = j / 10 * TAU;
        const irregular = 1 + texture * (.14 * Math.sin(a * 3 + phase) + .11 * Math.sin(a * 5 - phase) + (rand() - .5) * .18);
        const u = Math.cos(a) * rx * irregular, v = Math.sin(a) * ry * irregular;
        contour.push({ x: x + p.tx * u + p.nx * v, y: y + p.ty * u + p.ny * v });
      }
      const last = contour[9], first = contour[0];
      ctx.save();ctx.translate(x,y);ctx.transform(p.tx*rx,p.ty*rx,p.nx*ry,p.ny*ry,0,0);
      const wash=ctx.createRadialGradient(-.2,.1,.05,0,0,1.3);wash.addColorStop(0,pigment);wash.addColorStop(.45,pigment);wash.addColorStop(1,'#00000000');
      ctx.fillStyle=wash;ctx.globalAlpha=alpha*(.14+rand()*(.08+texture*.08));
      ctx.beginPath();
      const local=contour.map(q=>({x:((q.x-x)*p.tx+(q.y-y)*p.ty)/rx,y:((q.x-x)*p.nx+(q.y-y)*p.ny)/ry}));
      ctx.moveTo((local[9].x+local[0].x)/2,(local[9].y+local[0].y)/2);
      for(let j=0;j<10;j++){const a=local[j],b=local[(j+1)%10];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}
      ctx.closePath();ctx.fill();ctx.restore();
      // Pigment catches a short, changing part of a cloud boundary, never twin rails.
      if (i % 2 === 0) {
        const start = Math.floor(rand() * 10), count = 2 + Math.floor(rand() * 2);
        const a = contour[(start + 9) % 10], b = contour[start];
        ctx.lineWidth = width * (.025 + texture * .028);
        ctx.globalAlpha = alpha * (.07 + rand() * .08);
        ctx.beginPath(); ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
        for (let j = 0; j < count; j++) {
          const c = contour[(start + j) % 10], d = contour[(start + j + 1) % 10];
          ctx.quadraticCurveTo(c.x, c.y, (c.x + d.x) / 2, (c.y + d.y) / 2);
        }
        ctx.stroke();
      }
    }
  }

  /**
   * Draw one quadratic mark in the context's current coordinate system.
   * width is the nominal stem width in canvas units, texture/opacity are 0..1.
   * At most 29 centerline samples; material geometry stays below 500 vertices.
   * Pencil paper grain uses native fine dashes; watercolor uses at most 14 clouds.
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
