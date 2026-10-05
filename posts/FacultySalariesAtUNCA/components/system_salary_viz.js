import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import tippy from 'https://cdn.jsdelivr.net/npm/tippy.js@6/+esm';

export const salary_scrolly_states = [
  { group: "All", sort_by: "Avg Salary", col_adjust: true },
  { group: "Professor", sort_by: "Avg Salary", col_adjust: true },
  { group: "Professor", sort_by: "Avg Salary", col_adjust: false }
];

export function salary_scrolly_state(trigger_index) {
  return Math.max(0, Math.min(3, trigger_index ?? 0));
}

export function salary_scrolly_params(state, controls) {
  if (state < salary_scrolly_states.length) {
    return salary_scrolly_states[state];
  }

  return {
    group: controls.group,
    sort_by: controls.sort_by ?? "Avg Salary",
    col_adjust: controls.col_adjust
  };
}

export function sync_salary_controls(state, controls) {
  const locked = state < 3;

  if (locked) {
    Object.values(controls).forEach(control => {
      if (control) delete control.dataset.salaryScrollyUnlocked;
    });
    sync_control_value(controls.group, salary_scrolly_states[state].group);
    sync_control_value(controls.sort_by, salary_scrolly_states[state].sort_by);
    sync_control_value(controls.col_adjust, salary_scrolly_states[state].col_adjust);
  } else if (!controls.group?.dataset.salaryScrollyUnlocked) {
    const last_locked_state = salary_scrolly_states[salary_scrolly_states.length - 1];
    sync_control_value(controls.group, last_locked_state.group);
    sync_control_value(controls.sort_by, last_locked_state.sort_by);
    sync_control_value(controls.col_adjust, last_locked_state.col_adjust);
    Object.values(controls).forEach(control => {
      if (control) control.dataset.salaryScrollyUnlocked = "true";
    });
  }

  Object.values(controls).forEach(control => set_control_disabled(control, locked));
  return {state, locked};
}

export const salary_timeseries_scrolly_states = [
  { group: "All", start_year: "2012", normalize: false },
  { group: "All", start_year: "2012", normalize: true },
  { group: "All", start_year: "2016", normalize: true }
];

export function salary_timeseries_scrolly_state(trigger_index) {
  return Math.max(0, Math.min(3, trigger_index ?? 0));
}

export function local_closeread_trigger_index(trigger_index, focus_id) {
  if (!Number.isFinite(trigger_index) || typeof document === "undefined") {
    return 0;
  }

  const triggers = Array.from(document.querySelectorAll(".new-trigger"));
  const trigger = triggers[trigger_index];
  if (!trigger) return 0;

  if (trigger.getAttribute("data-focus-on") !== focus_id) {
    return 0;
  }

  return triggers
    .slice(0, trigger_index + 1)
    .filter(candidate => candidate.getAttribute("data-focus-on") === focus_id)
    .length - 1;
}

export function salary_timeseries_scrolly_params(state, controls) {
  if (state < salary_timeseries_scrolly_states.length) {
    return salary_timeseries_scrolly_states[state];
  }

  return {
    group: controls.group,
    start_year: controls.start_year,
    normalize: controls.normalize
  };
}

export function sync_salary_timeseries_controls(state, controls) {
  const locked = state < salary_timeseries_scrolly_states.length;

  if (locked) {
    Object.values(controls).forEach(control => {
      if (control) delete control.dataset.salaryTimeseriesUnlocked;
    });
    sync_control_value(controls.group, salary_timeseries_scrolly_states[state].group);
    sync_control_value(controls.start_year, salary_timeseries_scrolly_states[state].start_year);
    sync_control_value(controls.normalize, salary_timeseries_scrolly_states[state].normalize);
  } else if (!controls.group?.dataset.salaryTimeseriesUnlocked) {
    const last_locked_state = salary_timeseries_scrolly_states[salary_timeseries_scrolly_states.length - 1];
    sync_control_value(controls.group, last_locked_state.group);
    sync_control_value(controls.start_year, last_locked_state.start_year);
    sync_control_value(controls.normalize, last_locked_state.normalize);
    Object.values(controls).forEach(control => {
      if (control) control.dataset.salaryTimeseriesUnlocked = "true";
    });
  }

  Object.values(controls).forEach(control => set_control_disabled(control, locked));
  return {state, locked};
}

