
import mapboxgl from "https://cdn.skypack.dev/mapbox-gl@3.13.0";

mapboxgl.accessToken = MAPBOX_TOKEN;


////////////////////////////
// The main function.

export function make_map(map_data) {
  const construction = map_data.Construction
  const map = new mapboxgl.Map({
    container: 'map',
    zoom: 13.5,
    center: [-82.57, 35.617],
    // style: "mapbox://styles/mapbox/outdoors-v12"
    // style: "mapbox://styles/mapbox/standard-satellite"
    style: "mapbox://styles/mapbox/standard"
    // style: "mapbox://styles/mapbox/light-v11"
  });

  // Add standard controls to the map on load.
  map.on("load", async function () {
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    add_unca_layers();
    map.set_style = set_style;
    map.show_construction = false;
    // set_style("mapbox://styles/mapbox/standard-satellite");

  });


  return map;

  function add_unca_layers() {
     Object.keys(map_data).slice(1).forEach(function (key) {
      map.addSource(key, {
        type: "geojson",
        data: map_data[key]
      });
      map.addLayer({
        id: key,
        type: "fill",
        source: key,
        paint: {
          // "fill-color": "#aaa",
          "fill-color": "#003DA5",
          "fill-opacity": 0.2
        }
      });
      map.addLayer({
        id: key + "Boundary",
        type: "line",
        source: key,
        paint: {
          // "stroke-color": "#666",
          "stroke-color": "#003DA5",
          "stroke-width": 3,
          "stroke-opacity": 0.8
        }
      });
      let html;
      if (key === "MainCampus") {
        html = `<h3 style="font-size: 1.2em">Main Campus</h3>
        <p>UNCA's main campus, as outlined here, is about 150 acres.</p>
        `;
      }
      else if (key === "TheWoods") {
        html = `<h3 style="font-size: 1.2em">The Woods</h3>
        <p>The Woods occupy about 48 acres just south of main campus and on the other side of W. T. Weaver.</p>
        `;
      }
      else if (key === "Observatory") {
        html = `<h3 style="font-size: 1.2em">Lookout Mountain</h3>
        <p>Looming just to the North of UNCA's main campus is 65 acres of millennial campus that includes the peak of Lookout Mountain.</p>
        `;
      }
      else if (key === "Odyssey") {
        html = `<h3 style="font-size: 1.2em">Odyssey School</h3>
        <p>The Odyssey School takes a small portion of 22 acres of millennial campus located just to the southwest of main campus and on the other side of Broadway.</p>
        `;
      }
      else {
        html = key;
      }
      map.on('click', key, function(e) {
        const coordinates = e.lngLat;
        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(html)
          .addTo(map);
      });
    })
  }

  function add_construction() {
    if (map.getLayer("constructionFill")) {
      map.removeLayer("constructionFill");
    }
    if (map.getLayer("construction")) {
      map.removeLayer("construction");
    }
    if (map.getSource("construction")) {
      map.removeSource("construction");
    }
    
    map.addSource("construction", {
      type: "geojson",
      data: construction
    });
    map.addLayer({
      id: "constructionFill",
      type: "fill",
      source: "construction",
      paint: {
        "fill-color": ['get', 'fill'],
        "fill-opacity": 0.7
      }
    });
    // map.addLayer({
    //   id: "construction",
    //   type: "line",
    //   source: "construction",
    //   paint: {
    //     "line-width": 0.5
    //   }
    // });
  }

  function set_style(style) {
    map.setStyle(style);
    map.once("styledata", function() {
      if (map.show_construction) add_construction();
      add_unca_layers();
    });
    // map.once("styledata", add_construction);
  }
}

