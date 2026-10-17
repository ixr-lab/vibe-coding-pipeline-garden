/* Original Canvas flower studies. Deterministic, dependency-free botanical illustration. */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const kinds = Object.freeze(['cosmos', 'daisy', 'poppy']);
  const metadata = Object.freeze({
    cosmos: Object.freeze({name: 'Cosmos', scientific: 'Cosmos bipinnatus', rays: 8}),
    daisy: Object.freeze({name: 'Oxeye daisy', scientific: 'Leucanthemum vulgare', rays: '22–28'}),
    poppy: Object.freeze({name: 'Common poppy', scientific: 'Papaver rhoeas', petals: 4})
  });

  // Local copy of the garden's FNV-1a / Mulberry-style generator also works alone.
  function random(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return function () {
      h = (h + 0x6D2B79F5) | 0;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gradient(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [at, color] of stops) g.addColorStop(at, color);
    return g;
  }
  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
  }
  function stroke(ctx, color, width, path) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    path();
    ctx.stroke();
  }

  function attachment(ctx, kind) {
    const green = gradient(ctx, -.09, .2, .12, .55, [
      [0, '#293f2b'], [.42, '#668047'], [.76, '#365b36'], [1, '#273e2c']
    ]);
    stroke(ctx, green, kind === 'poppy' ? .037 : .031, function () {
      ctx.moveTo(.005, .12);
      ctx.quadraticCurveTo(.055, .42, .035, .75);
    });
    // Involucral bracts sit behind the rays; a common poppy sheds its sepals.
    if (kind === 'poppy') return;
    ctx.fillStyle = '#3e653c';
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * .34;
      ctx.save();
      ctx.translate(0, .19);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-.085, 0);
      ctx.quadraticCurveTo(-.12, .27, 0, .40);
      ctx.quadraticCurveTo(.075, .22, .08, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function cosmosRay(ctx, p, detailed) {
    const l = p.length, w = p.width, bend = p.bend;
    ctx.save();
    ctx.rotate(p.angle);
    ctx.fillStyle = gradient(ctx, -w * .5, -.18, w * .6, -l, [
      [0, p.base], [.22, p.mid], [.68, p.light], [1, p.edge]
    ]);
    ctx.beginPath();
    ctx.moveTo(-.035, -.115);
    ctx.bezierCurveTo(-w * .43, -.30, -w * 1.03 + bend, -l * .72, -w * .80 + bend, -l * .90);
    // The broad ray terminates in shallow, irregular teeth, not a round tip.
    ctx.quadraticCurveTo(-w * .74 + bend, -l * .99, -w * .54 + bend, -l * .98);
    ctx.lineTo(-w * .39 + bend, -l * .938);
    ctx.quadraticCurveTo(-w * .27 + bend, -l * 1.026, -w * .10 + bend, -l * 1.012);
    ctx.lineTo(w * .055 + bend, -l * .963);
    ctx.quadraticCurveTo(w * .24 + bend, -l * 1.036, w * .39 + bend, -l * .989);
    ctx.lineTo(w * .50 + bend, -l * .941);
    ctx.quadraticCurveTo(w * .68 + bend, -l * 1.00, w * .78 + bend, -l * .90);
    ctx.bezierCurveTo(w * .97 + bend, -l * .66, w * .39, -.29, .04, -.115);
    ctx.closePath();
    ctx.fill();

    // A broad curved crease gives each ray a folded surface without an outline.
    ctx.fillStyle = p.fold;
    ctx.beginPath();
    ctx.moveTo(.012, -.18);
    ctx.bezierCurveTo(w * .12, -l * .44, w * .12 + bend, -l * .82, bend, -l * .965);
    ctx.bezierCurveTo(w * .28 + bend, -l * .76, w * .29, -l * .40, .012, -.18);
    ctx.fill();
    if (detailed) {
      for (let v = -1; v <= 1; v++) {
        stroke(ctx, p.vein, .0044, function () {
          ctx.moveTo(v * .018, -.21);
          ctx.bezierCurveTo(v * w * .33, -l * .47, v * w * .43 + bend * .65, -l * .72,
            v * w * .46 + bend, -l * .91);
        });
      }
    }
    ctx.restore();
  }

  function yellowDisk(ctx, rand, radius, detailed, daisy) {
    const ry = radius * (daisy ? .87 : .82);
    ellipse(ctx, .006, .025, radius * 1.055, ry * 1.055, daisy ? '#9e611c' : '#725022');
    const g = ctx.createRadialGradient(-radius * .34, -ry * .35, radius * .04, 0, 0, radius);
    g.addColorStop(0, daisy ? '#ffe779' : '#ffd657');
    g.addColorStop(.49, daisy ? '#edbe32' : '#e8ae2b');
    g.addColorStop(.84, daisy ? '#ce8e1c' : '#bc7b20');
    g.addColorStop(1, '#8e5c20');
    ellipse(ctx, 0, 0, radius, ry, g);
    // Compact phyllotactic florets remain readable as a raised yellow disc.
    const count = detailed ? (daisy ? 105 : 62) : (daisy ? 43 : 29);
    for (let i = count - 1; i >= 0; i--) {
      const a = i * 2.399963229728653 + .28;
      const d = Math.sqrt((i + .5) / count) * radius * .91;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * .87;
      const s = radius * (detailed ? .067 : .088) * (.79 + rand() * .4);
      ellipse(ctx, x, y + s * .22, s, s * .76, '#a96b1f');
      ellipse(ctx, x - s * .17, y - s * .28, s * .79, s * .59,
        i % 5 === 0 ? '#ffe783' : i % 3 === 0 ? '#efb32b' : '#f8cd48');
      if (detailed && i % 3 === 0) ellipse(ctx, x + s * .14, y + s * .08, s * .20, s * .23, '#996122');
    }
  }

  function cosmos(ctx, rand, detailed) {
    const palettes = [
      ['#94224f', '#ca497e', '#ec78a7', '#f299b8', '#fff0f51e', '#8e315e30'],
      ['#87214f', '#bb3977', '#df68a5', '#ed8bbc', '#fff1fb24', '#70265033'],
      ['#aa3658', '#db6686', '#f29aaf', '#f6b2c0', '#fff5f325', '#a53c6530']
    ];
    const colors = palettes[Math.floor(rand() * palettes.length)];
    const turn = rand() * TAU, rays = [];
    for (let i = 0; i < 8; i++) {
      const angle = turn + i * TAU / 8 + (rand() - .5) * .105;
      const folded = Math.cos(angle) < -.63;
      rays.push({angle,
        length: (.88 + rand() * .16) * (folded ? .86 : 1),
        width: (.36 + rand() * .082) * (folded ? .94 : 1), bend: (rand() - .5) * .07,
        base: colors[0], mid: colors[1], light: colors[2], edge: colors[3], fold: colors[4], vein: colors[5]});
    }
    // Alternating depth makes the long rays overlap like a single flower head.
    for (const i of [0, 2, 4, 6, 1, 3, 5, 7]) cosmosRay(ctx, rays[i], detailed);
    yellowDisk(ctx, rand, .184 + rand() * .013, detailed, false);
  }

  function daisyRay(ctx, p, detailed) {
    const w = p.width, l = p.length, bend = p.bend;
    ctx.save();
    ctx.rotate(p.angle);
    ctx.fillStyle = gradient(ctx, -w, -.25, w * .7, -l, [
      [0, '#b6ab7b'], [.18, '#d9d7bf'], [.48, p.shadow ? '#e0e1d5' : '#f1f2e7'],
      [.83, p.shadow ? '#efefe4' : '#fffef5'], [1, '#f8f7eb']
    ]);
    ctx.beginPath();
    ctx.moveTo(-.018, -.16);
    ctx.bezierCurveTo(-w * .82, -.39, -w + bend, -l * .72, -w * .73 + bend, -l * .94);
    ctx.quadraticCurveTo(-w * .36 + bend, -l * 1.022, bend, -l * 1.002);
    ctx.quadraticCurveTo(w * .28 + bend, -l * 1.033, w * .70 + bend, -l * .96);
    ctx.bezierCurveTo(w * .92 + bend, -l * .75, w * .53, -.42, .018, -.16);
    ctx.closePath();
    ctx.fill();
    // Only a shallow central channel; dark all-round outlines make rays look rigid.
    if (detailed) {
      stroke(ctx, '#aab39d38', .006, function () {
        ctx.moveTo(0, -.30);
        ctx.bezierCurveTo(-w * .16, -.53, bend * .75, -l * .72, bend, -l * .93);
      });
      stroke(ctx, '#ffffff7a', .008, function () {
        ctx.moveTo(w * .22, -.39);
        ctx.quadraticCurveTo(w * .40 + bend, -l * .68, w * .26 + bend, -l * .91);
      });
    }
    ctx.restore();
  }

  function daisy(ctx, rand, detailed) {
    const count = 22 + Math.floor(rand() * 7), turn = rand() * TAU, rays = [];
    for (let i = 0; i < count; i++) {
      rays.push({angle: turn + i * TAU / count + (rand() - .5) * .037,
        length: .84 + rand() * .19, width: .068 + rand() * .024,
        bend: (rand() - .5) * .055, shadow: i % 3 === 0});
    }
    for (let parity = 0; parity < 2; parity++) {
      for (let i = parity; i < count; i += 2) daisyRay(ctx, rays[i], detailed);
    }
    yellowDisk(ctx, rand, .258 + rand() * .018, detailed, true);
  }

  function poppyPetal(ctx, p, detailed) {
    const w = p.width, l = p.length;
    ctx.save();
    ctx.rotate(p.angle);
    ctx.fillStyle = gradient(ctx, -w * .70, -.06, w * .42, -l, [
      [0, '#6c1726'], [.17, p.dark], [.43, p.red], [.79, p.light], [1, p.edge]
    ]);
    ctx.beginPath();
    ctx.moveTo(-.055, .035);
    ctx.bezierCurveTo(-w * .60, -.10, -w * 1.11, -l * .37, -w * .96, -l * .64);
    ctx.bezierCurveTo(-w * 1.02, -l * .79, -w * .79, -l * .89, -w * .61, -l * .86);
    ctx.bezierCurveTo(-w * .40, -l * 1.02, -w * .19, -l * .96, -.03, -l * .99);
    ctx.bezierCurveTo(w * .13, -l * .94, w * .30, -l * 1.04, w * .47, -l * .92);
    ctx.bezierCurveTo(w * .65, -l * .96, w * .94, -l * .78, w * .91, -l * .62);
    ctx.bezierCurveTo(w * 1.04, -l * .38, w * .57, -.10, .055, .035);
    ctx.closePath();
    ctx.fill();
    // Thin, translucent-looking folds run outwards from the petal base.
    ctx.fillStyle = '#ffbb7923';
    ctx.beginPath();
    ctx.moveTo(-.01, -.07);
    ctx.bezierCurveTo(-w * .27, -l * .37, -w * .47, -l * .68, -w * .48, -l * .88);
    ctx.bezierCurveTo(-w * .24, -l * .72, -w * .13, -l * .44, -.01, -.07);
    ctx.fill();
    ctx.fillStyle = '#71192724';
    ctx.beginPath();
    ctx.moveTo(.02, -.05);
    ctx.bezierCurveTo(w * .28, -l * .41, w * .61, -l * .64, w * .46, -l * .91);
    ctx.bezierCurveTo(w * .37, -l * .63, w * .15, -l * .34, .02, -.05);
    ctx.fill();
    if (detailed) {
      for (let i = -3; i <= 3; i++) {
        const reach = .81 + p.veins[i + 3] * .11;
        const end = i * w * .235;
        stroke(ctx, i % 2 ? '#73192b29' : '#ffb08530', .004 + p.veins[i + 3] * .003, function () {
          ctx.moveTo(i * .014, -.17);
          ctx.bezierCurveTo(end * .45, -l * .39, end * .94, -l * .65, end, -l * reach);
        });
      }
      stroke(ctx, '#ffb08a3b', .006, function () {
        ctx.moveTo(-w * .82, -l * .73);
        ctx.bezierCurveTo(-w * .51, -l * .89, -w * .40, -l * .91, -w * .22, -l * .91);
      });
    }
    ctx.restore();
  }

  function poppy(ctx, rand, detailed) {
    const turn = rand() * TAU, petals = [];
    const warm = rand() > .45;
    for (let i = 0; i < 4; i++) {
      petals.push({angle: turn + i * Math.PI / 2 + (rand() - .5) * .15,
        width: .63 + rand() * .09, length: .87 + rand() * .15,
        dark: warm ? '#ae252d' : '#a62135', red: warm ? '#e24437' : '#d93842',
        light: warm ? '#f76a4d' : '#ef5e5a', edge: warm ? '#f47a5c' : '#ed756d',
        veins: Array.from({length: 7}, () => rand())});
    }
    for (const i of [0, 2, 1, 3]) poppyPetal(ctx, petals[i], detailed);
    // Four basal blotches remain visible between the capsule and the red folds.
    for (const p of petals) {
      ctx.save();
      ctx.rotate(p.angle);
      ctx.fillStyle = gradient(ctx, 0, -.08, 0, -.43, [
        [0, '#221f26'], [.52, '#34212d'], [.86, '#48212ee8'], [1, '#661f3030']
      ]);
      ctx.beginPath();
      ctx.moveTo(-.07, .01);
      ctx.bezierCurveTo(-.14, -.11, -.22, -.22, -.18, -.34);
      ctx.quadraticCurveTo(-.10, -.40, -.04, -.345);
      ctx.quadraticCurveTo(.06, -.42, .14, -.32);
      ctx.bezierCurveTo(.19, -.21, .13, -.10, .07, .01);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ellipse(ctx, 0, .012, .238, .205, '#291e28');
    const count = detailed ? 48 : 27;
    for (let i = 0; i < count; i++) {
      const a = i * TAU / count + (rand() - .5) * .12;
      const d = .19 + rand() * .091;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * .87;
      stroke(ctx, '#53404a', .008, function () {
        ctx.moveTo(Math.cos(a) * .09, Math.sin(a) * .08);
        ctx.quadraticCurveTo(x * .79, y * .7 - .012, x, y);
      });
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ellipse(ctx, 0, 0, detailed ? .018 : .023, .011, i % 4 === 0 ? '#76616c' : '#221e27');
      ctx.restore();
    }
    const capsule = ctx.createRadialGradient(-.035, -.041, .006, 0, -.008, .114);
    capsule.addColorStop(0, '#b2a4a4');
    capsule.addColorStop(.55, '#8c7f89');
    capsule.addColorStop(1, '#574f60');
    ellipse(ctx, 0, -.008, .113, .096, capsule);
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + .12;
      stroke(ctx, '#d4c3bd', .008, function () {
        ctx.moveTo(Math.cos(a) * .018, -.008 + Math.sin(a) * .015);
        ctx.lineTo(Math.cos(a) * .087, -.008 + Math.sin(a) * .072);
      });
    }
    ellipse(ctx, -.004, -.012, .022, .018, '#827280');
  }

  /** Draw one illustrated, slightly oblique bloom; tilt is a rotation in radians.
   * Radius describes the corolla, not the small stem attachment beneath it.
   * No timer, DOM access, global random state, or internal bitmap cache is used.
   */
  function draw(ctx, kind, x, y, radius, seed, tilt = 0) {
    if (!kinds.includes(kind)) kind = 'cosmos';
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const rand = random(String(seed) + '|flower|' + kind);
    ctx.save();
    try {
      ctx.translate(x, y);
      ctx.rotate(Number.isFinite(tilt) ? tilt : 0);
      ctx.scale(radius, radius);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      attachment(ctx, kind);
      // The projection makes the bloom feel cupped while keeping species readable.
      ctx.scale(1, .84 + rand() * .055);
      if (kind === 'cosmos') cosmos(ctx, rand, radius >= 22);
      else if (kind === 'daisy') daisy(ctx, rand, radius >= 22);
      else poppy(ctx, rand, radius >= 22);
    } finally {
      ctx.restore();
    }
  }

  const api = Object.freeze({kinds, draw, metadata});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FlowerArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
