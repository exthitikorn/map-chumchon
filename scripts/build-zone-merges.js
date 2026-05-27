/**
 * Union district polygons by fillColor and as one Bangkok shape.
 * Usage: node scripts/build-zone-merges.js
 * Requires: npm install @turf/turf (dev)
 */

const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");

const districtsPath = path.join(__dirname, "..", "data", "districts.json");
const outPath = path.join(__dirname, "..", "data", "zone-merges.json");

function unionAll(features) {
  if (!features.length) {
    return null;
  }
  let merged = features[0];
  for (let i = 1; i < features.length; i += 1) {
    merged = turf.union(turf.featureCollection([merged, features[i]]));
  }
  return merged;
}

const districts = JSON.parse(fs.readFileSync(districtsPath, "utf8"));
const byColor = new Map();

for (const feature of districts.features) {
  const color = feature.properties.fillColor;
  if (!byColor.has(color)) {
    byColor.set(color, []);
  }
  byColor.get(color).push(feature);
}

const colorFeatures = [];
for (const [color, group] of byColor) {
  const merged = unionAll(group);
  const sample = group[0].properties;
  merged.properties = {
    fillColor: color,
    strokeColor: sample.strokeColor,
    fillOpacity: sample.fillOpacity,
    districts: group.map((f) => f.properties.district),
    mergeLevel: "color"
  };
  colorFeatures.push(merged);
}

colorFeatures.sort((a, b) => a.properties.fillColor.localeCompare(b.properties.fillColor));

const single = unionAll(districts.features);
single.properties = {
  fillColor: "#94a3b8",
  strokeColor: "#ffffff",
  fillOpacity: 0.32,
  districts: districts.features.map((f) => f.properties.district),
  mergeLevel: "all"
};

const output = {
  byColor: { type: "FeatureCollection", features: colorFeatures },
  single: { type: "FeatureCollection", features: [single] }
};

fs.writeFileSync(outPath, JSON.stringify(output), "utf8");
console.log(`Wrote ${outPath} (${colorFeatures.length} color groups + 1 full)`);
