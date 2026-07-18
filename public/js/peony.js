import * as THREE from "three";

/**
 * Open craft-paper peony bouquet.
 * Cupped teardrop petals (not dense cabbage spheres).
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Teardrop peony petal — narrow base, broad soft tip, gentle cup.
 * Looks like paper peony, not a cabbage ball.
 */
function createPetalGeometry(seed = 1) {
  const rng = mulberry32(seed);
  const segsU = 16;
  const segsV = 22;
  const w = 0.55;
  const h = 0.85;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= segsV; j++) {
    const v = j / segsV; // 0 base → 1 tip
    const y = v * h;
    // Teardrop width: thin base, full mid, soft round tip (not circle blob)
    const widthProf =
      Math.pow(Math.sin(Math.pow(v, 0.85) * Math.PI), 0.92) *
      (0.35 + 0.65 * Math.sin(v * Math.PI * 0.92));
    const halfW = w * Math.max(0.04, widthProf);

    for (let i = 0; i <= segsU; i++) {
      const u = i / segsU;
      const sx = u * 2 - 1;
      const x = sx * halfW;

      // Soft cup — deeper near base/mid, opens toward tip
      const cup = (1 - Math.abs(sx) * 0.55) * Math.sin(v * Math.PI) * 0.28 * (1 - v * 0.35);
      // Gentle paper ruffle on edges only
      const ruffle =
        Math.sin(u * Math.PI * 3 + v * 4 + seed) * 0.025 * v * Math.abs(sx) +
        Math.sin(u * Math.PI * 5 - v * 6) * 0.012 * v * v;

      const z = cup + ruffle + (rng() - 0.5) * 0.004 * v;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segsV; j++) {
    for (let i = 0; i < segsU; i++) {
      const a = j * (segsU + 1) + i;
      const b = a + segsU + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function petalMaterial(hex, roughness = 0.62) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness,
    metalness: 0,
    sheen: 0.85,
    sheenColor: new THREE.Color(0xffe4ef),
    sheenRoughness: 0.55,
    clearcoat: 0.08,
    clearcoatRoughness: 0.7,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

function createLeaf(w, len, color = 0x2d6b3a) {
  const segsU = 10;
  const segsV = 16;
  const positions = [];
  const indices = [];
  for (let j = 0; j <= segsV; j++) {
    const v = j / segsV;
    const y = v * len;
    const half = w * Math.sin(v * Math.PI) * Math.pow(1 - v * 0.2, 0.55);
    for (let i = 0; i <= segsU; i++) {
      const u = i / segsU;
      const x = (u * 2 - 1) * half;
      const z = Math.sin(v * Math.PI) * 0.05 * (1 - Math.abs(u * 2 - 1) * 0.5);
      positions.push(x, y, z);
    }
  }
  for (let j = 0; j < segsV; j++) {
    for (let i = 0; i < segsU; i++) {
      const a = j * (segsU + 1) + i;
      const b = a + segsU + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      side: THREE.DoubleSide,
    })
  );
}

/** Small closed bud — not a pink ball */
function createBud({ scale = 0.5, seed = 1 } = {}) {
  const group = new THREE.Group();
  const rng = mulberry32(seed);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.028, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.9 })
  );
  stem.position.y = -0.65;
  group.add(stem);

  const geo = createPetalGeometry(seed);
  const mat = petalMaterial(0xf3a0b8, 0.7);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(geo, mat);
    const a = (i / 5) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.03, 0.02, Math.sin(a) * 0.03);
    p.rotation.order = "YXZ";
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.x = 0.85 + rng() * 0.15; // mostly closed
    p.scale.set(0.32, 0.38, 0.32);
    group.add(p);
  }

  const sepals = createLeaf(0.12, 0.28, 0x3a7a45);
  sepals.position.set(0.02, -0.02, 0);
  sepals.rotation.z = 0.4;
  sepals.scale.setScalar(0.7);
  group.add(sepals);

  group.scale.setScalar(scale);
  return group;
}

/**
 * Open peony — layered cupped petals, airy (not cabbage).
 */
