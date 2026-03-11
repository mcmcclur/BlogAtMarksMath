const RUI = [0, 1, 2];
const URI = [1, 0, 2];
const RIU = [0, 2, 1];
const UIR = [1, 2, 0];
const IRU = [2, 0, 1];
const IUR = [2, 1, 0];

const PAIR_PERMS = {
  A: [RUI, URI],
  B: [RIU, UIR],
  C: [IRU, IUR]
};

function checkEvenM(m) {
  if (!Number.isInteger(m) || m < 4 || m % 2 !== 0) {
    throw new Error(`m must be an even integer >= 4, got ${m}`);
  }
}

function ijIndex(i, j, m) {
  return i * m + j;
}

function unpackIndex(index, m) {
  const i = Math.floor(index / m);
  const j = index % m;
  return [i, j];
}

function makeFiber(m, fill = RUI) {
  return Array.from({ length: m * m }, () => fill.slice());
}

function complexFiber(m) {
  const fb = makeFiber(m, RUI);

  fb[ijIndex(0, m - 1, m)] = URI.slice();
  for (let i = 3; i < m; i += 1) {
    fb[ijIndex(i, m - i, m)] = URI.slice();
  }

  for (let j = 1; j < m - 2; j += 1) {
    fb[ijIndex(1, j, m)] = RIU.slice();
  }
  fb[ijIndex(2, m - 1, m)] = RIU.slice();

  for (let i = 2; i < m; i += 1) {
    fb[ijIndex(i, 0, m)] = IUR.slice();
  }

  fb[ijIndex(0, 0, m)] = UIR.slice();
  fb[ijIndex(1, m - 2, m)] = UIR.slice();
  fb[ijIndex(1, 0, m)] = IRU.slice();
  fb[ijIndex(2, m - 2, m)] = IRU.slice();

  return fb;
}

function buildStructuredFiber(pairType, threshold, m) {
  const [defaultPerm, specialPerm] = PAIR_PERMS[pairType];
  const fb = new Array(m * m);

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const d = (i + j) % m;
      fb[ijIndex(i, j, m)] = (d === threshold ? specialPerm : defaultPerm).slice();
    }
  }

  return fb;
}

function buildAllFibers(m, tA, tB, tC) {
  const F = Math.floor(m / 2);
  const fibers = new Array(m);
  const fiberSlots = [];

  for (let s = 0; s < m; s += 1) {
    if (s !== F) {
      fiberSlots.push(s);
    }
  }

  const countA = fiberSlots.length - 2;
  let slot = 0;

  for (let idx = 0; idx < countA; idx += 1) {
    fibers[fiberSlots[slot]] = buildStructuredFiber('A', tA, m);
    slot += 1;
  }
  fibers[fiberSlots[slot]] = buildStructuredFiber('B', tB, m);
  slot += 1;
  fibers[fiberSlots[slot]] = buildStructuredFiber('C', tC, m);
  fibers[F] = complexFiber(m);

  return fibers;
}

function fiberAction(fiber, m, cycle) {
  const perm = new Array(m * m);

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const d = fiber[ijIndex(i, j, m)][cycle];
      const index = ijIndex(i, j, m);

      if (d === 0) {
        perm[index] = ijIndex((i + 1) % m, j, m);
      } else if (d === 1) {
        perm[index] = ijIndex(i, (j + 1) % m, m);
      } else {
        perm[index] = index;
      }
    }
  }

  return perm;
}

function composePerms(p1, p2) {
  const composed = new Array(p1.length);
  for (let idx = 0; idx < p1.length; idx += 1) {
    composed[idx] = p2[p1[idx]];
  }
  return composed;
}

function countCycles(perm) {
  const visited = new Array(perm.length).fill(false);
  let cycles = 0;

  for (let idx = 0; idx < perm.length; idx += 1) {
    if (visited[idx]) {
      continue;
    }

    cycles += 1;
    let cursor = idx;
    while (!visited[cursor]) {
      visited[cursor] = true;
      cursor = perm[cursor];
    }
  }

  return cycles;
}

function checkAllHamiltonianCycles(fibers, m) {
  for (let cycle = 0; cycle < 3; cycle += 1) {
    let comp = Array.from({ length: m * m }, (_, idx) => idx);

    for (let s = 0; s < m; s += 1) {
      comp = composePerms(comp, fiberAction(fibers[s], m, cycle));
    }

    if (countCycles(comp) !== 1) {
      return false;
    }
  }

  return true;
}

function APowK(m, k, tA) {
  const perm = new Array(m * m);

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const d = (i + j) % m;
      const shift = ((tA - d + m) % m) < k ? 1 : 0;
      const newI = (i + shift) % m;
      const newD = (d + k) % m;
      const newJ = (newD - newI + m) % m;
      perm[ijIndex(i, j, m)] = ijIndex(newI, newJ, m);
    }
  }

  return perm;
}

function serpPerm(threshold, m) {
  const perm = new Array(m * m);

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const d = (i + j) % m;
      perm[ijIndex(i, j, m)] = d === threshold
        ? ijIndex((i + 1) % m, j, m)
        : ijIndex(i, (j + 1) % m, m);
    }
  }

  return perm;
}

