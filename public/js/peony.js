import * as THREE from "three";

/**
 * Clear multi-flower peony bouquet (always visible, no GLB required).
 * If assets/models/peony.glb appears later, we can swap — for now this must work.
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
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: 0.55,
    metalness: 0,
    sheen: 0.9,
    sheenColor: new THREE.Color(0xffe8f0),
    sheenRoughness: 0.45,
    side: THREE.DoubleSide,
  });
}

/** Soft round petal disc (readable flower, not cabbage crown) */
function makePetalGeo() {
  // Ellipse-ish plane with slight cup via bent segments
  const geo = new THREE.PlaneGeometry(0.55, 0.7, 8, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / 0.275;
    const ny = (y + 0.15) / 0.45;
    const r = Math.sqrt(nx * nx + ny * ny);
    // Round silhouette by pushing edge verts inward slightly in z cup
    const cup = (1 - Math.min(1, r)) * 0.12;
    pos.setZ(i, cup);
    // Soft tip roundness: shrink width near tip
    if (y > 0.15) {
      const t = (y - 0.15) / 0.35;
      pos.setX(i, x * (1 - t * 0.35));
    }
  }
  geo.computeVertexNormals();
  return geo;
}

const _petalGeo = makePetalGeo();

function createLeaf(w, len, color) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(w, len * 0.35, 0, len);
  shape.quadraticCurveTo(-w, len * 0.35, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 8);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      side: THREE.DoubleSide,
    })
  );
  return mesh;
}

/**
 * One peony: layered petals around a soft core — reads as a flower head.
 */
export function createPeony({ scale = 1, seed = 1, open = 1 } = {}) {
  const group = new THREE.Group();
  const rng = mulberry32(seed);
  const colors = [0xffc1d6, 0xf48fb1, 0xec407a, 0xe91e63];

  // Short stem (stays inside wrap — not poking out the bottom)
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })
  );
  stem.position.y = -0.55;
  group.add(stem);

  for (let i = 0; i < 2; i++) {
    const leaf = createLeaf(0.18 + rng() * 0.06, 0.55 + rng() * 0.15, 0x388e3c);
    const side = i % 2 === 0 ? 1 : -1;
    leaf.position.set(side * 0.06, -0.25 - i * 0.2, 0.02);
    leaf.rotation.z = side * (0.8 + rng() * 0.25);
    leaf.rotation.x = -0.3;
    group.add(leaf);
  }

  const bloom = new THREE.Group();
  bloom.position.y = 0.15;
  group.add(bloom);

  // Outer soft ring
  const layers = [
    { n: 8, rad: 0.28 * open, tilt: 1.05, s: 1.0, col: colors[0] },
    { n: 7, rad: 0.2 * open, tilt: 0.85, s: 0.88, col: colors[1] },
    { n: 6, rad: 0.12 * open, tilt: 0.55, s: 0.72, col: colors[2] },
    { n: 5, rad: 0.05, tilt: 0.25, s: 0.55, col: colors[3] },
  ];

  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    const mat = petalMat(L.col);
    const off = rng() * Math.PI * 2;
    for (let i = 0; i < L.n; i++) {
      const petal = new THREE.Mesh(_petalGeo, mat);
      const a = off + (i / L.n) * Math.PI * 2;
      petal.position.set(Math.cos(a) * L.rad, li * 0.03, Math.sin(a) * L.rad);
      petal.rotation.order = "YXZ";
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = L.tilt + (rng() - 0.5) * 0.12;
      petal.rotation.z = (rng() - 0.5) * 0.15;
      petal.scale.setScalar(L.s * (0.92 + rng() * 0.12));
      bloom.add(petal);
    }
  }

  // Soft pink core (small — not a big ball)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 12),
    new THREE.MeshStandardMaterial({
      color: 0xd81b60,
      roughness: 0.6,
      emissive: 0x4a0020,
      emissiveIntensity: 0.1,
    })
  );
  core.position.y = 0.08;
  bloom.add(core);

  group.scale.setScalar(scale);
  group.userData.bloom = bloom;
  group.userData.phase = rng() * Math.PI * 2;
  return group;
}

function createWrap() {
  const group = new THREE.Group();
  const profile = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = -1.85 + t * 2.1;
    const radius = 0.14 + Math.pow(t, 0.9) * 0.95;
    profile.push(new THREE.Vector2(radius, y));
  }
  const kraft = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 36),
    new THREE.MeshStandardMaterial({
      color: 0xc4a574,
      roughness: 0.92,
      side: THREE.DoubleSide,
    })
  );
  group.add(kraft);

  // Clear film sheen over kraft
  const film = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 36),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      transmission: 0.7,
      thickness: 0.2,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  film.scale.setScalar(1.02);
  group.add(film);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.04, 10, 36),
    new THREE.MeshPhysicalMaterial({
      color: 0xe91e8c,
      roughness: 0.3,
      clearcoat: 0.5,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xffb3d4),
    })
  );
  band.position.y = -0.95;
  band.rotation.x = Math.PI / 2;
  group.add(band);

  return group;
}

/** Handheld bouquet — several distinct peony heads + wrap */
export function createBouquet() {
  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);

  // Distinct heads spaced apart so it reads as a BOUQUET
  const placements = [
    { x: 0.0, y: 0.55, z: 0.28, s: 1.15, seed: 11, rx: -0.4, ry: 0.0 },
    { x: 0.38, y: 0.4, z: 0.18, s: 1.0, seed: 22, rx: -0.35, ry: 0.5 },
    { x: -0.38, y: 0.42, z: 0.16, s: 1.02, seed: 33, rx: -0.35, ry: -0.5 },
    { x: 0.22, y: 0.7, z: -0.05, s: 0.92, seed: 44, rx: -0.15, ry: 0.25 },
    { x: -0.24, y: 0.68, z: -0.08, s: 0.94, seed: 55, rx: -0.15, ry: -0.3 },
    { x: 0.48, y: 0.28, z: -0.12, s: 0.85, seed: 66, rx: -0.2, ry: 0.85 },
    { x: -0.48, y: 0.3, z: -0.1, s: 0.85, seed: 77, rx: -0.2, ry: -0.85 },
  ];

  for (const p of placements) {
    const flower = createPeony({ scale: p.s, seed: p.seed, open: 1.0 });
    flower.position.set(p.x, p.y, p.z);
    flower.rotation.x = p.rx;
    flower.rotation.y = p.ry;
    wrap.add(flower);
  }

  // Greenery peeking between heads
  const leafSpots = [
    { x: 0.3, y: 0.35, z: 0.32, rz: 0.9 },
    { x: -0.28, y: 0.32, z: 0.3, rz: -0.9 },
    { x: 0.05, y: 0.75, z: 0.1, rz: 0.3 },
    { x: 0.45, y: 0.5, z: 0.0, rz: 1.1 },
    { x: -0.45, y: 0.48, z: 0.0, rz: -1.1 },
  ];
  for (const s of leafSpots) {
    const leaf = createLeaf(0.22, 0.7, 0x2e7d32);
    leaf.position.set(s.x, s.y, s.z);
    leaf.rotation.z = s.rz;
    leaf.rotation.x = -0.4;
    wrap.add(leaf);
  }

  const paper = createWrap();
  paper.position.y = 0.05;
  wrap.add(paper);

  root.userData.wrap = wrap;
  return root;
}
