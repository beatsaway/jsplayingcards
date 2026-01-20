import * as THREE from "three";

export function computeGridLayout(count, layout) {
  const rows = Math.ceil(count / layout.columns);
  const gridWidth = (layout.columns - 1) * layout.spacingX + layout.cardWidth;
  const gridHeight = (rows - 1) * layout.spacingY + layout.cardHeight;
  const positions = [];

  for (let index = 0; index < count; index += 1) {
    const col = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    const x = (col - (layout.columns - 1) / 2) * layout.spacingX;
    const y = ((rows - 1) / 2 - row) * layout.spacingY;
    positions.push(new THREE.Vector3(x, y, 0));
  }

  return { positions, rows, gridWidth, gridHeight };
}

export function createFloatState(count, bounds) {
  const positions = [];
  const rotations = [];
  const offsets = [];
  const phases = [];
  const speeds = [];
  const bends = [];
  const halfX = bounds.width / 2;
  const halfY = bounds.height / 2;
  const halfZ = bounds.depth / 2;

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    offsets.push(
      new THREE.Vector3(
        THREE.MathUtils.randFloat(-halfX, halfX),
        THREE.MathUtils.randFloat(-halfY, halfY),
        THREE.MathUtils.randFloat(-halfZ, halfZ)
      )
    );
    phases.push({
      a: THREE.MathUtils.randFloat(0, Math.PI * 2),
      b: THREE.MathUtils.randFloat(0, Math.PI * 2),
      c: THREE.MathUtils.randFloat(0, Math.PI * 2),
    });
    speeds.push(THREE.MathUtils.randFloat(0.5, 1.2));
    bends.push(0);
  }

  return { positions, rotations, offsets, phases, speeds, bends, bounds };
}

export function stepFloat(state, time, basePositions, params = {}) {
  const {
    spacing = 1.2,
    floatAmpX = 0.12,
    floatAmpY = 0.16,
    floatAmpZ = 0.2,
    pitchAmp = 0.22,
    yawAmp = 0.28,
    rollAmp = 0.35,
    bendAmp = 0.06,
  } = params;

  for (let i = 0; i < basePositions.length; i += 1) {
    const base = basePositions[i];
    const baseX = base.x * spacing;
    const baseY = base.y * spacing;
    const baseZ = base.z * spacing;
    const phase = state.phases[i];
    const speed = state.speeds[i];
    const offset = state.offsets[i];
    const t = time * speed;

    const x = baseX + offset.x * 0.05 + Math.sin(t + phase.a) * floatAmpX;
    const y = baseY + offset.y * 0.05 + Math.cos(t * 0.9 + phase.b) * floatAmpY;
    const z = baseZ + offset.z * 0.07 + Math.sin(t * 1.1 + phase.c) * floatAmpZ;
    state.positions[i].set(x, y, z);

    state.rotations[i].set(
      Math.sin(t * 1.2 + phase.c) * pitchAmp,
      Math.sin(t * 0.8 + phase.a) * yawAmp,
      Math.cos(t * 1.1 + phase.b) * rollAmp
    );

    state.bends[i] = Math.sin(t + phase.b) * bendAmp;
  }
}

export function createSpiralState(count, bounds) {
  const positions = [];
  const rotations = [];
  const phases = [];
  const speeds = [];
  const bends = [];
  const halfY = bounds.height / 2;

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    phases.push(THREE.MathUtils.randFloat(0, Math.PI * 2));
    speeds.push(THREE.MathUtils.randFloat(0.4, 0.9));
    bends.push(0);
  }

  return { positions, rotations, phases, speeds, bends, bounds, halfY };
}

export function stepSpiral(state, time, basePositions, params = {}) {
  const {
    spacing = 0.22,
    spiralTightness = 0.45,
    spinSpeed = 0.18,
    pitchAmp = 0.08,
    rollAmp = 0.12,
    bendAmp = 0.04,
  } = params;

  for (let i = 0; i < basePositions.length; i += 1) {
    const phase = state.phases[i];
    const speed = state.speeds[i];
    const t = time * speed;
    const angle = i * spiralTightness + t * spinSpeed + phase * 0.15;
    const radius = spacing * Math.sqrt(i + 1) * 2.6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    state.positions[i].set(x, 0, z);

    state.rotations[i].set(
      Math.sin(t + phase) * pitchAmp,
      angle + Math.PI / 2,
      Math.cos(t + phase) * rollAmp
    );

    state.bends[i] = Math.sin(t + phase) * bendAmp;
  }
}

