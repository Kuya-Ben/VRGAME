/* castle.js - BIG stone castle for A-Frame
   <a-entity id="castle" stone-castle="walltex: #brick; floortex: #Floor; rooftex: #roof; tile: 4" position="0 0 -25"></a-entity>
   Layout (local coordinates, front gate faces +z):
     - outer ward 80 x 64 with crenellated curtain walls
     - gatehouse with a 6-wide passage and portcullis
     - 4 round corner towers, 2 side towers, 1 back tower
     - central keep (walkable hall, red carpet, dais, pillars) with turrets and a spire
     - courtyard with a well, torches with real lights, and waving flags
   Everything with class "solid" blocks the player (see wall-collider).
*/
AFRAME.registerComponent('stone-castle', {
  schema: {
    stone:    { default: '#8a8d8f' },
    dark:     { default: '#ecf2fa' },
    roof:     { default: '#37251d' },
    floor:    { default: '#a39f98' },
    walltex:  { default: '' },
    floortex: { default: '' },
    rooftex:  { default: '' },
    tile:     { default: 4 },
    lights:   { default: true }      // torch lights (turn off if the scene is slow)
  },

  init: function () {
    var el = this.el, d = this.data;
    var Y0 = 0.4, H = 10, T = 2;        // ground level, curtain wall height, wall thickness
    var WY = Y0 + H / 2, TOP = Y0 + H;
    var W = 40, D = 32;                 // half-size of the outer ward (80 x 64)
    var DEG = 180 / Math.PI;

    function mat(color, tex, w, h) {
      if (!tex) return 'color: ' + color;
      var rx = Math.max(1, Math.round(w / d.tile)), ry = Math.max(1, Math.round(h / d.tile));
      return 'src: ' + tex + '; repeat: ' + rx + ' ' + ry;
    }
    function put(e, kind, solid, x, y, z) {
      e.setAttribute('class', (solid ? 'solid ' : '') + kind);
      e.setAttribute('position', x + ' ' + y + ' ' + z);
      el.appendChild(e);
      return e;
    }
    function box(kind, x, y, z, w, h, dp, color, tex, solid, rx, ry) {
      var e = document.createElement('a-box');
      e.setAttribute('width', w); e.setAttribute('height', h); e.setAttribute('depth', dp);
      if (rx || ry) e.setAttribute('rotation', (rx || 0) + ' ' + (ry || 0) + ' 0');
      e.setAttribute('material', mat(color, tex, Math.max(w, dp), h));
      return put(e, kind, solid, x, y, z);
    }
    function cyl(kind, x, y, z, r, h, color, tex, solid) {
      var e = document.createElement('a-cylinder');
      e.setAttribute('radius', r); e.setAttribute('height', h); e.setAttribute('segments-radial', 24);
      e.setAttribute('material', mat(color, tex, r * 6.28, h));
      return put(e, kind, solid, x, y, z);
    }
    function cone(kind, x, y, z, rb, h, seg, ry, color, tex) {
      var e = document.createElement('a-cone');
      e.setAttribute('radius-bottom', rb); e.setAttribute('radius-top', 0);
      e.setAttribute('height', h); e.setAttribute('segments-radial', seg);
      if (ry) e.setAttribute('rotation', '0 ' + ry + ' 0');
      e.setAttribute('material', mat(color, tex, rb * 6.28, h));
      return put(e, kind, false, x, y, z);
    }
    // battlements along a straight line (axis-aligned)
    function crenels(x1, z1, x2, z2, y) {
      var len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.floor(len / 2.6));
      var alongX = Math.abs(z2 - z1) < 0.01;
      for (var i = 0; i <= n; i++) {
        var t = i / n;
        box('merlon', x1 + (x2 - x1) * t, y, z1 + (z2 - z1) * t,
            alongX ? 1.3 : 1, 1.1, alongX ? 1 : 1.3, d.stone, d.walltex, false);
      }
    }
    function crenRect(cx, cz, hw, hd, y) {
      crenels(cx - hw, cz - hd, cx + hw, cz - hd, y);
      crenels(cx - hw, cz + hd, cx + hw, cz + hd, y);
      crenels(cx - hw, cz - hd, cx - hw, cz + hd, y);
      crenels(cx + hw, cz - hd, cx + hw, cz + hd, y);
    }
    function flag(x, y, z, color) {
      cyl('flag', x, y + 1.5, z, 0.07, 3, '#2a2a2a', '', false);
      var f = document.createElement('a-plane');
      f.setAttribute('width', 2.4); f.setAttribute('height', 1.4);
      f.setAttribute('material', 'color: ' + color + '; side: double');
      f.setAttribute('animation', 'property: rotation; from: 0 -14 0; to: 0 14 0; dir: alternate; dur: 1600; loop: true; easing: easeInOutSine');
      put(f, 'flag', false, x + 1.2, y + 2.3, z);
    }
    function torch(x, y, z) {
      cyl('torch', x, y, z, 0.1, 1.4, '#4a3020', '', false);
      var s = document.createElement('a-sphere');
      s.setAttribute('radius', 0.22);
      s.setAttribute('material', 'color: #ff8a1f; emissive: #ff8a1f; emissiveIntensity: 1');
      put(s, 'torch', false, x, y + 0.85, z);
      if (d.lights) {
        var l = document.createElement('a-light');
        l.setAttribute('type', 'point'); l.setAttribute('color', '#ff9b3d');
        l.setAttribute('intensity', 0.9); l.setAttribute('distance', 16);
        put(l, 'torch-light', false, x, y + 1.1, z);
      }
    }
    // round tower: coneH > 0 gives a pointed roof, 0 gives battlements
    function roundTower(x, z, r, h, coneH, flagColor) {
      cyl('tower', x, Y0 + h / 2, z, r, h, d.stone, d.walltex, true);
      cyl('tower', x, Y0 + h + 0.25, z, r + 0.4, 0.5, d.dark, d.walltex, false);
      var a = Math.atan2(x, z);
      [0.3, 0.6, 0.85].forEach(function (f) {
        box('window', x + r * Math.sin(a), Y0 + h * f, z + r * Math.cos(a),
            0.3, 1.5, 0.3, '#1b1d20', '', false, 0, a * DEG);
      });
      if (coneH) {
        cone('roof', x, Y0 + h + 0.5 + coneH / 2, z, r + 0.6, coneH, 24, 0, d.roof, d.rooftex);
        if (flagColor) flag(x, Y0 + h + 0.5 + coneH, z, flagColor);
      } else {
        for (var k = 0; k < 12; k++) {
          var t = (k / 12) * Math.PI * 2;
          box('merlon', x + (r + 0.1) * Math.sin(t), Y0 + h + 1.05, z + (r + 0.1) * Math.cos(t),
              1.3, 1.1, 0.8, d.stone, d.walltex, false, 0, t * DEG);
        }
      }
    }
    function squareTower(x, z, w, h, flagColor) {
      box('tower', x, Y0 + h / 2, z, w, h, w, d.stone, d.walltex, true);
      box('tower', x, Y0 + h + 0.25, z, w + 0.8, 0.5, w + 0.8, d.dark, d.walltex, false);
      crenRect(x, z, w / 2 + 0.2, w / 2 + 0.2, Y0 + h + 1.05);
      [0.4, 0.75].forEach(function (f) {
        box('window', x, Y0 + h * f, z + w / 2, 0.5, 1.8, 0.2, '#1b1d20', '', false);
      });
      if (flagColor) flag(x, Y0 + h + 0.5, z, flagColor);
    }

    /* ---- 1. Base and courtyard floor ---- */
    box('base', 0, 0.2, 0, 2 * W + 6, 0.4, 2 * D + 6, d.dark, d.floortex, false);
    box('floor', 0, Y0 + 0.02, 0, 2 * W - 2, 0.04, 2 * D - 2, d.floor, d.floortex, false);

    /* ---- 2. Curtain walls (gate gap in the middle of the front, 26 wide for the gatehouse) ---- */
    box('wall', 0, WY, -D, 2 * W + T, H, T, d.stone, d.walltex, true);                 // back
    box('wall', -W, WY, 0, T, H, 2 * D, d.stone, d.walltex, true);                     // left
    box('wall',  W, WY, 0, T, H, 2 * D, d.stone, d.walltex, true);                     // right
    box('wall', -(W + 13 + 1) / 2 - 0.0, WY, D, W + 1 - 13, H, T, d.stone, d.walltex, true);  // front left
    box('wall',  (W + 13 + 1) / 2 - 0.0, WY, D, W + 1 - 13, H, T, d.stone, d.walltex, true);  // front right
    crenels(-W - 1, -D, W + 1, -D, TOP + 0.6);
    crenels(-W, -D, -W, D, TOP + 0.6);
    crenels( W, -D,  W, D, TOP + 0.6);
    crenels(-W - 1, D, -13, D, TOP + 0.6);
    crenels(13, D, W + 1, D, TOP + 0.6);

    /* ---- 3. Gatehouse: two towers, arch lintel, portcullis ---- */
    [-8, 8].forEach(function (gx) {
      box('tower', gx, Y0 + 7.5, D, 10, 15, 10, d.stone, d.walltex, true);
      box('roof',  gx, Y0 + 15.25, D, 10.8, 0.5, 10.8, d.dark, d.rooftex, false);
      crenRect(gx, D, 5.2, 5.2, Y0 + 16.05);
      box('window', gx, Y0 + 10, D + 5.02, 0.5, 2, 0.1, '#1b1d20', '', false);
      flag(gx, Y0 + 15.5, D, gx < 0 ? '#9b1c1c' : '#1c3d9b');
    });
    box('wall', 0, Y0 + 11.5, D, 6.2, 7, 10, d.stone, d.walltex, false);               // lintel over the passage
    for (var g = -2.5; g <= 2.5; g += 1) {                                            // raised portcullis
      box('gate', g, Y0 + 6.2, D + 4.6, 0.25, 3.6, 0.25, '#2a2a2a', '', false);
    }
    box('gate', 0, Y0 + 5.2, D + 4.6, 6, 0.25, 0.25, '#2a2a2a', '', false);
    box('gate', 0, Y0 + 6.6, D + 4.6, 6, 0.25, 0.25, '#2a2a2a', '', false);
    torch(-3.7, Y0 + 0.7, D + 5.4);
    torch( 3.7, Y0 + 0.7, D + 5.4);

    /* ---- 4. Towers ---- */
    roundTower(-W, -D, 4.8, 18, 8, '#9b1c1c');
    roundTower( W, -D, 4.8, 18, 8, '#9b1c1c');
    roundTower(-W,  D, 4.8, 17, 8, '#1c3d9b');
    roundTower( W,  D, 4.8, 17, 8, '#1c3d9b');
    squareTower(-W, 0, 8, 14, null);
    squareTower( W, 0, 8, 14, null);
    squareTower(0, -D, 11, 17, '#9b1c1c');

    /* ---- 5. The keep (walkable hall) ---- */
    var cz = -8, hw = 13, hd = 10, KH = 24, T2 = 1.5;
    box('wall', 0, Y0 + KH / 2, cz - hd, 2 * hw + T2, KH, T2, d.stone, d.walltex, true);       // back
    box('wall', -hw, Y0 + KH / 2, cz, T2, KH, 2 * hd, d.stone, d.walltex, true);               // left
    box('wall',  hw, Y0 + KH / 2, cz, T2, KH, 2 * hd, d.stone, d.walltex, true);               // right
    box('wall', -(2.5 + hw + T2 / 2) / 2, Y0 + KH / 2, cz + hd, hw + T2 / 2 - 2.5, KH, T2, d.stone, d.walltex, true);  // front left of door
    box('wall',  (2.5 + hw + T2 / 2) / 2, Y0 + KH / 2, cz + hd, hw + T2 / 2 - 2.5, KH, T2, d.stone, d.walltex, true);  // front right of door
    box('wall', 0, Y0 + 7 + (KH - 7) / 2, cz + hd, 5, KH - 7, T2, d.stone, d.walltex, false);  // above the door (door is 5 wide, 7 tall)
    box('roof', 0, Y0 + KH + 0.25, cz, 2 * hw + 2.2, 0.5, 2 * hd + 2.2, d.dark, d.rooftex, false);
    crenRect(0, cz, hw + 0.6, hd + 0.6, Y0 + KH + 1.05);
    [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]].forEach(function (c, i) {                    // corner turrets
      cyl('tower', c[0], Y0 + (KH + 6) / 2, cz + c[1], 2.3, KH + 6, d.stone, d.walltex, true);
      cone('roof', c[0], Y0 + KH + 6 + 2.5, cz + c[1], 3, 5, 20, 0, d.roof, d.rooftex);
      flag(c[0], Y0 + KH + 8.5, cz + c[1], i % 2 ? '#1c3d9b' : '#9b1c1c');
    });
    cyl('tower', 0, Y0 + KH + 5, cz, 4.2, 10, d.stone, d.walltex, false);                     // central spire
    cone('roof', 0, Y0 + KH + 10 + 4.5, cz, 5, 9, 24, 0, d.roof, d.rooftex);
    flag(0, Y0 + KH + 14.5, cz, '#d4a017');
    [Y0 + 14, Y0 + 19].forEach(function (wy) {                                                 // windows
      [-8, 8].forEach(function (wx) { box('window', wx, wy, cz + hd + 0.8, 1.3, 3, 0.2, '#1b1d20', '', false); });
      box('window', -hw - 0.8, wy, cz, 0.2, 3, 1.3, '#1b1d20', '', false);
      box('window',  hw + 0.8, wy, cz, 0.2, 3, 1.3, '#1b1d20', '', false);
    });
    // inside the hall
    box('floor', 0, Y0 + 0.03, cz, 2 * hw - T2, 0.04, 2 * hd - T2, '#8a7f6d', d.floortex, false);
    box('floor', 0, Y0 + 0.06, cz + 2, 3, 0.03, 15, '#7a1f1f', '', false);                    // red carpet
    box('dais',  0, Y0 + 0.4, cz - hd + 3, 10, 0.8, 4, '#5a3a2a', '', false);                 // dais
    box('dais',  0, Y0 + 1.6, cz - hd + 2.2, 1.6, 1.6, 1.2, '#d4a017', '', false);            // throne
    [-7, 7].forEach(function (px) {
      [cz - 3, cz + 3].forEach(function (pz) { cyl('pillar', px, Y0 + 5, pz, 0.8, 10, d.stone, d.walltex, true); });
    });
    torch(-3.6, Y0 + 0.7, cz + hd + 0.9);
    torch( 3.6, Y0 + 0.7, cz + hd + 0.9);

    /* ---- 6. Courtyard details ---- */
    cyl('well', -18, Y0 + 0.5, 16, 1.7, 1, d.dark, d.walltex, true);
    cyl('well', -18, Y0 + 1.02, 16, 1.4, 0.05, '#2a5d8a', '', false);
    box('floor', 0, Y0 + 0.03, 17, 4, 0.02, 30, '#6e6a62', '', false);                          // path from gate to keep
  }
});