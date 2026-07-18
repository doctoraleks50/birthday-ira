import * as THREE from "three";

/**
 * Dense spherical peony — many thin ruffled petals (reference: craft-paper pink bouquet).
 * Each bloom is ~spherical with layered petals curling inward.
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft oval petal with ruffled tip — planar then bent into a cup */
function createPetalGeometry(w = 0.55, h = 0.75, seed = 1, highDetail = false) {
  const rng = mulberry32(seed);
  const shape = new THREE.Shape();
  // Wider, rounder silhouette — readable as a real peony petal up close
  shape.moveTo(0, 0);
  shape.bezierCurveTo(w * 0.65, h * 0.06, w * 1.05, h * 0.38, w * 0.78, h * 0.7);
  shape.bezierCurveTo(w * 0.55, h * 0.92, w * 0.28, h * 1.08, 0, h);
  shape.bezierCurveTo(-w * 0.28, h * 1.08, -w * 0.55, h * 0.92, -w * 0.78, h * 0.7);
  shape.bezierCurveTo(-w * 1.05, h * 0.38, -w * 0.65, h * 0.06, 0, 0);

  const segments = highDetail ? 40 : 24;
  let geo;
  if (highDetail) {
    geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.014,
      bevelSegments: 2,
      curveSegments: segments,
    });
  } else {
    geo = new THREE.ShapeGeometry(shape, segments);
  }

  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = Math.max(0, Math.min(1, v.y / h));
    const across = v.x / (w + 0.001);
    const cup = Math.sin(t * Math.PI) * 0.28 + t * t * 0.22;
    const ruffle = Math.sin(across * Math.PI * 4 + t * 7) * (highDetail ? 0.035 : 0.02) * t;
    const sideLift = across * across * 0.1 * t;
    v.z += cup + ruffle + sideLift;
    v.x *= 1 - t * 0.1;
    if (highDetail) {
      v.x += (rng() - 0.5) * 0.012 * t;
      v.y += (rng() - 0.5) * 0.01 * t;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function petalMat(hex, roughness = 0.62) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness,
    metalness: 0,
    sheen: 0.85,
    sheenColor: new THREE.Color(0xffd0e0),
    sheenRoughness: 0.45,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    side: THREE.DoubleSide,
  });
}

/**
 * One lush peony head (spherical) + stem + leaves
 */
export function createPeony({
  scale = 1,
  seed = 1,
  open = 0.85,
  highDetail = false,
} = {}) {
  const group = new THREE.Group();
  const rng = mulberry32(seed);

  const palette = [
    0xe91e8c,
    0xf43f9a,
    0xff5aad,
    0xff7ab8,
    0xff9ac8,
    0xffb3d4,
  ];

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 2.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.9 })
  );
  stem.position.y = -1.45;
  group.add(stem);

  for (let i = 0; i < 4; i++) {
    const leaf = createLeaf(0.28 + rng() * 0.12, 0.75 + rng() * 0.25, seed + i * 17);
    const side = i % 2 === 0 ? 1 : -1;
    leaf.position.set(side * (0.08 + rng() * 0.06), -0.55 - i * 0.35, (rng() - 0.5) * 0.1);
    leaf.rotation.z = side * (0.7 + rng() * 0.35);
    leaf.rotation.y = rng() * 0.6;
    leaf.rotation.x = -0.2 + rng() * 0.3;
    group.add(leaf);
  }

  const bloom = new THREE.Group();
  bloom.position.y = 0.05;
  group.add(bloom);

  // Front-row blooms: more petals, slightly more open & readable silhouette
  const layers = highDetail
    ? [
        { count: 16, radius: 0.48 * open, tilt: 1.15, w: 0.62, h: 0.82, y: -0.1 },
        { count: 15, radius: 0.4 * open, tilt: 0.98, w: 0.56, h: 0.76, y: -0.03 },
        { count: 14, radius: 0.32 * open, tilt: 0.78, w: 0.5, h: 0.68, y: 0.04 },
        { count: 12, radius: 0.24 * open, tilt: 0.58, w: 0.44, h: 0.58, y: 0.1 },
        { count: 11, radius: 0.16 * open, tilt: 0.38, w: 0.36, h: 0.5, y: 0.16 },
        { count: 10, radius: 0.1 * open, tilt: 0.22, w: 0.28, h: 0.4, y: 0.2 },
        { count: 8, radius: 0.05, tilt: 0.1, w: 0.2, h: 0.3, y: 0.24 },
      ]
    : [
        { count: 14, radius: 0.38 * open, tilt: 1.25, w: 0.52, h: 0.72, y: -0.08 },
        { count: 13, radius: 0.32 * open, tilt: 1.05, w: 0.48, h: 0.68, y: -0.02 },
        { count: 12, radius: 0.26 * open, tilt: 0.85, w: 0.44, h: 0.62, y: 0.04 },
        { count: 11, radius: 0.2 * open, tilt: 0.65, w: 0.4, h: 0.55, y: 0.1 },
        { count: 10, radius: 0.14 * open, tilt: 0.45, w: 0.34, h: 0.48, y: 0.15 },
        { count: 9, radius: 0.09 * open, tilt: 0.28, w: 0.28, h: 0.4, y: 0.19 },
        { count: 8, radius: 0.05 * open, tilt: 0.14, w: 0.22, h: 0.32, y: 0.22 },
        { count: 7, radius: 0.02, tilt: 0.05, w: 0.16, h: 0.24, y: 0.24 },
      ];

  layers.forEach((layer, li) => {
    const geo = createPetalGeometry(layer.w, layer.h, seed + li * 31, highDetail);
    const color = palette[Math.min(li, palette.length - 1)];
    const mat = petalMat(color, 0.5 + li * 0.03);
    const offset = (rng() * Math.PI * 2) / layer.count;

    for (let i = 0; i < layer.count; i++) {
      const petal = new THREE.Mesh(geo, mat);
      const angle = offset + (i / layer.count) * Math.PI * 2 + (rng() - 0.5) * 0.08;
      const rad = layer.radius * (0.92 + rng() * 0.16);

      petal.position.set(
        Math.cos(angle) * rad,
        layer.y + (rng() - 0.5) * 0.025,
        Math.sin(angle) * rad
      );
      petal.rotation.order = "YXZ";
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = layer.tilt + (rng() - 0.5) * 0.18;
      petal.rotation.z = (rng() - 0.5) * 0.25;
      petal.scale.setScalar(0.9 + rng() * 0.2);
      petal.castShadow = true;
      petal.receiveShadow = true;
      bloom.add(petal);
    }
  });

  // Soft pink core (no harsh yellow ball)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xd81b60,
      roughness: 0.7,
      emissive: 0x4a0020,
      emissiveIntensity: 0.08,
    })
  );
  core.position.y = 0.18;
  bloom.add(core);

  group.scale.setScalar(scale);
  group.userData.bloom = bloom;
  group.userData.phase = rng() * Math.PI * 2;
  return group;
}

