function checkOddM(m) {
  if (!Number.isInteger(m) || m < 3 || m % 2 === 0) {
    throw new Error(`m must be an odd integer >= 3, got ${m}`);
  }
}

function ijIndex(i, j, m) {
  return i * m + j;
}

function directionTriple(s, i, j, m) {
  if (s === 0) {
    return j === m - 1 ? [0, 1, 2] : [2, 1, 0];
  }
  if (s === m - 1) {
    return i > 0 ? [1, 2, 0] : [2, 1, 0];
  }
  return i === m - 1 ? [2, 0, 1] : [1, 0, 2];
}

function buildOddDecomposition(m) {
  checkOddM(m);

  const fibers = new Array(m);

  for (let s = 0; s < m; s += 1) {
    const fiber = new Array(m * m);
    for (let i = 0; i < m; i += 1) {
      for (let j = 0; j < m; j += 1) {
        fiber[ijIndex(i, j, m)] = directionTriple(s, i, j, m);
      }
    }
    fibers[s] = fiber;
  }

  return fibers;
}

function directionAt(i, j, k, m, cycle, fibers) {
  const s = (i + j + k) % m;
  return fibers[s][ijIndex(i, j, m)][cycle];
}

function stepVertex(i, j, k, d, m) {
  if (d === 0) {
    return [(i + 1) % m, j, k];
  }
  if (d === 1) {
    return [i, (j + 1) % m, k];
  }
  return [i, j, (k + 1) % m];
}

function generateCycle(m, cycle, fibers) {
  const path = [];
  let i = 0;
  let j = 0;
  let k = 0;

  for (let step = 0; step < m ** 3; step += 1) {
    const direction = directionAt(i, j, k, m, cycle, fibers);
    path.push({ vertex: [i, j, k], direction });
    [i, j, k] = stepVertex(i, j, k, direction, m);
  }

  if (i !== 0 || j !== 0 || k !== 0) {
    throw new Error(`Cycle ${cycle} did not return to origin.`);
  }

  return path;
}

function verifyDecomposition(m, fibers) {
  const allArcs = new Set();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    const path = generateCycle(m, cycle, fibers);
    const vertices = new Set(path.map(({ vertex }) => vertex.join(',')));

    if (vertices.size !== m ** 3) {
      throw new Error(`Cycle ${cycle}: not Hamiltonian (${vertices.size} unique vertices)`);
    }

    for (const { vertex, direction } of path) {
      const arc = `${vertex.join(',')}|${direction}`;
      if (allArcs.has(arc)) {
        throw new Error(`Cycle ${cycle}: duplicate arc ${vertex.join(',')} dir ${direction}`);
      }
      allArcs.add(arc);
    }
  }

  if (allArcs.size !== 3 * m ** 3) {
    throw new Error(`Not all arcs used: ${allArcs.size} != ${3 * m ** 3}`);
  }

  return true;
}

export {
  buildOddDecomposition,
  buildOddDecomposition as build_odd_decomposition,
  directionAt as direction_at,
  generateCycle,
  generateCycle as generate_cycle,
  stepVertex as step,
  verifyDecomposition,
  verifyDecomposition as verify_decomposition
};

export default buildOddDecomposition;
