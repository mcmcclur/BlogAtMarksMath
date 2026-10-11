import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export async function make_map(RasterMap, svgDoc, koenigsbergSvgText) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const mapStrokeColor = "#231f20";
  const morphedEdgeWidth = 32;
  const morphedNodeRadius = 44;
  const container = d3.create("div")
    .attr("class", "map-container")
    .style("position", "relative")
    .style("width", "100%")
    .style("max-width", "850px")
    .style("aspect-ratio", "4096 / 3351")
    .style("overflow", "hidden");

  // The stage holds both layers so they can be transformed together
  const stage = container.append("div")
    .attr("class", "map-stage")
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%")
    .style("transform-origin", "0 0");

  stage.append("img")
    .attr("class", "raster-map")
    .attr("src", RasterMap)
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%")
    .style("object-fit", "contain");

  // Inline the SVG so it's part of the DOM and selectable with D3
  const svgNode = document.importNode(svgDoc.documentElement, true);
  const svg = d3.select(svgNode)
    .attr("width", null)
    .attr("height", null)
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%");
  stage.node().append(svgNode);

  const Graph = svg.select("#Graph");
  const bridges = svg.select("#Bridges");
  const initialEdges = new Map();
  const initialNodes = new Map();
  Graph.selectAll("path").each(function() {
    initialEdges.set(this.id, d3.select(this).attr("d"));
  });
  Graph.selectAll("circle").each(function() {
    const circle = d3.select(this);
    initialNodes.set(this.id, {
      cx: circle.attr("cx"),
      cy: circle.attr("cy"),
      r: circle.attr("r")
    });
  });
  bridges.attr('opacity', 0);
  Graph.selectAll("path").each(function() {
    const length = this.getTotalLength();
    const path = d3.select(this);
    path .attr("stroke-dasharray", [0, length])
  })
  Graph.selectAll("circle").attr("opacity", 0);

  const node = container.node();

  // When cancelled, any in-flight try_path chain halts at its next step
  let cancelled = false;
  let currentStep = -1;
  let currentView = null;
  const halt = () => new Promise(() => {});

  const zoom = d3.zoom()
    .scaleExtent([1, 40])
    // disable all user-initiated zooming/panning (wheel, drag, touch, double-click);
    // programmatic transforms via zoomTo/zoomBy/reset still work
    .filter(() => false)
    // keep the map covering the frame (size is read lazily, since it can change)
    .constrain((transform, extent, translateExtent) => {
      const W = node.clientWidth, H = node.clientHeight;
      const {k} = transform;
      const x = Math.min(0, Math.max(W - W * k, transform.x));
      const y = Math.min(0, Math.max(H - H * k, transform.y));
      return d3.zoomIdentity.translate(x, y).scale(k);
    })
    .on("zoom", (event) => {
      const {x, y, k} = event.transform;
      stage.style("transform", `translate(${x}px, ${y}px) scale(${k})`);
    });

  container.call(zoom);

  // Keep the zoom transform proportional to the container when it resizes
  let lastW = node.clientWidth, lastH = node.clientHeight;
  let resizeFrame = null;
  const ro = new ResizeObserver(() => {
    const W = node.clientWidth, H = node.clientHeight;
    if (!W || !H) return;
    if (!lastW || !lastH) { lastW = W; lastH = H; return; }
    if (W === lastW && H === lastH) return;
    lastW = W; lastH = H;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (currentView) {
        container.call(zoom.transform, fit(currentView.target, currentView.padding));
      } else {
        container.call(zoom.transform, d3.zoomIdentity);
      }
    });
  });
  ro.observe(node);

  // Bounding box of the SVG content in untransformed stage pixels
  function contentBox() {
    const bb = svgNode.getBBox();
    const vb = svgNode.viewBox.baseVal;
    const kx = node.clientWidth / vb.width, ky = node.clientHeight / vb.height;
    return [(bb.x - vb.x) * kx, (bb.y - vb.y) * ky, (bb.x + bb.width - vb.x) * kx, (bb.y + bb.height - vb.y) * ky];
  }

  // Bounding box of an element in untransformed stage pixels
  function elementBox(el) {
    const cr = node.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const t = d3.zoomTransform(node);
    const [x0, y0] = t.invert([r.left - cr.left, r.top - cr.top]);
    const [x1, y1] = t.invert([r.right - cr.left, r.bottom - cr.top]);
    return [x0, y0, x1, y1];
  }

  // Transform that fits `target` (element, selector, or null for all SVG content)
  function fit(target, padding) {
    const W = node.clientWidth, H = node.clientHeight;
    const el = typeof target === "string" ? svgNode.querySelector(target) : target;
    const [x0, y0, x1, y1] = el ? elementBox(el) : contentBox();
    const k = Math.min(40, (1 - 2 * padding) * Math.min(W / (x1 - x0), H / (y1 - y0)));
    return d3.zoomIdentity
      .translate(W / 2, H / 2).scale(k)
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  }

  // Each method returns the d3 transition so callers can chain or await .end()
  node.zoom = zoom;
  node.zoomTo = (target = null, {padding = 0.05, duration = 750} = {}) => {
    currentView = {target, padding};
    return container.transition().duration(duration).call(zoom.transform, fit(target, padding));
  };
  node.zoomBy = (k, {duration = 400} = {}) =>
    container.transition().duration(duration).call(zoom.scaleBy, k);
  node.resetView = ({duration = 750} = {}) => {
    currentView = null;
    return container.transition().duration(duration).call(zoom.transform, d3.zoomIdentity);
  };

  function restoreGeometry() {
    Graph.selectAll("path").each(function() {
      const path = d3.select(this);
      path
        .attr("d", initialEdges.get(this.id))
        .attr("stroke-dashoffset", null)
        .style("stroke", mapStrokeColor)
        .style("stroke-dasharray", null)
        .style("stroke-width", null);
    });
    Graph.selectAll("circle").each(function() {
      const circle = d3.select(this);
      const initial = initialNodes.get(this.id);
      circle
        .attr("cx", initial.cx)
        .attr("cy", initial.cy)
        .attr("r", initial.r)
        .style("stroke", mapStrokeColor);
    });
  }

  function hideGraph() {
    svg.selectAll(".question-mark").remove();
    Graph.selectAll("circle").attr("opacity", 0);
    Graph.selectAll("path").each(function() {
      const length = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dashoffset", null)
        .attr("stroke-dasharray", [0, length]);
    });
  }

  function styleTraversalPaths() {
    Graph.selectAll("path")
      .style("stroke-width", "7px");
  }

  function showFirstPathStatic() {
    cancelled = true;
    svg.selectAll(".question-mark").remove();
    restoreGeometry();
    stage.select(".raster-map").interrupt().style("opacity", 1);
    bridges.interrupt().attr("opacity", 1);
    styleTraversalPaths();
    Graph.selectAll("circle").attr("opacity", 1);
    Graph.selectAll("#Edge2, #Edge6, #Edge7, #Edge4, #Edge1").each(function() {
      const length = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dashoffset", null)
        .attr("stroke-dasharray", [length, length]);
    });
    Graph.selectAll("#Edge3, #Edge5").each(function() {
      const length = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dashoffset", null)
        .attr("stroke-dasharray", [0, length]);
    });
  }

  function showAllPathsStatic() {
    showFirstPathStatic();
    Graph.selectAll("#Edge3, #Edge5").each(function() {
      const length = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dashoffset", null)
        .attr("stroke-dasharray", [length, length]);
    });
  }

  function addQuestionMarks(delayMs = 0) {
    return (async () => {
      if (delayMs) await delay(delayMs);
      if (cancelled) return;
      const points = ["#Edge3", "#Edge5"].map(id => {
        const path = Graph.select(id).node();
        return path.getPointAtLength(0.48 * path.getTotalLength());
      });
      svg.selectAll(".question-mark")
        .data(points)
        .join("text")
        .attr("class", "question-mark")
        .attr("x", d => d.x)
        .attr("y", d => d.y - 10)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 76)
        .attr("font-family", "Arial, sans-serif")
        .attr("fill", "#be1e2d")
        .attr("stroke", "#000")
        .text("?");
    })().catch(() => {});
  }

  function hideFirstPathAnimated({duration = 450} = {}) {
    cancelled = true;
    svg.selectAll(".question-mark").remove();
    Graph.selectAll("path, circle").interrupt();
    Graph.selectAll("circle")
      .transition()
      .duration(duration / 2)
      .attr("opacity", 0);
    Graph.selectAll("path").each(function() {
      const length = this.getTotalLength();
      d3.select(this)
        .transition()
        .duration(duration)
        .attr("stroke-dashoffset", null)
        .attr("stroke-dasharray", [0, length]);
    });
  }

  function hideRemainingEdgesAnimated({duration = 450} = {}) {
    cancelled = true;
    svg.selectAll(".question-mark")
      .transition()
      .duration(duration / 2)
      .attr("opacity", 0)
      .remove();
    Graph.selectAll("#Edge3, #Edge5").each(function() {
      const length = this.getTotalLength();
      d3.select(this)
        .transition()
        .duration(duration)
        .attr("stroke-dashoffset", null)
        .attr("stroke-dasharray", [0, length]);
    });
  }

  function reset({duration = 750} = {}) {
    cancelled = true;
    Graph.selectAll("path, circle").interrupt();
    svg.selectAll(".question-mark").remove();
    restoreGeometry();
    stage.select(".raster-map").interrupt().style("opacity", 1);
    bridges.interrupt().attr("opacity", 0);
    hideGraph();
    return node.resetView({duration});
  }

  node.reset = reset;


  function fade_bridges_in(dir) {
    if(dir == "in") {
      bridges
        .transition()
        .duration(800)
        .attr("opacity", 1);
    }
    else if(dir == "out") {
      bridges
        .transition()
        .duration(500)
        .attr("opacity", 0);
    }
  }

  function add_node(nodeID) {
    if (cancelled) return halt();
    const transition = Graph.select(nodeID)
      .transition()
      .duration(0)
      .attr('opacity', 1)
      .end();
    return transition;
  }
  function traverse_edge(edgeID, dir = "forward") {
    if (cancelled) return halt();
    const path = Graph.select(edgeID);
    const length = path.node().getTotalLength();
    const transition = dir == "forward" ? path
      .attr("stroke-dasharray", [0, length])
      .transition()
      .duration(400)
      .attr("stroke-dasharray", [length, length])
      .end() : path
        .attr("stroke-dasharray", [length, length])
        .attr("stroke-dashoffset", -length)
        .transition()
        .duration(400)
        .attr("stroke-dashoffset", 0)
        .end()
    return transition;
  }

  // Step 2, part 1: walk the path through the first five bridges
  function try_path() {
    cancelled = false;
    styleTraversalPaths();
    return add_node("#NodeD")
      .then(() => traverse_edge("#Edge2"))
      .then(() => add_node("#NodeA"))
      .then(() => d3.transition().duration(100).end())
      .then(() => traverse_edge("#Edge6"))
      .then(() => add_node("#NodeC"))
      .then(() => d3.transition().duration(100).end())
      .then(() => traverse_edge("#Edge7"))
      .then(() => add_node("#NodeB"))
      .then(() => d3.transition().duration(100).end())
      .then(() => traverse_edge("#Edge4", "backward"))
      .then(() => d3.transition().duration(100).end())
      .then(() => traverse_edge("#Edge1", "backward"))
      .catch(() => {}) // a transition interrupted by cancel() just ends the chain
  }

  // Step 3: draw the remaining two edges and show the question marks
  function try_path_2() {
    cancelled = false;
    styleTraversalPaths();
    traverse_edge("#Edge3");
    traverse_edge("#Edge5");
    return addQuestionMarks(200);
  }

  function reverseMorphToMap({duration = 1200} = {}) {
    cancelled = true;
    Graph.selectAll("path, circle").interrupt();
    svg.selectAll(".question-mark").remove();
    styleTraversalPaths();
    stage.select(".raster-map").transition().duration(duration).style("opacity", 1);
    bridges.transition().duration(duration / 2).attr("opacity", 1);
    node.zoomTo("#Graph", {padding: 0.08, duration});

    const N = 120;
    const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const sample = (pathNode) => {
      const length = pathNode.getTotalLength();
      return d3.range(N + 1).map(i => {
        const p = pathNode.getPointAtLength(length * i / N);
        return [p.x, p.y];
      });
    };
    const linePath = points => "M" + points.map(p => p.join(",")).join("L");
    const done = [];

    Graph.selectAll("path").each(function() {
      const path = d3.select(this);
      const src = sample(this);
      tempPath.setAttribute("d", initialEdges.get(this.id));
      const dst = sample(tempPath);
      done.push(path.transition().duration(duration).ease(d3.easeCubicInOut)
        .style("stroke", mapStrokeColor)
        .style("stroke-width", "7px")
        .attrTween("d", () => t => linePath(src.map((p, i) => [
          p[0] + (dst[i][0] - p[0]) * t,
          p[1] + (dst[i][1] - p[1]) * t
        ])))
        .end());
    });

    Graph.selectAll("circle").each(function() {
      const circle = d3.select(this);
      const initial = initialNodes.get(this.id);
      done.push(circle.transition().duration(duration).ease(d3.easeCubicInOut)
        .style("stroke", mapStrokeColor)
        .attr("opacity", 1)
        .attr("cx", initial.cx)
        .attr("cy", initial.cy)
        .attr("r", initial.r)
        .end());
    });

    Promise.all(done).then(() => {
      restoreGeometry();
      showAllPathsStatic();
      cancelled = false;
      addQuestionMarks();
    }).catch(() => {});
  }

  function showStep(step, direction = null) {
    if (step === currentStep) return;
    const previousStep = currentStep;
    const movingBackward = step < previousStep;
    currentStep = step;

    if (step === 0) {
      if (movingBackward) {
        fade_bridges_in("out");
      }
      reset({duration: previousStep < 0 ? 0 : 650});
    }
    else if (step === 1) {
      if (previousStep < 0 || previousStep > 1) {
        if (movingBackward) {
          hideFirstPathAnimated();
          node.zoomTo("#Bridges", {padding: 0.08, duration: 650});
        } else {
          reset({duration: 0});
        }
      }
      if (!movingBackward) {
        node.zoomTo("#Bridges", {padding: 0.08, duration: previousStep < 0 ? 0 : 800});
        fade_bridges_in("in");
      }
    }
    else if (step === 2) {
      if (previousStep < 1 || previousStep > 2) {
        if (movingBackward) {
          hideRemainingEdgesAnimated();
          node.zoomTo("#Graph", {padding: 0.12, duration: 450});
          return;
        } else {
          reset({duration: 0});
          bridges.attr("opacity", 1);
        }
      }
      if (previousStep > 2) {
        showFirstPathStatic();
        node.zoomTo("#Graph", {padding: 0.12, duration: 350});
      } else {
        node.zoomTo("#Graph", {padding: 0.12, duration: 800});
        try_path();
      }
    }
    else if (step === 3) {
      if (previousStep < 2 || previousStep > 3) {
        if (movingBackward) {
          reverseMorphToMap();
          return;
        } else {
          reset({duration: 0});
          bridges.attr("opacity", 1);
          showFirstPathStatic();
          node.zoomTo("#Graph", {padding: 0.12, duration: 0});
        }
      }
      try_path_2();
    }
    else if (step === 4) {
      if (previousStep < 3) {
        reset({duration: 0});
        bridges.attr("opacity", 1);
        showAllPathsStatic();
        node.zoomTo("#Graph", {padding: 0.08, duration: 0});
      }
      morph_graph(node, {edgeWidth: morphedEdgeWidth, nodeRadius: morphedNodeRadius});
    }
  }

  node.fade_bridges_in = fade_bridges_in;
  node.try_path = try_path;
  node.try_path_2 = try_path_2;
  node.showStep = showStep;
  node.morph_graph = () => morph_graph(node);
  node.cancel = () => { cancelled = true; };

  return node;
}




