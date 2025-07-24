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
    .fitExtent([[0, 0], [w, h]], states);
  let path = d3.geoPath().projection(projection);
  
  states.features.forEach(function (state) {
    state.properties.bounds = path.bounds(state);
  });
  map
    .append("path")
    .attr("d", path(states))
    .attr('class', 'responsive-stroke responsive-fill')
    // .attr("fill", "lightgray")
    // .attr("stroke", "white")
    // .style("fill", "var(--bs-secondary-bg)")
    // .style("stroke", "var(--bs-border-color)")    
    .attr("stroke-width", 2);

  schools.forEach(function (school) {
    const [x,y] = projection([school.lon, school.lat]);
    school.x = x;
    school.y = y;
  });
  map
    .selectAll("circle")
    .data(schools)
    .join("circle")
    .attr('class', function(d) {
        if(d.legacy_status == 5) {
            return 'responsive-stroke legacy-considered';
        }
        else {
            return 'responsive-stroke legacy-not-considered';
        }
   })
    .attr("id", (g) => g[0])
    .attr("cx", s => s.x)
    .attr("cy", s => s.y)
    // .attr('r', 3)
    // .attr("fill", d => d.legacy_status == 5 ? "red" : "blue")
    // .attr("stroke", "#000")
    .attr("stroke-width", 0.5)
    .each(function(d) {
        tippy(this, {
            content: d.name
        })
    });

  const zoom = d3.zoom()
    .on("zoom", function (evt) {
      map.attr("transform", evt.transform);
      svg.selectAll("circle")
        .attr("r", 2 / evt.transform.k)
        .attr("stroke-width", 0.5 / evt.transform.k);
      svg.select("path")
        .attr("stroke-width", 2.5 / evt.transform.k);
    })
  svg.call(zoom).on(".zoom", null);

  svg.node().fit_state = fit_state;
  fit_state({bounds: path.bounds(states)}, false);
  return svg.node();

  function fit_state(zoomto, transition = true) {
    const [[x0, y0], [x1, y1]] = zoomto.bounds;
    const k = Math.min(w / (x1 - x0), h / (y1 - y0)) * 0.9;
    const tx = (w - k * (x0 + x1)) / 2;
    const ty = (h - k * (y0 + y1)) / 2;
    (transition ? svg.transition().duration(1250) : svg).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(k)
    );
  }
  function set_visible() {

  }
}