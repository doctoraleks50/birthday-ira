import * as THREE from "three";

/**
 * Birthday cake with 30 lit candles.
 * extinguish(n) puts out n candles with soft smoke.
 */

function makeFrostingIcing(radius, y, color) {
  const geo = new THREE.TorusGeometry(radius * 0.92, 0.07, 10, 48);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI / 2;
  m.position.y = y;
  return m;
}

export function createCake() {
  const root = new THREE.Group();
  const cake = new THREE.Group();
  root.add(cake);

  // Plate
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.4, metalness: 0.1 })
  );
  plate.position.y = -0.55;
  cake.add(plate);

  // Bottom tier
  const tier1 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.3, 0.55, 48),
    new THREE.MeshStandardMaterial({ color: 0xffe4ec, roughness: 0.65 })
  );
  tier1.position.y = -0.2;
  tier1.castShadow = true;
  cake.add(tier1);
  cake.add(makeFrostingIcing(1.25, 0.08, 0xff8fab));

  // Top tier
  const tier2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.9, 0.45, 48),
    new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.6 })
  );
  tier2.position.y = 0.3;
  tier2.castShadow = true;
  cake.add(tier2);
  cake.add(makeFrostingIcing(0.85, 0.52, 0xff6b9d));

  // Cream swirls on top
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const swirl = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfffafa, roughness: 0.5 })
    );
    swirl.position.set(Math.cos(a) * 0.55, 0.58, Math.sin(a) * 0.55);
    swirl.scale.set(1, 0.7, 1);
    cake.add(swirl);
  }

  // Decor berries
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const berry = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xc9184a, roughness: 0.35 })
    );
    berry.position.set(Math.cos(a) * 1.0, 0.12, Math.sin(a) * 1.0);
    cake.add(berry);
  }

  const candles = [];
  const smokeParticles = [];

  // 30 candles: rings of 1 + 6 + 10 + 13
  const rings = [
    { n: 1, r: 0 },
    { n: 6, r: 0.28 },
    { n: 10, r: 0.5 },
    { n: 13, r: 0.7 },
  ];
  let idx = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = ring.n === 1 ? 0 : (i / ring.n) * Math.PI * 2;
      const x = Math.cos(a) * ring.r;
      const z = Math.sin(a) * ring.r;
      const c = createCandle(idx);
      c.group.position.set(x, 0.55, z);
      cake.add(c.group);
      candles.push(c);
      idx++;
    }
  }

  root.userData.cake = cake;
  root.userData.candles = candles;
  root.userData.smokeParticles = smokeParticles;
  root.userData.litCount = candles.length;

  root.extinguish = (count) => {
    let left = count;
    for (const c of candles) {
      if (left <= 0) break;
      if (!c.lit) continue;
      c.extinguish(smokeParticles);
      left--;
      root.userData.litCount--;
    }
    return root.userData.litCount;
  };

  root.tick = (t, dt) => {
    for (const c of candles) c.tick(t);
    // Smoke rise
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const p = smokeParticles[i];
      p.age += dt;
      p.mesh.position.y += dt * 0.35;
      p.mesh.position.x += Math.sin(t * 2 + p.phase) * dt * 0.08;
      p.mesh.material.opacity = Math.max(0, 0.35 * (1 - p.age / p.life));
      p.mesh.scale.setScalar(0.6 + p.age * 1.2);
      if (p.age >= p.life) {
        cake.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        smokeParticles.splice(i, 1);
      }
    }
  };

  return root;
}

function createCandle(seed) {
  const group = new THREE.Group();
  const colors = [0xfff8e7, 0xffd6e8, 0xe8f4ff, 0xfff0c2];
  const waxColor = colors[seed % colors.length];

  const wax = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.32, 10),
    new THREE.MeshStandardMaterial({ color: waxColor, roughness: 0.7 })
  );
  wax.position.y = 0.16;
  group.add(wax);

  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
  );
  wick.position.y = 0.35;
  group.add(wick);

  // Flame — two stacked emissive teardrops
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffaa33,
    emissive: 0xff6600,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.95,
    roughness: 1,
  });
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), flameMat);
  outer.position.y = 0.42;
  group.add(outer);

  const innerMat = flameMat.clone();
  innerMat.color.set(0xfff5c0);
  innerMat.emissive.set(0xffcc44);
  innerMat.emissiveIntensity = 2.2;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 6), innerMat);
  inner.position.y = 0.4;
  group.add(inner);

  // Soft point light
  const light = new THREE.PointLight(0xff8833, 0.35, 1.5);
  light.position.y = 0.45;
  group.add(light);

  const state = {
    group,
    lit: true,
    outer,
    inner,
    light,
    flameMat,
    phase: Math.random() * Math.PI * 2,
    tick(t) {
      if (!this.lit) return;
      const flicker = 0.85 + Math.sin(t * 18 + this.phase) * 0.12 + Math.sin(t * 31 + this.phase) * 0.06;
      this.outer.scale.set(flicker, 0.9 + flicker * 0.15, flicker);
      this.inner.scale.set(flicker * 0.9, flicker, flicker * 0.9);
      this.light.intensity = 0.25 + flicker * 0.2;
      this.outer.rotation.z = Math.sin(t * 12 + this.phase) * 0.12;
      this.inner.rotation.z = Math.sin(t * 14 + this.phase) * 0.1;
    },
    extinguish(smokeList) {
      if (!this.lit) return;
      this.lit = false;
      this.outer.visible = false;
      this.inner.visible = false;
      this.light.intensity = 0;

      // Soft smoke puff
      const smokeGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const smokeMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(smokeGeo, smokeMat);
      mesh.position.copy(this.group.position);
      mesh.position.y += 0.42;
      this.group.parent?.add(mesh);
      smokeList.push({
        mesh,
        age: 0,
        life: 1.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
      // Second wispy particle
      const mesh2 = mesh.clone();
      mesh2.material = smokeMat.clone();
      mesh2.position.x += 0.02;
      this.group.parent?.add(mesh2);
      smokeList.push({
        mesh: mesh2,
        age: 0.15,
        life: 2.2,
        phase: Math.random() * Math.PI * 2,
      });
    },
  };
  return state;
}
