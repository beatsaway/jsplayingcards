import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { applyCameraView, cameraViews } from "./cameraview.js";
import {
  applyCardBend,
  computeGridLayout,
  createFloatState,
  createFlipState,
  createFountainState,
  createHelixState,
  createRippleState,
  createRingState,
  createScatterState,
  createSnakeState,
  createSpringState,
  createSpiralState,
  resolveCollisions,
  stepFloat,
  stepFlip,
  stepFountain,
  stepHelix,
  stepRipple,
  stepRing,
  stepScatter,
  stepSnake,
  stepSpring,
  stepSpiral,
} from "./physics.js?v=layouts3";

const deck = new window.Deck();
const cardRenderer = new window.CardRenderer();
const staging = document.getElementById("card-staging");
const container = document.getElementById("three-root");
const modeSelect = document.getElementById("layout-mode");
const textureCache = new Map();
const backVariant = Number(staging?.dataset.backVariant || 4);
const layout = {
  columns: 13,
  spacingX: 1.02,
  spacingY: 1.45,
  cardWidth: 1,
  cardHeight: 1.4,
};
const CARD_PIXEL_WIDTH = 110;
const CARD_PIXEL_HEIGHT = Math.round((CARD_PIXEL_WIDTH * 7) / 5);
const CARD_PIXEL_SCALE = 2;
let gridWidth = 0;
let gridHeight = 0;
let gridTargets = [];
let cardMeshes = [];
let floatState = null;
let flipState = null;
let fountainState = null;
let helixState = null;
let rippleState = null;
let spiralState = null;
let ringState = null;
let scatterState = null;
let snakeState = null;
let springState = null;
let layoutMode = "grid";
let transition = null;
let hasInitialized = false;
const TRANSITION_DURATION = 0.8;
let cameraTransition = null;
const CAMERA_TRANSITION_DURATION = 2.4;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.1, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const clock = new THREE.Clock();

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  updateCameraDistance();
  camera.updateProjectionMatrix();
}

