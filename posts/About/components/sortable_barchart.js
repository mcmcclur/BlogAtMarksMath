import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {delay} from '/components/delay.js';

export function sortable_alpha_barchart(letters)  {
  // Standard SVG setup stuff
  const w = 650;
  const h = 250;
  const pad = 50;
  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, w, h])
    .style("max-width", '100%');
  const x_scale = d3
    .scaleBand()
    .domain(letters.map((o) => o.letter))
    .range([pad, w - pad])
    .padding(0.2);
  const max = d3.max(letters.map((o) => o.frequency));
  const y_scale = d3
    .scaleLinear()
    .domain([0, max])
    .range([h - pad, pad]);

  // Add the bars
  svg
    .append("g")
    .selectAll("rect")
    .data(letters)
    .join("rect")
    .attr("x", (d) => x_scale(d.letter))
    .attr("y", (d) => y_scale(d.frequency))
    .attr("height", (d) => y_scale(0) - y_scale(d.frequency))
    .attr("width", x_scale.bandwidth())
    .attr("fill", "steelblue")
    .attr("stroke", "currentColor")
    .attr("stroke-width", 1)
    .on('pointerenter', function() {
        d3.select(this).attr("stroke-width", "2");
    })
    .on('pointerleave', function() {
        d3.select(this).attr("stroke-width", "1");
    });

  // Add the axes
  const x_axis = svg
    .append("g")
    .attr("transform", `translate(0,${h - pad})`)
    .call(d3.axisBottom(x_scale).tickSizeOuter(0));
  const y_axis = svg
    .append("g")
    .attr("transform", `translate(${pad})`)
    .call(d3.axisLeft(y_scale).ticks(5).tickSizeOuter(0));
  y_axis.select("path.domain").attr("stroke", null);

  // Grab the list of tick transforms so we can move
  // them around as we like.
  const tick_transforms = [];
  x_axis
    .selectAll("g.tick")
    .nodes()
    .forEach(function (g, i) {
      const T = g.getAttribute("transform");
      const freq_idx = i;
      const alpha_idx = letters.find((o) => o.freq_idx == i).alpha_idx;
      tick_transforms.push({ freq_idx, alpha_idx, T });
    });

  // Animate the bars on first view and
  // store their location information, too.
  const xs = [];
  svg
    .selectAll("rect")
    .nodes()
    .forEach(function (r, i) {
      const dr = d3.select(r);
      const x = +dr.attr("x");
      xs.push(x);
      dr.attr("data-idx_freq", i);
      dr.attr("data-idx_alpha", letters[i].idx);
      const y = +dr.attr("y");
      const h = +dr.attr("height");
      const Y = h + y;
      dr.attr("y", Y).attr("height", 0);
      delay(150).then(() => {
        delay(50 * i).then(() =>
          dr
            .attr("y", Y)
            .attr("height", 0)
            .transition()
            .duration(200)
            .attr("y", y)
            .attr("height", h)
        );
      });
    });

  svg.node().sort = sort;
  return svg.node();

  // Define the sort button that's applied in
  // response to the radio button.
  function sort(by) {
    if (by === "Alphabetically") {
      svg.selectAll("rect").each(function (d, i) {
        const x = xs[d.alpha_idx];
        d3.select(this).transition().duration(800).attr("x", x);
      });
      x_axis.selectAll("g.tick").each(function (g, i) {
        const idx = letters[i].alpha_idx;
        const transform = tick_transforms[idx]; //.find((o) => o.alpha_idx == idx);
        d3.select(this)
          .transition()
          .duration(800)
          .attr("transform", transform.T);
      });
    } else {
      svg.selectAll("rect").each(function (d, i) {
        const x = xs[d.freq_idx];
        d3.select(this).transition().duration(800).attr("x", x);
      });
      x_axis.selectAll("g.tick").each(function (g, i) {
        const transform = tick_transforms[i]; //.find((o) => o.alpha_idx == idx);
        d3.select(this)
          .transition()
          .duration(800)
          .attr("transform", transform.T);
      });
    }
  }
}