export function createPeony({
  scale = 1,
  seed = 1,
  open = 1.0,
} = {}) {
  const group = new THREE.Group();
  const rng = mulberry32(seed);

  // Soft paper-peony pinks (blush, not neon ball)
  const outerPink = 0xf7c4d4;
  const midPink = 0xf0a0b8;
  const innerPink = 0xe8789a;
  const heartPink = 0xd45a7a;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.04, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.9 })
  );
  stem.position.y = -1.35;
  group.add(stem);

  for (let i = 0; i < 3; i++) {
    const leaf = createLeaf(0.28 + rng() * 0.1, 0.8 + rng() * 0.2, i % 2 ? 0x3a7d48 : 0x2a6338);
    const side = i % 2 === 0 ? 1 : -1;
    leaf.position.set(side * (0.07 + rng() * 0.05), -0.4 - i * 0.3, (rng() - 0.5) * 0.08);
    leaf.rotation.z = side * (0.7 + rng() * 0.3);
    leaf.rotation.y = rng() * 0.5;
    group.add(leaf);
  }

  const bloom = new THREE.Group();
  bloom.position.y = 0.02;
  group.add(bloom);

  // Fewer layers, more open — readable individual petals
  const layers = [
    { count: 8, radius: 0.38 * open, tilt: 1.25, size: 1.05, y: -0.1, color: outerPink, rough: 0.68 },
    { count: 7, radius: 0.28 * open, tilt: 1.05, size: 0.92, y: -0.02, color: midPink, rough: 0.6 },
    { count: 6, radius: 0.18 * open, tilt: 0.78, size: 0.78, y: 0.06, color: innerPink, rough: 0.55 },
    { count: 5, radius: 0.08 * open, tilt: 0.42, size: 0.58, y: 0.12, color: heartPink, rough: 0.5 },
  ];

  layers.forEach((layer, li) => {
    const mat = petalMaterial(layer.color, layer.rough);
    const offset = (rng() * Math.PI * 2) / layer.count;
    const sharedGeo = createPetalGeometry(seed + li * 17);

    for (let i = 0; i < layer.count; i++) {
      // Unique geo on outer rings for organic edges
      const geo =
        li < 2 ? createPetalGeometry(seed + li * 17 + i * 9) : sharedGeo;
      const petal = new THREE.Mesh(geo, mat);
      const angle = offset + (i / layer.count) * Math.PI * 2 + (rng() - 0.5) * 0.12;
      const rad = layer.radius * (0.9 + rng() * 0.18);
      const s = layer.size * (0.92 + rng() * 0.14);

      petal.position.set(
        Math.cos(angle) * rad,
        layer.y + (rng() - 0.5) * 0.03,
        Math.sin(angle) * rad
      );
      petal.rotation.order = "YXZ";
      petal.rotation.y = -angle + Math.PI / 2 + (rng() - 0.5) * 0.15;
      // Open bloom: outer petals almost flat / slightly drooping
      petal.rotation.x = layer.tilt + (rng() - 0.5) * 0.18;
      petal.rotation.z = (rng() - 0.5) * 0.22;
      petal.scale.set(s * (0.95 + rng() * 0.1), s, s);
      petal.castShadow = true;
      bloom.add(petal);
    }
  });

  // Tiny folded heart — no hard sphere “ball”
  const heartMat = petalMaterial(0xc94a6e, 0.48);
  const heartGeo = createPetalGeometry(seed + 99);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(heartGeo, heartMat);
    const a = (i / 4) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.02, 0.14, Math.sin(a) * 0.02);
    p.rotation.order = "YXZ";
    p.rotation.y = -a;
    p.rotation.x = 0.25;
    p.scale.set(0.28, 0.32, 0.28);
    bloom.add(p);
  }

  group.scale.setScalar(scale);
  group.userData.bloom = bloom;
  group.userData.phase = rng() * Math.PI * 2;
  return group;
}

