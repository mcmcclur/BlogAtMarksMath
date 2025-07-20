import json
import re
from math import cos, radians
from xml.dom import minidom
from svg.path import parse_path
from shapely.geometry import Polygon, mapping

# --- CONFIGURATION ---
SVG_FILE = "MySketch-ForConversion.svg"
GEOJSON_FILE = "MySketch.geojson"
lat_nw = 35.61425
lon_nw = -82.56522
width_m = 627
height_m = 0.99 * width_m
DECIMALS = 6
PATH_SAMPLES = 50

# --- Style Parsing ---
def parse_css_styles(style_string):
    style_dict = {}
    for rule in re.findall(r'(\.[\w\-]+)\s*\{([^}]+)\}', style_string):
        class_name = rule[0].strip('.')
        styles = {}
        for decl in rule[1].split(';'):
            if ':' in decl:
                prop, val = decl.split(':', 1)
                styles[prop.strip()] = val.strip()
        style_dict[class_name] = styles
    return style_dict

# --- Coordinate Conversion ---
def svg_to_latlon(x, y, svg_width, svg_height):
    lat_span = height_m / 111320
    lon_span = width_m / (40075000 * cos(radians(lat_nw)) / 360)
    lon = lon_nw + (x / svg_width) * lon_span
    lat = lat_nw - (y / svg_height) * lat_span
    return [round(lon, DECIMALS), round(lat, DECIMALS)]

# --- Convert path to polygonal list of (x, y) tuples ---
def path_to_polygon(path_data, samples=PATH_SAMPLES):
    path = parse_path(path_data)
    points = []
    for seg in path:
        for i in range(samples):
            pt = seg.point(i / samples)
            points.append((pt.real, pt.imag))
    if points[0] != points[-1]:
        points.append(points[0])
    return points

# --- Parse SVG ---
doc = minidom.parse(SVG_FILE)
svg_tag = doc.getElementsByTagName("svg")[0]
viewBox = svg_tag.getAttribute("viewBox")
_, _, svg_width, svg_height = map(float, viewBox.split())

# --- Load styles from <defs> ---
style_dict = {}
for defs in doc.getElementsByTagName("defs"):
    for style in defs.getElementsByTagName("style"):
        if style.firstChild:
            style_dict.update(parse_css_styles(style.firstChild.nodeValue))

# --- Main recursive extraction ---
features = []

def extract_elements(node, parent_id=None, grandparent_id=None):
    if node.nodeType != node.ELEMENT_NODE:
        return

    tag = node.nodeName
    cls = node.getAttribute("class")
    styles = style_dict.get(cls, {}).copy()

    if node.hasAttribute("style"):
        inline = node.getAttribute("style")
        inline_styles = dict(item.split(':') for item in inline.split(';') if ':' in item)
        styles.update(inline_styles)

    fill = styles.get("fill", "").lower()
    if fill == "none" or fill == "":
        # Skip anything with no visible fill
        pass
    else:
        this_id = node.getAttribute("id") or parent_id or grandparent_id

        if tag == "path":
            d = node.getAttribute("d")
            pts = path_to_polygon(d)
            print(f"Extracted path with {len(pts)} points")

        elif tag == "polygon":
            raw = node.getAttribute("points").strip()
            coords = re.split(r'[,\s]+', raw)
            try:
                pts = [(float(coords[i]), float(coords[i+1])) for i in range(0, len(coords)-1, 2)]
                if pts[0] != pts[-1]:
                    pts.append(pts[0])
                print(f"Extracted polygon with {len(pts)} points")
            except ValueError:
                pts = None
                print(f"⚠️ Skipping malformed polygon: {raw}")
        else:
            pts = None

        if tag in {"path", "polygon"} and pts:
            geo_pts = [svg_to_latlon(x, y, svg_width, svg_height) for x, y in pts]
            polygon = Polygon(geo_pts)
            feature = {
                "type": "Feature",
                "geometry": mapping(polygon),
                "properties": styles | {"class": cls}
            }
            if this_id:
                feature["properties"]["id"] = this_id
            features.append(feature)

    # Recurse into children regardless of whether this node was drawable
    for child in node.childNodes:
        extract_elements(child, node.getAttribute("id") or parent_id, parent_id)


extract_elements(doc.documentElement)

# --- Save GeoJSON ---
geojson = {
    "type": "FeatureCollection",
    "features": features
}

with open(GEOJSON_FILE, "w") as f:
    json.dump(geojson, f, indent=2)

print(f"\n✅ Exported {len(features)} features to {GEOJSON_FILE}")