async function cardTexture(rank, suitName) {
  const key = `${rank}-${suitName}`;
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  const card = deck.getCard(rank, suitName);
  if (!card) {
    return null;
  }

  staging.innerHTML = "";
  staging.appendChild(cardRenderer.createCardElement(card));
  const canvas = await window.html2canvas(staging.firstElementChild, { backgroundColor: null, scale: 2 });
  const roundedCanvas = applyRoundedMask(canvas, 0);

  const texture = new THREE.CanvasTexture(roundedCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

async function backTexture(variant) {
  const key = `back-${variant}`;
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  let canvas = null;
  if (variant === 2 || variant === 4) {
    canvas = createBackPatternCanvas(variant);
  } else {
    staging.innerHTML = "";
    staging.appendChild(createBackElement(variant));
    canvas = await window.html2canvas(staging.firstElementChild, {
      backgroundColor: null,
      scale: CARD_PIXEL_SCALE,
    });
  }
  const roundedCanvas = applyRoundedMask(canvas, 0);

  const texture = new THREE.CanvasTexture(roundedCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

function createBackElement(variant) {
  if (typeof cardRenderer.createBackCardElement === "function") {
    return cardRenderer.createBackCardElement(variant);
  }

  const cardNode = document.createElement("div");
  cardNode.className = `card back back-${variant}`;

  const pattern = document.createElement("div");
  pattern.className = "back-pattern";
  cardNode.appendChild(pattern);
  return cardNode;
}

function createBackPatternCanvas(variant) {
  if (variant !== 2 && variant !== 4) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_PIXEL_WIDTH * CARD_PIXEL_SCALE;
  canvas.height = CARD_PIXEL_HEIGHT * CARD_PIXEL_SCALE;
  const ctx = canvas.getContext("2d");
  const scale = CARD_PIXEL_SCALE;

  const baseColor = "#ffffff";
  const patternColor = "#f87171";
  const borderColor = "#f87171";
  const inset = 10 * scale;
  const patternRadius = 4 * scale;
  const borderWidth = 2 * scale;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const patternRect = {
    x: inset,
    y: inset,
    width: canvas.width - inset * 2,
    height: canvas.height - inset * 2,
  };

  ctx.save();
  roundRectPath(ctx, patternRect, patternRadius);
  ctx.clip();

  if (variant === 2) {
    drawDotPattern(ctx, patternRect, 6 * scale, 1.5 * scale, 1 * scale, 1 * scale, patternColor);
    drawDotPattern(ctx, patternRect, 9 * scale, 2 * scale, 3 * scale, 2 * scale, patternColor);
  } else {
    drawDotPattern(ctx, patternRect, 7 * scale, 1.65 * scale, 0, 0, patternColor);
    drawDotPattern(ctx, patternRect, 4 * scale, 1.1 * scale, 2 * scale, 2 * scale, patternColor);
  }
  ctx.restore();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  roundRectPath(ctx, patternRect, patternRadius);
  ctx.stroke();

  return canvas;
}

function drawDotPattern(ctx, rect, step, radius, offsetX, offsetY, color) {
  ctx.fillStyle = color;
  const startX = rect.x + offsetX;
  const startY = rect.y + offsetY;
  const endX = rect.x + rect.width;
  const endY = rect.y + rect.height;

  for (let y = startY; y <= endY; y += step) {
    for (let x = startX; x <= endX; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function roundRectPath(ctx, rect, radius) {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.lineTo(rect.x + rect.width - r, rect.y);
  ctx.quadraticCurveTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + r);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - r);
  ctx.quadraticCurveTo(
    rect.x + rect.width,
    rect.y + rect.height,
    rect.x + rect.width - r,
    rect.y + rect.height
  );
  ctx.lineTo(rect.x + r, rect.y + rect.height);
  ctx.quadraticCurveTo(rect.x, rect.y + rect.height, rect.x, rect.y + rect.height - r);
  ctx.lineTo(rect.x, rect.y + r);
  ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y);
  ctx.closePath();
}

async function createCardMesh(rank, suitName, position) {
  const texture = await cardTexture(rank, suitName);
  if (!texture) {
    return null;
  }

  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const backCardTexture = await backTexture(backVariant);
  if (backCardTexture) {
    backCardTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  const geometry = new THREE.BoxGeometry(1, 1.4, 0.02, 6, 8, 1);

  const frontMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.FrontSide,
  });
  const backMaterial = new THREE.MeshBasicMaterial({
    map: backCardTexture || null,
    transparent: true,
    side: THREE.FrontSide,
  });
  const sideMaterial = new THREE.MeshBasicMaterial({ color: 0xe5e7eb });

  const mesh = new THREE.Mesh(geometry, [
    sideMaterial,
    sideMaterial,
    sideMaterial,
    sideMaterial,
    frontMaterial,
    backMaterial,
  ]);
  mesh.userData.geometry = geometry;
  mesh.position.copy(position);
  return mesh;
}

function updateCameraDistance() {
  if (!gridWidth || !gridHeight) {
    return;
  }
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distanceForWidth = gridWidth / 2 / (Math.tan(fov / 2) * camera.aspect);
  const distanceForHeight = gridHeight / 2 / Math.tan(fov / 2);
  const distance = Math.max(distanceForWidth, distanceForHeight) + 1.5;
  camera.position.set(0, 0.1, distance);
}

async function initScene() {
  const { positions, rows, gridWidth: width, gridHeight: height } = computeGridLayout(
    deck.cards.length,
    layout
  );
  gridWidth = width;
  gridHeight = height;
  gridTargets = positions;
  updateCameraDistance();

  cardMeshes = await Promise.all(
    deck.cards.map((card, index) => {
      const position = gridTargets[index] || new THREE.Vector3();
      return createCardMesh(card.rank, card.suit.name, position);
    })
  );

  cardMeshes.filter(Boolean).forEach((mesh) => scene.add(mesh));
  const bounds = {
    width: Math.max(gridWidth * 1.2, 6),
    height: Math.max(gridHeight * 1.2, 3.5),
    depth: 1.8,
  };
  floatState = createFloatState(cardMeshes.length, bounds);
  flipState = createFlipState(cardMeshes.length);
  fountainState = createFountainState(cardMeshes.length);
  helixState = createHelixState(cardMeshes.length);
  rippleState = createRippleState(cardMeshes.length);
  spiralState = createSpiralState(cardMeshes.length, bounds);
  ringState = createRingState(cardMeshes.length, bounds);
  scatterState = createScatterState(cardMeshes.length, bounds);
  snakeState = createSnakeState(cardMeshes.length, bounds);
  springState = createSpringState(cardMeshes.length);
  setLayoutMode(modeSelect?.value || "grid");
  hasInitialized = true;
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  let transitionT = null;
  if (transition) {
    transitionT = Math.min(1, (time - transition.startTime) / transition.duration);
    if (transitionT >= 1) {
      transition = null;
      transitionT = null;
    }
  }

  if (cameraTransition) {
    const camT = Math.min(1, (time - cameraTransition.startTime) / cameraTransition.duration);
    const eased = camT * camT * (3 - 2 * camT);
    camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, eased);
    camera.quaternion.slerpQuaternions(
      cameraTransition.fromQuaternion,
      cameraTransition.toQuaternion,
      eased
    );
    camera.fov = THREE.MathUtils.lerp(cameraTransition.fromFov, cameraTransition.toFov, eased);
    camera.near = THREE.MathUtils.lerp(cameraTransition.fromNear, cameraTransition.toNear, eased);
    camera.far = THREE.MathUtils.lerp(cameraTransition.fromFar, cameraTransition.toFar, eased);
    camera.updateProjectionMatrix();
    controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, eased);
    if (camT >= 1) {
      cameraTransition = null;
    }
  }

  if (layoutMode === "dance" && springState) {
    stepSpring(springState, time, gridTargets, { spacing: 1.1, gap: 1.6, hopHeight: 0.7 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = springState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(springState.rotations[index]);
      const targetBend = springState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "float" && floatState) {
    stepFloat(floatState, time, gridTargets, { spacing: 1.25 });
    resolveCollisions(floatState.positions, 0.7, 6, { softness: 0.55, maxPush: 0.06 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = floatState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(floatState.rotations[index]);
      const targetBend = floatState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "spiral" && spiralState) {
    stepSpiral(spiralState, time, gridTargets, {
      spacing: 0.22,
      spiralTightness: 0.45,
      spinSpeed: 0.18,
    });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = spiralState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(spiralState.rotations[index]);
      const targetBend = spiralState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "helix" && helixState) {
    stepHelix(helixState, time, gridTargets, { radius: 2.2, height: 4.4, spinSpeed: 0.55 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = helixState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(helixState.rotations[index]);
      const targetBend = helixState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "fountain" && fountainState) {
    stepFountain(fountainState, time, gridTargets, {
      spacing: 0.6,
      height: 2.9,
      spread: 0.35,
      cycle: 2.1,
      groupSize: 5,
    });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = fountainState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(fountainState.rotations[index]);
      const targetBend = fountainState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "circle" && ringState) {
    stepRing(ringState, time, gridTargets, { radius: 3.2, spinSpeed: 0.6, spacing: 0.9 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = ringState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(ringState.rotations[index]);
      const targetBend = ringState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "ring" && snakeState) {
    stepSnake(snakeState, time, gridTargets, { radius: 3.2, waveAmp: 0.32, waveSpeed: 1.3 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = snakeState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(snakeState.rotations[index]);
      const targetBend = snakeState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "ripple" && rippleState) {
    stepRipple(rippleState, time, gridTargets, { spacing: 1.05, waveAmp: 0.22, waveSpeed: 1.5 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = rippleState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(rippleState.rotations[index]);
      const targetBend = rippleState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "scatter" && scatterState) {
    stepScatter(scatterState, time, gridTargets, { spread: 1.45, driftSpeed: 0.9 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = scatterState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(scatterState.rotations[index]);
      const targetBend = scatterState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (layoutMode === "flip" && flipState) {
    stepFlip(flipState, time, gridTargets, { spacing: 1.05, waveSpeed: 1.8, phaseStep: 0.35 });
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const targetPos = flipState.positions[index];
      const targetQuat = new THREE.Quaternion().setFromEuler(flipState.rotations[index]);
      const targetBend = flipState.bends[index];
      applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT);
    });
  } else if (gridTargets.length) {
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      const basePos = gridTargets[index];
      const wobble = Math.sin(time * 1.2 + index * 0.35) * 0.03;
      const targetPos = new THREE.Vector3(basePos.x, basePos.y + wobble, basePos.z);
      const targetQuat = new THREE.Quaternion();
      const targetFlip = mesh.userData.isFlipped ? Math.PI : 0;
      const currentFlip = mesh.userData.flipAngle || 0;
      const easedFlip = currentFlip + (targetFlip - currentFlip) * 0.18;
      mesh.userData.flipAngle = easedFlip;
      if (Math.abs(targetFlip - easedFlip) < 0.001) {
        mesh.userData.flipAngle = targetFlip;
      }
      if (mesh.userData.flipAngle) {
        targetQuat.setFromEuler(new THREE.Euler(0, mesh.userData.flipAngle, 0));
      }
      applyTransition(mesh, index, targetPos, targetQuat, 0, transitionT, true);
    });
  }
  controls.update();
  renderer.render(scene, camera);
}

function applyTransition(mesh, index, targetPos, targetQuat, targetBend, transitionT, smoothGrid = false) {
  if (transitionT !== null && transition?.fromPositions[index]) {
    const eased = transitionT * transitionT * (3 - 2 * transitionT);
    mesh.position.lerpVectors(transition.fromPositions[index], targetPos, eased);
    mesh.quaternion.slerpQuaternions(transition.fromQuaternions[index], targetQuat, eased);
    const startBend = transition.fromBends[index] || 0;
    const blendedBend = startBend + (targetBend - startBend) * eased;
    applyCardBend(mesh.userData.geometry, blendedBend);
    mesh.userData.lastBend = blendedBend;
    return;
  }

  if (smoothGrid) {
    mesh.position.lerp(targetPos, 0.12);
  } else {
    mesh.position.copy(targetPos);
  }
  mesh.quaternion.copy(targetQuat);
  applyCardBend(mesh.userData.geometry, targetBend);
  mesh.userData.lastBend = targetBend;
}

window.addEventListener("resize", resizeRenderer);

function setLayoutMode(mode) {
  layoutMode =
    mode === "dance" ||
    mode === "float" ||
    mode === "spiral" ||
    mode === "helix" ||
    mode === "fountain" ||
    mode === "circle" ||
    mode === "ring" ||
    mode === "ripple" ||
    mode === "scatter" ||
    mode === "flip"
      ? mode
      : "grid";
  if (hasInitialized) {
    transition = {
      startTime: clock.getElapsedTime(),
      duration: TRANSITION_DURATION,
      fromPositions: cardMeshes.map((mesh) => (mesh ? mesh.position.clone() : null)),
      fromQuaternions: cardMeshes.map((mesh) => (mesh ? mesh.quaternion.clone() : null)),
      fromBends: cardMeshes.map((mesh) => (mesh ? mesh.userData.lastBend || 0 : 0)),
    };
  }
  const nextView = cameraViews[layoutMode];
  if (nextView) {
    cameraTransition = {
      startTime: clock.getElapsedTime(),
      duration: CAMERA_TRANSITION_DURATION,
      fromPosition: camera.position.clone(),
      toPosition: new THREE.Vector3(...nextView.position),
      fromQuaternion: camera.quaternion.clone(),
      toQuaternion: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(nextView.rotation[0], nextView.rotation[1], nextView.rotation[2])
      ),
      fromFov: camera.fov,
      toFov: nextView.fov,
      fromNear: camera.near,
      toNear: nextView.near,
      fromFar: camera.far,
      toFar: nextView.far,
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(...nextView.target),
    };
  } else {
    applyCameraView(camera, controls, nextView);
  }
  if (layoutMode === "grid" && gridTargets.length) {
    cardMeshes.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }
      mesh.position.copy(gridTargets[index]);
      mesh.rotation.set(0, 0, 0);
    });
  }
}

if (modeSelect) {
  modeSelect.addEventListener("change", (event) => {
    setLayoutMode(event.target.value);
  });
}

window.addEventListener("keydown", (event) => {
  const layoutOptions = [
    "grid",
    "dance",
    "float",
    "spiral",
    "helix",
    "fountain",
    "circle",
    "ring",
    "ripple",
    "scatter",
    "flip",
  ];

  if (event.code === "Space") {
    event.preventDefault();
    const next = layoutOptions[Math.floor(Math.random() * layoutOptions.length)];
    if (modeSelect) {
      modeSelect.value = next;
    }
    setLayoutMode(next);
    return;
  }

  if (event.key && event.key.toLowerCase() === "n") {
    event.preventDefault();
    const currentIndex = Math.max(0, layoutOptions.indexOf(layoutMode));
    const nextIndex = (currentIndex + 1) % layoutOptions.length;
    const next = layoutOptions[nextIndex];
    if (modeSelect) {
      modeSelect.value = next;
    }
    setLayoutMode(next);
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key && event.key.toLowerCase() === "c") {
    console.log("camera", {
      position: camera.position.toArray(),
      rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      aspect: camera.aspect,
      target: controls.target.toArray(),
    });
  }
});

renderer.domElement.addEventListener("click", (event) => {
  if (layoutMode !== "grid") {
    return;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(cardMeshes.filter(Boolean), true);
  if (!intersects.length) {
    return;
  }
  const hit = intersects[0].object;
  const mesh = hit.parent && hit.parent.isGroup ? hit.parent : hit;
  if (mesh) {
    mesh.userData.isFlipped = !mesh.userData.isFlipped;
    if (mesh.userData.flipAngle === undefined) {
      mesh.userData.flipAngle = mesh.userData.isFlipped ? Math.PI : 0;
    }
  }
});

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    initScene();
  });
} else {
  initScene();
}

function applyRoundedMask(sourceCanvas, radiusPx) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext("2d");

  const radius = Math.max(0, Math.min(radiusPx, Math.min(canvas.width, canvas.height) / 2));
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(canvas.width - radius, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
  ctx.lineTo(canvas.width, canvas.height - radius);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
  ctx.lineTo(radius, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(sourceCanvas, 0, 0);
  return canvas;
}
