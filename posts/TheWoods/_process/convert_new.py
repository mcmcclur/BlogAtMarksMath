from svg.path import parse_path
from xml.dom import minidom
from shapely.geometry import Polygon, LineString, mapping
import json
import numpy as np
import re

# --- CONFIGURATION ---
svg_path = "DevelopmentDrawingClippedVM.svg"
geojson_path = "DevelopmentDrawingClippedVM.geojson"

# Mainly, I'm interested in the Python program itself.
# Here are the parameters I used before, though, they
# might need to be adjusted:
lat_nw = 35.61421
lon_nw = -82.56522
width_m = 630
height_m = 0.97*width_m

# --- SVG DIMENSIONS ---
doc = minidom.parse(svg_path)
svg_tag = doc.getElementsByTagName("svg")[0]
viewBox = svg_tag.getAttribute("viewBox")
if viewBox:
    _, _, width_svg, height_svg = map(float, viewBox.strip().split())
else:
    width_svg = float(svg_tag.getAttribute("width"))
    height_svg = float(svg_tag.getAttribute("height"))

# height_m = height_svg / width_svg * width_m

print(f"SVG dimensions: {width_svg}x{height_svg} pixels")
print(f"Geographic dimensions: {width_m}m x {height_m}m")

# --- GEOGRAPHIC CONVERSION ---
deg_per_meter_lat = 1 / 111320
deg_per_meter_lon = 1 / (40075000 * np.cos(np.radians(lat_nw)) / 360)

def svg_to_latlon(x, y):
    lon = lon_nw + (x / width_svg) * width_m * deg_per_meter_lon
    lat = lat_nw - (y / height_svg) * height_m * deg_per_meter_lat
    return [round(lon, 6), round(lat, 6)]

# --- PARSE CSS STYLE DEFINITIONS ---
# style_dict = {}
# style_tags = doc.getElementsByTagName("style")
# for style_tag in style_tags:
#     if style_tag.firstChild:
#         css_text = style_tag.firstChild.nodeValue
#         # Match .cls-123 { fill: #abcdef; ... }
#         matches = re.findall(r"\.(\w+)\s*{[^}]*?fill\s*:\s*([^;]+)", css_text)
#         for class_name, fill_value in matches:
#             style_dict[class_name.strip()] = fill_value.strip()

# --- PARSE CSS STYLE DEFINITIONS ---
style_dict = {}
style_tags = doc.getElementsByTagName("style")
for style_tag in style_tags:
    if style_tag.firstChild:
        css_text = style_tag.firstChild.nodeValue
        # Fix regex to include hyphens in class names
        matches = re.findall(r"\.([\w\-]+)\s*{[^}]*?fill\s*:\s*([^;]+)", css_text)
        for class_name, fill_value in matches:
            style_dict[class_name.strip()] = fill_value.strip()




# --- EXTRACT PATH ELEMENTS ---
features = []
path_elements = doc.getElementsByTagName("path")

for path_elem in path_elements:
    d_attr = path_elem.getAttribute("d")
    if not d_attr:
        continue

    try:
        path = parse_path(d_attr)
    except Exception:
        continue

    coords = []
    for segment in path:
        try:
            x, y = segment.start.real, segment.start.imag
            coords.append(svg_to_latlon(x, y))
        except Exception:
            continue

    if len(coords) < 2:
        continue

    # Determine geometry type
    if True:
        geometry = mapping(Polygon(coords))
    else:
        geometry = mapping(LineString(coords))

    # Resolve style
    cls = path_elem.getAttribute("class")
    inline_fill = path_elem.getAttribute("fill")
    fill_value = inline_fill or style_dict.get(cls, None)

    feature = {
        "type": "Feature",
        "geometry": geometry,
        "properties": {
            "class": cls,
            "id": path_elem.getAttribute("id"),
            "fill": fill_value
        }
    }
    features.append(feature)
    # Later, inside path loop:
    cls = path_elem.getAttribute("class").strip()
    cls = cls.split()[0] if cls else None
    inline_fill = path_elem.getAttribute("fill")
    fill_value = inline_fill or style_dict.get(cls)

    if not fill_value:
        print(f"⚠️ No fill found for class '{cls}' (inline='{inline_fill}')")

# --- OUTPUT TO GEOJSON ---
geojson = {
    "type": "FeatureCollection",
    "features": features
}

with open(geojson_path, "w") as f:
    json.dump(geojson, f, indent=2)

print(f"✅ Saved {len(features)} features to {geojson_path}")
