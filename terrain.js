// terrain.js - rolling hills that stay flat around the castle.
// <a-entity terrain="width: 500; depth: 550; flat: 100; blend: 70; height: 12"></a-entity>
// Also adds "ground-follow" so the camera walks over the hills.
if (!AFRAME.components['terrain']) {
AFRAME.registerComponent('terrain', {
  schema: {
    width:    { default: 500 },
    depth:    { default: 550 },
    segments: { default: 220 },   // more = smoother (and heavier)
    height:   { default: 12 },    // tallest hills, in world units
    scale:    { default: 90 },    // size of the hills: bigger = wider, gentler hills
    flat:     { default: 100 },   // flat square around the castle: |x| and |z| below this stay at 0
    blend:    { default: 70 },    // distance over which the land rises into hills
    seed:     { default: 3 },
    low:      { type: 'color', default: '#784008' },   // grass
    mid:      { type: 'color', default: '#a06916' },   // darker grass
    high:     { type: 'color', default: '#8a7f6a' }    // rock on the tops
  },

  init: function () {
    var d = this.data, self = this;

    // smooth value noise, same result on every reload
    function hash(ix, iz) {
      var n = Math.sin(ix * 127.1 + iz * 311.7 + d.seed * 74.7) * 43758.5453;
      return n - Math.floor(n);
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    function noise(x, z) {
      var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
      var a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), e = hash(ix + 1, iz + 1);
      var u = smooth(fx), v = smooth(fz);
      return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
    }
    function fbm(x, z) {
      var h = 0, amp = 1, freq = 1, sum = 0;
      for (var o = 0; o < 4; o++) {
        h += noise(x * freq, z * freq) * amp; sum += amp; amp *= 0.5; freq *= 2;
      }
      return h / sum;
    }

    this.heightAt = function (x, z) {
      var edge = Math.max(Math.abs(x), Math.abs(z));
      var t = Math.min(1, Math.max(0, (edge - d.flat) / d.blend));
      var mask = smooth(t);                       // 0 near the castle, 1 far away
      var n = fbm(x / d.scale, z / d.scale);      // 0..1
      return Math.max(0, (n - 0.35)) / 0.65 * d.height * mask;
    };
    window.terrainHeight = this.heightAt;         // used by grass-scatter and ground-follow

    // build the mesh
    var geo = new THREE.PlaneGeometry(d.width, d.depth, d.segments, Math.round(d.segments * d.depth / d.width));
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var cLow = new THREE.Color(d.low), cMid = new THREE.Color(d.mid), cHigh = new THREE.Color(d.high), c = new THREE.Color();

    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var y = this.heightAt(x, z);
      pos.setY(i, y);
      var k = Math.min(1, y / d.height);
      var speckle = (noise(x * 0.8, z * 0.8) - 0.5) * 0.12;   // small color variation
      if (k < 0.5) c.copy(cLow).lerp(cMid, k * 2);
      else c.copy(cMid).lerp(cHigh, (k - 0.5) * 2);
      colors[i * 3]     = Math.min(1, Math.max(0, c.r + speckle));
      colors[i * 3 + 1] = Math.min(1, Math.max(0, c.g + speckle));
      colors[i * 3 + 2] = Math.min(1, Math.max(0, c.b + speckle));
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.02;                      // avoids flicker with the castle floor
    this.el.setObject3D('mesh', mesh);
  }
});
}

// Keeps the camera a fixed height above the terrain.
if (!AFRAME.components['ground-follow']) {
AFRAME.registerComponent('ground-follow', {
  schema: { eye: { default: 1.6 } },
  tick: function () {
    if (!window.terrainHeight) return;
    var p = this.el.object3D.position;
    var target = window.terrainHeight(p.x, p.z) + this.data.eye;
    p.y += (target - p.y) * 0.3;                  // smooth, so slopes don't jolt
  }
});
}
