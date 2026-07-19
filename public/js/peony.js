import * as THREE from "three";

/**
 * Photoreal peony bouquet from painted reference images.
 * Drag-rotate crossfades front → 3/4 → top.
 */

const BASE = new URL("../assets/bouquet/", import.meta.url);
const NAMES = ["peony-front.webp", "peony-threeq.webp", "peony-top.webp"];

let _texPromise = null;

function loadTex(name) {
  const loader = new THREE.TextureLoader();
  return loader.loadAsync(new URL(name, BASE).href).then((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  });
}

/** Start downloading textures ASAP (intro / greeting). */
export function preloadBouquetTextures() {
  if (!_texPromise) {
    _texPromise = Promise.all(NAMES.map(loadTex)).catch((err) => {
      console.warn("bouquet preload", err);
      _texPromise = null;
      throw err;
    });
  }
  return _texPromise;
}

function makeCard(tex, w, h) {
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

/**
 * Async bouquet: beautiful painted peonies as layered cards.
 */
export async function createBouquet() {
  const [frontTex, threeQTex, topTex] = await preloadBouquetTextures();

  const root = new THREE.Group();
  const wrap = new THREE.Group();
  root.add(wrap);

  const front = makeCard(frontTex, 2.55, 3.2);
  const threeQ = makeCard(threeQTex, 2.55, 3.2);
  const top = makeCard(topTex, 2.7, 2.7);

  front.position.set(0, 0.55, 0);
  threeQ.position.set(0, 0.55, -0.02);
  top.position.set(0, 0.7, -0.04);
  top.rotation.x = -0.15;

  threeQ.material.opacity = 0;
  top.material.opacity = 0;

  wrap.add(front);
  wrap.add(threeQ);
  wrap.add(top);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 32),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.95;
  wrap.add(shadow);

  root.userData.wrap = wrap;
  root.userData.cards = { front, threeQ, top };
  root.userData.fromPhotos = true;
  root.userData.phase = 0;

  front.userData.bloom = front;
  front.userData.phase = 0;

  return root;
}

export function createPeony() {
  return new THREE.Group();
}
