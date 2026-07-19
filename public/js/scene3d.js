import * as THREE from "three";
import { createBouquet, preloadBouquetTextures } from "./peony.js";
import { createCake } from "./cake.js";

export class Experience3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = "idle"; // idle | bouquet | stars | cake
    this.clock = new THREE.Clock();
    this._takeReady = false;
    this.onTakeReady = null;
    this.onAllCandlesOut = null;
    this.cake = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a0a18, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    this.camera.position.set(0, 0.4, 22);

    this._buildLights();
    this.bouquet = null;
    this.stars = null;
    this.shooting = [];
    this.balloons = null;
    this.confetti = null;

    // Warm bouquet textures while user is still on intro/greeting
    preloadBouquetTextures().catch(() => {});

    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);
    this._resize();

    this._pointer = new THREE.Vector2(0, 0);
    this._drag = { active: false, x: 0, y: 0, lastX: 0, lastY: 0 };
    this._userRot = { x: 0, y: 0.2 };

    window.addEventListener(
      "pointermove",
      (e) => {
        this._pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        this._pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
        if (this._drag.active && (this.mode === "bouquet")) {
          const dx = e.clientX - this._drag.lastX;
          const dy = e.clientY - this._drag.lastY;
          this._drag.lastX = e.clientX;
          this._drag.lastY = e.clientY;
          this._userRot.y += dx * 0.008;
          this._userRot.x += dy * 0.006;
          // Clamp tilt so bouquet doesn't flip upside-down
          this._userRot.x = Math.max(-0.85, Math.min(0.55, this._userRot.x));
        }
      },
      { passive: true }
    );

    const onDown = (e) => {
      if (this.mode !== "bouquet") return;
      // Don't steal clicks from UI buttons
      if (e.target?.closest?.("button, a")) return;
      this._drag.active = true;
      this._drag.lastX = e.clientX;
      this._drag.lastY = e.clientY;
      try { this.canvas.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    };
    const onUp = () => { this._drag.active = false; };
    this.canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0xffe8f0, 0.45));

    const key = new THREE.DirectionalLight(0xfff5f8, 1.6);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xa8c4ff, 0.55);
    fill.position.set(-5, 2, 3);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0xff6b9d, 1.2, 30);
    rim.position.set(0, 2, -4);
    this.scene.add(rim);

    this._key = key;
    this._rim = rim;
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  /** Soft blush backdrop for bouquet */
  _setBouquetBackdrop() {
    this.renderer.setClearColor(0x2a1228, 1);
    this.scene.fog = new THREE.FogExp2(0x2a1228, 0.028);
    if (this._bgMesh) {
      this.scene.remove(this._bgMesh);
      this._bgMesh = null;
    }
    const bg = new THREE.Mesh(
      new THREE.SphereGeometry(80, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0x3d1a38,
        side: THREE.BackSide,
      })
    );
    this._bgMesh = bg;
    this.scene.add(bg);
  }

  async startBouquetApproach() {
    this.mode = "bouquet";
    this._takeReady = false;
    this._setBouquetBackdrop();

    if (this.bouquet) {
      this.scene.remove(this.bouquet);
      this.bouquet = null;
    }

    try {
      this.bouquet = await createBouquet();
    } catch (err) {
      console.error("bouquet photos failed", err);
      this.bouquet = new THREE.Group();
      this.bouquet.userData.wrap = this.bouquet;
    }
    this.bouquet.position.set(0, -0.15, 0);
    this.bouquet.rotation.y = 0.15;
    this._userRot = { x: 0.0, y: 0.12 };
    this.scene.add(this.bouquet);

    this._buildBalloons();
    this._buildConfetti();

    // Start nearby — short glide so bouquet is readable right away
    this.camera.position.set(0.15, 0.95, 9.5);
    this.camera.lookAt(0, 0.55, 0);
    this._camFrom = this.camera.position.clone();
    this._camTo = new THREE.Vector3(0.1, 0.85, 5.0);
    this._approachT = 0;
    this._approachDur = 2.0;
  }

  takeBouquet() {
    if (this.mode !== "bouquet" || !this.bouquet) return;
    this.mode = "bouquet-exit";
    this._exitT = 0;
    this._exitDur = 1.8;
    this._exitFrom = this.bouquet.position.clone();
    this._exitCamFrom = this.camera.position.clone();
  }

  startStars() {
    this.mode = "stars";
    this.renderer.setClearColor(0x030512, 1);
    this.scene.fog = null;

    if (this.bouquet) {
      this.scene.remove(this.bouquet);
      this.bouquet = null;
    }
    this._clearPartyFx();
    if (this._bgMesh) {
      this.scene.remove(this._bgMesh);
      this._bgMesh = null;
    }

    // Dim lights for night
    this._key.intensity = 0.15;
    this._rim.intensity = 0.05;

    this._buildStarfield();
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);
    this._shootTimer = 0.2; // first streak soon after wish scene opens
  }

  /** Transition from stars → birthday cake with 30 candles */
  startCake() {
    this.mode = "cake";

    // Clear starfield
    if (this.stars) { this.scene.remove(this.stars); this.stars = null; }
    if (this.milky) { this.scene.remove(this.milky); this.milky = null; }
    for (const s of this.shooting) {
      this.scene.remove(s.mesh);
      s.line?.geometry?.dispose();
      s.line?.material?.dispose();
      s.head?.geometry?.dispose();
      s.head?.material?.dispose();
    }
    this.shooting = [];

    this.renderer.setClearColor(0x1a1024, 1);
    this.scene.fog = new THREE.FogExp2(0x1a1024, 0.04);
    this._key.intensity = 1.1;
    this._rim.intensity = 0.6;
    this._rim.color.set(0xffaa66);

    if (this.cake) {
      this.scene.remove(this.cake);
      this.cake = null;
    }
    this.cake = createCake();
    this.cake.position.set(0, -0.2, 0);
    this.scene.add(this.cake);

    this.camera.position.set(0.4, 1.6, 4.2);
    this.camera.lookAt(0, 0.4, 0);
    this._cakeCamBase = this.camera.position.clone();
  }

  /**
   * Extinguish candles based on blow intensity 0..1
   * Stronger blow → more candles per call
   */
  blowCandles(intensity) {
    if (this.mode !== "cake" || !this.cake || intensity <= 0) return this.cake?.userData.litCount ?? 0;
    // Map intensity → candles: soft=1, strong≈6–8
    const n = Math.max(1, Math.round(intensity * 8));
    const left = this.cake.extinguish(n);
    if (left <= 0) this.onAllCandlesOut?.();
    return left;
  }

  get litCandles() {
    return this.cake?.userData.litCount ?? 0;
  }

  _buildStarfield() {
    if (this.stars) this.scene.remove(this.stars);

    const count = 2500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: AdditiveBlendingSafe(),
      })
    );
    this.scene.add(this.stars);

    // Milky band hint
    const milkyGeo = new THREE.BufferGeometry();
    const mCount = 800;
    const mPos = new Float32Array(mCount * 3);
    for (let i = 0; i < mCount; i++) {
      mPos[i * 3] = (Math.random() - 0.5) * 80;
      mPos[i * 3 + 1] = (Math.random() - 0.5) * 12 + Math.sin(i) * 3;
      mPos[i * 3 + 2] = -20 - Math.random() * 30;
    }
    milkyGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
    this.milky = new THREE.Points(
      milkyGeo,
      new THREE.PointsMaterial({
        color: 0xa8b8ff,
        size: 0.18,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: AdditiveBlendingSafe(),
      })
    );
    this.scene.add(this.milky);

    this.shooting = [];
  }

  _spawnShootingStar() {
    // Streak line + bright head (Points looked like a stuck dot)
    const start = new THREE.Vector3(
      4 + Math.random() * 8,
      3.5 + Math.random() * 4,
      -8 - Math.random() * 4
    );
    const vel = new THREE.Vector3(
      -10 - Math.random() * 6,
      -6 - Math.random() * 4,
      1.5 + Math.random() * 2
    );
    const trailLen = 2.8 + Math.random() * 1.2;
    const dir = vel.clone().normalize();

    const positions = new Float32Array(6);
    // head
    positions[0] = start.x;
    positions[1] = start.y;
    positions[2] = start.z;
    // tail
    positions[3] = start.x - dir.x * trailLen;
    positions[4] = start.y - dir.y * trailLen;
    positions[5] = start.z - dir.z * trailLen;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xfff4d6,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: AdditiveBlendingSafe(),
    });
    const line = new THREE.Line(geo, lineMat);
    line.frustumCulled = false;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xfff8e7,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: AdditiveBlendingSafe(),
      })
    );
    head.position.copy(start);
    head.frustumCulled = false;

    const group = new THREE.Group();
    group.add(line);
    group.add(head);
    group.frustumCulled = false;
    this.scene.add(group);

    this.shooting.push({
      mesh: group,
      line,
      head,
      pos: start.clone(),
      vel,
      trailLen,
      life: 1.6 + Math.random() * 0.7,
      age: 0,
    });
  }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this._tick();
    };
    loop();
  }

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    if (this.mode === "bouquet" || this.mode === "bouquet-exit") {
      this._tickBouquet(dt, t);
    } else if (this.mode === "stars") {
      this._tickStars(dt, t);
    } else if (this.mode === "cake") {
      this._tickCake(dt, t);
    }

    this.renderer.render(this.scene, this.camera);
  }

  _tickCake(dt, t) {
    if (!this.cake) return;
    this.cake.tick(t, dt);
    const c = this.cake.userData.cake;
    c.rotation.y = Math.sin(t * 0.25) * 0.08 + this._pointer.x * 0.12;
    c.rotation.x = 0.05 + this._pointer.y * 0.04;
    // Gentle camera drift
    if (this._cakeCamBase) {
      this.camera.position.x = this._cakeCamBase.x + Math.sin(t * 0.2) * 0.15;
      this.camera.position.y = this._cakeCamBase.y + Math.cos(t * 0.18) * 0.08;
      this.camera.lookAt(0, 0.4, 0);
    }
  }

  _tickBouquet(dt, t) {
    if (!this.bouquet) return;
    const wrap = this.bouquet.userData.wrap || this.bouquet;

    // User drag rotation + gentle breathe (no auto spin fighting the drag)
    const swayY = this._drag.active ? 0 : Math.sin(t * 0.35) * 0.03;
    const swayX = this._drag.active ? 0 : Math.sin(t * 0.28) * 0.015;
    wrap.rotation.y = this._userRot.y + swayY;
    wrap.rotation.x = this._userRot.x + swayX;
    wrap.position.y = Math.sin(t * 0.9) * 0.03;

    // Photo bouquet: crossfade front / 3-4 / top from tilt & yaw
    const cards = this.bouquet.userData.cards;
    if (cards) {
      const yaw = Math.abs(wrap.rotation.y);
      const pitch = wrap.rotation.x; // negative = tip toward camera somewhat; positive = look down
      let topW = Math.max(0, Math.min(1, (pitch - 0.25) / 0.55));
      let sideW = Math.max(0, Math.min(1, (yaw - 0.2) / 0.7)) * (1 - topW);
      let frontW = Math.max(0, 1 - sideW - topW);
      const sum = frontW + sideW + topW || 1;
      frontW /= sum; sideW /= sum; topW /= sum;
      cards.front.material.opacity = frontW;
      cards.threeQ.material.opacity = sideW;
      cards.top.material.opacity = topW;
      cards.front.visible = frontW > 0.02;
      cards.threeQ.visible = sideW > 0.02;
      cards.top.visible = topW > 0.02;
    } else {
      // Procedural fallback micro-motion
      wrap.traverse((obj) => {
        if (obj.userData?.bloom) {
          obj.userData.bloom.rotation.y = Math.sin(t * 0.5 + obj.userData.phase) * 0.03;
        }
      });
    }

    // Helium balloons float gently (strings are children — move with balloon)
    if (this.balloonGroup) {
      for (const b of this.balloonGroup.children) {
        const d = b.userData;
        b.position.x = d.baseX + Math.sin(t * 0.35 + d.phase) * 0.22;
        b.position.y = d.baseY + Math.sin(t * 0.45 + d.phase * 1.3) * 0.28;
        b.position.z = d.baseZ;
        b.rotation.z = Math.sin(t * 0.4 + d.phase) * 0.08;
        b.rotation.x = Math.sin(t * 0.3 + d.phase) * 0.05;
        // string tip sway
        if (d.stringTip) {
          d.stringTip.position.x = Math.sin(t * 0.9 + d.phase) * 0.08;
          d.stringTip.position.z = Math.cos(t * 0.7 + d.phase) * 0.06;
        }
      }
    }

    // Confetti slow drift
    if (this.confetti) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < this._confettiData.length; i++) {
        const d = this._confettiData[i];
        d.y += d.vy * dt;
        d.x += d.vx * dt;
        if (d.y < -4) { d.y = 7; d.x = (Math.random() - 0.5) * 10; }
        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.rx += d.rsx * dt, d.ry += d.rsy * dt, d.rz += d.rsz * dt);
        dummy.scale.set(d.s, d.s * 0.5, 1);
        dummy.updateMatrix();
        this.confetti.setMatrixAt(i, dummy.matrix);
      }
      this.confetti.instanceMatrix.needsUpdate = true;
    }

    if (this.mode === "bouquet") {
      this._approachT += dt;
      const k = Math.min(1, this._approachT / this._approachDur);
      const e = easeOutCubic(k);
      this.camera.position.lerpVectors(this._camFrom, this._camTo, e);
      this.camera.lookAt(0, 0.4, 0);

      if (k >= 1 && !this._takeReady) {
        this._takeReady = true;
        this.onTakeReady?.();
      }
    } else if (this.mode === "bouquet-exit") {
      this._exitT += dt;
      const k = Math.min(1, this._exitT / this._exitDur);
      const e = easeInCubic(k);
      // Bouquet falls / moves toward viewer hands then out of frame
      wrap.position.y = -e * 6;
      wrap.position.z = e * 4;
      wrap.rotation.x = e * 0.8;
      wrap.scale.setScalar(1 - e * 0.3);
      this.camera.position.z = this._exitCamFrom.z + e * 2;
      if (k >= 1) {
        this.mode = "idle";
        this.onBouquetGone?.();
      }
    }
  }

  _clearPartyFx() {
    if (this.balloonGroup) {
      this.scene.remove(this.balloonGroup);
      this.balloonGroup.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose?.();
        }
      });
      this.balloonGroup = null;
    }
    if (this.balloons) {
      this.scene.remove(this.balloons);
      this.balloons = null;
    }
    if (this._balloonStrings) {
      for (const s of this._balloonStrings) this.scene.remove(s);
      this._balloonStrings = null;
    }
    if (this.confetti) {
      this.scene.remove(this.confetti);
      this.confetti = null;
    }
  }

  /** Helium party balloons — metallic, float ABOVE bouquet, strings hang down (not clipped) */
  _buildBalloons() {
    this._clearPartyFx();
    this.balloonGroup = new THREE.Group();
    this.scene.add(this.balloonGroup);

    // Classic helium teardrop profile (round top, nip at bottom)
    const profile = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      // y from +0.55 (top) to -0.65 (nipple)
      const y = 0.55 - t * 1.2;
      let rr;
      if (t < 0.82) {
        // sphere-ish body
        const ny = (y - 0.05) / 0.55;
        rr = Math.sqrt(Math.max(0, 1 - ny * ny)) * 0.52;
      } else {
        // taper to tied nipple
        const u = (t - 0.82) / 0.18;
        rr = 0.12 * (1 - u) + 0.03 * u;
      }
      profile.push(new THREE.Vector2(Math.max(0.01, rr), y));
    }
    const balloonGeo = new THREE.LatheGeometry(profile, 40);
    balloonGeo.computeVertexNormals();

    // Metallic foil / chrome party balloons (like Sketchfab pick)
    const colors = [
      0xff4d8d, // hot pink
      0xffd700, // gold
      0x7ec8ff, // sky
      0xff6b9d, // rose
      0xc0c0c0, // silver
      0xb388ff, // lilac
      0xff8fab, // blush
      0x80deea, // aqua
    ];

    // Place HIGH around frame sides so full balloon + string stay in view
    const slots = [
      { x: -2.4, y: 2.8, z: -0.5, s: 1.05 },
      { x: 2.5, y: 3.0, z: -0.3, s: 1.1 },
      { x: -1.6, y: 3.6, z: -1.2, s: 0.95 },
      { x: 1.7, y: 3.8, z: -1.0, s: 1.0 },
      { x: -3.0, y: 2.2, z: 0.4, s: 0.9 },
      { x: 3.1, y: 2.4, z: 0.3, s: 0.92 },
      { x: -0.8, y: 4.0, z: -1.6, s: 0.85 },
      { x: 0.9, y: 4.2, z: -1.5, s: 0.88 },
    ];

    slots.forEach((slot, i) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({
        color: colors[i % colors.length],
        roughness: 0.12,
        metalness: 0.85,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        reflectivity: 0.9,
        iridescence: 0.25,
        iridescenceIOR: 1.3,
      });
      const body = new THREE.Mesh(balloonGeo, mat);
      body.castShadow = true;
      g.add(body);

      // Tied knot / nipple highlight
      const knot = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.3 })
      );
      knot.position.y = -0.68;
      g.add(knot);

      // Ribbon string hanging DOWN (child of balloon so it never clips separately)
      const stringLen = 1.6 + Math.random() * 0.5;
      const stringCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, -0.7, 0),
        new THREE.Vector3(0.05, -0.7 - stringLen * 0.35, 0.02),
        new THREE.Vector3(-0.08, -0.7 - stringLen * 0.7, -0.02),
        new THREE.Vector3(0.02, -0.7 - stringLen, 0)
      );
      const string = new THREE.Mesh(
        new THREE.TubeGeometry(stringCurve, 24, 0.012, 5, false),
        new THREE.MeshStandardMaterial({ color: 0xf5e6ff, roughness: 0.55, metalness: 0.1 })
      );
      g.add(string);

      // Tip marker for sway
      const tip = new THREE.Object3D();
      tip.position.set(0, -0.7 - stringLen, 0);
      g.add(tip);

      g.position.set(slot.x, slot.y, slot.z);
      g.scale.setScalar(slot.s);
      g.userData = {
        baseX: slot.x,
        baseY: slot.y,
        baseZ: slot.z,
        phase: Math.random() * Math.PI * 2,
        stringTip: tip,
      };
      this.balloonGroup.add(g);
    });
  }

  _buildConfetti() {
    const geo = new THREE.PlaneGeometry(0.2, 0.4);
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.3, roughness: 0.4 });
    const count = 160;
    this.confetti = new THREE.InstancedMesh(geo, mat, count);
    this._confettiData = [];
    const colors = [0xffd166, 0xc9184a, 0xff8fab, 0x4cc9f0, 0xffffff, 0x80ed99];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const d = {
        x: (Math.random() - 0.5) * 12,
        y: (Math.random() - 0.5) * 10,
        z: -1 - Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.2 - Math.random() * 0.2,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        rsx: (Math.random() - 0.5) * 2,
        rsy: (Math.random() - 0.5) * 2,
        rsz: (Math.random() - 0.5) * 2,
        s: 0.6 + Math.random() * 1.2,
      };
      this._confettiData.push(d);
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.rx, d.ry, d.rz);
      dummy.scale.set(d.s, d.s * 0.5, 1);
      dummy.updateMatrix();
      this.confetti.setMatrixAt(i, dummy.matrix);
      this.confetti.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    this.confetti.instanceColor.needsUpdate = true;
    this.scene.add(this.confetti);
  }

  _tickStars(dt, t) {
    if (this.stars) {
      this.stars.rotation.y = t * 0.012;
      this.stars.rotation.x = Math.sin(t * 0.05) * 0.02;
    }
    if (this.milky) {
      this.milky.rotation.z = t * 0.008;
    }

    // Gentle cam drift
    this.camera.position.x = Math.sin(t * 0.1) * 0.4 + this._pointer.x * 0.3;
    this.camera.position.y = Math.cos(t * 0.12) * 0.25 + this._pointer.y * 0.2;
    this.camera.lookAt(0, 0, -10);

    this._shootTimer -= dt;
    if (this._shootTimer <= 0) {
      this._spawnShootingStar();
      this._shootTimer = 0.9 + Math.random() * 1.4;
    }

    for (let i = this.shooting.length - 1; i >= 0; i--) {
      const s = this.shooting[i];
      s.age += dt;
      s.pos.addScaledVector(s.vel, dt);

      const dir = s.vel.clone().normalize();
      const arr = s.line.geometry.attributes.position.array;
      arr[0] = s.pos.x;
      arr[1] = s.pos.y;
      arr[2] = s.pos.z;
      arr[3] = s.pos.x - dir.x * s.trailLen;
      arr[4] = s.pos.y - dir.y * s.trailLen;
      arr[5] = s.pos.z - dir.z * s.trailLen;
      s.line.geometry.attributes.position.needsUpdate = true;
      s.line.geometry.computeBoundingSphere();
      s.head.position.copy(s.pos);

      const fade = Math.max(0, 1 - s.age / s.life);
      s.line.material.opacity = 0.25 + fade * 0.75;
      s.head.material.opacity = fade;
      s.head.scale.setScalar(0.7 + fade * 0.6);

      if (s.age >= s.life) {
        this.scene.remove(s.mesh);
        s.line.geometry.dispose();
        s.line.material.dispose();
        s.head.geometry.dispose();
        s.head.material.dispose();
        this.shooting.splice(i, 1);
      }
    }
  }
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}
function easeInCubic(x) {
  return x * x * x;
}
function AdditiveBlendingSafe() {
  return THREE.AdditiveBlending;
}