/** Handheld bouquet: open peonies + buds + sparse greenery */
export function createBouquet() {
  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);
  const rng = mulberry32(2026);

  // Spread out — less “one cabbage head”
  const placements = [
    { x: 0.0, y: 0.18, z: 0.42, s: 1.08, seed: 11, open: 1.05, rx: -0.32, ry: 0.05 },
    { x: 0.52, y: 0.06, z: 0.28, s: 0.98, seed: 22, open: 1.0, rx: -0.28, ry: 0.45 },
    { x: -0.5, y: 0.08, z: 0.26, s: 1.0, seed: 33, open: 1.0, rx: -0.28, ry: -0.45 },
    { x: 0.28, y: 0.32, z: -0.22, s: 0.88, seed: 44, open: 0.92, rx: 0.0, ry: 0.3 },
    { x: -0.3, y: 0.3, z: -0.24, s: 0.9, seed: 55, open: 0.94, rx: -0.02, ry: -0.32 },
  ];

  for (const p of placements) {
    const flower = createPeony({ scale: p.s, seed: p.seed, open: p.open });
    flower.position.set(p.x, p.y, p.z);
    flower.rotation.x = p.rx;
    flower.rotation.y = p.ry;
    wrap.add(flower);
  }

  const buds = [
    { x: 0.18, y: 0.45, z: 0.08, s: 0.55, seed: 101, rx: -0.15, ry: 0.25 },
    { x: -0.22, y: 0.42, z: 0.05, s: 0.5, seed: 102, rx: -0.12, ry: -0.3 },
  ];
  for (const b of buds) {
    const bud = createBud({ scale: b.s, seed: b.seed });
    bud.position.set(b.x, b.y, b.z);
    bud.rotation.x = b.rx;
    bud.rotation.y = b.ry;
    wrap.add(bud);
  }

  // Sparse greenery between blooms (not hiding flowers)
  const leafSpots = [
    { x: 0.38, y: 0.15, z: 0.4, rx: -0.55, ry: 0.2, rz: 0.85, w: 0.36, len: 1.05 },
    { x: -0.36, y: 0.12, z: 0.38, rx: -0.5, ry: -0.2, rz: -0.9, w: 0.34, len: 1.0 },
    { x: 0.55, y: 0.2, z: 0.05, rx: -0.2, ry: 0.9, rz: 1.05, w: 0.32, len: 0.95 },
    { x: -0.55, y: 0.18, z: 0.02, rx: -0.2, ry: -0.9, rz: -1.05, w: 0.32, len: 0.95 },
    { x: 0.05, y: 0.4, z: -0.3, rx: 0.1, ry: 0.2, rz: 0.55, w: 0.3, len: 0.9 },
    { x: 0.42, y: -0.02, z: 0.35, rx: -0.7, ry: 0.15, rz: 0.5, w: 0.28, len: 0.85 },
    { x: -0.4, y: 0.0, z: 0.36, rx: -0.65, ry: -0.1, rz: -0.45, w: 0.28, len: 0.85 },
  ];
  for (let i = 0; i < leafSpots.length; i++) {
    const spot = leafSpots[i];
    const leaf = createLeaf(
      spot.w * (0.92 + rng() * 0.15),
      spot.len * (0.92 + rng() * 0.12),
      i % 2 ? 0x3a7d48 : 0x2a6338
    );
    leaf.position.set(spot.x, spot.y, spot.z);
    leaf.rotation.set(spot.rx, spot.ry, spot.rz);
    wrap.add(leaf);
  }

  // Kraft wrap
  const kraftProfile = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = -2.15 + t * 2.35;
    const radius = 0.12 + Math.pow(t, 0.85) * 1.0;
    kraftProfile.push(new THREE.Vector2(radius, y));
  }
  const kraft = new THREE.Mesh(
    new THREE.LatheGeometry(kraftProfile, 40),
    new THREE.MeshStandardMaterial({
      color: 0xc4a574,
      roughness: 0.92,
      side: THREE.DoubleSide,
    })
  );
  kraft.position.y = -0.15;
  wrap.add(kraft);

  const liner = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.035, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xfaf6f0, roughness: 0.85 })
  );
  liner.position.y = 0.12;
  liner.rotation.x = Math.PI / 2;
  wrap.add(liner);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.04, 10, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0xe91e8c,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.55,
      sheen: 0.75,
      sheenColor: new THREE.Color(0xffb3d4),
    })
  );
  band.position.y = -1.05;
  band.rotation.x = Math.PI / 2;
  wrap.add(band);

  const ribbonMat = band.material;
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.032, 8, 24, Math.PI * 1.4),
      ribbonMat
    );
    loop.position.set(side * 0.17, -0.95, 0.2);
    loop.rotation.set(0.3, side * 0.6, side * 0.9);
    wrap.add(loop);
  }
  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.5, 0.01), ribbonMat);
    end.position.set(side * 0.11, -1.42, 0.18);
    end.rotation.z = side * 0.25;
    wrap.add(end);
  }

  root.userData.wrap = wrap;
  return root;
}