function sync_control_value(control, value) {
  if (!control || input_value(control) === value) return;

  const radio = radio_for_value(control, value);
  if (radio) {
    radio.checked = true;
    dispatch_input_events(radio);
    dispatch_input_events(control);
    return;
  }

  const checkbox = control.querySelector('input[type="checkbox"]');
  if (checkbox) {
    checkbox.checked = Boolean(value);
    dispatch_input_events(checkbox);
    dispatch_input_events(control);
  }
}

function dispatch_input_events(control) {
  control.dispatchEvent(new Event("input", {bubbles: true}));
  control.dispatchEvent(new Event("change", {bubbles: true}));
}

function input_value(control) {
  const checked = control.querySelector('input[type="radio"]:checked');
  if (checked) return radio_label(checked);

  const checkbox = control.querySelector('input[type="checkbox"]');
  if (checkbox) return checkbox.checked;

  if ("value" in control) return control.value;

  return undefined;
}

function radio_for_value(control, value) {
  return Array
    .from(control.querySelectorAll('input[type="radio"]'))
    .find(input => radio_label(input) === value);
}

function radio_label(input) {
  return Array
    .from(input.closest("label")?.childNodes ?? [])
    .filter(node => node !== input)
    .map(node => node.textContent)
    .join("")
    .trim();
}

function set_control_disabled(control, disabled) {
  if (!control) return;

  control
    .querySelectorAll("button, input, select, textarea")
    .forEach(input => {
      input.disabled = disabled;
    });

  control.setAttribute("aria-disabled", String(disabled));
  control.classList.toggle("salary-control-locked", disabled);
}


