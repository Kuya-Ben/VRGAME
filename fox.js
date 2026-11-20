/* fox.js - playable fox (third-person) for A-Frame
   W A S D / arrows = move, Shift = run, mouse (after a click) or Q / E = turn camera.
   Needs: aframe-extras (for animation-mixer) and objects with class="solid" for collision. */
if (!AFRAME.components['fox-player']) {
AFRAME.registerComponent('fox-player', {
  schema: {
    speed:    { default: 4 },    // walking speed (units per second)
    run:      { default: 9 },    // running speed (hold Shift)
    radius:   { default: 0.5 },  // collision size
    distance: { default: 6 },    // camera distance behind the fox
    offset:   { default: 0 }     // degrees: use 180 if the fox walks backwards
  },
  init: function () {
    var self = this, scene = this.el.sceneEl;
    this.keys = {};
    this.yaw = 0;
    this.pitch = 0.35;
    this.facing = 0;
    this.state = 'Survey';
    this.fox = this.el.querySelector('#fox');
    this.cam = scene.querySelector('#followCam');
    this.boxes = [];
    this.count = 0;
    this.playerBox = new THREE.Box3();
    this.camBox = new THREE.Box3();
    this.tmp = new THREE.Vector3();
    this.size = new THREE.Vector3(0.6, 0.6, 0.6);
    this.dir = new THREE.Vector3();

    window.addEventListener('keydown', function (e) { self.keys[e.code] = true; });
    window.addEventListener('keyup',   function (e) { self.keys[e.code] = false; });
    window.addEventListener('blur',    function ()  { self.keys = {}; });

    scene.addEventListener('click', function () {
      var c = scene.canvas;
      if (c && document.pointerLockElement !== c) c.requestPointerLock();
    });
    document.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement !== scene.canvas) return;
      self.yaw -= e.movementX * 0.003;
      self.pitch = Math.max(0.05, Math.min(1.2, self.pitch + e.movementY * 0.003));
    });
  },
  refreshBoxes: function () {
    var solids = this.el.sceneEl.querySelectorAll('.solid');
    this.count = solids.length;
    for (var i = 0; i < this.count; i++) {
      var b = this.boxes[i] || (this.boxes[i] = new THREE.Box3());
      b.setFromObject(solids[i].object3D);
    }
  },
  blocked: function (x, z) {
    var r = this.data.radius;
    this.playerBox.min.set(x - r, 0.1, z - r);
    this.playerBox.max.set(x + r, 1.0, z + r);
    for (var i = 0; i < this.count; i++) {
      if (this.boxes[i].intersectsBox(this.playerBox)) return true;
    }
    return false;
  },
  camBlocked: function (x, y, z) {
    this.tmp.set(x, y, z);
    this.camBox.setFromCenterAndSize(this.tmp, this.size);
    for (var i = 0; i < this.count; i++) {
      if (this.boxes[i].intersectsBox(this.camBox)) return true;
    }
    return false;
  },
  tick: function (time, delta) {
    var dt = Math.min(delta / 1000, 0.05), k = this.keys, p = this.el.object3D.position;
    this.refreshBoxes();

    this.yaw += ((k.KeyQ ? 1 : 0) - (k.KeyE ? 1 : 0)) * 1.8 * dt;

    var f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    var r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    var sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.dir.set(-sy * f + cy * r, 0, -cy * f - sy * r);
    var moving = this.dir.lengthSq() > 0;
    var running = moving && (k.ShiftLeft || k.ShiftRight);

    if (moving) {
      this.dir.normalize();
      var step = (running ? this.data.run : this.data.speed) * dt;
      var nx = p.x + this.dir.x * step, nz = p.z + this.dir.z * step;
      if (!this.blocked(nx, nz)) { p.x = nx; p.z = nz; }
      else if (!this.blocked(nx, p.z)) { p.x = nx; }
      else if (!this.blocked(p.x, nz)) { p.z = nz; }

      var target = Math.atan2(this.dir.x, this.dir.z) + this.data.offset * Math.PI / 180;
      var diff = Math.atan2(Math.sin(target - this.facing), Math.cos(target - this.facing));
      this.facing += diff * Math.min(1, dt * 10);
    }
    if (this.fox) this.fox.object3D.rotation.y = this.facing;

    var clip = moving ? (running ? 'Run' : 'Walk') : 'Survey';
    if (clip !== this.state && this.fox) {
      this.state = clip;
      this.fox.setAttribute('animation-mixer', 'clip', clip);
    }

    // Camera follows behind the fox. It moves closer if a wall is in the way.
    if (this.cam) {
      var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), dist = this.data.distance;
      var cx, cyy, cz;
      for (;;) {
        cx = p.x + sy * cp * dist; cyy = 1 + sp * dist; cz = p.z + cy * cp * dist;
        if (dist <= 1.2 || !this.camBlocked(cx, cyy, cz)) break;
        dist -= 0.4;
      }
      this.cam.object3D.position.set(cx, cyy, cz);
      this.cam.object3D.lookAt(p.x, 1, p.z);
    }
  }
});
}

AFRAME.registerComponent('guard-patrol', {
  schema: {
    from:      { type: 'vec3', default: { x: -20, y: 0, z: 80 } },
    to:        { type: 'vec3', default: { x: 20,  y: 0, z: 80 } },
    speed:     { default: 5 },     // units per second
    turnSpeed: { default: 10 },    // radians per second: higher = faster turn
    offset:    { default: 0 }      // degrees: use 180 if the fox walks backward
  },

  init: function () {
    console.log('guard-patrol is running');
    this.goingToB = true;
    this.yaw = 0;
    this.el.object3D.position.set(this.data.from.x, this.data.from.y, this.data.from.z);
  },

  tick: function (time, delta) {
    var d = this.data;
    var dt = Math.min(delta / 1000, 0.05);
    var obj = this.el.object3D;
    var p = obj.position;
    var goal = this.goingToB ? d.to : d.from;

    var dx = goal.x - p.x;
    var dz = goal.z - p.z;
    var dist = Math.hypot(dx, dz);

    // the "if": reached the end, so switch direction
    if (dist < 0.3) {
      this.goingToB = !this.goingToB;
      return;
    }

    // turn toward the goal
    var desired = Math.atan2(dx, dz) + d.offset * Math.PI / 180;
    var diff = Math.atan2(Math.sin(desired - this.yaw), Math.cos(desired - this.yaw));
    var maxTurn = d.turnSpeed * dt;
    this.yaw += Math.max(-maxTurn, Math.min(maxTurn, diff));
    obj.rotation.y = this.yaw;

    // walk only once she is facing the right way
    if (Math.abs(diff) < 0.3) {
      p.x += (dx / dist) * d.speed * dt;
      p.z += (dz / dist) * d.speed * dt;
    }
  }
});
