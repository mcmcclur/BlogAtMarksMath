import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import tippy from 'https://cdn.jsdelivr.net/npm/tippy.js@6/+esm';


export function make_map(states, schools) {
  const w = 975;
  const h = 610;
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, w, h])
    .style("width", "100%");
  let map = svg.append("g");

  let projection = d3
    .geoAlbersUsa()
    // .scale(1300) 
    // .translate([w/2,h/2])
    .fitSize([w, h], states);
  let path = d3.geoPath().projection(projection);
  
  states.features.forEach(function (state) {
    state.properties.bounds = path.bounds(state);
  });

  map
    .append("path")
    .attr("d", path(states))
    .attr("fill", "lightgray")
    .attr("stroke", "white")
    .attr("stroke-width", 1);

  schools.forEach(function (school) {
    const [x,y] = projection([school.lon, school.lat]);
    school.x = x;
    school.y = y;
  });
  map
    .selectAll("circle")
    .data(schools)
    .join("circle")
    .attr("id", (g) => g[0])
    .attr("cx", s => s.x)
    .attr("cy", s => s.y)
    .attr('r', 3)
//     .attr("r", (g) => (3 * Math.sqrt(g[1].length) * w) / 1100)
    .attr("fill", d => d.legacy_status == 5 ? "red" : "blue")
    .attr("stroke", "#000")
    .attr("stroke-width", 0.5)
//     .attr("stroke-width", strokeWidth)
//     .attr("fill-opacity", 0.3)
//     .on("pointerenter", function () {
//       d3.select(this).attr("stroke-width", 2 * strokeWidth);
//     })
//     .on("pointerleave", function () {
//       d3.select(this).attr("stroke-width", strokeWidth);
//     })
    .each(function(d) {
        tippy(this, {
            content: d.name
        })
    });


  svg.node().fit_state = fit_state;

  const zoom = d3.zoom()
    // .scaleExtent([1, 8])
    .on("zoom", (event) => {
    map.attr("transform", event.transform);
  });
  svg.call(zoom).on(".zoom", null);
  return svg.node();

  function fit_state(zoomto) {
    const [[x0, y0], [x1, y1]] = zoomto.bounds;
    const k = Math.min(w / (x1 - x0), h / (y1 - y0)) * 0.9;
    const tx = (w - k * (x0 + x1)) / 2;
    const ty = (h - k * (y0 + y1)) / 2;
    svg.transition().duration(1250).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(k)
    );
  }
}