export function make_salary_viz(summary_data, opts = {}) {
  const {
    animate = false,
    tooltips = true
  } = opts;
  const w = 700;
  const h = 300;
  const pad = 50;
  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, w, h])
    // .style("border", "solid 1px black");

  const x_scale = d3
    .scaleBand()
    .domain(summary_data.map((o) => o.abbr))
    .range([pad, w - pad])
    .padding(0.2);
  const max_value = 210000; 
  const y_scale = d3
    .scaleLinear()
    .domain([0, max_value])
    .range([h - pad, pad]);
  const transition_duration = 650;

  function tooltip_content(d) {
    return `
      <div style="font-weight: bold">${d.school}</div>
      <div><span style="font-style: italic">Avg Salary:</span> $${Math.round(d.average_salary)}</div>
      <div><span style="font-style: italic">CoL:</span> ${Math.round(d.CoL)}</div>
      <div><span style="font-style: italic">Adjusted:</span> $${Math.round(d.adjusted_average_salary)}</div>
    `;
  }

  const bars = svg
    .append("g")
    .selectAll("rect")
    .data(summary_data, d => d.abbr)
    .join("rect")
    .attr('class', d => d.abbr)
    .attr("x", (d) => x_scale(d.abbr))
    .attr("y", (d) => y_scale(d.val))
    .attr("height", (d) => y_scale(0) - y_scale(d.val))
    .attr("width", x_scale.bandwidth())
    .attr("fill", o => o.abbr != "UNCA" ? "lightblue" : '#003DA5')
    .on('pointerenter', function() {
      d3.select(this)
        .attr('stroke-width', 2)
        .attr('stroke', 'black')
    })
    .on('pointerleave', function() {
      svg.selectAll('rect')
        .attr('stroke', null)
    });
    if(tooltips) {
      bars.each(function(d) {
        tippy(this, {
            allowHTML: true,
            theme: 'light-border',
            content: tooltip_content(d),
            animation: false,
            arrow: true
        })
      });
    }

  const x_axis = svg
    .append("g")
    .attr("transform", `translate(0,${h - pad})`)
    .call(d3.axisBottom(x_scale).tickSizeOuter(0));
  const y_axis = svg
    .append("g")
    .attr("transform", `translate(${pad})`)
    .call(d3.axisLeft(y_scale).tickSizeOuter(0));
  y_axis.select("path.domain").attr("stroke", null);

  if(animate) {
    bars
      .nodes()
      .forEach(function (r, i) {
        let dr = d3.select(r);
        let y = +dr.attr("y");
        let h = +dr.attr("height");
        let Y = h + y;
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
  }

  function update(next_data) {
    x_scale.domain(next_data.map((o) => o.abbr));

    const t = svg
      .transition()
      .duration(transition_duration)
      .ease(d3.easeCubicInOut);

    const updated_bars = svg
      .selectAll("rect")
      .data(next_data, d => d.abbr)
      .join(
        enter => enter
          .append("rect")
          .attr('class', d => d.abbr)
          .attr("x", (d) => x_scale(d.abbr))
          .attr("y", y_scale(0))
          .attr("height", 0)
          .attr("width", x_scale.bandwidth())
          .attr("fill", o => o.abbr != "UNCA" ? "lightblue" : '#003DA5')
          .on('pointerenter', function() {
            d3.select(this)
              .attr('stroke-width', 2)
              .attr('stroke', 'black')
          })
          .on('pointerleave', function() {
            svg.selectAll('rect')
              .attr('stroke', null)
          }),
        update => update,
        exit => exit
          .transition(t)
          .attr("y", y_scale(0))
          .attr("height", 0)
          .remove()
      );

    updated_bars
      .transition(t)
      .attr("x", (d) => x_scale(d.abbr))
      .attr("y", (d) => y_scale(d.val))
      .attr("height", (d) => y_scale(0) - y_scale(d.val))
      .attr("width", x_scale.bandwidth())
      .attr("fill", o => o.abbr != "UNCA" ? "lightblue" : '#003DA5');

    if(tooltips) {
      updated_bars.each(function(d) {
        if(this._tippy) {
          this._tippy.setContent(tooltip_content(d));
        }
        else {
          tippy(this, {
            allowHTML: true,
            theme: 'light-border',
            content: tooltip_content(d),
            animation: false,
            arrow: true
          });
        }
      });
    }

    x_axis
      .transition(t)
      .call(d3.axisBottom(x_scale).tickSizeOuter(0));
  }

  svg.node().update = update;


  return svg.node();
}


export function summarize_data(data, group, sort_by, col_adjust) {
  const filtered_data = group == "All" ? data : data.filter(o => o.group == group)
  const summary_data = d3.rollups(
    filtered_data,
    a => ({
      abbr: a[0].school_abbr,
      school: a[0].school_name,
      average_salary: d3.mean(a, o => o.salary),
      CoL: a[0].CoL
    }),
    o => o.school_abbr
  ).map(a => a[1]);

  summary_data.forEach(function(o) {
    o.adjusted_average_salary = 100*o.average_salary/o.CoL;
    if(col_adjust) {
      o.val =  o.adjusted_average_salary
    } else {
        o.val = o.average_salary
      }
    });
  if(sort_by == "Avg Salary") {
    return d3.sort(summary_data, o => -o.val);
  }
  else {
    return summary_data;
  }
}

export function prepare_salary_timeseries(data, group, normalize, start_year = -Infinity) {
  const start_year_number = Number(start_year);
  const filtered_data = data
    .filter(d => d.group === group && Number.isFinite(d.avg_salary))
    .map(d => ({
      ...d,
      year_date: d3.utcParse("%Y")(String(d.year))
    }));

  const grouped_data = d3.groups(filtered_data, d => d.UnitID).map(([, values]) => {
    const sorted_values = d3.sort(values, d => d.year);
    const first_visible_value = sorted_values
      .find(d => d.year >= start_year_number && Number.isFinite(d.avg_salary) && d.avg_salary > 0)?.avg_salary;

    return sorted_values
      .filter(d => Number.isFinite(d.avg_salary) && (!normalize || first_visible_value))
      .map(d => ({
        ...d,
        salary_value: normalize ? d.avg_salary / first_visible_value : d.avg_salary,
        visible: d.year >= start_year_number
      }));
  }).filter(values => values.filter(d => d.visible).length > 1);

  return d3.sort(grouped_data, values => values[0].abbreviation === "UNCA" ? 1 : 0);
}

export function make_salary_timeseries_viz(grouped_data, opts = {}) {
  let current_grouped_data = grouped_data;
  let current_opts = {
    normalize: false,
    unca_color: "#003DA5",
    ...opts
  };
  let schools = new Map(current_grouped_data.map(values => [values[0].UnitID, values[0]]));
  const w = 900;
  const h = 500;
  const margin = {top: 34, right: 28, bottom: 54, left: 78};
  const svg = d3
    .create("svg")
    .attr("width", "100%")
    .attr("viewBox", [0, 0, w, h])
    .attr("role", "img")
    .attr("aria-label", "Average faculty salary over time across UNC System schools");

  const clip_id = `salary-timeseries-clip-${Math.random().toString(36).slice(2)}`;
  svg
    .append("clipPath")
    .attr("id", clip_id)
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", w - margin.left - margin.right)
    .attr("height", h - margin.top - margin.bottom);

  const x_scale = d3
    .scaleUtc()
    .range([margin.left, w - margin.right]);
  const y_scale = d3
    .scaleLinear()
    .range([h - margin.bottom, margin.top]);
  const line = d3
    .line()
    .defined(d => Number.isFinite(d.salary_value))
    .x(d => x_scale(d.year_date))
    .y(d => y_scale(d.salary_value));

  const x_axis = svg
    .append("g")
    .attr("transform", `translate(0,${h - margin.bottom})`);

  const y_grid = svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`);

  const y_axis = svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`);

  svg
    .append("text")
    .attr("x", w / 2)
    .attr("y", h - 12)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", 13)
    .text("Year");

  const y_label = svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", 13);

  const graph = svg.append("g").attr("clip-path", `url(#${clip_id})`);

  const label = svg
    .append("g")
    .attr("pointer-events", "none")
    .attr("opacity", 0);

  label
    .append("rect")
    .attr("rx", 4)
    .attr("fill", "var(--bs-body-bg)")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.25);

  const label_text = label
    .append("text")
    .attr("fill", "currentColor")
    .attr("font-size", 13)
    .attr("font-weight", 700)
    .attr("dominant-baseline", "middle");

  const overlay = svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", w - margin.left - margin.right)
    .attr("height", h - margin.top - margin.bottom)
    .attr("fill", "transparent")
    .style("touch-action", "none")
    .on("pointermove", highlight_closest)
    .on("pointerleave", reset_highlight);

  update(current_grouped_data, current_opts, {animate: false});

  const node = svg.node();
  node.update = (next_grouped_data, next_opts = {}) => {
    update(next_grouped_data, {...current_opts, ...next_opts}, {animate: true});
  };

  return node;

  function update(next_grouped_data, next_opts = {}, transition_opts = {}) {
    current_grouped_data = next_grouped_data;
    current_opts = {...current_opts, ...next_opts};
    schools = new Map(current_grouped_data.map(values => [values[0].UnitID, values[0]]));
    const flat_data = current_grouped_data.flat();
    const visible_data = flat_data.filter(d => d.visible);
    const y_extent = d3.extent(visible_data, d => d.salary_value);
    const y_pad = current_opts.normalize ? 0.05 : 5000;
    const y_format = current_opts.normalize ? d3.format(".2f") : d => `$${d3.format(",.0f")(d)}`;
    const transition = svg
      .transition()
      .duration(transition_opts.animate ? 700 : 0)
      .ease(d3.easeCubicInOut);

    x_scale.domain(d3.extent(visible_data, d => d.year_date));
    y_scale
      .domain([Math.max(0, y_extent[0] - y_pad), y_extent[1] + y_pad])
      .nice();

    x_axis
      .transition(transition)
      .call(d3.axisBottom(x_scale).ticks(d3.utcYear.every(2)).tickFormat(d3.utcFormat("%Y")).tickSizeOuter(0));

    y_axis
      .transition(transition)
      .call(d3.axisLeft(y_scale).ticks(6).tickFormat(y_format).tickSizeOuter(0))
      .call(g => g.select(".domain").remove());

    y_grid
      .transition(transition)
      .call(d3.axisLeft(y_scale).ticks(6).tickSize(-(w - margin.left - margin.right)).tickFormat("").tickSizeOuter(0))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke-opacity", 0.12));

    y_label.text(current_opts.normalize ? "Relative average salary" : "Average salary");

    graph
      .selectAll("path.salary-timeseries-line")
      .data(current_grouped_data, d => d[0].UnitID)
      .join(
        enter => enter
          .append("path")
          .attr("class", d => `salary-timeseries-line salary-timeseries-line-${d[0].UnitID}`)
          .attr("fill", "none")
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr("stroke", d => d[0].abbreviation === "UNCA" ? current_opts.unca_color : "currentColor")
          .attr("stroke-width", d => d[0].abbreviation === "UNCA" ? 4 : 1)
          .attr("stroke-opacity", 0)
          .attr("d", line)
          .call(enter => enter.transition(transition)
            .attr("stroke-opacity", d => d[0].abbreviation === "UNCA" ? 1 : 0.28)),
        update => update
          .attr("stroke", d => d[0].abbreviation === "UNCA" ? current_opts.unca_color : "currentColor")
          .attr("stroke-width", d => d[0].abbreviation === "UNCA" ? 4 : 1)
          .attr("stroke-opacity", d => d[0].abbreviation === "UNCA" ? 1 : 0.28)
          .call(update => update.transition(transition).attr("d", line)),
        exit => exit
          .transition(transition)
          .attr("stroke-opacity", 0)
          .remove()
      );

    graph.select(".salary-timeseries-line-199111").raise();
    label.attr("opacity", 0);
  }

  function highlight_closest(evt) {
    const [x, y] = d3.pointer(evt, svg.node());
    const year = x_scale.invert(x);
    const value = y_scale.invert(y);
    const closest = get_closest_salary_point(year, value, current_grouped_data, y_scale);

    if (!closest) {
      reset_highlight();
      return;
    }

    graph.selectAll("path.salary-timeseries-line")
      .attr("stroke-width", d => d[0].UnitID === closest.id ? 3.5 : d[0].abbreviation === "UNCA" ? 4 : 1)
      .attr("stroke-opacity", d => d[0].UnitID === closest.id ? 1 : d[0].abbreviation === "UNCA" ? 0.9 : 0.16);

    graph.select(`.salary-timeseries-line-${closest.id}`).raise();

    const school = schools.get(closest.id);
    const label_x = Math.min(w - margin.right - 190, Math.max(margin.left + 8, x_scale(closest.year_date) + 10));
    const label_y = Math.min(h - margin.bottom - 14, Math.max(margin.top + 14, y_scale(closest.salary_value)));

    label_text.text(`${school.abbreviation}: ${school.institution_name}`);
    const bbox = label_text.node().getBBox();
    label
      .attr("opacity", 1)
      .attr("transform", `translate(${label_x},${label_y})`);
    label.select("rect")
      .attr("x", -8)
      .attr("y", -bbox.height / 2 - 5)
      .attr("width", bbox.width + 16)
      .attr("height", bbox.height + 10);
    label_text.attr("x", 0).attr("y", 0);
  }

  function reset_highlight() {
    graph.selectAll("path.salary-timeseries-line")
      .attr("stroke-width", d => d[0].abbreviation === "UNCA" ? 4 : 1)
      .attr("stroke-opacity", d => d[0].abbreviation === "UNCA" ? 1 : 0.28);
    graph.select(".salary-timeseries-line-199111").raise();
    label.attr("opacity", 0);
  }
}

function get_closest_salary_point(year, value, grouped_data, y_scale) {
  const candidates = [];

  grouped_data.forEach(values => {
    const visible_values = values.filter(d => d.visible);
    const years = visible_values.map(d => d.year_date.getTime());
    const idx = d3.bisectCenter(years, year.getTime());
    const point = visible_values[idx];
    if (!point) return;

    candidates.push({
      ...point,
      id: point.UnitID,
      err: Math.abs(y_scale(point.salary_value) - y_scale(value))
    });
  });

  return d3.sort(candidates, d => d.err)[0];
}

function delay(duration, value) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(value);
    }, duration);
  });
}
