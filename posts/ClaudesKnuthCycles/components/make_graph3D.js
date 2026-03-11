import * as THREE from 'https://esm.sh/three@0.161.0';
import { OrbitControls } from 'https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'https://esm.sh/three@0.161.0/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'https://esm.sh/three@0.161.0/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'https://esm.sh/three@0.161.0/examples/jsm/lines/LineMaterial.js';
import { build_even_decomposition, generate_cycle } from './even_solution.js';
import { build_odd_decomposition, generate_cycle as generate_odd_cycle } from './odd_solution.js';

function makePeriodicPoint(i, j, k, n, spacing, extent) {
  const x = -extent / 2 + i * spacing;
  const y = -extent / 2 + j * spacing;
  const z = -extent / 2 + k * spacing;
  return new THREE.Vector3(x, y, z);
}

function pushSegment(positions, start, end) {
  positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
}

function axisVector(axis, amount) {
  if (axis === 0) {
    return new THREE.Vector3(amount, 0, 0);
  }
  if (axis === 1) {
    return new THREE.Vector3(0, amount, 0);
  }
  return new THREE.Vector3(0, 0, amount);
}

function buildEdgePositions(n, spacing, extent) {
  const positions = [];
  const overshoot = spacing * 0.55;

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let k = 0; k < n; k += 1) {
        const start = makePeriodicPoint(i, j, k, n, spacing, extent);

        for (let axis = 0; axis < 3; axis += 1) {
          const nextIndex = [i, j, k];
          nextIndex[axis] = (nextIndex[axis] + 1) % n;

          if ((axis === 0 && i < n - 1) || (axis === 1 && j < n - 1) || (axis === 2 && k < n - 1)) {
            const end = makePeriodicPoint(nextIndex[0], nextIndex[1], nextIndex[2], n, spacing, extent);
            pushSegment(positions, start, end);
            continue;
          }

          const direction = axisVector(axis, overshoot);
          const boundaryOut = start.clone().add(direction);
          const wrappedVertex = makePeriodicPoint(nextIndex[0], nextIndex[1], nextIndex[2], n, spacing, extent);
          const boundaryIn = wrappedVertex.clone().sub(direction);

          pushSegment(positions, start, boundaryOut);
          pushSegment(positions, boundaryIn, wrappedVertex);
        }
      }
    }
  }

  return positions;
}

function buildPointPositions(n, spacing, extent) {
  const positions = [];

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let k = 0; k < n; k += 1) {
        const point = makePeriodicPoint(i, j, k, n, spacing, extent);
        positions.push(point.x, point.y, point.z);
      }
    }
  }

  return positions;
}

function buildCyclePositions(n, spacing, extent, cyclePath) {
  const positions = [];
  const segments = buildCycleSegments(n, spacing, extent, cyclePath);

  for (const { start, end } of segments) {
    pushSegment(positions, start, end);
  }

  return positions;
}

function buildCycleSegments(n, spacing, extent, cyclePath) {
  const segments = [];
  const overshoot = spacing * 0.55;

  for (const { vertex, direction } of cyclePath) {
    const [i, j, k] = vertex;
    const start = makePeriodicPoint(i, j, k, n, spacing, extent);
    const nextIndex = [i, j, k];
    nextIndex[direction] = (nextIndex[direction] + 1) % n;

    const wraps =
      (direction === 0 && i === n - 1) ||
      (direction === 1 && j === n - 1) ||
      (direction === 2 && k === n - 1);

    if (!wraps) {
      const end = makePeriodicPoint(nextIndex[0], nextIndex[1], nextIndex[2], n, spacing, extent);
      segments.push({ start, end });
      continue;
    }

    const directionVector = axisVector(direction, overshoot);
    const boundaryOut = start.clone().add(directionVector);
    const wrappedVertex = makePeriodicPoint(nextIndex[0], nextIndex[1], nextIndex[2], n, spacing, extent);
    const boundaryIn = wrappedVertex.clone().sub(directionVector);

    segments.push({ start, end: boundaryOut });
    segments.push({ start: boundaryIn, end: wrappedVertex });
  }

  return segments;
}

function buildMotionPath(segments) {
  let totalLength = 0;

  const annotatedSegments = segments.map(({ start, end }) => {
    const length = start.distanceTo(end);
    const segment = {
      start,
      end,
      length,
      offset: totalLength
    };
    totalLength += length;
    return segment;
  });

  return { segments: annotatedSegments, totalLength };
}

