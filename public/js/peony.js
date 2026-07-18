import * as THREE from "three";

/**
 * Obvious multi-head peony bouquet — 7 separate pink blooms you can count.
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function petalMat(hex) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.62,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

/** Rounded petal as a flat ellipse mesh */
function petalMesh(mat, w, h) {
  const geo = new THREE.CircleGeometry(0.5, 20);
  geo.scale(w, h, 1);
  // gentle cup
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, (1 - (x * x + y * y) * 4) * 0.08);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function createLeaf(color = 0x2e7d32) {
  const geo = new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  geo.scale(1.1, 1.8, 0.35);
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide })
  );
}

/** Compact peony head — clearly one flower */
export function createPeony({ scale = 1, seed = 1 } = {}) {
  const g = new THREE.Group();
  const rng = mulberry32(seed);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.03, 0.85, 7),
    new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.9 })
  );
  stem.position.y = -0.42;
  g.add(stem);

  const leaf = createLeaf();
  leaf.position.set(0.08, -0.15, 0.02);
  leaf.rotation.z = 0.9;
  leaf.scale.setScalar(0.55);
  g.add(leaf);

  const bloom = new THREE.Group();
  bloom.position.y = 0.12;
  g.add(bloom);

  const palette = [0xffb6c9, 0xff8fb5, 0xf06292, 0xe91e63];

  // Outer petals
  for (let i = 0; i < 9; i++) {
    const mat = petalMat(palette[i % 2]);
    const p = petalMesh(mat, 0.42, 0.5);
    const a = (i / 9) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.22, 0.0, Math.sin(a) * 0.22);
    p.rotation.order = "YXZ";
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.x = 0.95 + (rng() - 0.5) * 0.15;
    bloom.add(p);
  }
  // Mid
  for (let i = 0; i < 7; i++) {
    const mat = petalMat(palette[2]);
    const p = petalMesh(mat, 0.34, 0.4);
    const a = (i / 7) * Math.PI * 2 + 0.3;
    p.position.set(Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12);
    p.rotation.order = "YXZ";
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.x = 0.65;
    bloom.add(p);
  }
  // Inner
  for (let i = 0; i < 5; i++) {
    const mat = petalMat(palette[3]);
    const p = petalMesh(mat, 0.22, 0.28);
    const a = (i / 5) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.05, 0.08, Math.sin(a) * 0.05);
    p.rotation.order = "YXZ";
    p.rotation.y = -a;
    p.rotation.x = 0.35;
    bloom.add(p);
  }

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc2185b, roughness: 0.55 })
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

  // Wide fan — heads clearly separated (you can count seven)
  const placements = [
    { x: 0.0, y: 0.75, z: 0.35, s: 1.2, seed: 1, rx: -0.55, ry: 0 },
    { x: 0.55, y: 0.55, z: 0.25, s: 1.05, seed: 2, rx: -0.45, ry: 0.55 },
    { x: -0.55, y: 0.55, z: 0.25, s: 1.05, seed: 3, rx: -0.45, ry: -0.55 },
    { x: 0.9, y: 0.35, z: -0.05, s: 0.95, seed: 4, rx: -0.3, ry: 0.95 },
    { x: -0.9, y: 0.35, z: -0.05, s: 0.95, seed: 5, rx: -0.3, ry: -0.95 },
    { x: 0.35, y: 0.85, z: -0.2, s: 1.0, seed: 6, rx: -0.25, ry: 0.3 },
    { x: -0.35, y: 0.85, z: -0.2, s: 1.0, seed: 7, rx: -0.25, ry: -0.3 },
  ];

  for (const p of placements) {
    const f = createPeony({ scale: p.s, seed: p.seed });
    f.position.set(p.x, p.y, p.z);
    f.rotation.x = p.rx;
    f.rotation.y = p.ry;
    wrap.add(f);
  }

  // Filler leaves between heads
  for (const [x, y, z, rz] of [
    [0.25, 0.5, 0.4, 0.8],
    [-0.25, 0.5, 0.4, -0.8],
    [0.7, 0.4, 0.1, 1.0],
    [-0.7, 0.4, 0.1, -1.0],
    [0, 0.95, 0.05, 0.2],
  ]) {
    const leaf = createLeaf(0x388e3c);
    leaf.position.set(x, y, z);
    leaf.rotation.z = rz;
    leaf.rotation.x = -0.5;
    leaf.scale.setScalar(0.7);
    wrap.add(leaf);
  }

  // Kraft cone — stems tuck inside, heads above rim
  const profile = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = -1.5 + t * 1.85;
    const r = 0.16 + Math.pow(t, 0.95) * 1.05;
    profile.push(new THREE.Vector2(r, y));
  }
  const kraft = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 40),
    new THREE.MeshStandardMaterial({
      color: 0xc4a574,
      roughness: 0.9,
      side: THREE.DoubleSide,
    })
  );
  kraft.position.y = 0.1;
  wrap.add(kraft);

  const film = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.12,
      transmission: 0.65,
      transparent: true,
      opacity: 0.4,
      thickness: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  film.position.y = 0.1;
  film.scale.setScalar(1.025);
  wrap.add(film);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.045, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0xe91e8c, roughness: 0.35 })
  );
  band.position.y = -0.75;
  band.rotation.x = Math.PI / 2;
  wrap.add(band);

  root.userData.wrap = wrap;
  return root;
}
