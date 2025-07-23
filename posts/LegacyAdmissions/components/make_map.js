import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import tippy from 'https://cdn.jsdelivr.net/npm/tippy.js@6/+esm';


export function make_map(states, schools) {

  console.log("make_map 0", states);
//   let div = d3.create("div")
//     .style("width", `${w}px`)
//     .style("height", `${h}px`);
  const w = 975;
  const h = 610;
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, w, h])
    .style("width", "100%");

  console.log("make_map", states);
  
  //.attr("width", w).attr("height", h);
  let map = svg.append("g");

  // projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305])
  let projection = d3
    .geoAlbersUsa()
    .scale(1300) 
    .translate([w/2,h/2]);
    // .fitSize([w - 10, h], rect);
  let path = d3.geoPath().projection(projection);


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
        console.log([d, this]);
        tippy(this, {
            content: d.name
        })
    })
    // .nodes()
    // .forEach(function (c) {
    //   let content = get_tip(c.id);
    //   tippy(c, {
    //     content: content,
    //     theme: "light",
    //     allowHTML: true,
    //     interactive: true,
    //     appendTo: () => div.node() // document.body,
    //   });
    // });

//   map.call(
//     d3
//       .zoom()
//       .scaleExtent([0.5, 8])
//       .duration(500)
//       .on("zoom", function (evt) {
//         map.attr("transform", evt.transform);
//       })
//   );

  return svg.node();
}