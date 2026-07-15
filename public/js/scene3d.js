import * as THREE from "three";

/** 3D scene: hearts, rose petals, confetti ribbons */
export class BirthdayScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.burstQueue = [];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.camera.position.set(0, 0, 18);

    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);

    this._buildLights();
    this._buildHearts();
    this._buildPetals();
    this._buildConfetti();
    this._buildSparkles();

    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);
    this._resize();

    this._boundMove = (e) => this._onPointerMove(e);
    window.addEventListener("pointermove", this._boundMove, { passive: true });
    window.addEventListener("pointerdown", (e) => this.burstAt(e.clientX, e.clientY, 40), { passive: true });
  }

  _buildLights() {
    const amb = new THREE.AmbientLight(0xffd6e8, 0.6);
    const key = new THREE.DirectionalLight(0xffe4b5, 1.2);
    key.position.set(5, 8, 10);
    const fill = new THREE.PointLight(0xc9184a, 0.8, 40);
    fill.position.set(-6, -2, 8);
    const rim = new THREE.PointLight(0xffd166, 0.5, 30);
    rim.position.set(0, 5, -5);
    this.scene.add(amb, key, fill, rim);
  }

  _heartShape() {
    const s = new THREE.Shape();
    const x = 0, y = 0;
    s.moveTo(x, y + 0.25);
    s.bezierCurveTo(x, y + 0.25, x - 0.25, y, x - 0.25, y - 0.1);
    s.bezierCurveTo(x - 0.25, y - 0.35, x, y - 0.45, x, y - 0.55);
    s.bezierCurveTo(x, y - 0.45, x + 0.25, y - 0.35, x + 0.25, y - 0.1);
    s.bezierCurveTo(x + 0.25, y, x, y + 0.25, x, y + 0.25);
    return s;
  }

  _buildHearts() {
    const geo = new THREE.ExtrudeGeometry(this._heartShape(), {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    geo.center();
    geo.scale(0.35, 0.35, 0.35);

    const colors = [0xc9184a, 0xff4d6d, 0xff8fab, 0xffd166, 0xffffff];
    const count = 48;
    this.hearts = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.35 }),
      count
    );
    this.heartData = [];

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const d = {
        x: (Math.random() - 0.5) * 28,
        y: (Math.random() - 0.5) * 18,
        z: (Math.random() - 0.5) * 12 - 2,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        sx: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.6,
        color: colors[i % colors.length],
      };
      this.heartData.push(d);
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.rx, d.ry, d.rz);
      dummy.scale.setScalar(d.sx);
      dummy.updateMatrix();
      this.hearts.setMatrixAt(i, dummy.matrix);
      this.hearts.setColorAt(i, new THREE.Color(d.color));
    }
    this.hearts.instanceMatrix.needsUpdate = true;
    this.hearts.instanceColor.needsUpdate = true;
    this.scene.add(this.hearts);
  }

  _buildPetals() {
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.quadraticCurveTo(0.3, 0.5, 0, 1);
    petalShape.quadraticCurveTo(-0.3, 0.5, 0, 0);
    const geo = new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.02,
      bevelEnabled: false,
    });
    geo.center();
    geo.scale(0.5, 0.5, 0.5);

    const count = 64;
    this.petals = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0xff8fab,
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.6,
        transparent: true,
        opacity: 0.85,
      }),
      count
    );
    this.petalData = [];
    const dummy = new THREE.Object3D();
    const hues = [0xff8fab, 0xffb3c6, 0xc9184a, 0xffd6e8];

    for (let i = 0; i < count; i++) {
      const d = {
        x: (Math.random() - 0.5) * 32,
        y: 8 + Math.random() * 10,
        z: (Math.random() - 0.5) * 14,
        fall: 0.15 + Math.random() * 0.35,
        sway: Math.random() * Math.PI * 2,
        swayAmp: 0.3 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2,
        scale: 0.5 + Math.random() * 1.2,
        color: hues[i % hues.length],
      };
      this.petalData.push(d);
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.z = d.rot;
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      this.petals.setMatrixAt(i, dummy.matrix);
      this.petals.setColorAt(i, new THREE.Color(d.color));
    }
    this.petals.instanceMatrix.needsUpdate = true;
    this.petals.instanceColor.needsUpdate = true;
    this.scene.add(this.petals);
  }

  _buildConfetti() {
    const geo = new THREE.PlaneGeometry(0.12, 0.35);
    const count = 200;
    this.confetti = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        metalness: 0.4,
        roughness: 0.3,
      }),
      count
    );
    this.confettiData = [];
    const dummy = new THREE.Object3D();
    const palette = [0xffd166, 0xc9184a, 0xff8fab, 0x4cc9f0, 0xffffff, 0xb5179e, 0x80ed99];

    for (let i = 0; i < count; i++) {
      const d = {
        x: (Math.random() - 0.5) * 30,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -0.05 - Math.random() * 0.08,
        vz: (Math.random() - 0.5) * 0.02,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        rsx: (Math.random() - 0.5) * 3,
        rsy: (Math.random() - 0.5) * 3,
        rsz: (Math.random() - 0.5) * 3,
        color: palette[i % palette.length],
        scale: 0.6 + Math.random() * 1.4,
      };
      this.confettiData.push(d);
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.rx, d.ry, d.rz);
      dummy.scale.set(d.scale, d.scale * 0.4, 1);
      dummy.updateMatrix();
      this.confetti.setMatrixAt(i, dummy.matrix);
      this.confetti.setColorAt(i, new THREE.Color(d.color));
    }
    this.confetti.instanceMatrix.needsUpdate = true;
    this.confetti.instanceColor.needsUpdate = true;
    this.scene.add(this.confetti);
  }

  _buildSparkles() {
    const geo = new THREE.BufferGeometry();
    const count = 120;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.sparkles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffd166,
        size: 0.08,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.scene.add(this.sparkles);
  }

  burstAt(clientX, clientY, amount = 30) {
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    const v = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    const dist = -this.camera.position.z / dir.z;
    const point = this.camera.position.clone().add(dir.multiplyScalar(dist));
    this.burstQueue.push({ x: point.x, y: point.y, amount, life: 1 });
  }

  megaBurst() {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.burstAt(
          window.innerWidth * (0.2 + Math.random() * 0.6),
          window.innerHeight * (0.2 + Math.random() * 0.6),
          60
        );
      }, i * 200);
    }
  }

  _onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.targetMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _updateHearts(t) {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.heartData.length; i++) {
      const d = this.heartData[i];
      dummy.position.set(
        d.x + Math.sin(t * d.speed + d.phase) * 0.4,
        d.y + Math.cos(t * d.speed * 0.7 + d.phase) * 0.3,
        d.z
      );
      dummy.rotation.set(
        d.rx + t * 0.2,
        d.ry + t * 0.15,
        d.rz + Math.sin(t + d.phase) * 0.2
      );
      dummy.scale.setScalar(d.sx * (1 + Math.sin(t * 2 + d.phase) * 0.05));
      dummy.updateMatrix();
      this.hearts.setMatrixAt(i, dummy.matrix);
    }
    this.hearts.instanceMatrix.needsUpdate = true;
  }

  _updatePetals(t, dt) {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.petalData.length; i++) {
      const d = this.petalData[i];
      d.y -= d.fall * dt * 3;
      d.sway += dt;
      if (d.y < -12) {
        d.y = 12 + Math.random() * 4;
        d.x = (Math.random() - 0.5) * 32;
      }
      dummy.position.set(
        d.x + Math.sin(d.sway) * d.swayAmp,
        d.y,
        d.z
      );
      d.rot += d.rotSpeed * dt;
      dummy.rotation.set(0.3, d.rot, 0.8);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      this.petals.setMatrixAt(i, dummy.matrix);
    }
    this.petals.instanceMatrix.needsUpdate = true;
  }

  _updateConfetti(dt) {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.confettiData.length; i++) {
      const d = this.confettiData[i];
      d.x += d.vx;
      d.y += d.vy;
      d.z += d.vz;
      d.rx += d.rsx * dt;
      d.ry += d.rsy * dt;
      d.rz += d.rsz * dt;

      if (d.y < -14) {
        d.y = 14;
        d.x = (Math.random() - 0.5) * 30;
      }

      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.rx, d.ry, d.rz);
      dummy.scale.set(d.scale, d.scale * 0.4, 1);
      dummy.updateMatrix();
      this.confetti.setMatrixAt(i, dummy.matrix);
    }
    this.confetti.instanceMatrix.needsUpdate = true;

    // Burst impulses
    for (const b of this.burstQueue) {
      for (let i = 0; i < this.confettiData.length && b.amount > 0; i++) {
        const d = this.confettiData[i];
        const dx = d.x - b.x;
        const dy = d.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
          d.vx += (dx / (dist + 0.1)) * 0.15;
          d.vy += (dy / (dist + 0.1)) * 0.15 + 0.1;
          b.amount--;
        }
      }
      b.life -= dt;
    }
    this.burstQueue = this.burstQueue.filter((b) => b.life > 0);
  }

  tick() {
    const t = this.clock.getElapsedTime();
    const dt = this.clock.getDelta();

    this.mouse.lerp(this.targetMouse, 0.05);
    this.camera.position.x = this.mouse.x * 1.5;
    this.camera.position.y = this.mouse.y * 1;
    this.camera.lookAt(0, 0, 0);

    this._updateHearts(t);
    this._updatePetals(t, dt);
    this._updateConfetti(dt);

    if (this.sparkles) {
      this.sparkles.rotation.y = t * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("pointermove", this._boundMove);
    this.renderer.dispose();
  }
}

export function createBokeh(container, count = 24) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "bokeh-dot";
    const size = 40 + Math.random() * 120;
    el.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      --dur:${6 + Math.random() * 10}s;
      --op:${0.15 + Math.random() * 0.35};
      --dx:${(Math.random() - 0.5) * 60}px;
      --dy:${(Math.random() - 0.5) * 60}px;
    `;
    container.appendChild(el);
  }
}
