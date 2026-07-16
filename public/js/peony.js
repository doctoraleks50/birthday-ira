import * as THREE from "three";

/** Soft peony petal — curved surface as ExtrudeGeometry from organic shape */
function createPetalGeometry(width = 1, length = 1.4, curl = 0.5) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.6, length * 0.1, width * 0.8, length * 0.5, width * 0.2, length * 0.98);
  shape.bezierCurveTo(0, length * 1.1, 0, length * 1.1, -width * 0.2, length * 0.98);
  shape.bezierCurveTo(-width * 0.8, length * 0.5, -width * 0.6, length * 0.1, 0, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.026,
    bevelSegments: 3,
    curveSegments: 24,
  });

  // Curl petal tip toward center / outward
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = Math.max(0, v.y / length);
    const fold = Math.sin(t * Math.PI) * curl;
    v.z += fold * (0.45 + t * 0.9);
    // taper to a round tip
    v.x *= 1 - t * 0.12;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.translate(0, 0, 0);
  return geo;
}

function petalMaterial(hex, roughness = 0.55) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness,
    metalness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffd6e8),
    sheenRoughness: 0.55,
    side: THREE.DoubleSide,
  });
}

/**
 * Full peony flower: layered rings of individually modeled petals + center.
 */
export function createPeony({
  scale = 1,
  seed = 1,
  palette = [0xf7a8c4, 0xff8fab, 0xf48fb1, 0xe85d8a, 0xffc2d4],
} = {}) {
  const group = new THREE.Group();
  const rng = mulberry32(seed);

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 2.4, 8);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d5a3d, roughness: 0.85 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = -1.35;
  group.add(stem);

  // Leaves
  for (let i = 0; i < 3; i++) {
    const leaf = createLeaf(0.35 + rng() * 0.2, 0.9 + rng() * 0.3);
    leaf.position.set((rng() - 0.5) * 0.15, -0.7 - i * 0.45, (rng() - 0.5) * 0.1);
    leaf.rotation.z = (i % 2 === 0 ? 1 : -1) * (0.6 + rng() * 0.4);
    leaf.rotation.y = rng() * Math.PI;
    group.add(leaf);
  }

  const bloom = new THREE.Group();
  bloom.position.y = 0.15;
  group.add(bloom);

  // Layers: outer → inner
  const layers = [
    { count: 12, radius: 0.46, tilt: 1.15, len: 1.45, w: 0.9,  curl: 0.55, y: -0.06 },
    { count: 11, radius: 0.36, tilt: 0.95, len: 1.25, w: 0.78, curl: 0.5,  y: 0.01 },
    { count: 10, radius: 0.26, tilt: 0.65, len: 1.08, w: 0.66, curl: 0.4,  y: 0.08 },
    { count: 9,  radius: 0.16, tilt: 0.35, len: 0.9,  w: 0.52, curl: 0.3,  y: 0.14 },
    { count: 7,  radius: 0.06, tilt: 0.12, len: 0.62, w: 0.38, curl: 0.22, y: 0.2  },
  ];

  layers.forEach((layer, li) => {
    const geo = createPetalGeometry(layer.w, layer.len, layer.curl);
    const color = palette[li % palette.length];
    const mat = petalMaterial(color, 0.45 + li * 0.04);
    const offset = (rng() * Math.PI * 2) / layer.count;

    for (let i = 0; i < layer.count; i++) {
      const petal = new THREE.Mesh(geo, mat);
      const angle = offset + (i / layer.count) * Math.PI * 2;
      const wobble = (rng() - 0.5) * 0.12;

      petal.position.set(
        Math.cos(angle) * layer.radius,
        layer.y + (rng() - 0.5) * 0.03,
        Math.sin(angle) * layer.radius
      );
      petal.rotation.order = "YXZ";
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = layer.tilt + wobble;
      petal.rotation.z = (rng() - 0.5) * 0.2;
      petal.scale.setScalar(0.92 + rng() * 0.16);
      petal.castShadow = true;
      petal.receiveShadow = true;
      bloom.add(petal);
    }
  });

  // Center (anthers / core)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.45, emissive: 0x332200, emissiveIntensity: 0.15 })
  );
  core.position.y = 0.2;
  bloom.add(core);

  for (let i = 0; i < 18; i++) {
    const anther = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.4 })
    );
    const a = (i / 18) * Math.PI * 2;
    anther.position.set(Math.cos(a) * 0.1, 0.22 + Math.sin(i) * 0.04, Math.sin(a) * 0.1);
    bloom.add(anther);
  }

  group.scale.setScalar(scale);
  group.userData.bloom = bloom;
  group.userData.phase = rng() * Math.PI * 2;
  return group;
}

function createLeaf(w, len) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(w, len * 0.4, 0, len);
  shape.quadraticCurveTo(-w, len * 0.4, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false, curveSegments: 8 });
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x3d7a4a, roughness: 0.75, side: THREE.DoubleSide })
  );
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Arrangement of peonies as a handheld bouquet */
export function createBouquet() {
  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);

  const placements = [
    { x: 0, y: 0, z: 0, s: 1.05, seed: 11, rot: 0 },
    { x: 0.55, y: -0.15, z: 0.25, s: 0.88, seed: 22, rot: 0.4 },
    { x: -0.5, y: -0.1, z: 0.2, s: 0.9, seed: 33, rot: -0.35 },
    { x: 0.25, y: 0.2, z: -0.35, s: 0.82, seed: 44, rot: 0.2 },
    { x: -0.3, y: 0.15, z: -0.3, s: 0.85, seed: 55, rot: -0.25 },
    { x: 0.05, y: -0.35, z: 0.45, s: 0.78, seed: 66, rot: 0.5 },
    { x: -0.55, y: -0.4, z: -0.1, s: 0.75, seed: 77, rot: -0.6 },
  ];

  const palettes = [
    [0xf7a8c4, 0xff8fab, 0xf48fb1, 0xe85d8a, 0xffc2d4],
    [0xffd6e0, 0xffb3c6, 0xff8fab, 0xf48fb1, 0xffc2d1],
    [0xe8b4c8, 0xd4a5b8, 0xc98ba8, 0xb76e9a, 0xf0d0dc],
    [0xff9ebd, 0xff7aa2, 0xf06292, 0xec407a, 0xffc1d6],
  ];

  for (const p of placements) {
    const flower = createPeony({
      scale: p.s,
      seed: p.seed,
      palette: palettes[p.seed % palettes.length],
    });
    flower.position.set(p.x, p.y, p.z);
    flower.rotation.y = p.rot;
    flower.rotation.x = -0.15 + (p.seed % 5) * 0.03;
    wrap.add(flower);
  }

  // Paper wrap — smoother lathe rather than simple cone
  const wrapProfile = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const y = -1.9 + t * 2.1;
    const radius = 0.2 + Math.pow(t, 0.7) * 0.9 + (1 - t) * 0.05;
    wrapProfile.push(new THREE.Vector2(radius, y));
  }
  const paperGeo = new THREE.LatheGeometry(wrapProfile, 28);
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf5e6d3,
    side: THREE.DoubleSide,
    roughness: 0.9,
    transparent: true,
    opacity: 0.92,
  });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  paper.position.y = -0.2;
  paper.rotation.x = Math.PI;
  wrap.add(paper);

  // Ribbon
  const ribbon = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.035, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xc9184a, roughness: 0.4, metalness: 0.15 })
  );
  ribbon.position.y = -1.15;
  ribbon.rotation.x = Math.PI / 2;
  wrap.add(ribbon);

  root.userData.wrap = wrap;
  return root;
}