function createLeaf(w, len, seed) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(w, len * 0.25, w * 1.05, len * 0.55, 0.05, len);
  shape.bezierCurveTo(-w * 1.05, len * 0.55, -w, len * 0.25, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 12);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = v.y / len;
    v.z = Math.sin(t * Math.PI) * 0.04;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x1f5c32,
      roughness: 0.8,
      side: THREE.DoubleSide,
    })
  );
}

/** Handheld bouquet: 9 dense peonies in kraft wrap + satin ribbon bow */
export function createBouquet() {
  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);

  // Front row (high z / facing camera) gets highDetail
  const placements = [
    { x: 0.0, y: 0.12, z: 0.35, s: 1.12, seed: 11, open: 1.0, rx: -0.25, ry: 0.0, front: true },
    { x: 0.48, y: 0.02, z: 0.38, s: 1.05, seed: 22, open: 0.98, rx: -0.28, ry: 0.35, front: true },
    { x: -0.46, y: 0.04, z: 0.36, s: 1.06, seed: 33, open: 0.98, rx: -0.28, ry: -0.35, front: true },
    { x: 0.22, y: 0.28, z: -0.22, s: 0.88, seed: 44, open: 0.85, rx: 0.05, ry: 0.25 },
    { x: -0.25, y: 0.25, z: -0.25, s: 0.9, seed: 55, open: 0.88, rx: 0.02, ry: -0.3 },
    { x: 0.08, y: -0.05, z: 0.55, s: 1.0, seed: 66, open: 0.95, rx: -0.35, ry: 0.1, front: true },
    { x: -0.52, y: -0.08, z: 0.05, s: 0.84, seed: 77, open: 0.78, rx: -0.12, ry: -0.55 },
    { x: 0.55, y: -0.06, z: 0.02, s: 0.82, seed: 88, open: 0.75, rx: -0.1, ry: 0.6 },
    { x: -0.05, y: 0.38, z: 0.08, s: 0.8, seed: 99, open: 0.7, rx: 0.08, ry: 0.1 },
  ];

  for (const p of placements) {
    const flower = createPeony({
      scale: p.s,
      seed: p.seed,
      open: p.open,
      highDetail: !!p.front,
    });
    flower.position.set(p.x, p.y, p.z);
    flower.rotation.x = p.rx;
    flower.rotation.y = p.ry;
    wrap.add(flower);
  }

  // Kraft paper wrap (lathe cone with flared top)
  const kraftProfile = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = -2.15 + t * 2.35;
    // narrow bottom → wide open top
    const radius = 0.12 + Math.pow(t, 0.85) * 1.05;
    kraftProfile.push(new THREE.Vector2(radius, y));
  }
  const kraft = new THREE.Mesh(
    new THREE.LatheGeometry(kraftProfile, 36),
    new THREE.MeshStandardMaterial({
      color: 0xc4a574,
      roughness: 0.92,
      side: THREE.DoubleSide,
    })
  );
  kraft.position.y = -0.15;
  wrap.add(kraft);

  // White inner lining peeking at top rim
  const liner = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.04, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xfaf6f0, roughness: 0.85 })
  );
  liner.position.y = 0.12;
  liner.rotation.x = Math.PI / 2;
  wrap.add(liner);

  // Satin ribbon band
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

  // Bow loops
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
  // Trailing ribbon ends
  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.55, 0.01),
      ribbonMat
    );
    end.position.set(side * 0.12, -1.45, 0.2);
    end.rotation.z = side * 0.25;
    wrap.add(end);
  }

  root.userData.wrap = wrap;
  return root;
}
