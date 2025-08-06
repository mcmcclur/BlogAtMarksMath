import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export function make_graph(chosen_data, variable) {
  const schools = new Map(chosen_data.map((a) => [a[0].SchoolID, a[0]]))
  // const v = "student_teacher_pay_ratio";
  const v = variable.toLowerCase().replace(/ /g, "_");
  const w = 987;
  const h = 610;
  const svg = d3
    .create("svg")
    .attr("width", "100%")
    .attr("viewBox", [0, 0, w, h])
    .style("border", "solid 1px black");

  const time_extent = [2012, 2023].map((d) => d3.utcParse("%Y")(d));
  const v_extent = d3.extent(
    chosen_data.flat().filter((o) => o[v] < Infinity),
    (o) => o[v]
  );
  // v_extent[0] = 0;
  const v_range = v_extent[1] - v_extent[0];

  //set up scales
  let pad = 60; //increased to handle possible 4 digit numbers
  let time_scale = d3
    .scaleTime()
    .domain(time_extent)
    .range([pad, w - pad]);
  let y_scale = d3
    .scaleLinear()
    .domain(v_extent)
    .range([h - pad, pad]);
  let path = d3
    .line()
    .x((d) => time_scale(d.Year))
    .y((d) => y_scale(d[v]));

  let graph = svg.append("g");
  graph
    .selectAll("path")
    .data(chosen_data)
    .join("path")
    .attr("d", path)
    .attr("class", (d) => (d[0].SchoolID == 199111 ? `School${d[0].SchoolID} unca-responsive-stroke` : `School${d[0].SchoolID} responsive-stroke`))
    .attr("fill", "none")
    // .attr("stroke", (d) => (d[0].SchoolID == 199111 ? "#003DA5" : 'var(--bs-secondary-color)'))
    .attr("stroke-width", (d) => (d[0].SchoolID == 199111 ? 6 : 1))
    .attr("opacity", (d) => (d[0].SchoolID == 199111 ? 1 : 0.3));
  graph
    .selectAll("circle")
    .data(chosen_data.flat())
    .join("circle") 
    .attr("class", (d) => (d.SchoolID == 199111 ? `School${d.SchoolID} unca-responsive-fill` : `School${d.SchoolID} responsive-fill`))
    .attr("cx", (d) => time_scale(d.Year))
    .attr("cy", (d) => y_scale(d[v]))
    .attr("r", (d) => (d.SchoolID == 199111 ? 6 : 3))
    // .attr("fill", (d) => (d.SchoolID == 199111 ? "#003DA5" : 'var(--bs-secondary-color)'))
    // .attr("stroke", (d) => (d.SchoolID == 199111 ? "#003DA5" : 'var(--bs-secondary-color)'))
    // .attr("fill", (d) => (d.SchoolID == 199111 ? "lightblue" : 'var(--bs-secondary-color)'))
    // .attr("stroke", (d) => (d.SchoolID == 199111 ? "lightblue" : 'var(--bs-secondary-color)'))    
    .attr("opacity", (d) => (d.SchoolID == 199111 ? 1 : 0.2));
  graph.selectAll(".School199111").raise();

  let text_group = svg
    .append("g")
    .append("text")
    .attr("id", "text_group")
    .attr("class", "responsive-stroke")
    .attr("x", 60)
    .attr("y", 40)
    .attr("font-size", "120%")
    .attr("text-anchor", "start");

  // Draw the axes
  svg
    .append("g")
    .attr("transform", `translate(0, ${h - 0.8 * pad})`)
    .call(d3.axisBottom(time_scale).tickSizeOuter(0));
  svg
    .append("g")
    .attr("transform", `translate(${0.8 * pad})`)
    .call(d3.axisLeft(y_scale).tickSizeOuter(0));

  svg
    .on("touchmove", (e) => e.preventDefault()) // prevent scrolling
    .on("touchstart", set_styles)
    // .on("pointerenter", () => swatch_container.style("opacity", 0))
    .on("pointermove", set_styles);

  return svg.node();

  function set_styles(evt) {
    let p = d3.pointer(evt);
    let x = p[0];
    let y = p[1];
    let time = time_scale.invert(x);
    let value = y_scale.invert(y);
    let closest = get_closest(time, value, chosen_data, v);
    if (closest && closest.err < 0.1 * v_range) {
      let closest_id = closest.id;
      graph.selectAll("path").attr("stroke-width", 1).attr("opacity", 0.3);
      graph
        .select(`path.School${closest_id}`)
        .attr("stroke-width", 3)
        .attr("opacity", 1);
      graph.selectAll("circle").attr("r", 2).attr("opacity", 0.3);
      graph
        .selectAll(`circle.School${closest_id}`)
        .attr("r", 4)
        .attr("opacity", 1);
      text_group.text(schools.get(closest_id).SchoolName);
    } else {
      graph.selectAll("path").attr("stroke-width", 1).attr("opacity", 0.3);
      graph
        .select("path.School199111")
        .attr("stroke-width", 6)
        .attr("opacity", 1);
      graph.selectAll("circle").attr("r", 3).attr("opacity", 0.3);
      graph.selectAll(`circle.School199111`).attr("r", 6).attr("opacity", 1);
      text_group.text(null);
    }
  }
}


function get_closest(time, value, data, variable) {
  let results = [];

  data.forEach(function (school_data, i) {
    let these_dates = school_data.map((o) => o.Year.getTime());
    let these_values = school_data.map((o) => o[variable]);
    try {
      let idx = d3.bisect(these_dates, time);
      let t1 = these_dates[idx - 1];
      let t2 = these_dates[idx];
      let p1 = these_values[idx - 1];
      let p2 = these_values[idx];
      let p = p1 + ((p2 - p1) * (time - t1)) / (t2 - t1);
      results.push({
        time: time,
        value: p,
        err: Math.abs(p - value),
        id: school_data[0].SchoolID
      });
    } catch {
      ("pass");
    }
  });
  return results.sort((o1, o2) => o1.err - o2.err)[0];
}