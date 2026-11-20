
    // Blocks the player from walking into any entity with class "solid"
    AFRAME.registerComponent('wall-collider', {
      schema: { radius: { default: 0.3 } },
      init: function () {
        this.last = new THREE.Vector3().copy(this.el.object3D.position);
        this.wallBox = new THREE.Box3();
        this.playerBox = new THREE.Box3();
      },
      blocked: function (x, z) {
        var r = this.data.radius;
        this.playerBox.min.set(x - r, 0.1, z - r);
        this.playerBox.max.set(x + r, 1.7, z + r);
        var walls = document.querySelectorAll('.solid');
        for (var i = 0; i < walls.length; i++) {
          this.wallBox.setFromObject(walls[i].object3D);
          if (this.wallBox.intersectsBox(this.playerBox)) return true;
        }
        return false;
      },
      tick: function () {
        var p = this.el.object3D.position;
        if (this.blocked(p.x, p.z)) {
          if (!this.blocked(p.x, this.last.z)) { p.z = this.last.z; }       // slide along wall
          else if (!this.blocked(this.last.x, p.z)) { p.x = this.last.x; }  // slide along wall
          else { p.x = this.last.x; p.z = this.last.z; }                    // fully blocked
        }
        this.last.copy(p);
      }
    });

    AFRAME.registerComponent('hover-grow', {
  schema: {
    normal: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
    hover:  { type: 'vec3', default: { x: 1.3, y: 1.3, z: 1.3 } }
  },
  init: function () {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(2, 2);   // starts off-screen
    var self = this;
    window.addEventListener('mousemove', function (event) {
      self.mouse.x = event.clientX / window.innerWidth * 2 - 1;
      self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
  },
  tick: function () {
    var camera = this.el.sceneEl.camera;
    if (!camera) return;
    this.raycaster.setFromCamera(this.mouse, camera);
    var hit = this.raycaster.intersectObject(this.el.object3D, true).length > 0;
    var s = hit ? this.data.hover : this.data.normal;
    this.el.object3D.scale.set(s.x, s.y, s.z);
  }
});



if (!AFRAME.components['wall-collider']) {
  AFRAME.registerComponent('wall-collider', {
    schema: { radius: { default: 0.3 } },
    init: function () {
      this.last = new THREE.Vector3().copy(this.el.object3D.position);
      this.wallBox = new THREE.Box3();
      this.playerBox = new THREE.Box3();
    },
    blocked: function (x, z) {
      var r = this.data.radius;
      this.playerBox.min.set(x - r, 0.1, z - r);
      this.playerBox.max.set(x + r, 1.7, z + r);
      var walls = document.querySelectorAll('.solid');
      for (var i = 0; i < walls.length; i++) {
        this.wallBox.setFromObject(walls[i].object3D);
        if (this.wallBox.intersectsBox(this.playerBox)) return true;
      }
      return false;
    },
    tick: function () {
      var p = this.el.object3D.position;
      if (this.blocked(p.x, p.z)) {
        if (!this.blocked(p.x, this.last.z)) { p.z = this.last.z; }
        else if (!this.blocked(this.last.x, p.z)) { p.x = this.last.x; }
        else { p.x = this.last.x; p.z = this.last.z; }
      }
      this.last.copy(p);
    }
  });
}



// grass.js - scatters many copies of a glb model (instanced), never inside the castle.
// Usage: <a-entity gltf-model="#grass" grass-scatter="count: 1000; exclude: 80; height: 1"></a-entity>
// The model is re-centered and dropped onto the ground (y = 0) and resized to "height",
// so it works even if the glb has a big offset or an odd scale.
if (!AFRAME.components['grass-scatter']) {
AFRAME.registerComponent('grass-scatter', {
  schema: {
    count:    { default: 500 },
    height:   { default: 1 },     // height of one clump in world units (0 = keep the model's own size)
    areaX:    { default: 240 },   // half-width of the area to fill
    areaZ:    { default: 270 },   // half-depth
    exclude:  { default: 80 },    // keep clear where |x| and |z| are below this
    minScale: { default: 0.8 },   // random size multiplier
    maxScale: { default: 1.6 },
    seed:     { default: 1 }
  },

  init: function () {
    var self = this;
    this.el.addEventListener('model-loaded', function () { self.build(); });
  },

  build: function () {
    var d = this.data;
    var root = this.el.getObject3D('mesh');
    if (!root) return;
    this.el.object3D.updateMatrixWorld(true);
    var entityInv = new THREE.Matrix4().copy(this.el.object3D.matrixWorld).invert();

    var meshes = [];
    root.traverse(function (o) { if (o.isMesh && !o.isSkinnedMesh) meshes.push(o); });
    if (!meshes.length) { console.warn('grass-scatter: no static meshes found'); return; }

    // bounding box of the whole model, so it can be centered and put on the ground
    var box = new THREE.Box3();
    var rels = meshes.map(function (mesh) {
      var rel = new THREE.Matrix4().multiplyMatrices(entityInv, mesh.matrixWorld);
      mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox.clone().applyMatrix4(rel));
      return rel;
    });
    var size = new THREE.Vector3(); box.getSize(size);
    var cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    var k = (d.height > 0 && size.y > 0) ? d.height / size.y : 1;
    var base = new THREE.Matrix4()
      .makeScale(k, k, k)
      .multiply(new THREE.Matrix4().makeTranslation(-cx, -box.min.y, -cz));

    // random numbers that stay the same on every reload
    var s = d.seed;
    function rand() {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    var spots = [];
    while (spots.length < d.count) {
      var x = (rand() * 2 - 1) * d.areaX;
      var z = (rand() * 2 - 1) * d.areaZ;
      if (Math.abs(x) < d.exclude && Math.abs(z) < d.exclude) continue;
      spots.push({ x: x, z: z, ry: rand() * Math.PI * 2,
                   sc: d.minScale + rand() * (d.maxScale - d.minScale) });
    }

    var group = new THREE.Group();
    var place = new THREE.Matrix4(), rot = new THREE.Matrix4(), scl = new THREE.Matrix4();
    var m = new THREE.Matrix4();

    meshes.forEach(function (mesh, idx) {
      var inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, spots.length);
      inst.frustumCulled = false;
      spots.forEach(function (p, i) {
        place.makeTranslation(p.x, window.terrainHeight ? window.terrainHeight(p.x, p.z) : 0, p.z);
        rot.makeRotationY(p.ry);
        scl.makeScale(p.sc, p.sc, p.sc);
        m.copy(place).multiply(rot).multiply(scl).multiply(base).multiply(rels[idx]);
        inst.setMatrixAt(i, m);
      });
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
    });

    this.el.removeObject3D('mesh');
    this.el.setObject3D('scatter', group);
    console.log('grass-scatter: placed ' + spots.length + ' copies, model size ' +
      size.x.toFixed(2) + ' x ' + size.y.toFixed(2) + ' x ' + size.z.toFixed(2));
  }
});
}