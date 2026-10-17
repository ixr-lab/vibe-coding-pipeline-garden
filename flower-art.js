/* Original Canvas flower studies. Deterministic, dependency-free botanical illustration. */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const kinds = Object.freeze(['cosmos', 'daisy', 'poppy']);
  const metadata = Object.freeze({
    cosmos: Object.freeze({name: 'Cosmos', scientific: 'Cosmos bipinnatus', rays: 8}),
    daisy: Object.freeze({name: 'Oxeye daisy', scientific: 'Leucanthemum vulgare', rays: '24-29'}),
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
    ctx.bezierCurveTo(-w * .32, -.30, -w * .99 + bend, -l * .72, -w * .83 + bend, -l * .90);
    // Short, unequal tooth facets replace v3's rounded decorative scallops.
    const cap = [[-.71, .968], [-.55, .950], [-.40, .987], [-.22, .970],
      [-.035, 1.008], [.135, .982], [.32, .995], [.48, .959], [.65, .974], [.79, .908]];
    for (let i = 0; i < cap.length; i++) {
      ctx.lineTo(w * cap[i][0] + bend, -l * (cap[i][1] + p.teeth[i]));
    }
    ctx.bezierCurveTo(w * .95 + bend, -l * .66, w * .32, -.29, .04, -.115);
    ctx.closePath();
    ctx.fill();

    // Narrow channels follow each ray instead of dividing it into large panels.
    stroke(ctx, p.fold, p.folded ? .020 : .012, function () {
      ctx.moveTo(.007, -.19);
      ctx.bezierCurveTo(w * .10, -l * .43, w * .13 + bend, -l * .73, bend, -l * .95);
    });
    stroke(ctx, '#86285535', .008, function () {
      ctx.moveTo(-w * .36, -l * .48);
      ctx.bezierCurveTo(-w * .74 + bend, -l * .68, -w * .88 + bend, -l * .83, -w * .73 + bend, -l * .95);
    });
    if (p.folded) {
      ctx.fillStyle = gradient(ctx, 0, -l * .79, 0, -l * .96,
        [[0, '#92265f00'], [.52, '#8f2a626b'], [.76, '#ed8bbf8c'], [1, '#f7a0ce18']]);
      ctx.beginPath();
      ctx.moveTo(-w * .72 + bend, -l * .90);
      ctx.quadraticCurveTo(bend, -l * .82, w * .72 + bend, -l * .92);
      ctx.lineTo(w * .66 + bend, -l * .97);
      ctx.quadraticCurveTo(bend, -l * .90, -w * .65 + bend, -l * .97);
      ctx.closePath();
      ctx.fill();
    }
    if (detailed) {
      for (let v = -3; v <= 3; v++) {
        stroke(ctx, v % 2 ? p.vein : '#fff2fc35', .0036 + p.ridges[v + 3] * .003, function () {
          ctx.moveTo(v * .010, -.21);
          ctx.bezierCurveTo(v * w * .15, -l * .47, v * w * .21 + bend * .65, -l * .72,
            v * w * .23 + bend, -l * (.88 + p.ridges[v + 3] * .06));
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
      ['#8e1a61', '#c63d8e', '#e76ab2', '#ed91c5', '#fff0fa46', '#82265f40'],
      ['#801c5e', '#b93189', '#d85cab', '#e583be', '#fff1fb45', '#70265040'],
      ['#9c2c69', '#d25698', '#ec88ba', '#f0a0c8', '#fff5fb48', '#97326e40']
    ];
    const colors = palettes[Math.floor(rand() * palettes.length)];
    const turn = rand() * TAU, rays = [];
    for (let i = 0; i < 8; i++) {
      const angle = turn + i * TAU / 8 + (rand() - .5) * .16;
      const folded = Math.cos(angle) < -.63;
      rays.push({angle,
        length: (.86 + rand() * .18) * (folded ? .73 + rand() * .10 : 1),
        width: (.33 + rand() * .073) * (folded ? .84 : 1), bend: (rand() - .5) * .11,
        folded, teeth: Array.from({length: 10}, () => (rand() - .5) * .018),
        ridges: Array.from({length: 7}, () => rand()),
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
      [0, '#9f9d7b'], [.18, p.shadow ? '#aeb7b6' : '#d1d7d1'],
      [.48, p.shadow ? '#cdd3d4' : '#eeefed'],
      [.83, p.shadow ? '#e0e4e3' : '#fffef7'], [1, '#f7f7f1']
    ]);
    ctx.beginPath();
    ctx.moveTo(-.018, -.16);
    ctx.bezierCurveTo(-w * .72, -.39, -w + bend, -l * .72, -w * .57 + bend, -l * .94);
    ctx.quadraticCurveTo(-w * .27 + bend, -l * 1.015, bend - w * .06, -l);
    ctx.lineTo(bend + w * .06, -l * .978);
    ctx.quadraticCurveTo(w * .23 + bend, -l * 1.014, w * .49 + bend, -l * .96);
    ctx.bezierCurveTo(w * .94 + bend, -l * .76, w * .49, -.42, .018, -.16);
    ctx.closePath();
    ctx.fill();
    // The shaded edge sits beneath the adjacent ray, not around its whole outline.
    stroke(ctx, p.shadow ? '#82929a5e' : '#a2adb34b', .009, function () {
      ctx.moveTo(-w * .26, -.32);
      ctx.bezierCurveTo(-w * .75, -l * .54, -w * .93 + bend, -l * .77, -w * .46 + bend, -l * .95);
    });
    if (p.curl) {
      stroke(ctx, '#a7b0b36b', .015, function () {
        ctx.moveTo(-w * .49 + bend, -l * .91);
        ctx.quadraticCurveTo(bend, -l * .958, w * .35 + bend, -l * .943);
      });
    }
    if (detailed) {
      stroke(ctx, '#8f9ca34f', .006, function () {
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
    const count = 24 + Math.floor(rand() * 6), turn = rand() * TAU, rays = [];
    for (let i = 0; i < count; i++) {
      const angle = turn + i * TAU / count + (rand() - .5) * .062;
      const curl = Math.cos(angle) < -.4 && rand() > .3;
      rays.push({angle, length: (.83 + rand() * .22) * (curl ? .88 : 1),
        width: .084 + rand() * .029, bend: (rand() - .5) * .085,
        shadow: i % 2 === 0, curl});
    }
    for (let parity = 0; parity < 2; parity++) {
      for (let i = parity; i < count; i += 2) daisyRay(ctx, rays[i], detailed);
    }
    yellowDisk(ctx, rand, .258 + rand() * .018, detailed, true);
  }

  function poppyPetal(ctx, p, detailed) {
    const w = p.width, l = p.length, lean = p.lean;
    ctx.save();
    ctx.rotate(p.angle);
    ctx.fillStyle = gradient(ctx, -w * .14, -.03, w * .25, -l, [
      [0, '#7e122c'], [.16, p.dark], [.42, p.red], [.83, p.light], [1, p.edge]
    ]);
    ctx.beginPath();
    ctx.moveTo(-.055, .035);
    ctx.bezierCurveTo(-w * .53, -.10, -w * 1.10, -l * .35, -w * .97 + lean, -l * .62);
    ctx.bezierCurveTo(-w * 1.04 + lean, -l * .75, -w * .91 + lean, -l * .88, -w * .70 + lean, -l * .90);
    ctx.bezierCurveTo(-w * .63 + lean, -l * (1.01 + p.edgeWave), -w * .31 + lean, -l * .91, -w * .20 + lean, -l * .99);
    ctx.bezierCurveTo(w * .02 + lean, -l * 1.035, w * .11 + lean, -l * .97, w * .28 + lean, -l * 1.01);
    ctx.bezierCurveTo(w * .49 + lean, -l * (1.01 - p.edgeWave), w * .65 + lean, -l * .88, w * .76 + lean, -l * .87);
    ctx.bezierCurveTo(w * 1.04 + lean, -l * .77, w * .96 + lean, -l * .45, w * .80, -l * .31);
    ctx.bezierCurveTo(w * .67, -l * .14, w * .31, -.04, .055, .035);
    ctx.closePath();
    ctx.fill();
    ctx.clip();

    // Short irregular creases replace the thick, continuous v3 highlight panels.
    const creaseCount = detailed ? 24 : 8;
    for (let i = 0; i < creaseCount; i++) {
      const v = p.veins[i], u = (i + .5) / creaseCount * 2 - 1;
      const endX = u * w * .91 + lean;
      const endY = -l * (.73 + v * .29 - Math.abs(u) * .15);
      const startY = -l * (.19 + p.veins[(i + 7) % 24] * .39);
      const startX = endX * (.23 + p.veins[(i + 11) % 24] * .25);
      const kink = (p.veins[(i + 3) % 24] - .5) * .055;
      stroke(ctx, i % 3 === 0 ? '#8f12302e' : '#ffafbc26', .003 + v * .005, function () {
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + (endX - startX) * .24 + kink, startY * .65 + endY * .35,
          endX * .85 - kink, endY * .77, endX, endY);
      });
      if (detailed && i % 3 === 0) {
        stroke(ctx, '#fca1b21e', .004, function () {
          ctx.moveTo(endX * .66 + .008, endY * .67);
          ctx.quadraticCurveTo(endX * .90 + .012, endY * .87, endX + .006, endY);
        });
      }
    }
    // A local overlap shadow curls along one side; the other edge stays light.
    const side = gradient(ctx, -w, -.4, -w * .63, -.4,
      [[0, '#7c123557'], [.58, '#b51e3b28'], [1, '#b51e3b00']]);
    ellipse(ctx, -w * .87 + lean, -l * .60, w * .31, l * .36, side);
    if (detailed) {
      stroke(ctx, '#ffa6b23b', .005, function () {
        ctx.moveTo(-w * .66 + lean, -l * .91);
        ctx.bezierCurveTo(-w * .48 + lean, -l * 1.00, -w * .30 + lean, -l * .93,
          -w * .20 + lean, -l * .985);
      });
    }
    ctx.restore();
  }

  function poppy(ctx, rand, detailed) {
    const turn = (rand() - .5) * .42, petals = [];
    const warm = rand() > .45;
    // Two taller back petals and two shorter front petals make an uneven cup.
    const angles = [-.63, .67, 2.16, 4.08];
    for (let i = 0; i < 4; i++) {
      petals.push({angle: turn + angles[i] + (rand() - .5) * .15,
        width: (i < 2 ? .63 : .73) + rand() * .12,
        length: (i < 2 ? .91 : .72) + rand() * .16,
        lean: (rand() - .5) * .12, edgeWave: (rand() - .5) * .065,
        dark: warm ? '#b21330' : '#a91538', red: warm ? '#e51f3a' : '#dc2448',
        light: warm ? '#f43a4f' : '#ed3b5b', edge: warm ? '#ef4255' : '#e84965',
        blotch: .25 + rand() * .095, blotchWidth: .12 + rand() * .055,
        veins: Array.from({length: 24}, () => rand())});
    }
    for (const i of [0, 1, 3, 2]) poppyPetal(ctx, petals[i], detailed);
    // Unequal basal marks merge into the loose stamen ring, rather than a black flower.
    for (const p of petals) {
      const b = p.blotch, w = p.blotchWidth;
      ctx.save();
      ctx.rotate(p.angle);
      ctx.fillStyle = gradient(ctx, 0, -.08, 0, -b, [
        [0, '#271f2d'], [.66, '#342030'], [1, '#5d1935c7']
      ]);
      ctx.beginPath();
      ctx.moveTo(-.07, .01);
      ctx.bezierCurveTo(-w * .84, -.10, -w * 1.12, -b * .70, -w, -b * .90);
      ctx.lineTo(-w * .65, -b * .86);
      ctx.lineTo(-w * .28, -b);
      ctx.lineTo(w * .16, -b * .92);
      ctx.lineTo(w * .48, -b * .97);
      ctx.lineTo(w * .89, -b * .78);
      ctx.bezierCurveTo(w, -b * .52, w * .68, -.10, .07, .01);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ellipse(ctx, 0, .012, .157, .138, '#3a2532');
    const count = detailed ? 58 : 29;
    for (let i = 0; i < count; i++) {
      const a = i * TAU / count + (rand() - .5) * .12;
      const d = .18 + rand() * .13;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * .87;
      stroke(ctx, i % 3 ? '#4c2f3b' : '#79505b', .006, function () {
        ctx.moveTo(Math.cos(a) * .09, Math.sin(a) * .08);
        ctx.quadraticCurveTo(x * .79, y * .7 - .02, x, y);
      });
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ellipse(ctx, 0, 0, detailed ? .016 : .020, .009, i % 4 === 0 ? '#715660' : '#2d2430');
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
