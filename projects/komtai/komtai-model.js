/* Komtai: procedural 3D model of the oven toaster (three.js r128 global build).
   Parts: door + controls, tray, wire rack, oven body, fan unit (convection fan, blower, cable).
   x = right, y = up, z = towards the viewer (front of the oven). */
(function (global) {
  'use strict';
  var THREE = global.THREE;
  if (!THREE) return;

  var PI = Math.PI;
  var BLUE = 0x305a88;

  /* ---------- helpers ---------- */
  function rrPath(target, w, h, r, cx, cy) {
    var x = cx - w / 2, y = cy - h / 2;
    target.moveTo(x + r, y);
    target.lineTo(x + w - r, y);
    target.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
    target.lineTo(x + w, y + h - r);
    target.absarc(x + w - r, y + h - r, r, 0, PI / 2, false);
    target.lineTo(x + r, y + h);
    target.absarc(x + r, y + h - r, r, PI / 2, PI, false);
    target.lineTo(x, y + r);
    target.absarc(x + r, y + r, r, PI, PI * 1.5, false);
    return target;
  }

  /* rounded slab with optional rounded holes, centred on z */
  function slab(w, h, r, depth, holes, bevel) {
    var b = bevel == null ? 0.04 : bevel;
    var shape = rrPath(new THREE.Shape(), w - 2 * b, h - 2 * b, Math.max(r - b, 0.02), 0, 0);
    (holes || []).forEach(function (o) {
      shape.holes.push(rrPath(new THREE.Path(), o.w + 2 * b, o.h + 2 * b, o.r + b, o.cx || 0, o.cy || 0));
    });
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 28
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }

  function rod(a, b, radius, mat) {
    var va = new THREE.Vector3(a[0], a[1], a[2]);
    var vb = new THREE.Vector3(b[0], b[1], b[2]);
    var dir = vb.clone().sub(va);
    var len = dir.length();
    var m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  }

  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    return t;
  }

  function ease(x) { return x * x * (3 - 2 * x); }

  /* ---------- environment for soft reflections ---------- */
  function makeEnv(renderer) {
    var s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(60, 60, 60), new THREE.MeshBasicMaterial({ color: 0x56606d, side: THREE.BackSide })));
    function panel(w, h, x, y, z, rx, ry, k) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m);
    }
    panel(30, 30, 0, 28, 0, PI / 2, 0, 2.2);
    panel(8, 30, -26, 6, 6, 0, PI / 2, 1.4);
    panel(8, 30, 26, 6, 10, 0, PI / 2, 1.1);
    panel(30, 8, 0, 4, 28, 0, 0, 0.9);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0xdfe3e8 }));
    floor.rotation.x = -PI / 2; floor.position.y = -20; s.add(floor);
    var pm = new THREE.PMREMGenerator(renderer);
    var tex = pm.fromScene(s, 0.02).texture;
    pm.dispose();
    return tex;
  }

  /* ---------- the model ---------- */
  function buildOven() {
    var root = new THREE.Group();

    var mBlue = new THREE.MeshPhysicalMaterial({ color: BLUE, metalness: 0.2, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 0.8 });
    var mSteel = new THREE.MeshStandardMaterial({ color: 0xcfd4da, metalness: 0.9, roughness: 0.32 });
    var mChrome = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, metalness: 1, roughness: 0.14 });
    var mDark = new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.5, roughness: 0.45 });
    var mGrey = new THREE.MeshStandardMaterial({ color: 0x9da2a8, metalness: 0.2, roughness: 0.5 });
    var mGlass = new THREE.MeshPhysicalMaterial({ color: 0x0c0e12, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.74, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
    var mBack = new THREE.MeshStandardMaterial({ color: 0xaab0b8, metalness: 0.85, roughness: 0.4 });
    var mCable = new THREE.MeshStandardMaterial({ color: 0xe3e5e8, metalness: 0.05, roughness: 0.55 });

    /* --- oven body --- */
    var gBody = new THREE.Group();
    var mShell = mBlue.clone();
    var shell = new THREE.Mesh(slab(4.0, 2.5, 0.5, 2.4, [{ w: 3.7, h: 2.2, r: 0.38 }]), mShell);
    gBody.add(shell);
    var liner = new THREE.Mesh(slab(3.64, 2.14, 0.34, 2.3, [{ w: 3.44, h: 1.94, r: 0.28 }], 0.02), mSteel);
    gBody.add(liner);
    // slit along the top, where the warm air leaves
    gBody.add(box(3.1, 0.012, 0.06, mDark, 0, 1.292, 0.78));
    // air valves on the underside
    [-0.95, 0.95].forEach(function (x) {
      for (var i = 0; i < 6; i++) gBody.add(box(1.0, 0.012, 0.07, mDark, x, -1.292, -0.75 + i * 0.3));
    });
    // feet
    [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]].forEach(function (p) {
      gBody.add(box(0.6, 0.1, 0.36, mGrey, p[0], -1.34, p[1]));
    });
    root.add(gBody);

    /* --- door + controls (hinged at its bottom edge) --- */
    var gDoor = new THREE.Group();            // pivot
    gDoor.position.set(0, -1.25, 1.2);
    var door = new THREE.Group();
    door.position.set(0, 1.25, 0.1);
    gDoor.add(door);
    door.add(new THREE.Mesh(slab(4.0, 2.5, 0.5, 0.16, [{ w: 2.6, h: 1.75, r: 0.14, cx: -0.5, cy: -0.17 }]), mBlue));
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.85), mGlass);
    glass.position.set(-0.5, -0.17, 0.0);
    door.add(glass);
    // handle
    var bar = rod([-1.75, 0.92, 0.34], [0.75, 0.92, 0.34], 0.065, mChrome);
    door.add(bar);
    door.add(rod([-1.6, 0.92, 0.1], [-1.6, 0.92, 0.34], 0.05, mChrome));
    door.add(rod([0.6, 0.92, 0.1], [0.6, 0.92, 0.34], 0.05, mChrome));
    // touch display
    var dispTex = canvasTex(256, 320, function (c, w, h) {
      c.fillStyle = '#a4a8ad'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.textAlign = 'center';
      c.font = '600 84px Poppins, Quicksand, sans-serif'; c.fillText('22:10', w / 2, 158);
      c.font = '500 26px Poppins, Quicksand, sans-serif'; c.fillText('wed 23 September', w / 2, 204);
    });
    var disp = new THREE.Mesh(slab(0.64, 0.8, 0.1, 0.03, [], 0.01), mGrey);
    disp.position.set(1.4, 0.52, 0.1);
    door.add(disp);
    var dispFace = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.76), new THREE.MeshBasicMaterial({ map: dispTex }));
    dispFace.position.set(1.4, 0.52, 0.128);
    door.add(dispFace);
    // two dials
    function dial(y, label) {
      var g = new THREE.Group();
      var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.1, 40), mChrome);
      rim.rotation.x = PI / 2; g.add(rim);
      var tex = canvasTex(128, 128, function (c, w, h) {
        c.fillStyle = '#e9ebee'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#3a3f46'; c.textAlign = 'center';
        c.font = '600 30px Poppins, Quicksand, sans-serif'; c.fillText(label, w / 2, h / 2 + 10);
      });
      var face = new THREE.Mesh(new THREE.CircleGeometry(0.19, 40), new THREE.MeshBasicMaterial({ map: tex }));
      face.position.z = 0.052; g.add(face);
      g.position.set(1.4, y, 0.14);
      return g;
    }
    door.add(dial(-0.13, 'Temp.'));
    door.add(dial(-0.78, 'Time'));

    root.add(gDoor);

    /* --- wire rack --- */
    var gRack = new THREE.Group();
    var levels = [-0.62, -0.18, 0.26, 0.7];
    [-1.66, 1.66].forEach(function (x) {
      levels.forEach(function (y) { gRack.add(rod([x, y, -0.95], [x, y, 0.95], 0.02, mChrome)); });
      [-0.95, 0, 0.95].forEach(function (z) { gRack.add(rod([x, levels[0], z], [x, levels[3], z], 0.02, mChrome)); });
    });
    [-0.95, 0.95].forEach(function (z) {
      gRack.add(rod([-1.66, levels[3], z], [1.66, levels[3], z], 0.02, mChrome));
      gRack.add(rod([-1.66, levels[0], z], [1.66, levels[0], z], 0.02, mChrome));
    });
    root.add(gRack);

    /* --- tray --- */
    var gTray = new THREE.Group();
    gTray.position.y = -0.18 + 0.045;
    gTray.add(box(3.2, 0.04, 2.0, mDark, 0, 0, 0));
    gTray.add(box(3.2, 0.1, 0.04, mDark, 0, 0.05, 0.98));
    gTray.add(box(3.2, 0.1, 0.04, mDark, 0, 0.05, -0.98));
    gTray.add(box(0.04, 0.1, 2.0, mDark, 1.58, 0.05, 0));
    gTray.add(box(0.04, 0.1, 2.0, mDark, -1.58, 0.05, 0));
    root.add(gTray);

    /* --- fan unit: back panel + convection fan + blower + cable --- */
    var gFan = new THREE.Group();
    var panel = new THREE.Mesh(slab(3.44, 1.94, 0.28, 0.08, [], 0.01), mBack);
    panel.position.z = -1.16;
    gFan.add(panel);
    var wheel = new THREE.Group();
    wheel.position.set(0, 0, -1.1);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.02, 10, 64), mSteel);
    wheel.add(ring);
    var N = 16;
    for (var i = 0; i < N; i++) {
      var a0 = i * 2 * PI / N, pts = [];
      for (var k = 0; k <= 8; k++) {
        var r = 0.1 + k * 0.065, th = a0 + (r - 0.1) * 2.1;
        pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
      }
      var blade = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.016, 6, false), mChrome);
      wheel.add(blade);
    }
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 24), mChrome);
    hub.rotation.x = PI / 2; wheel.add(hub);
    gFan.add(wheel);
    // blower drum behind the panel
    var drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 48), mSteel);
    drum.rotation.x = PI / 2; drum.position.set(0.9, 0.1, -1.45);
    gFan.add(drum);
    [0.55, 0.42, 0.29].forEach(function (rr) {
      var t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.014, 8, 48), mDark);
      t.position.set(0.9, 0.1, -1.7); gFan.add(t);
    });
    var drumCap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20), mDark);
    drumCap.rotation.x = PI / 2; drumCap.position.set(0.9, 0.1, -1.72);
    gFan.add(drumCap);
    // power cable
    var cpts = [[1.5, 0.1, -1.5], [2.05, 0.2, -1.75], [2.55, -0.2, -1.75], [2.65, -0.85, -1.4],
      [2.5, -1.3, -0.95], [2.15, -1.32, -0.65], [2.5, -1.32, -0.35], [2.3, -1.32, -0.05]]
      .map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); });
    var cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cpts), 90, 0.035, 8, false), mCable);
    gFan.add(cable);
    var plug = box(0.22, 0.16, 0.34, mCable, 2.3, -1.32, 0.12);
    gFan.add(plug);
    gFan.add(rod([2.24, -1.32, 0.29], [2.24, -1.32, 0.46], 0.016, mChrome));
    gFan.add(rod([2.36, -1.32, 0.29], [2.36, -1.32, 0.46], 0.016, mChrome));
    root.add(gFan);

    /* --- air flow markers --- */
    var gAir = new THREE.Group();
    var airMat = function (c) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95 }); };
    var warm = 0xff8a3c, warm2 = 0xffc23d, cool = 0x59b8f5;
    var streams = [];
    function stream(kind, curve, n, color, speed, size) {
      var meshes = [];
      for (var q = 0; q < n; q++) {
        var m = new THREE.Mesh(new THREE.ConeGeometry(size, size * 2.9, 14), airMat(color));
        gAir.add(m); meshes.push(m);
      }
      streams.push({ kind: kind, curve: curve, meshes: meshes, speed: speed });
    }
    function ellipse(rx, ry, z, cy) {
      var p = [];
      for (var j = 0; j < 72; j++) {
        var t = -j / 72 * 2 * PI + PI / 2; // clockwise
        p.push(new THREE.Vector3(Math.cos(t) * rx, cy + Math.sin(t) * ry, z));
      }
      return new THREE.CatmullRomCurve3(p, true);
    }
    function trail(curve, color) {
      var t = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.03, 6, curve.closed), airMat(color));
      t.material.opacity = 0.45; t.userData.trail = true; gAir.add(t);
    }
    var cA = ellipse(1.5, 0.82, -0.9, -0.05), cB = ellipse(0.98, 0.5, -0.9, -0.05);
    trail(cA, warm); trail(cB, warm2);
    stream('conv', cA, 6, warm, 0.09, 0.11);
    stream('conv', cB, 4, warm2, 0.12, 0.095);
    [-1.1, 0, 1.1].forEach(function (x) {
      stream('cool', new THREE.LineCurve3(new THREE.Vector3(x, 1.4, 0.78), new THREE.Vector3(x, 2.3, 0.78)), 3, warm, 0.16, 0.085);
    });
    [-1.5, -0.5, 0.5, 1.5].forEach(function (x) {
      stream('cool', new THREE.LineCurve3(new THREE.Vector3(x, -1.0, 3.1), new THREE.Vector3(x, -1.0, 1.35)), 3, cool, 0.16, 0.09);
    });
    root.add(gAir);

    var seen = [];
    root.traverse(function (o) { if (o.isMesh && o.material.color && seen.indexOf(o.material) < 0 && !o.material.map) { seen.push(o.material); o.material.color.convertSRGBToLinear(); } });
    root.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = o !== glass; } });
    glass.castShadow = false;
    gAir.traverse(function (c) { c.castShadow = false; c.receiveShadow = false; });

    // label anchors (local to each part)
    function anchor(parent, x, y, z) { var a = new THREE.Object3D(); a.position.set(x, y, z); parent.add(a); return a; }
    var anchors = {
      door: anchor(door, 0.2, 1.3, 0.2),
      tray: anchor(gTray, 0, 0.1, 1.05),
      rack: anchor(gRack, -1.66, 0.7, 0.95),
      body: anchor(gBody, 0, 1.3, 0.1),
      fan: anchor(gFan, 0.9, 0.75, -1.45)
    };

    return { root: root, gBody: gBody, gDoor: gDoor, gRack: gRack, gTray: gTray, gFan: gFan, gAir: gAir,
      shell: shell, mBlue: mBlue, wheel: wheel, streams: streams, anchors: anchors };
  }

  /* ---------- viewer ---------- */
  var VIEWS = {
    front:   { az: 0,     el: 0.06 },
    angle:   { az: 0.62, el: 0.3 },
    side:    { az: 1.5708, el: 0.06 },
    top:     { az: 0.4,  el: 1.15 },
    back:    { az: 2.45,  el: 0.3 }
  };
  var MODES = {
    assembled: { explode: 0, door: 0, flow: 0, shell: 1 },
    exploded:  { explode: 1, door: 0, flow: 0, shell: 1 },
    open:      { explode: 0, door: 1, flow: 0, shell: 1 },
    convection:{ explode: 0, door: 1, flow: 1, shell: 1 },
    cooling:   { explode: 0, door: 0, flow: 2, shell: 0.32 }
  };

  function create(canvas, opts) {
    opts = opts || {};
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var scene = new THREE.Scene();
    scene.environment = makeEnv(renderer);
    var camera = new THREE.PerspectiveCamera(26, 1, 0.5, 200);

    var key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-6, 11, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
    key.shadow.camera.near = 1; key.shadow.camera.far = 40;
    key.shadow.bias = -0.0004; key.shadow.radius = 5;
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c2cf, 0.3));

    var floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.13 }));
    var fadeU = { value: new THREE.Vector4(3.4, 3.0, 0.4, 0.3) };   // radii x/z, centre x/z
    floor.material.onBeforeCompile = function (sh) {
      sh.uniforms.uFade = fadeU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform vec4 uFade;')
        .replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
          'float fall = 1.0 - smoothstep(0.35, 1.0, length(vec2((vWP.x - uFade.z) / uFade.x, (vWP.z - uFade.w) / uFade.y)));\n  gl_FragColor = vec4( color, opacity * fall * ( 1.0 - getShadowMask() ) );');
    };
    floor.material.depthWrite = false; floor.rotation.x = -PI / 2; floor.position.y = -1.4; floor.receiveShadow = true;
    scene.add(floor);

    var o = buildOven();
    scene.add(o.root);

    // labels
    var labelEls = {};
    if (opts.labels) {
      var names = { door: 'Door + controls', tray: 'Tray', rack: 'Wire rack', body: 'Oven body', fan: 'Fan unit' };
      Object.keys(names).forEach(function (k) {
        var el = document.createElement('span');
        el.className = 'kv-label'; el.textContent = names[k];
        opts.labels.appendChild(el); labelEls[k] = el;
      });
    }

    var cur = { explode: 0, door: 0, flow: 0, shell: 1, flowAmt: 0, az: VIEWS.angle.az, el: VIEWS.angle.el, dist: 17.5 };
    var tar = { explode: 0, door: 0, flow: 0, shell: 1, az: VIEWS.angle.az, el: VIEWS.angle.el };
    var flowMode = 0;
    var running = false, last = 0, time = 0, w = 1, h = 1;
    var tmpV = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tan = new THREE.Vector3();

    function fitDist(aspect) {
      var base = 10.6 + cur.explode * 5.2 + cur.door * 3.4;
      var need = 4.6 / Math.min(aspect, 1.6);       // narrow canvases need more room
      return base * Math.max(1, need / 2.9);
    }

    function apply() {
      var e = ease(cur.explode);
      fadeU.value.set(3.4 + e * 2.6, 3.0 + e * 5.0, 0.4, 0.3 + e * 0.5);
      o.gDoor.position.z = 1.2 + e * 3.5;
      o.gDoor.rotation.x = ease(cur.door) * 1.55;
      o.gTray.position.z = e * 2.3 + ease(cur.door) * 1.15;
      o.gRack.position.z = e * 1.2;
      o.gFan.position.z = -e * 2.3;
      o.shell.material.transparent = cur.shell < 0.995;
      o.shell.material.opacity = cur.shell;
      o.shell.material.depthWrite = cur.shell > 0.7;

      // air flow markers
      var fa = cur.flowAmt;
      o.gAir.visible = fa > 0.01;
      if (o.gAir.visible) {
        o.streams.forEach(function (s) {
          var on = (s.kind === 'conv' ? (flowMode === 1 ? 1 : 0) : (flowMode === 2 ? 1 : 0)) * fa;
          s.meshes.forEach(function (m, i) {
            var t = (time * s.speed + i / s.meshes.length) % 1;
            if (s.kind === 'conv') {
              s.curve.getPointAt(t, tmpV); m.position.copy(tmpV);
              s.curve.getTangentAt(t, tan);
              m.quaternion.setFromUnitVectors(up, tan.normalize());
              m.scale.setScalar(on);
            } else {
              s.curve.getPointAt(t, tmpV); m.position.copy(tmpV);
              s.curve.getTangentAt(t, tan);
              m.quaternion.setFromUnitVectors(up, tan.normalize());
              m.scale.setScalar(Math.sin(t * PI) * on);
            }
            m.visible = on > 0.01;
          });
        });
        o.gAir.children.forEach(function (c) {
          if (c.userData.trail) c.visible = flowMode === 1 && fa > 0.01;
        });
      }

      // camera
      cur.dist = fitDist(w / h) * (cur.zoom || 1);
      var tz = e * 0.55 + 0.1 + cur.door * 0.5, ty = cur.door * -0.3;
      camera.position.set(
        Math.cos(cur.el) * Math.sin(cur.az) * cur.dist,
        ty + Math.sin(cur.el) * cur.dist,
        tz + Math.cos(cur.el) * Math.cos(cur.az) * cur.dist);
      camera.lookAt(0, ty, tz);
    }

    function updateLabels() {
      var vis = w > 480 ? ease(Math.max(0, (cur.explode - 0.55) / 0.45)) : 0;
      Object.keys(labelEls).forEach(function (k) {
        var a = o.anchors[k];
        a.getWorldPosition(tmpV);
        tmpV.project(camera);
        var el = labelEls[k];
        el.style.opacity = vis;
        el.style.transform = 'translate(-50%,-100%) translate(' + ((tmpV.x * 0.5 + 0.5) * w) + 'px,' + ((-tmpV.y * 0.5 + 0.5) * h) + 'px)';
      });
    }

    function step(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now; time += dt;
      var k = 1 - Math.exp(-dt * 4.5);
      ['explode', 'door', 'shell', 'az', 'el'].forEach(function (p) { cur[p] += (tar[p] - cur[p]) * k; });
      var wantFlow = tar.flow > 0 ? 1 : 0;
      cur.flowAmt += (wantFlow - cur.flowAmt) * (1 - Math.exp(-dt * 5));
      if (tar.flow > 0) flowMode = tar.flow;
      else if (cur.flowAmt < 0.02) flowMode = 0;
      if (flowMode === 1 || cur.flowAmt > 0.02) o.wheel.rotation.z -= dt * (flowMode === 1 ? 6 : 1.2) * (flowMode ? 1 : cur.flowAmt);
      apply();
      renderer.render(scene, camera);
      updateLabels();
      requestAnimationFrame(step);
    }

    function resize(width, height, ratio) {
      w = width || canvas.clientWidth || 600;
      h = height || canvas.clientHeight || 400;
      renderer.setPixelRatio(ratio || Math.min(global.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, !!width);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    var api = {
      views: VIEWS, modes: MODES,
      start: function () { if (running) return; running = true; last = performance.now(); requestAnimationFrame(step); },
      stop: function () { running = false; },
      resize: resize,
      view: function (name) { var v = VIEWS[name]; if (v) { tar.az = v.az; tar.el = v.el; } },
      mode: function (name, camName) {
        var m = MODES[name]; if (!m) return;
        tar.explode = m.explode; tar.door = m.door; tar.flow = m.flow; tar.shell = m.shell;
        if (name === 'convection') { tar.az = 0.22; tar.el = 0.18; }
        else if (name === 'cooling') { tar.az = 0.55; tar.el = 0.55; }
        else if (name === 'open') { tar.az = 0.5; tar.el = 0.28; }
        else if (name === 'exploded') { tar.az = 0.8; tar.el = 0.22; }
        else { tar.az = VIEWS.angle.az; tar.el = VIEWS.angle.el; }
        if (camName) api.view(camName);
      },
      setExplode: function (v) { tar.explode = v; },
      drive: function (e, az, el) { tar.explode = e; tar.az = az; tar.el = el; tar.door = 0; tar.flow = 0; tar.shell = 1; },
      rotateBy: function (dx, dy) {
        tar.az += dx; tar.el = Math.max(-0.05, Math.min(1.35, tar.el + dy));
      },
      /* jump straight to a pose (used for still renders) */
      pose: function (st) {
        var m = st.mode ? MODES[st.mode] : {};
        ['explode', 'door', 'flow', 'shell'].forEach(function (p) {
          var v = st[p] != null ? st[p] : (m[p] != null ? m[p] : (p === 'shell' ? 1 : 0));
          tar[p] = v; if (p !== 'flow') cur[p] = v;
        });
        flowMode = tar.flow; cur.flowAmt = tar.flow > 0 ? 1 : 0;
        if (st.az != null) { tar.az = cur.az = st.az; }
        if (st.el != null) { tar.el = cur.el = st.el; }
        cur.zoom = st.zoom || 1;
        time = st.time || 0.2;
        if (st.wheel != null) o.wheel.rotation.z = st.wheel;
        apply();
        renderer.render(scene, camera);
        updateLabels();
      },
      toDataURL: function (type) { return canvas.toDataURL(type || 'image/png'); },
      get state() { return { explode: tar.explode, door: tar.door, flow: tar.flow }; }
    };
    resize();
    apply();
    renderer.render(scene, camera);
    return api;
  }

  global.KomtaiModel = { create: create };
})(window);
