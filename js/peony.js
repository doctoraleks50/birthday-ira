import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Bouquet from Sketchfab peony GLB (multiply + clear film wrap, tapered bottom).
 * Place file at: assets/models/peony.glb
 * Source intended: https://sketchfab.com/3d-models/peony-e5aacbac020d483094b110e11dd9b306
 */

const PEONY_URL = new URL("../assets/models/peony.glb", import.meta.url).href;

let _peonyTemplate = null;
let _loadPromise = null;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  root.position.sub(center); // center at origin

  // Sit bloom so stem hangs down a bit: shift so bottom is below 0
  const box2 = new THREE.Box3().setFromObject(root);
  const minY = box2.min.y;
  const maxY = box2.max.y;
  const h = Math.max(0.001, maxY - minY);
  // Target height ~1.15 for a single bloom head+stem
  const s = 1.15 / h;
  root.scale.setScalar(s);
  root.position.y -= minY * s; // bottom at 0
  // Move so flower head sits around y≈0.9 and stem goes down
  root.position.y -= 0.15;

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        }
      }
    }
  });
  return root;
}

export function loadPeonyModel() {
  if (_peonyTemplate) return Promise.resolve(_peonyTemplate);
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      PEONY_URL,
      (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        normalizeModel(root);
        _peonyTemplate = root;
        resolve(root);
      },
      undefined,
      (err) => {
        console.error("Failed to load peony.glb — put Sketchfab peony at assets/models/peony.glb", err);
        reject(err);
      }
    );
  });
  return _loadPromise;
}

function clonePeony() {
  if (!_peonyTemplate) throw new Error("peony not loaded");
  const c = _peonyTemplate.clone(true);
  // Clone materials so instances can vary slightly later if needed
  c.traverse((o) => {
    if (o.isMesh && o.material) {
      if (Array.isArray(o.material)) o.material = o.material.map((m) => m.clone());
      else o.material = o.material.clone();
    }
  });
  return c;
}

/** Clear florist film — wide at top, tapered narrow at bottom */
function createFilmWrap() {
  const group = new THREE.Group();
  const profile = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const y = -2.35 + t * 2.55;
    // narrow bottom → flared top (bouquet cone)
    const radius = 0.1 + Math.pow(t, 1.05) * 1.15;
    profile.push(new THREE.Vector2(radius, y));
  }

  const film = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xf7fbff,
      roughness: 0.12,
      metalness: 0.0,
      transmission: 0.82,
      thickness: 0.35,
      ior: 1.35,
      transparent: true,
      opacity: 0.55,
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  film.position.y = 0.05;
  group.add(film);

  // Soft white tissue fringe at the top rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.035, 8, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.55,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
  );
  rim.position.y = 0.22;
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  // Satin ribbon around the narrow waist
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.04, 10, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0xe91e8c,
      roughness: 0.28,
      clearcoat: 0.55,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xffb3d4),
    })
  );
  band.position.y = -1.15;
  band.rotation.x = Math.PI / 2;
  group.add(band);

  const ribbonMat = band.material;
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 8, 24, Math.PI * 1.4),
      ribbonMat
    );
    loop.position.set(side * 0.16, -1.05, 0.2);
    loop.rotation.set(0.3, side * 0.55, side * 0.85);
    group.add(loop);
  }
  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.01), ribbonMat);
    end.position.set(side * 0.1, -1.5, 0.18);
    end.rotation.z = side * 0.22;
    group.add(end);
  }

  return group;
}

/**
 * Async: load peony.glb, clone into a handheld bouquet in clear film.
 */
export async function createBouquet() {
  await loadPeonyModel();

  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);

  // Spread blooms like a real hand bouquet (heads up, stems into wrap)
  const placements = [
    { x: 0.0, y: 0.55, z: 0.22, s: 1.05, rx: -0.35, ry: 0.05, rz: 0 },
    { x: 0.32, y: 0.42, z: 0.18, s: 0.95, rx: -0.3, ry: 0.45, rz: 0.08 },
    { x: -0.3, y: 0.44, z: 0.16, s: 0.96, rx: -0.3, ry: -0.45, rz: -0.08 },
    { x: 0.18, y: 0.62, z: -0.08, s: 0.88, rx: -0.15, ry: 0.25, rz: 0.05 },
    { x: -0.2, y: 0.6, z: -0.1, s: 0.9, rx: -0.15, ry: -0.28, rz: -0.05 },
    { x: 0.42, y: 0.35, z: -0.05, s: 0.82, rx: -0.2, ry: 0.75, rz: 0.1 },
    { x: -0.42, y: 0.36, z: -0.02, s: 0.82, rx: -0.2, ry: -0.75, rz: -0.1 },
  ];

  const rng = mulberry32(42);
  for (const p of placements) {
    const flower = clonePeony();
    flower.position.set(p.x, p.y, p.z);
    flower.rotation.set(p.rx, p.ry, p.rz);
    flower.scale.multiplyScalar(p.s * (0.96 + rng() * 0.08));
    // Tiny sway phase for animation hook
    flower.userData.bloom = flower;
    flower.userData.phase = rng() * Math.PI * 2;
    wrap.add(flower);
  }

  wrap.add(createFilmWrap());

  root.userData.wrap = wrap;
  root.userData.fromGltf = true;
  return root;
}

/** Sync fallback stub — scene uses async path */
export function createPeony() {
  return new THREE.Group();
}