export function createRingState(count, bounds) {
  const positions = [];
  const rotations = [];
  const phases = [];
  const speeds = [];
  const bends = [];
  const halfY = bounds.height / 2;

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    phases.push(THREE.MathUtils.randFloat(0, Math.PI * 2));
    speeds.push(THREE.MathUtils.randFloat(0.5, 1));
    bends.push(0);
  }

  return { positions, rotations, phases, speeds, bends, bounds, halfY };
}

export function stepRing(state, time, basePositions, params = {}) {
  const {
    radius = 3.1,
    spacing = 1.1,
    spinSpeed = 0.5,
    liftAmp = 0.15,
    pitchAmp = 0.12,
    yawTwist = 1,
    rollAmp = 0.18,
    bendAmp = 0.08,
  } = params;
  const count = basePositions.length;

  for (let i = 0; i < count; i += 1) {
    const phase = state.phases[i];
    const speed = state.speeds[i];
    const t = time * speed;
    const baseY = (basePositions[i]?.y || 0) * spacing;
    const y = baseY + Math.sin(t + phase) * liftAmp;
    const angle = (i / count) * Math.PI * 2 + t * spinSpeed;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    state.positions[i].set(x, y, z);

    state.rotations[i].set(
      Math.sin(t + phase) * pitchAmp,
      angle + Math.PI * yawTwist,
      Math.cos(t + phase) * rollAmp
    );

    state.bends[i] = Math.sin(t + phase) * bendAmp;
  }
}

export function createSnakeState(count, bounds) {
  const positions = [];
  const rotations = [];
  const phases = [];
  const bends = [];
  const speeds = [];

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    phases.push(THREE.MathUtils.randFloat(0, Math.PI * 2));
    bends.push(0);
    speeds.push(THREE.MathUtils.randFloat(0.85, 1.15));
  }

  return { positions, rotations, phases, bends, speeds, bounds };
}

export function stepSnake(state, time, basePositions, params = {}) {
  const {
    radius = 3.2,
    waveAmp = 0.35,
    waveSpeed = 1.4,
    phaseStep = 0.45,
    pitchAmp = 0.22,
    bendAmp = 0.08,
  } = params;
  const count = basePositions.length;
  const angleStep = (Math.PI * 2) / Math.max(1, count);

  for (let i = 0; i < count; i += 1) {
    const phase = state.phases[i];
    const speed = state.speeds[i];
    const t = time * waveSpeed * speed;
    const wave = Math.sin(t - i * phaseStep + phase);
    const angle = i * angleStep + t * 0.6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = wave * waveAmp;
    state.positions[i].set(x, y, z);

    state.rotations[i].set(wave * pitchAmp, angle + Math.PI / 2, 0);
    state.bends[i] = wave * bendAmp;
  }
}

export function createSpringState(count) {
  const positions = [];
  const rotations = [];
  const phases = [];
  const bends = [];

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    phases.push(THREE.MathUtils.randFloat(0, Math.PI * 2));
    bends.push(0);
  }

  return { positions, rotations, phases, bends };
}

export function stepSpring(state, time, basePositions, params = {}) {
  const {
    spacing = 1.1,
    gap = 1.6,
    hopHeight = 0.7,
    hopSpeed = 1.25,
    pitchAmp = 0.18,
    bendAmp = 0.08,
  } = params;
  const count = Math.max(1, basePositions.length);
  const half = Math.floor(count / 2);

  for (let i = 0; i < count; i += 1) {
    const phase = state.phases[i];
    const t = time * hopSpeed + phase;
    const side = i < half ? -1 : 1;
    const localIndex = i < half ? i : i - half;
    const x = (localIndex - (half - 1) / 2) * spacing;
    const z = side * gap;
    const hop = (Math.sin(t) + 1) / 2;
    const y = hop * hopHeight;

    const hopAcross = Math.sin(t) * gap * 0.35;
    state.positions[i].set(x + hopAcross * side * -1, y, z);
    state.rotations[i].set(hop * pitchAmp, 0, 0);
    state.bends[i] = hop * bendAmp;
  }
}

export function createHelixState(count) {
  const positions = [];
  const rotations = [];
  const phases = [];
  const bends = [];

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    phases.push(THREE.MathUtils.randFloat(0, Math.PI * 2));
    bends.push(0);
  }

  return { positions, rotations, phases, bends };
}