function pointAlongMotionPath(path, distance) {
  if (path.segments.length === 0 || path.totalLength === 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  const wrappedDistance = ((distance % path.totalLength) + path.totalLength) % path.totalLength;

  for (const segment of path.segments) {
    if (wrappedDistance <= segment.offset + segment.length) {
      const t = segment.length === 0 ? 0 : (wrappedDistance - segment.offset) / segment.length;
      return segment.start.clone().lerp(segment.end, t);
    }
  }

  const last = path.segments[path.segments.length - 1];
  return last.end.clone();
}

function shouldDrawArrow(i, j, k, axis, stride) {
  return (i + 2 * j + 3 * k + axis) % stride === 0;
}

function addArrow(scene, start, end, color, headLength, headWidth) {
  const direction = end.clone().sub(start);
  const length = direction.length();

  if (length === 0) {
    return null;
  }

  const unitDirection = direction.clone().normalize();
  const arrow = new THREE.ArrowHelper(
    unitDirection,
    start,
    length,
    color,
    Math.min(headLength, length * 0.55),
    Math.min(headWidth, length * 0.35)
  );
  scene.add(arrow);
  return arrow;
}

export function make_graph3D(n, options = {}) {
  if (!Number.isInteger(n) || n <= 2) {
    throw new Error('make_graph3D(n): n must be an integer greater than 2.');
  }

  const baseWidth = options.width ?? null;
  const aspectRatio = options.aspectRatio ?? (760 / 520);
  const height = options.height ?? (baseWidth ? Math.round(baseWidth / aspectRatio) : 520);
  const spacing = options.spacing ?? 1.25;
  const pointSize = options.pointSize ?? 0.15;
  const extent = spacing * (n - 1);
  const cycleIndex = options.cycleIndex ?? null;
  const cycleColors = options.cycleColors ?? [0x60a5fa, 0xf87171, 0x34d399];
  const cycleMarkerColors = options.cycleMarkerColors ?? [0x1e3a8a, 0x7f1d1d, 0x065f46];

  const container = document.createElement('div');
  container.style.width = '100%';
  if (baseWidth) {
    container.style.maxWidth = `${baseWidth}px`;
  }
  container.style.aspectRatio = `${aspectRatio}`;
  container.style.margin = '1rem 0';
  container.style.position = 'relative';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background ?? 0xf7f4ec);

  const initialWidth = baseWidth ?? 760;
  const camera = new THREE.PerspectiveCamera(42, initialWidth / height, 0.1, 1000);
  camera.position.set(extent * 1.55, extent * 1.35, extent * 1.7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initialWidth, height);
  container.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.15);
  mainLight.position.set(8, 10, 12);
  scene.add(mainLight);

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(buildPointPositions(n, spacing, extent), 3)
  );
  const pointMaterial = new THREE.PointsMaterial({
    color: options.pointColor ?? 0x16324f,
    size: pointSize,
    sizeAttenuation: true
  });
  scene.add(new THREE.Points(pointGeometry, pointMaterial));

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(buildEdgePositions(n, spacing, extent), 3)
  );
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: options.edgeColor ?? 0x000000,
    transparent: true,
    opacity: 0.8
  });
  scene.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

  let cycleGeometry = null;
  let cycleMaterial = null;
  let cycleLine = null;
  let cycleMarkerGeometry = null;
  let cycleMarkerMaterial = null;
  let cycleMarker = null;
  let cycleMotionPath = null;
  let animationClock = null;
  const arrowHelpers = [];

  const arrowColor = options.arrowColor ?? 0x444444;
  const arrowStride = options.arrowStride ?? Math.max(2, Math.floor(n / 2));
  const arrowHeadLength = options.arrowHeadLength ?? spacing * 0.16;
  const arrowHeadWidth = options.arrowHeadWidth ?? spacing * 0.085;

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let k = 0; k < n; k += 1) {
        const start = makePeriodicPoint(i, j, k, n, spacing, extent);

        for (let axis = 0; axis < 3; axis += 1) {
          if (!shouldDrawArrow(i, j, k, axis, arrowStride)) {
            continue;
          }

          const nextIndex = [i, j, k];
          nextIndex[axis] = (nextIndex[axis] + 1) % n;
          const wraps =
            (axis === 0 && i === n - 1) ||
            (axis === 1 && j === n - 1) ||
            (axis === 2 && k === n - 1);

          if (wraps) {
            continue;
          }

          const end = makePeriodicPoint(nextIndex[0], nextIndex[1], nextIndex[2], n, spacing, extent);
          const arrowStart = start.clone().lerp(end, 0.36);
          const arrowEnd = start.clone().lerp(end, 0.64);
          const arrow = addArrow(scene, arrowStart, arrowEnd, arrowColor, arrowHeadLength, arrowHeadWidth);
          if (arrow) {
            arrowHelpers.push(arrow);
          }
        }
      }
    }
  }

  if (cycleIndex !== null && cycleIndex !== undefined) {
    if (!Number.isInteger(cycleIndex) || cycleIndex < 0 || cycleIndex > 2) {
      throw new Error('make_graph3D(..., { cycleIndex }): cycleIndex must be 0, 1, or 2.');
    }

    const fibers = n % 2 === 0 ? build_even_decomposition(n) : build_odd_decomposition(n);
    const cyclePath = n % 2 === 0
      ? generate_cycle(n, cycleIndex, fibers)
      : generate_odd_cycle(n, cycleIndex, fibers);
    const cycleSegments = buildCycleSegments(n, spacing, extent, cyclePath);
    cycleMotionPath = buildMotionPath(cycleSegments);
    cycleGeometry = new LineGeometry();
    cycleGeometry.setPositions(buildCyclePositions(n, spacing, extent, cyclePath));
    cycleMaterial = new LineMaterial({
      color: cycleColors[cycleIndex] ?? 0x1d4ed8,
      linewidth: options.cycleLinewidth ?? 2,
      transparent: true,
      opacity: 1,
      resolution: new THREE.Vector2(initialWidth, height)
    });
    cycleLine = new Line2(cycleGeometry, cycleMaterial);
    scene.add(cycleLine);

    const cycleArrowColor = options.cycleArrowColor ?? cycleMarkerColors[cycleIndex] ?? 0x1e3a8a;
    const cycleArrowStride = options.cycleArrowStride ?? Math.max(3, Math.floor(n / 2));
    const cycleArrowHeadLength = options.cycleArrowHeadLength ?? spacing * 0.22;
    const cycleArrowHeadWidth = options.cycleArrowHeadWidth ?? spacing * 0.12;

    cycleSegments.forEach(({ start, end }, idx) => {
      if (idx % cycleArrowStride !== 0) {
        return;
      }

      const arrowStart = start.clone().lerp(end, 0.3);
      const arrowEnd = start.clone().lerp(end, 0.7);
      const arrow = addArrow(
        scene,
        arrowStart,
        arrowEnd,
        cycleArrowColor,
        cycleArrowHeadLength,
        cycleArrowHeadWidth
      );
      if (arrow) {
        arrowHelpers.push(arrow);
      }
    });

    cycleMarkerGeometry = new THREE.SphereGeometry(options.cycleMarkerRadius ?? Math.max(pointSize * 0.95, 0.12), 24, 24);
    cycleMarkerMaterial = new THREE.MeshStandardMaterial({
      color: options.cycleMarkerColor ?? cycleMarkerColors[cycleIndex] ?? 0x1e3a8a,
      emissive: options.cycleMarkerColor ?? cycleMarkerColors[cycleIndex] ?? 0x1e3a8a,
      emissiveIntensity: 0.25
    });
    cycleMarker = new THREE.Mesh(cycleMarkerGeometry, cycleMarkerMaterial);
    cycleMarker.position.copy(cycleMotionPath.segments[0]?.start ?? new THREE.Vector3());
    scene.add(cycleMarker);

    animationClock = new THREE.Clock();
  }

  const frame = new THREE.Box3Helper(
    new THREE.Box3(
      new THREE.Vector3(-extent / 2 - spacing * 0.55, -extent / 2 - spacing * 0.55, -extent / 2 - spacing * 0.55),
      new THREE.Vector3(extent / 2 + spacing * 0.55, extent / 2 + spacing * 0.55, extent / 2 + spacing * 0.55)
    ),
    options.frameColor ?? 0x8c7a6b
  );
  scene.add(frame);

  function resizeRenderer() {
    const rect = container.getBoundingClientRect();
    const fallbackWidth = baseWidth ?? initialWidth;
    const nextWidth = Math.max(320, Math.round(rect.width || fallbackWidth));
    const nextHeight = options.height ?? Math.round(nextWidth / aspectRatio);
    renderer.setSize(nextWidth, nextHeight, false);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    cycleMaterial?.resolution.set(nextWidth, nextHeight);
  }

  const resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(container);
  resizeRenderer();

  let disposed = false;

  function animate() {
    if (disposed) {
      return;
    }

    if (cycleMarker && cycleMotionPath && animationClock) {
      const elapsed = animationClock.getElapsedTime();
      const speed = options.cycleSpeed ?? Math.max(0.55, spacing * 0.9);
      cycleMarker.position.copy(pointAlongMotionPath(cycleMotionPath, elapsed * speed));
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  container.value = {
    scene,
    camera,
    renderer,
    controls,
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      controls.dispose();
      pointGeometry.dispose();
      pointMaterial.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      cycleGeometry?.dispose();
      cycleMaterial?.dispose();
      cycleMarkerGeometry?.dispose();
      cycleMarkerMaterial?.dispose();
      arrowHelpers.forEach((arrow) => {
        arrow.line.geometry.dispose();
        arrow.line.material.dispose();
        arrow.cone.geometry.dispose();
        arrow.cone.material.dispose();
      });
      renderer.dispose();
    }
  };

  return container;
}
