import mapboxgl from "https://cdn.skypack.dev/mapbox-gl@3.13.0";
mapboxgl.accessToken = MAPBOX_TOKEN;

let popup;
export function make_map(map_data) {
  const construction = map_data.Construction;
  construction.features = construction.features.filter(function(feature) {
    return feature.properties.fill !== " none";
  });
  construction.features.forEach(function(feature,i) {
      if(feature.properties.id == "Outline") {
        feature.properties.base = 0;
        feature.properties.height = 1;
      }
      else if(
        feature.properties.id == "RoadsOuter" || 
        feature.properties.id == "Field") {
        feature.properties.base = 1;
        feature.properties.height = 2;
      }
    else if(feature.properties.id == "StadiumWalls") {
        feature.properties.base = 2;
        feature.properties.height = 30;
      }
    else if(feature.properties.id == "Buildings") {
        feature.properties.base = 2;
        feature.properties.height = 20;
      }
    else if(feature.properties.id == "Bleachers") {
        feature.properties.base = 2;
        feature.properties.height = 8*(((i-1) % 4)+1);
      }
    });
    const construction3D = {
      type: "FeatureCollection", 
      features: construction.features
    };

  const map = new mapboxgl.Map({
    container: 'map',
    zoom: 15.7,
    center: [-82.563, 35.612],
    pitch: 60,
    bearing: -30,
    style: "mapbox://styles/mapbox/standard"
  });

  // Experiment with iPhone features.
  map.dragRotate.enable();
  map.touchZoomRotate.enableRotation(); 

  map.set_style = set_style;
  map.add_unca_layers = add_unca_layers;

  map.on("load", async function () {
    // fitBounds doesn't seem to work with pitch.
    // map.fitBounds([
    //   [-82.57444,35.60558], // Southwest corner
    //   [-82.55738,35.62799] // Northeast corner
    // ]);
    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );
    map.show_construction = true;
    map.add_construction = add_construction;
    add_unca_layers();
    add_construction();
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
          "fill-color": "#003DA5",
          "fill-opacity": 0.1
        }
      });
      map.addLayer({
        id: key + "Boundary",
        type: "line",
        source: key,
        paint: {
          "stroke-color": "#003DA5",
          "stroke-width": 3,
          "stroke-opacity": 0.4
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
      if(!popup) {
        map.on('click', key, function(e) {
          const coordinates = e.lngLat;
          popup = new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(html)
            .addTo(map);
        });
      }
    });
  }

  function add_construction() {
    if (map.getLayer("construction3D")) {
      map.removeLayer("construction3D");
    }
    if (map.getSource("construction3D")) {
      map.removeSource("construction3D");
    }
    map.addSource("construction3D", {
      type: "geojson",
      data: construction3D
    });
    map.addLayer({
      id: "construction3D",
      type: "fill-extrusion",
      source: "construction3D",
      paint: {
        "fill-extrusion-color": ['get', 'fill'],
        "fill-extrusion-opacity": 0.7,
        "fill-extrusion-height": ['get', 'height'],
        "fill-extrusion-base": ['get', 'base']
      }
    });
  }

  function set_style(style) {
    map.setStyle(style);
    map.once("styledata", function() {
      if (map.show_construction) add_construction();
      add_unca_layers();
    });
  }
}