export function stepHelix(state, time, basePositions, params = {}) {
  const {
    radius = 2.2,
    height = 4.4,
    spinSpeed = 0.5,
    pitchAmp = 0.18,
    bendAmp = 0.08,
  } = params;
  const count = Math.max(1, basePositions.length);
  const mid = (count - 1) / 2;

  for (let i = 0; i < count; i += 1) {
    const phase = state.phases[i];
    const t = time * spinSpeed;
    const angle = i * 0.55 + t + phase * 0.1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = ((i - mid) / mid) * (height / 2);

    state.positions[i].set(x, y, z);
    state.rotations[i].set(Math.sin(t + phase) * pitchAmp, angle + Math.PI / 2, 0);
    state.bends[i] = Math.sin(angle + t) * bendAmp;
  }
}

export function createRippleState(count) {
  const positions = [];
  const rotations = [];
  const bends = [];

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    bends.push(0);
  }

  return { positions, rotations, bends };
}

export function stepRipple(state, time, basePositions, params = {}) {
  const {
    spacing = 1,
    waveAmp = 0.24,
    waveLength = 3.2,
    waveSpeed = 1.4,
    pitchAmp = 0.2,
    bendAmp = 0.06,
  } = params;

  for (let i = 0; i < basePositions.length; i += 1) {
    const base = basePositions[i];
    const x = base.x * spacing;
    const y = base.y * spacing;
    const distance = Math.sqrt(x * x + y * y);
    const wave = Math.sin(distance * (Math.PI * 2) / waveLength - time * waveSpeed);
    const lift = wave * waveAmp;

    state.positions[i].set(x, y + lift, base.z);
    state.rotations[i].set(lift * pitchAmp, 0, 0);
    state.bends[i] = wave * bendAmp;
  }
}

export function createScatterState(count, bounds) {
  const positions = [];
  const rotations = [];
  const offsets = [];
  const rotOffsets = [];
  const phases = [];
  const speeds = [];
  const bends = [];
  const halfX = bounds.width / 2;
  const halfY = bounds.height / 2;
  const halfZ = bounds.depth / 2;

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    offsets.push(
      new THREE.Vector3(
        THREE.MathUtils.randFloat(-halfX, halfX),
        THREE.MathUtils.randFloat(-halfY, halfY),
        THREE.MathUtils.randFloat(-halfZ, halfZ)
      )
    );
    rotOffsets.push(
      new THREE.Euler(
        THREE.MathUtils.randFloat(-1.2, 1.2),
        THREE.MathUtils.randFloat(-1.2, 1.2),
        THREE.MathUtils.randFloat(-1.2, 1.2)
      )
    );
    phases.push(THREE.MathUtils.randFloat(0, Math.PI * 2));
    speeds.push(THREE.MathUtils.randFloat(0.9, 1.2));
    bends.push(0);
  }

  return { positions, rotations, offsets, rotOffsets, phases, speeds, bends, bounds };
}

export function stepScatter(state, time, basePositions, params = {}) {
  const {
    spread = 1.4,
    driftAmp = 0.35,
    driftSpeed = 0.85,
    bendAmp = 0.06,
  } = params;

  for (let i = 0; i < basePositions.length; i += 1) {
    const offset = state.offsets[i];
    const rot = state.rotOffsets[i];
    const phase = state.phases[i];
    const speed = state.speeds[i];
    const t = time * driftSpeed * speed + phase;
    const drift = 1 + Math.sin(t) * driftAmp;
    const x = offset.x * spread * drift;
    const y = offset.y * spread * drift;
    const z = offset.z * spread * drift;

    state.positions[i].set(x, y, z);
    state.rotations[i].set(
      rot.x * Math.sin(t),
      rot.y * Math.cos(t),
      rot.z * Math.sin(t * 0.9)
    );
    state.bends[i] = Math.sin(t) * bendAmp;
  }
}

export function createFlipState(count) {
  const positions = [];
  const rotations = [];
  const bends = [];

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    bends.push(0);
  }

  return { positions, rotations, bends };
}

export function stepFlip(state, time, basePositions, params = {}) {
  const {
    spacing = 1,
    waveSpeed = 1.8,
    phaseStep = 0.35,
    liftAmp = 0.35,
  } = params;

  for (let i = 0; i < basePositions.length; i += 1) {
    const base = basePositions[i];
    const t = time * waveSpeed - i * phaseStep;
    const flip = Math.sin(t);
    const lift = Math.abs(flip) * liftAmp;

    state.positions[i].set(base.x * spacing, base.y * spacing + lift, base.z);
    state.rotations[i].set(flip * Math.PI, 0, 0);
    state.bends[i] = 0;
  }
}