function serpPermC1(threshold, m) {
  const perm = new Array(m * m);

  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const d = (i + j) % m;
      perm[ijIndex(i, j, m)] = d === threshold
        ? ijIndex(i, (j + 1) % m, m)
        : ijIndex((i + 1) % m, j, m);
    }
  }

  return perm;
}

function precomputeBases(m, tB) {
  const tA = m - 1;
  const F = Math.floor(m / 2);
  const complex = complexFiber(m);
  const xC1 = fiberAction(complex, m, 1);
  const xC2 = fiberAction(complex, m, 2);

  const baseC2 = composePerms(xC2, serpPerm(tB, m));
  const aBefore = APowK(m, F, tA);
  const aAfter = APowK(m, m - 3 - F, tA);
  const baseC1 = composePerms(composePerms(aBefore, xC1), aAfter);

  return [baseC1, baseC2];
}

function findThresholds(m) {
  const h = Math.floor(m / 2);
  let step;
  let offset;

  if (h % 3 === 0) {
    step = 6;
    offset = 0;
  } else if (h % 3 === 2) {
    step = 6;
    offset = 2;
  } else {
    step = 2;
    offset = 0;
  }

  for (const tB of [0, 2]) {
    const [baseC1, baseC2] = precomputeBases(m, tB);

    for (let tC = offset; tC < m; tC += step) {
      if (countCycles(composePerms(serpPermC1(tC, m), baseC1)) !== 1) {
        continue;
      }
      if (countCycles(composePerms(serpPerm(tC, m), baseC2)) !== 1) {
        continue;
      }

      const fibers = buildAllFibers(m, m - 1, tB, tC);
      if (checkAllHamiltonianCycles(fibers, m)) {
        return [m - 1, tB, tC];
      }
    }
  }

  for (let tA = m - 1; tA >= 0; tA -= 1) {
    for (let tB = 0; tB < m; tB += 1) {
      for (let tC = 0; tC < m; tC += 1) {
        const fibers = buildAllFibers(m, tA, tB, tC);
        if (checkAllHamiltonianCycles(fibers, m)) {
          return [tA, tB, tC];
        }
      }
    }
  }

  return null;
}

function buildM4Fibers() {
  const fibers = new Array(4);
  fibers[0] = buildStructuredFiber('A', 3, 4);
  fibers[1] = buildStructuredFiber('B', 3, 4);
  fibers[3] = buildStructuredFiber('C', 3, 4);

  const fb = makeFiber(4, RUI);
  fb[ijIndex(0, 0, 4)] = URI.slice();
  fb[ijIndex(0, 1, 4)] = RIU.slice();
  fb[ijIndex(0, 2, 4)] = RIU.slice();
  fb[ijIndex(0, 3, 4)] = UIR.slice();
  fb[ijIndex(1, 0, 4)] = IUR.slice();
  fb[ijIndex(1, 3, 4)] = IRU.slice();
  fb[ijIndex(2, 0, 4)] = IUR.slice();
  fb[ijIndex(2, 2, 4)] = URI.slice();
  fb[ijIndex(3, 0, 4)] = IRU.slice();
  fb[ijIndex(3, 1, 4)] = UIR.slice();
  fibers[2] = fb;

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
    const d = directionAt(i, j, k, m, cycle, fibers);
    path.push({ vertex: [i, j, k], direction: d });
    [i, j, k] = stepVertex(i, j, k, d, m);
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

function buildEvenDecomposition(m) {
  checkEvenM(m);

  if (m === 4) {
    return buildM4Fibers();
  }

  const thresholds = findThresholds(m);
  if (thresholds === null) {
    throw new Error(`No thresholds found for m=${m}`);
  }

  const [tA, tB, tC] = thresholds;
  return buildAllFibers(m, tA, tB, tC);
}

function printCycle(m, cycle, path) {
  const dirNames = ['i+1', 'j+1', 'k+1'];
  const lines = [`Cycle ${cycle} (length ${path.length}):`];

  for (let idx = 0; idx < path.length; idx += 1) {
    const { vertex, direction } = path[idx];
    if (idx < 20 || idx >= path.length - 5) {
      lines.push(`  (${vertex.join(',')}) -> ${dirNames[direction]}`);
    } else if (idx === 20) {
      lines.push(`  ... (${path.length - 25} more steps) ...`);
    }
  }

  return lines.join('\n');
}

export {
  APowK as _A_pow_k,
  IUR,
  IRU,
  PAIR_PERMS,
  RIU,
  RUI,
  UIR,
  URI,
  buildAllFibers as build_all_fibers,
  buildEvenDecomposition as build_even_decomposition,
  buildEvenDecomposition,
  buildM4Fibers as build_m4_fibers,
  buildStructuredFiber as build_structured_fiber,
  checkAllHamiltonianCycles as check_all_hc,
  complexFiber as complex_fiber,
  composePerms as compose_perms,
  countCycles as count_cycles,
  directionAt as direction_at,
  findThresholds as find_thresholds,
  fiberAction as fiber_action,
  generateCycle as generate_cycle,
  precomputeBases as _precompute_bases,
  printCycle as print_cycle,
  serpPerm as _serp_perm,
  serpPermC1 as _serp_perm_c1,
  stepVertex as step,
  verifyDecomposition as verify_decomposition
};

export default buildEvenDecomposition;
