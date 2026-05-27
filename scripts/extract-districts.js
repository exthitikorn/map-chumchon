/**
 * Extract generateBoundary([...]) from healthmap page HTML -> data/districts.json
 * Usage: node scripts/extract-districts.js [path-to-page.html]
 */

const fs = require("fs");
const path = require("path");

const htmlPath = process.argv[2];
const outPath = path.join(__dirname, "..", "data", "districts.json");

if (!htmlPath) {
  console.error("Usage: node scripts/extract-districts.js <path-to-page.html>");
  process.exit(1);
}

if (!fs.existsSync(htmlPath)) {
  console.error("File not found:", htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");

function extractGenerateBoundaryArray(source) {
  const marker = "generateBoundary(";
  const start = source.indexOf(marker);
  if (start === -1) return null;

  let i = start + marker.length;
  while (i < source.length && source[i] !== "[") i += 1;
  if (source[i] !== "[") return null;

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  const arrayStart = i;

  for (; i < source.length; i += 1) {
    const c = source[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) inString = false;
      continue;
    }

    if (c === '"' || c === "'") {
      inString = true;
      quote = c;
      continue;
    }

    if (c === "[") depth += 1;
    else if (c === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(arrayStart, i + 1);
      }
    }
  }

  return null;
}

const arrayJson = extractGenerateBoundaryArray(html);
if (!arrayJson) {
  console.error("generateBoundary([...]) not found in", htmlPath);
  process.exit(1);
}

const boundaries = JSON.parse(arrayJson);
console.log(`Found ${boundaries.length} districts`);

function districtName(dThName) {
  const parts = String(dThName).trim().split(/\s+/);
  if (parts.length >= 3 && /^Zone$/i.test(parts[0])) {
    return parts.slice(2).join(" ");
  }
  if (parts.length >= 2 && /^Zone$/i.test(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return dThName.replace(/^Zone\s+\d+\s+/i, "").trim();
}

function themeToColors(theme) {
  if (!theme || typeof theme !== "object") {
    return { fillColor: "#60a5fa", strokeColor: "#1d4ed8", fillOpacity: 0.35 };
  }
  return {
    fillColor: theme.fillColor || theme.color || "#60a5fa",
    strokeColor: theme.color || theme.strokeColor || "#ffffff",
    fillOpacity: theme.fillOpacity != null ? theme.fillOpacity : 0.5
  };
}

const features = boundaries.map((item) => {
  const coordinates = JSON.parse(item.coordinate);
  const colors = themeToColors(item.theme);
  const name = districtName(item.d_th_name);

  return {
    type: "Feature",
    properties: {
      district: name,
      zone: item.d_th_name,
      nameEn: item.d_en_name,
      fillColor: colors.fillColor,
      strokeColor: colors.strokeColor,
      fillOpacity: colors.fillOpacity,
      desc: item.desc || null
    },
    geometry: {
      type: "Polygon",
      coordinates
    }
  };
});

const geojson = { type: "FeatureCollection", features };
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), "utf8");
console.log(`Wrote ${outPath}`);