export function createFountainState(count) {
  const positions = [];
  const rotations = [];
  const phases = [];
  const speeds = [];
  const bends = [];

  for (let i = 0; i < count; i += 1) {
    positions.push(new THREE.Vector3());
    rotations.push(new THREE.Euler());
    phases.push(THREE.MathUtils.randFloat(0, Math.PI * 2));
    speeds.push(THREE.MathUtils.randFloat(0.9, 1.1));
    bends.push(0);
  }

  return { positions, rotations, phases, speeds, bends };
}

export function stepFountain(state, time, basePositions, params = {}) {
  const {
    spacing = 0.6,
    height = 2.8,
    spread = 0.35,
    cycle = 2.2,
    groupSize = 5,
    pitchAmp = 0.2,
    bendAmp = 0.06,
  } = params;
  const count = basePositions.length;

  for (let i = 0; i < count; i += 1) {
    const base = basePositions[i];
    const phase = state.phases[i];
    const speed = state.speeds[i];
    const group = Math.floor(i / Math.max(1, groupSize));
    const t = (time * speed + group * 0.35 + phase * 0.15) % cycle;
    const normalized = t / cycle;
    const lift = 4 * normalized * (1 - normalized);
    const y = lift * height;

    const baseX = base.x * spacing;
    const baseZ = base.y * spacing;
    const len = Math.hypot(baseX, baseZ) || 1;
    const dirX = baseX / len;
    const dirZ = baseZ / len;
    const x = baseX + dirX * y * spread;
    const z = baseZ + dirZ * y * spread;

    state.positions[i].set(x, y, z);
    state.rotations[i].set(-lift * pitchAmp, Math.atan2(z, x) + Math.PI / 2, 0);
    state.bends[i] = lift * bendAmp;
  }
}

export function resolveCollisions(positions, radius, iterations = 6, params = {}) {
  const { softness = 0.6, maxPush = 0.08 } = params;
  const cellSize = radius * 2;
  const minDistance = radius * 2;
  const temp = new THREE.Vector3();

  for (let step = 0; step < iterations; step += 1) {
    const grid = buildSpatialHash(positions, cellSize);
    const checked = new Set();

    for (let i = 0; i < positions.length; i += 1) {
      const pos = positions[i];
      const { cx, cy } = getCell(pos, cellSize);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const key = `${cx + dx},${cy + dy}`;
          const bucket = grid.get(key);
          if (!bucket) {
            continue;
          }
          for (let b = 0; b < bucket.length; b += 1) {
            const j = bucket[b];
            if (j <= i) {
              continue;
            }
            const pairKey = `${i}:${j}`;
            if (checked.has(pairKey)) {
              continue;
            }
            checked.add(pairKey);

            const other = positions[j];
            temp.subVectors(pos, other);
            let dist = temp.length();
            if (dist === 0) {
              temp.set(Math.random() - 0.5, Math.random() - 0.5, 0);
              dist = temp.length();
            }
            if (dist < minDistance) {
              let push = ((minDistance - dist) / dist) * 0.5;
              push *= softness;
              push = Math.min(push, maxPush);
              temp.multiplyScalar(push);
              pos.x += temp.x;
              pos.y += temp.y;
              other.x -= temp.x;
              other.y -= temp.y;
            }
          }
        }
      }
    }
  }
}

function buildSpatialHash(positions, cellSize) {
  const grid = new Map();
  for (let i = 0; i < positions.length; i += 1) {
    const { cx, cy } = getCell(positions[i], cellSize);
    const key = `${cx},${cy}`;
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push(i);
  }
  return grid;
}

function getCell(position, cellSize) {
  return {
    cx: Math.floor(position.x / cellSize),
    cy: Math.floor(position.y / cellSize),
  };
}

export function applyCardBend(geometry, amount) {
  if (!geometry.attributes.position) {
    return;
  }
  const position = geometry.attributes.position;
  if (!geometry.userData.basePositions) {
    geometry.userData.basePositions = Float32Array.from(position.array);
  }
  const base = geometry.userData.basePositions;
  const vertex = new THREE.Vector3();
  const bend = THREE.MathUtils.clamp(amount, -0.3, 0.3);

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const normalizedY = vertex.y / 0.7;
    const baseZ = base[i * 3 + 2] || 0;
    const offsetZ = Math.sin(normalizedY * Math.PI) * bend;
    position.setXYZ(i, vertex.x, vertex.y, baseZ + offsetZ);
  }
  position.needsUpdate = true;
}
