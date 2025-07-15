
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import mapboxgl from "https://cdn.skypack.dev/mapbox-gl@3.13.0";

mapboxgl.accessToken = MAPBOX_TOKEN;


////////////////////////////
// The main function.

export function make_map(construction) {
  const map = new mapboxgl.Map({
    container: 'map',
    zoom: 15.3,
    center: [-82.563, 35.6115],
    // style: "mapbox://styles/mapbox/outdoors-v12"
    style: "mapbox://styles/mapbox/standard-satellite"
    // style: "mapbox://styles/mapbox/standard"
    // style: "mapbox://styles/mapbox/light-v11"
  });

  // Add standard controls to the map on load.
  map.on("load", async function () {
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.set_style = set_style;
    map.show_construction = true;
    set_style("mapbox://styles/mapbox/standard-satellite");
  });

  return map;

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
        // "fill-color": '#333',
        "fill-opacity": 0.6
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
    });
    // map.once("styledata", add_construction);
  }
}

