import * as THREE from "three";

/**
 * Soft craft-paper peony bouquet.
 * Petals are textured planes with smooth radial alpha (not hard polygons).
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft round peony petal texture (paper feel) */
function makePetalTexture(hex, seed = 1) {
  const rng = mulberry32(seed);
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const cx = size * 0.5;
  const cy = size * 0.55;

  const g = ctx.createRadialGradient(cx, cy * 0.85, size * 0.02, cx, cy, size * 0.48);
  const col = new THREE.Color(hex);
  const light = col.clone().lerp(new THREE.Color(0xfff0f6), 0.45);
  const mid = col.clone().lerp(new THREE.Color(0xffc0d8), 0.15);
  g.addColorStop(0, `#${light.getHexString()}`);
  g.addColorStop(0.45, `#${mid.getHexString()}`);
  g.addColorStop(0.78, `#${col.getHexString()}`);
  g.addColorStop(1, "rgba(0,0,0,0)");

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.0, 1.18);
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.08, size * 0.38, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  ctx.globalCompositeOperation = "soft-light";
  ctx.strokeStyle = `rgba(255,230,240,${0.18 + rng() * 0.1})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.28);
    const x = cx + (rng() - 0.5) * size * 0.35;
    ctx.quadraticCurveTo(cx + (rng() - 0.5) * 20, cy, x, cy - size * 0.32);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = (x - cx) / (size * 0.42);
      const dy = (y - cy) / (size * 0.48);
      const r = Math.sqrt(dx * dx + dy * dy);
      const edge = Math.max(0, Math.min(1, 1 - (r - 0.72) / 0.28));
      d[i + 3] = Math.round(d[i + 3] * edge * edge);
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const _texCache = new Map();
function petalTexture(hex, seed) {
  const key = `${hex}_${seed % 7}`;
  if (!_texCache.has(key)) _texCache.set(key, makePetalTexture(hex, seed));
  return _texCache.get(key);
}

function petalMat(hex, seed) {
  return new THREE.MeshBasicMaterial({
    map: petalTexture(hex, seed),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.96,
  });
}

function createLeaf(w, len, color = 0x1f5c32) {
  const segsU = 12;
  const segsV = 18;
  const positions = [];
  const indices = [];
  for (let j = 0; j <= segsV; j++) {
    const v = j / segsV;
    const y = v * len;
    const belly = Math.sin(v * Math.PI);
    const tip = Math.pow(Math.max(0, 1 - v), 0.45);
    const serr = 1 + Math.sin(v * Math.PI * 5) * 0.06 * (v > 0.15 && v < 0.85 ? 1 : 0);
    const half = w * belly * tip * serr;
    for (let i = 0; i <= segsU; i++) {
      const u = i / segsU;
      const x = (u * 2 - 1) * half;
      const z = Math.sin(v * Math.PI) * 0.06 * (1 - Math.abs(u * 2 - 1) * 0.45);
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
      roughness: 0.82,
      side: THREE.DoubleSide,
    })
  );
}

/** Closed / half-open bud nestled among blooms */
function createBud({ scale = 0.55, seed = 1 } = {}) {
  const group = new THREE.Group();
  const rng = mulberry32(seed);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.9 })
  );
  stem.position.y = -0.75;
  group.add(stem);

  const calyx = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 })
  );
  calyx.position.y = 0.02;
  calyx.scale.set(1, 1.15, 1);
  group.add(calyx);

  const petalGeo = new THREE.PlaneGeometry(1, 1.1);
  const mat = petalMat(0xf06292, seed);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(petalGeo, mat);
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.04, 0.08, Math.sin(a) * 0.04);
    p.rotation.order = "YXZ";
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.x = 0.55 + rng() * 0.2;
    p.scale.setScalar(0.28);
    group.add(p);
  }

  // Small leaf under bud
  const leaf = createLeaf(0.22, 0.55, 0x256b38);
  leaf.position.set(0.06, -0.15, 0.02);
  leaf.rotation.z = 0.9;
  group.add(leaf);

  group.scale.setScalar(scale);
  return group;
}

/**
 * One lush peony — layered soft textured petals forming a round bloom
 */
export function createPeony({
  scale = 1,
  seed = 1,
  open = 0.9,
} = {}) {
  const group = new THREE.Group();
  const rng = mulberry32(seed);

  const palette = [0xf48fb1, 0xf06292, 0xec407a, 0xe91e63, 0xd81b60, 0xffc1d9];

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.045, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.9 })
  );
  stem.position.y = -1.4;
  group.add(stem);

  for (let i = 0; i < 4; i++) {
    const leaf = createLeaf(
      0.3 + rng() * 0.12,
      0.85 + rng() * 0.25,
      i % 2 ? 0x256b38 : 0x1b5e2a
    );
    const side = i % 2 === 0 ? 1 : -1;
    leaf.position.set(side * (0.08 + rng() * 0.06), -0.35 - i * 0.28, (rng() - 0.5) * 0.1);
    leaf.rotation.z = side * (0.75 + rng() * 0.35);
    leaf.rotation.y = rng() * 0.6;
    leaf.rotation.x = -0.15 + rng() * 0.25;
    group.add(leaf);
  }

  const bloom = new THREE.Group();
  bloom.position.y = 0.05;
  group.add(bloom);

  const petalGeo = new THREE.PlaneGeometry(1, 1.15, 1, 1);

  const layers = [
    { count: 10, radius: 0.42 * open, tilt: 1.15, size: 0.72, y: -0.06 },
    { count: 10, radius: 0.34 * open, tilt: 0.95, size: 0.64, y: 0.0 },
    { count: 9, radius: 0.26 * open, tilt: 0.75, size: 0.56, y: 0.06 },
    { count: 8, radius: 0.18 * open, tilt: 0.55, size: 0.48, y: 0.12 },
    { count: 7, radius: 0.11 * open, tilt: 0.35, size: 0.4, y: 0.17 },
    { count: 6, radius: 0.05, tilt: 0.15, size: 0.32, y: 0.21 },
  ];

  layers.forEach((layer, li) => {
    const color = palette[Math.min(li, palette.length - 1)];
    const mat = petalMat(color, seed + li * 13);
    const offset = (rng() * Math.PI * 2) / layer.count;

    for (let i = 0; i < layer.count; i++) {
      const petal = new THREE.Mesh(petalGeo, mat);
      const angle = offset + (i / layer.count) * Math.PI * 2 + (rng() - 0.5) * 0.08;
      const rad = layer.radius * (0.92 + rng() * 0.14);
      const s = layer.size * (0.9 + rng() * 0.18);

      petal.position.set(
        Math.cos(angle) * rad,
        layer.y + (rng() - 0.5) * 0.02,
        Math.sin(angle) * rad
      );
      petal.rotation.order = "YXZ";
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = layer.tilt + (rng() - 0.5) * 0.15;
      petal.rotation.z = (rng() - 0.5) * 0.25;
      petal.scale.set(s, s, s);
      bloom.add(petal);
    }
  });

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 14),
    new THREE.MeshStandardMaterial({
      color: 0xd81b60,
      roughness: 0.65,
      emissive: 0x4a0020,
      emissiveIntensity: 0.12,
    })
  );
  core.position.y = 0.16;
  bloom.add(core);

  const fluffMat = petalMat(0xffb3d4, seed + 99);
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(petalGeo, fluffMat);
    const a = (i / 8) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.04, 0.2, Math.sin(a) * 0.04);
    p.rotation.order = "YXZ";
    p.rotation.y = -a;
    p.rotation.x = 0.2;
    p.scale.setScalar(0.22);
    bloom.add(p);
  }

  group.scale.setScalar(scale);
  group.userData.bloom = bloom;
  group.userData.phase = rng() * Math.PI * 2;
  return group;
}

/** Handheld bouquet: peonies + buds + greenery between blooms */
export function createBouquet() {
  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);
  const rng = mulberry32(2026);

  const placements = [
    { x: 0.0, y: 0.14, z: 0.38, s: 1.15, seed: 11, open: 1.0, rx: -0.28, ry: 0.0 },
    { x: 0.46, y: 0.04, z: 0.34, s: 1.05, seed: 22, open: 0.96, rx: -0.3, ry: 0.4 },
    { x: -0.44, y: 0.06, z: 0.32, s: 1.06, seed: 33, open: 0.96, rx: -0.3, ry: -0.4 },
    { x: 0.2, y: 0.3, z: -0.18, s: 0.92, seed: 44, open: 0.88, rx: 0.02, ry: 0.28 },
    { x: -0.22, y: 0.28, z: -0.2, s: 0.94, seed: 55, open: 0.9, rx: 0.0, ry: -0.3 },
    { x: 0.55, y: -0.02, z: 0.0, s: 0.88, seed: 66, open: 0.82, rx: -0.12, ry: 0.7 },
    { x: -0.55, y: -0.04, z: 0.02, s: 0.88, seed: 77, open: 0.82, rx: -0.12, ry: -0.7 },
  ];

  for (const p of placements) {
    const flower = createPeony({ scale: p.s, seed: p.seed, open: p.open });
    flower.position.set(p.x, p.y, p.z);
    flower.rotation.x = p.rx;
    flower.rotation.y = p.ry;
    wrap.add(flower);
  }

  // Closed buds between open blooms
  const buds = [
    { x: 0.28, y: 0.42, z: 0.12, s: 0.62, seed: 101, rx: -0.2, ry: 0.3 },
    { x: -0.3, y: 0.4, z: 0.1, s: 0.58, seed: 102, rx: -0.18, ry: -0.35 },
    { x: 0.08, y: 0.48, z: -0.05, s: 0.55, seed: 103, rx: 0.05, ry: 0.1 },
  ];
  for (const b of buds) {
    const bud = createBud({ scale: b.s, seed: b.seed });
    bud.position.set(b.x, b.y, b.z);
    bud.rotation.x = b.rx;
    bud.rotation.y = b.ry;
    wrap.add(bud);
  }

  // Large filler leaves peeking BETWEEN flowers
  const leafSpots = [
    { x: 0.32, y: 0.22, z: 0.42, rx: -0.5, ry: 0.2, rz: 0.9, w: 0.42, len: 1.15 },
    { x: -0.3, y: 0.2, z: 0.4, rx: -0.45, ry: -0.15, rz: -0.95, w: 0.4, len: 1.1 },
    { x: 0.58, y: 0.18, z: 0.18, rx: -0.3, ry: 0.8, rz: 1.1, w: 0.38, len: 1.05 },
    { x: -0.58, y: 0.16, z: 0.16, rx: -0.3, ry: -0.8, rz: -1.1, w: 0.38, len: 1.05 },
    { x: 0.12, y: 0.35, z: -0.35, rx: 0.15, ry: 0.4, rz: 0.7, w: 0.36, len: 1.0 },
    { x: -0.15, y: 0.32, z: -0.38, rx: 0.12, ry: -0.45, rz: -0.75, w: 0.36, len: 1.0 },
    { x: 0.4, y: -0.05, z: 0.45, rx: -0.7, ry: 0.1, rz: 0.55, w: 0.34, len: 0.95 },
    { x: -0.38, y: -0.02, z: 0.48, rx: -0.65, ry: -0.1, rz: -0.5, w: 0.34, len: 0.95 },
    { x: 0.0, y: 0.5, z: 0.2, rx: -0.35, ry: 0.0, rz: 0.35, w: 0.32, len: 0.9 },
    { x: 0.5, y: 0.35, z: -0.1, rx: -0.1, ry: 1.0, rz: 1.2, w: 0.35, len: 1.0 },
    { x: -0.5, y: 0.33, z: -0.08, rx: -0.1, ry: -1.0, rz: -1.2, w: 0.35, len: 1.0 },
    { x: 0.22, y: 0.05, z: 0.55, rx: -0.85, ry: 0.25, rz: 0.4, w: 0.3, len: 0.85 },
  ];
  for (let i = 0; i < leafSpots.length; i++) {
    const spot = leafSpots[i];
    const leaf = createLeaf(
      spot.w * (0.9 + rng() * 0.2),
      spot.len * (0.9 + rng() * 0.15),
      i % 3 === 0 ? 0x2e7d32 : i % 3 === 1 ? 0x1b5e20 : 0x388e3c
    );
    leaf.position.set(spot.x, spot.y, spot.z);
    leaf.rotation.set(spot.rx, spot.ry, spot.rz);
    wrap.add(leaf);
  }

  // Kraft paper wrap
  const kraftProfile = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = -2.15 + t * 2.35;
    const radius = 0.12 + Math.pow(t, 0.85) * 1.05;
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
    new THREE.TorusGeometry(0.95, 0.04, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xfaf6f0, roughness: 0.85 })
  );
  liner.position.y = 0.12;
  liner.rotation.x = Math.PI / 2;
  wrap.add(liner);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.045, 10, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0xe91e8c,
      roughness: 0.25,
      metalness: 0.05,
      clearcoat: 0.6,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xffb3d4),
    })
  );
  band.position.y = -1.05;
  band.rotation.x = Math.PI / 2;
  wrap.add(band);

  const ribbonMat = band.material;
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.035, 8, 24, Math.PI * 1.4),
      ribbonMat
    );
    loop.position.set(side * 0.18, -0.95, 0.22);
    loop.rotation.set(0.3, side * 0.6, side * 0.9);
    wrap.add(loop);
  }
  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.01), ribbonMat);
    end.position.set(side * 0.12, -1.45, 0.2);
    end.rotation.z = side * 0.25;
    wrap.add(end);
  }

  root.userData.wrap = wrap;
  return root;
}
