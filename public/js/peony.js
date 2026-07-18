import * as THREE from "three";

/**
 * Gift peony bouquet — soft round blooms, clear film wrap, readable as flowers.
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softMat(hex, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: opts.roughness ?? 0.5,
    metalness: 0,
    sheen: opts.sheen ?? 0.95,
    sheenColor: new THREE.Color(0xfff2f7),
    sheenRoughness: 0.4,
    clearcoat: opts.clearcoat ?? 0.1,
    clearcoatRoughness: 0.5,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

/** Soft oval petal (circle deformed into cup) */
function makePetal(mat, w, h, cup = 0.14) {
  const geo = new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  geo.scale(w, h, cup);
  // tip slightly narrower
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) {
      const t = y / (h * 0.5);
      pos.setX(i, pos.getX(i) * (1 - t * 0.25));
      pos.setZ(i, pos.getZ(i) * (1 - t * 0.15));
    }
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function makeLeaf(color = 0x2e7d32) {
  const geo = new THREE.SphereGeometry(0.35, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  geo.scale(0.55, 1.15, 0.18);
  return new THREE.Mesh(geo, softMat(color, { roughness: 0.85, sheen: 0.2, clearcoat: 0 }));
}

/** One peony head — round & soft */
export function createPeony({ scale = 1, seed = 1 } = {}) {
  const g = new THREE.Group();
  const rng = mulberry32(seed);
  const pinks = [0xffe0ec, 0xffc2d7, 0xff9ec0, 0xf06292, 0xe91e63];

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.028, 0.7, 8),
    softMat(0x2e7d32, { roughness: 0.9, sheen: 0 })
  );
  stem.position.y = -0.35;
  g.add(stem);

  const leaf = makeLeaf();
  leaf.position.set(0.07, -0.12, 0.02);
  leaf.rotation.z = 0.85;
  leaf.scale.setScalar(0.45);
  g.add(leaf);

  const bloom = new THREE.Group();
  bloom.position.y = 0.08;
  g.add(bloom);

  // Outer fluffy ring
  for (let i = 0; i < 10; i++) {
    const p = makePetal(softMat(pinks[i % 2]), 0.38, 0.42, 0.16);
    const a = (i / 10) * Math.PI * 2 + rng() * 0.05;
    p.position.set(Math.cos(a) * 0.2, -0.02, Math.sin(a) * 0.2);
    p.rotation.order = "YXZ";
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.x = 1.05 + (rng() - 0.5) * 0.1;
    p.scale.setScalar(0.95 + rng() * 0.1);
    bloom.add(p);
  }
  // Mid
  for (let i = 0; i < 8; i++) {
    const p = makePetal(softMat(pinks[2]), 0.3, 0.34, 0.14);
    const a = (i / 8) * Math.PI * 2 + 0.2;
    p.position.set(Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12);
    p.rotation.order = "YXZ";
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.x = 0.75;
    bloom.add(p);
  }
  // Inner
  for (let i = 0; i < 6; i++) {
    const p = makePetal(softMat(pinks[3]), 0.2, 0.24, 0.12);
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.05, 0.09, Math.sin(a) * 0.05);
    p.rotation.order = "YXZ";
    p.rotation.y = -a;
    p.rotation.x = 0.4;
    bloom.add(p);
  }

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 12),
    softMat(pinks[4], { roughness: 0.45 })
  );
  core.position.y = 0.1;
  bloom.add(core);

  g.scale.setScalar(scale);
  g.userData.bloom = bloom;
  g.userData.phase = rng() * Math.PI * 2;
  return g;
}

export function createBouquet() {
  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);

  // Seven clearly separated heads in a gift fan
  const spots = [
    [0.0, 0.78, 0.35, 1.2, 11, -0.5, 0.0],
    [0.5, 0.58, 0.22, 1.05, 22, -0.42, 0.55],
    [-0.5, 0.58, 0.22, 1.05, 33, -0.42, -0.55],
    [0.3, 0.88, -0.05, 1.0, 44, -0.25, 0.3],
    [-0.32, 0.86, -0.05, 1.0, 55, -0.25, -0.3],
    [0.78, 0.4, -0.05, 0.92, 66, -0.3, 0.95],
    [-0.78, 0.42, -0.05, 0.92, 77, -0.3, -0.95],
  ];

  for (const [x, y, z, s, seed, rx, ry] of spots) {
    const f = createPeony({ scale: s, seed });
    f.position.set(x, y, z);
    f.rotation.x = rx;
    f.rotation.y = ry;
    wrap.add(f);
  }

  // Greenery
  for (const [x, y, z, rz] of [
    [0.28, 0.48, 0.4, 0.9],
    [-0.28, 0.46, 0.38, -0.9],
    [0.6, 0.55, 0.08, 1.1],
    [-0.6, 0.55, 0.08, -1.1],
    [0.0, 0.95, 0.15, 0.2],
  ]) {
    const leaf = makeLeaf(0x388e3c);
    leaf.position.set(x, y, z);
    leaf.rotation.set(-0.5, 0, rz);
    leaf.scale.setScalar(0.65);
    wrap.add(leaf);
  }

  // Kraft + clear film, tapered bottom
  const profile = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    profile.push(new THREE.Vector2(0.15 + Math.pow(t, 0.95) * 1.05, -1.55 + t * 1.9));
  }
  const kraft = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 40),
    softMat(0xc9a87c, { roughness: 0.92, sheen: 0.15, clearcoat: 0 })
  );
  kraft.position.y = 0.15;
  wrap.add(kraft);

  const film = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      transmission: 0.75,
      thickness: 0.28,
      transparent: true,
      opacity: 0.4,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  film.position.y = 0.15;
  film.scale.setScalar(1.02);
  wrap.add(film);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.04, 10, 36),
    softMat(0xe91e8c, { roughness: 0.3, clearcoat: 0.6 })
  );
  band.position.y = -0.7;
  band.rotation.x = Math.PI / 2;
  wrap.add(band);

  root.userData.wrap = wrap;
  return root;
}
