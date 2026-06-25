// ============================================================================
//  wheel.js  —  The 3D roulette wheel, balls, and the spin animation
// ============================================================================
import * as THREE from 'three';
import { WHEEL_ORDER, POCKET_COUNT, colourOf, COLOURS } from './data.js';

const STEP = (Math.PI * 2) / POCKET_COUNT;

// Geometry radii (world units).
const POCKET_INNER = 2.28;
const POCKET_OUTER = 3.0;
const R_POCKET = 2.64;            // resting radius of a ball in its pocket
const ROTOR_FLOOR = 0.16;
const POCKET_Y = 0.19;
const BALL_R = 0.13;

// Ball flight envelope.
const ORBIT_START_R = 4.2;
const ORBIT_START_Y = 0.6;
const POCKET_REST_Y = 0.24;

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

// --- Canvas texture for a single pocket number -----------------------------
function numberTexture(n, colour) {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 96, 96);
  g.fillStyle = '#ffffff';
  g.font = 'bold 56px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 4;
  g.fillText(String(n), 48, 50);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

export function buildWheel(scene) {
  const root = new THREE.Group();
  scene.add(root);

  // ---------------------------------------------------------------------
  //  STATOR  (the static bowl the ball spins around)
  // ---------------------------------------------------------------------
  const stator = new THREE.Group();
  root.add(stator);

  // Bowl profile lathed around Y — a smooth curved track.
  const profile = [
    new THREE.Vector2(3.05, 0.02),
    new THREE.Vector2(3.35, 0.08),
    new THREE.Vector2(3.8, 0.26),
    new THREE.Vector2(4.25, 0.5),
    new THREE.Vector2(4.7, 0.86),
    new THREE.Vector2(5.05, 1.2),
    new THREE.Vector2(5.25, 1.32),
  ];
  const bowlGeo = new THREE.LatheGeometry(profile, 96);
  const bowlMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a12, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide,
  });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.receiveShadow = true;
  stator.add(bowl);

  // Polished gold rim around the very top.
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(5.18, 0.16, 24, 96),
    new THREE.MeshStandardMaterial({ color: COLOURS.gold, roughness: 0.18, metalness: 1.0 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.3;
  rim.castShadow = true;
  stator.add(rim);

  // Ball-track lip (where the ball orbits) — a thin glossy ring.
  const track = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.05, 16, 96),
    new THREE.MeshStandardMaterial({ color: 0x6b5a3a, roughness: 0.25, metalness: 0.8 }),
  );
  track.rotation.x = Math.PI / 2;
  track.position.y = 0.52;
  stator.add(track);

  // Diamond deflectors on the bowl wall.
  const defMat = new THREE.MeshStandardMaterial({ color: 0xcfcfd6, roughness: 0.2, metalness: 0.95 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), defMat);
    d.position.set(Math.cos(a) * 4.55, 0.74, Math.sin(a) * 4.55);
    d.scale.set(1, 0.6, 1.4);
    d.lookAt(0, 0.74, 0);
    d.castShadow = true;
    stator.add(d);
  }

  // ---------------------------------------------------------------------
  //  ROTOR  (the rotating wheel head with numbered pockets)
  // ---------------------------------------------------------------------
  const rotor = new THREE.Group();
  root.add(rotor);

  // Dark base disc.
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(POCKET_OUTER + 0.04, POCKET_OUTER + 0.04, 0.3, 96),
    new THREE.MeshStandardMaterial({ color: 0x16110c, roughness: 0.4, metalness: 0.6 }),
  );
  base.position.y = ROTOR_FLOOR - 0.05;
  base.receiveShadow = true;
  base.castShadow = true;
  rotor.add(base);

  const fretMat = new THREE.MeshStandardMaterial({ color: 0xe7c878, roughness: 0.2, metalness: 1.0 });

  for (let i = 0; i < POCKET_COUNT; i++) {
    const n = WHEEL_ORDER[i];
    // RingGeometry theta maps to the rotor's local XZ angle with a sign flip
    // (after the -90° X rotation), so mirror thetaStart to align the coloured
    // wedge with its number label and the ball's landing angle.
    const a0 = -i * STEP - STEP / 2;

    // Coloured pocket wedge.
    const wedge = new THREE.Mesh(
      new THREE.RingGeometry(POCKET_INNER, POCKET_OUTER, 6, 1, a0, STEP),
      new THREE.MeshStandardMaterial({
        color: COLOURS[colourOf(n)], roughness: 0.45, metalness: 0.35,
        emissive: COLOURS[colourOf(n)], emissiveIntensity: 0.05,
      }),
    );
    wedge.rotation.x = -Math.PI / 2;
    wedge.position.y = POCKET_Y;
    wedge.receiveShadow = true;
    rotor.add(wedge);

    // Radial metal fret between pockets.
    const fret = new THREE.Mesh(new THREE.BoxGeometry(POCKET_OUTER - POCKET_INNER + 0.1, 0.12, 0.03), fretMat);
    const af = i * STEP - STEP / 2;
    fret.position.set(Math.cos(af) * (R_POCKET), POCKET_Y + 0.06, Math.sin(af) * (R_POCKET));
    fret.rotation.y = -af;
    rotor.add(fret);

    // Number label, lying flat, reading outward.
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshBasicMaterial({ map: numberTexture(n, colourOf(n)), transparent: true }),
    );
    const am = i * STEP;
    label.position.set(Math.cos(am) * 2.78, POCKET_Y + 0.011, Math.sin(am) * 2.78);
    label.rotation.x = -Math.PI / 2;
    label.rotation.z = -am + Math.PI / 2;
    rotor.add(label);
  }

  // Inner gold ring framing the pockets.
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(POCKET_INNER, 0.05, 16, 96),
    fretMat,
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = POCKET_Y + 0.05;
  rotor.add(innerRing);

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(POCKET_OUTER, 0.06, 16, 96),
    fretMat,
  );
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = POCKET_Y + 0.05;
  rotor.add(outerRing);

  // Central turret / spinner.
  const turret = new THREE.Group();
  turret.position.y = POCKET_Y;
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 1.9, 1.5, 48),
    new THREE.MeshStandardMaterial({ color: COLOURS.gold, roughness: 0.15, metalness: 1.0 }),
  );
  cone.position.y = 0.75;
  cone.castShadow = true;
  turret.add(cone);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xfff2cc, roughness: 0.1, metalness: 1.0, emissive: 0x4a3a10, emissiveIntensity: 0.4 }),
  );
  knob.position.y = 1.6;
  turret.add(knob);
  // Cross handles.
  for (let i = 0; i < 4; i++) {
    const h = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.07, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xe7c878, roughness: 0.2, metalness: 1.0 }),
    );
    h.position.y = 1.45;
    h.rotation.y = (i / 4) * Math.PI;
    turret.add(h);
  }
  rotor.add(turret);

  // ---------------------------------------------------------------------
  //  BALLS
  // ---------------------------------------------------------------------
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.04, metalness: 0.2,
    emissive: 0xffffff, emissiveIntensity: 0.35,
  });
  const balls = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 24), ballMat.clone());
    b.castShadow = true;
    b.visible = false;
    root.add(b);
    balls.push({ mesh: b, active: false, landed: false, localAngle: 0, radius: R_POCKET, height: POCKET_REST_Y });
  }

  // ---------------------------------------------------------------------
  //  Animation state
  // ---------------------------------------------------------------------
  let spinning = false;
  let spinStart = 0;
  let elapsed = 0;
  let duration = 6.2;
  let rotorStart = 0;
  let rotorEnd = 0;
  let spinResolve = null;
  let onRattle = null;
  let rattledAt = 0;
  let droppedFlags = [];
  let onDrop = null;
  let idleSpeed = 0.12;

  function pocketAngleOf(num) {
    const idx = WHEEL_ORDER.indexOf(num);
    return idx * STEP;
  }

  // Begin a spin toward the given winning numbers (one per ball).
  function spin(results, { onRattle: r, onDrop: d } = {}) {
    spinning = true;
    spinStart = performance.now();
    elapsed = 0;
    duration = 5.6 + Math.random() * 1.0;
    onRattle = r; onDrop = d;
    rattledAt = 0;
    droppedFlags = results.map(() => false);

    rotorStart = rotor.rotation.y;
    const rotorRevs = 5 + Math.random() * 2;
    rotorEnd = rotorStart + rotorRevs * Math.PI * 2;

    results.forEach((num, i) => {
      const b = balls[i];
      b.active = true;
      b.landed = false;
      b.mesh.visible = true;
      b.result = num;
      // Each ball gets its own radius lane + revolution count so they read independently.
      b.laneR = ORBIT_START_R - i * 0.16;
      b.restR = R_POCKET - i * 0.16;
      b.ballRevs = (8 + Math.random() * 3 + i * 0.7);
      b.phase0 = Math.random() * Math.PI * 2;
      const pa = pocketAngleOf(num);
      // World angle of a rotor pocket at rotation θ is (localAngle − θ), because
      // Three's Y-rotation flips our (cosα, sinα) polar convention. Land there.
      b.worldEnd = pa - rotorEnd;
      b.worldStart = b.phase0;
      // Travel inwards across ballRevs full turns, decelerating into worldEnd.
      b.worldStartAdj = b.worldEnd + b.ballRevs * Math.PI * 2;
    });
    for (let i = results.length; i < balls.length; i++) {
      balls[i].active = false;
      balls[i].mesh.visible = false;
    }

    return new Promise((res) => { spinResolve = res; });
  }

  function update(dt) {
    // Idle rotor breathing when not spinning.
    if (!spinning) {
      rotor.rotation.y += idleSpeed * dt;
      // landed balls ride along with the rotor.
      for (const b of balls) {
        if (b.landed && b.active) placeBallLocal(b);
      }
      turretSpin(dt);
      return;
    }

    // Wall-clock driven so the spin always lasts ~`duration` seconds,
    // independent of frame rate (low-end devices won't run it in slow-mo).
    elapsed = (performance.now() - spinStart) / 1000;
    const t = Math.min(elapsed / duration, 1);
    const er = easeOutCubic(t);

    rotor.rotation.y = rotorStart + (rotorEnd - rotorStart) * er;
    turretSpin(dt);

    // Rattle sound as the ball nears the end of its run.
    if (onRattle && t > 0.72 && elapsed - rattledAt > 0.22) {
      rattledAt = elapsed;
      onRattle();
    }

    let allLanded = true;
    balls.forEach((b, i) => {
      if (!b.active) return;
      const tb = Math.min(t, 1);
      const e = easeOutQuint(tb);

      // Angle: travel from start (far) to world-end, decelerating.
      const ang = b.worldStartAdj - (b.worldStartAdj - b.worldEnd) * e;

      // Radius: hold near the rim, then spiral inward over the last 38%.
      let r;
      const spiralStart = 0.62;
      if (tb < spiralStart) {
        r = b.laneR;
      } else {
        const k = (tb - spiralStart) / (1 - spiralStart);
        r = b.laneR + (b.restR - b.laneR) * easeOutCubic(k);
      }

      // Height: drop as it spirals in, with a couple of damped bounces.
      let y;
      if (tb < spiralStart) {
        y = ORBIT_START_Y;
      } else {
        const k = (tb - spiralStart) / (1 - spiralStart);
        const fall = ORBIT_START_Y + (POCKET_REST_Y - ORBIT_START_Y) * easeOutCubic(k);
        const bounce = Math.max(0, 1 - k) * 0.12 * Math.abs(Math.sin(k * Math.PI * 4));
        y = fall + bounce;
      }

      // Late-stage angular jitter to mimic bouncing across frets.
      let jitter = 0;
      if (tb > 0.85 && tb < 0.995) {
        jitter = (1 - (tb - 0.85) / 0.145) * 0.05 * Math.sin(tb * 140 + i);
      }

      b.mesh.position.set(Math.cos(ang + jitter) * r, y, Math.sin(ang + jitter) * r);

      if (onDrop && !droppedFlags[i] && tb > 0.92) {
        droppedFlags[i] = true;
        onDrop();
      }

      if (tb >= 1) {
        // Lock the ball to its pocket in rotor-local space.
        b.landed = true;
        b.localAngle = pocketAngleOf(b.result);
        b.radius = b.restR;
        b.height = POCKET_REST_Y;
        placeBallLocal(b);
      } else {
        allLanded = false;
      }
    });

    if (t >= 1 && allLanded) {
      spinning = false;
      const res = spinResolve;
      spinResolve = null;
      if (res) res();
    }
  }

  // Position a landed ball relative to the (still slowly turning) rotor.
  function placeBallLocal(b) {
    const a = b.localAngle - rotor.rotation.y;
    b.mesh.position.set(Math.cos(a) * b.radius, b.height, Math.sin(a) * b.radius);
  }

  function turretSpin(dt) {
    turret.rotation.y -= dt * 0.6;
  }

  function hideBalls() {
    for (const b of balls) { b.active = false; b.landed = false; b.mesh.visible = false; }
  }

  return { root, rotor, stator, update, spin, hideBalls, get spinning() { return spinning; } };
}
