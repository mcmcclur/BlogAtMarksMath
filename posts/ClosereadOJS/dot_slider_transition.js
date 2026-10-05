import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export function make_it() {
  const w = 800;
  const h = 200;
  const pad = 20;

  const svg = d3.create("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("viewBox", [0, 0, w, h])
    .style('max-width', `${w}px`)
    .style('width', '100%')
    .style('height', 'auto')
    .style('border', 'solid 1px currentColor');

  const dot = svg.append('circle')
    .attr('cx', 0.1*w)
    .attr('cy', 0.5*h)
    .attr('r', 0.2*h)
    .attr('fill', 'currentColor')

  const node = svg.node();
  node.update = update;
  return node;

  function update(side, transition=true) {
    const cx = side === "left" ? 0.1*w : 0.9*w;

    dot.interrupt();
    if(transition) {
      dot
        .transition()
        .duration(750)
        .attr('cx', cx)
    }
    else {
      dot
        .attr('cx', cx)
    }
  }
}