function morph_graph(pic, {duration = 2000, edgeWidth = 32, nodeRadius = 44} = {}) {
  const root = d3.select(pic);
  const Graph = root.select("#Graph");

  // Stop any in-flight try_path animation and its pending steps
  pic.cancel();
  Graph.selectAll("path, circle").interrupt();
  root.selectAll(".question-mark").remove();

  // Place the Wikipedia graph (viewBox 210x171) centered in the 4096x3351 stage
  const s = 17, ox = (4096 - 210 * s) / 2, oy = (3351 - 171 * s) / 2;
  const P = ([x, y]) => [ox + x * s, oy + y * s];

  // Node correspondence: A (degree 5) -> left, B -> right, C -> top, D -> bottom
  const W = {A: [14, 86], B: [197, 86], C: [110, 14], D: [110, 158]};
  const line = (p, q) => [p, [p[0] + (q[0] - p[0]) / 3, p[1] + (q[1] - p[1]) / 3],
    [p[0] + 2 * (q[0] - p[0]) / 3, p[1] + 2 * (q[1] - p[1]) / 3], q];

  // Target cubic Béziers (canonical direction a -> b), from the Wikipedia SVG
  const edges = {
    Edge3: {a: "A", b: "B", c: line(W.A, W.B)},
    Edge7: {a: "C", b: "B", c: line(W.C, W.B)},
    Edge4: {a: "D", b: "B", c: line(W.D, W.B)},
    Edge6: {a: "A", b: "C", c: [W.A, [17, 24], [46, 3], W.C]},
    Edge5: {a: "A", b: "C", c: [W.A, [52, 74], [91, 62], W.C]},
    Edge1: {a: "A", b: "D", c: [W.A, [17, 148], [46, 169], W.D]},
    Edge2: {a: "A", b: "D", c: [W.A, [52, 98], [91, 110], W.D]}
  };
  const bez = ([p0, p1, p2, p3], t) => {
    const u = 1 - t;
    return [0, 1].map(i => u*u*u*p0[i] + 3*u*u*t*p1[i] + 3*u*t*t*p2[i] + t*t*t*p3[i]);
  };

  // Current node positions
  const nodes = {};
  for (const k of "ABCD") {
    const n = Graph.select(`#Node${k}`);
    nodes[k] = [+n.attr("cx"), +n.attr("cy")];
  }
  const nearest = (p) => Object.keys(nodes).reduce((best, k) =>
    Math.hypot(p.x - nodes[k][0], p.y - nodes[k][1]) < Math.hypot(p.x - nodes[best][0], p.y - nodes[best][1]) ? k : best);

  const N = 120;
  const done = [];

  // Make every edge fully drawn with no dashing, and clear highlights
  const clearDashes = () => Graph.selectAll("path")
    .attr("stroke-dasharray", null)
    .attr("stroke-dashoffset", null)
    .style("stroke-dasharray", "none")
    .style("stroke", "currentColor")
    .style("stroke-width", `${edgeWidth}px`);

  // Sample the source paths (before the dash attributes change nothing geometric)
  const sources = Object.entries(edges).map(([id, e]) => {
    const node = Graph.select(`#${id}`).node();
    const len = node.getTotalLength();
    const src = d3.range(N + 1).map(i => {
      const p = node.getPointAtLength(len * i / N);
      return [p.x, p.y];
    });
    const startNode = nearest(node.getPointAtLength(0));
    return {id, e, src, startNode};
  });

  clearDashes();

  // Fade out the historical map and zoom back to the full graph.
  root.select(".raster-map").style("opacity", 1).transition().duration(duration).style("opacity", 0);
  root.select("#Bridges").attr("opacity", 1).transition().duration(duration / 2).attr("opacity", 0);
  pic.resetView({duration});

  for (const {id, e: {a, c}, src, startNode} of sources) {
    const cubic = (startNode === a ? c : [...c].reverse()).map(P);
    const dst = d3.range(N + 1).map(i => bez(cubic, i / N));
    done.push(Graph.select(`#${id}`).transition().duration(duration).ease(d3.easeCubicInOut)
      .attrTween("d", () => t => "M" + src.map((p, i) =>
        [p[0] + (dst[i][0] - p[0]) * t, p[1] + (dst[i][1] - p[1]) * t].join(",")).join("L"))
      .end());
  }

  for (const k of "ABCD") {
    const [x, y] = P(W[k]);
    done.push(Graph.select(`#Node${k}`).transition().duration(duration).ease(d3.easeCubicInOut)
      .attr("opacity", 1).attr("cx", x).attr("cy", y).attr("r", nodeRadius).end());
  }
  return Promise.all(done).then(clearDashes);
}
