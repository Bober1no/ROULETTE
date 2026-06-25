// ============================================================================
//  three-scene.js  —  Renderer, camera, lights, post-processing
// ============================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.FogExp2(0x05070d, 0.018);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 11.5, 13.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.5, 0);
  controls.minDistance = 9;
  controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.4;

  // ---- Lighting --------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x4a5a7a, 0.55));

  const hemi = new THREE.HemisphereLight(0x88aaff, 0x10221a, 0.5);
  scene.add(hemi);

  const key = new THREE.SpotLight(0xfff0d8, 700, 60, Math.PI / 5, 0.5, 1.6);
  key.position.set(6, 18, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 50;
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.PointLight(0x3a6bff, 180, 40, 2);
  rim.position.set(-9, 6, -6);
  scene.add(rim);

  const gold = new THREE.PointLight(0xffcb6b, 120, 30, 2);
  gold.position.set(8, 4, -5);
  scene.add(gold);

  // ---- Environment: a dark casino floor + glowing horizon -------------
  const floorGeo = new THREE.CircleGeometry(60, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e16, roughness: 0.85, metalness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  // Subtle glowing ring on the floor for atmosphere.
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(7.2, 7.6, 96),
    new THREE.MeshBasicMaterial({ color: 0x1c6bff, transparent: true, opacity: 0.25 }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.01;
  scene.add(halo);

  // ---- Post-processing: bloom for that neon casino glow ----------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.7, 0.85);
  composer.addPass(bloom);

  function resize(w, h) {
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { renderer, scene, camera, controls, composer, bloom, lights: { key, rim, gold, halo }, resize };
}
