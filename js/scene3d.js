import * as THREE from "three";
import { createBouquet } from "./peony.js";

export class Experience3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = "idle"; // idle | bouquet | stars
    this.clock = new THREE.Clock();
    this._takeReady = false;
    this.onTakeReady = null;

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

    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);
    this._resize();

    this._pointer = new THREE.Vector2(0, 0);
    window.addEventListener(
      "pointermove",
      (e) => {
        this._pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        this._pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      },
      { passive: true }
    );
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

  startBouquetApproach() {
    this.mode = "bouquet";
    this._takeReady = false;
    this._setBouquetBackdrop();

    if (this.bouquet) {
      this.scene.remove(this.bouquet);
    }
    this.bouquet = createBouquet();
    this.bouquet.position.set(0, -0.2, 0);
    this.bouquet.rotation.y = 0.25;
    this.scene.add(this.bouquet);

    // Start far
    this.camera.position.set(0.2, 0.6, 28);
    this.camera.lookAt(0, 0.2, 0);
    this._camFrom = this.camera.position.clone();
    this._camTo = new THREE.Vector3(0.15, 0.35, 4.2);
    this._approachT = 0;
    this._approachDur = 7.5; // seconds
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
    this._shootTimer = 0;
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
    const geo = new THREE.BufferGeometry();
    const trail = 14;
    const pos = new Float32Array(trail * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xfff8e7,
      size: 0.25,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: AdditiveBlendingSafe(),
    });
    const mesh = new THREE.Points(geo, mat);

    const start = new THREE.Vector3(
      (Math.random() - 0.5) * 16 + 6,
      6 + Math.random() * 5,
      -5 - Math.random() * 8
    );
    const vel = new THREE.Vector3(
      -8 - Math.random() * 6,
      -5 - Math.random() * 4,
      2 + Math.random() * 2
    );

    this.scene.add(mesh);
    this.shooting.push({
      mesh,
      pos: start.clone(),
      vel,
      life: 1.4 + Math.random() * 0.8,
      age: 0,
      trail,
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
    }

    this.renderer.render(this.scene, this.camera);
  }

  _tickBouquet(dt, t) {
    if (!this.bouquet) return;
    const wrap = this.bouquet.userData.wrap;

    // Subtle sway + breathe
    wrap.rotation.y = Math.sin(t * 0.35) * 0.12 + this._pointer.x * 0.15;
    wrap.rotation.x = Math.sin(t * 0.28) * 0.04 + this._pointer.y * 0.05;
    wrap.position.y = Math.sin(t * 0.9) * 0.04;

    // Petal micro-motion
    wrap.traverse((obj) => {
      if (obj.userData?.bloom) {
        obj.userData.bloom.rotation.y = Math.sin(t * 0.5 + obj.userData.phase) * 0.03;
      }
    });

    if (this.mode === "bouquet") {
      this._approachT += dt;
      const k = Math.min(1, this._approachT / this._approachDur);
      const e = easeOutCubic(k);
      this.camera.position.lerpVectors(this._camFrom, this._camTo, e);
      this.camera.lookAt(0, 0.15, 0);

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
      this._shootTimer = 1.6 + Math.random() * 2.2;
    }

    for (let i = this.shooting.length - 1; i >= 0; i--) {
      const s = this.shooting[i];
      s.age += dt;
      s.pos.addScaledVector(s.vel, dt);
      const arr = s.mesh.geometry.attributes.position.array;
      for (let p = s.trail - 1; p > 0; p--) {
        arr[p * 3] = arr[(p - 1) * 3];
        arr[p * 3 + 1] = arr[(p - 1) * 3 + 1];
        arr[p * 3 + 2] = arr[(p - 1) * 3 + 2];
      }
      arr[0] = s.pos.x;
      arr[1] = s.pos.y;
      arr[2] = s.pos.z;
      s.mesh.geometry.attributes.position.needsUpdate = true;
      s.mesh.material.opacity = Math.max(0, 1 - s.age / s.life);

      if (s.age >= s.life) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
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
