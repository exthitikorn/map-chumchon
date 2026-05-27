/**
 * Import BMA community locations (CSV) -> data/community-pins.json
 *
 * Source: https://data.bangkok.go.th/dataset/chumchon
 * Default CSV: download from Open Data (Windows-874 / TIS-620 encoding)
 *
 * Usage:
 *   node scripts/import-community-csv.js
 *   node scripts/import-community-csv.js path/to/community.csv
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const DEFAULT_CSV_URL =
  "https://data.bangkok.go.th/dataset/4d05e37a-2f09-48c5-9905-d5c65176a4a6/resource/d5c69e37-5c8f-48ef-9275-97c125939352/download/community.csv";

const outPath = path.join(__dirname, "..", "data", "community-pins.json");
const cachePath = path.join(__dirname, "..", "data", "community-source.csv");

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          download(response.headers.location).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function decodeCsvBuffer(buffer) {
  return new TextDecoder("windows-874").decode(buffer);
}

/** @param {string} line */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      fields.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  fields.push(current);
  return fields;
}

function normalizeDistrict(dname) {
  return String(dname || "")
    .replace(/^เขต\s*/u, "")
    .trim();
}

function roundCoord(value, digits = 6) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Number(n.toFixed(digits));
}

function isBangkokCoord(lat, lng) {
  return lat >= 13.4 && lat <= 14.2 && lng >= 100.2 && lng <= 100.95;
}

function rowToPin(row, index) {
  const [
    oid,
    name,
    dcode,
    scode,
    typeId,
    latitude,
    longitude,
    dname,
    sname,
    typeName,
  ] = row;

  const lat = roundCoord(latitude);
  const lng = roundCoord(longitude);

  if (lat == null || lng == null || !isBangkokCoord(lat, lng)) {
    return { error: `invalid coordinates: ${latitude}, ${longitude}`, index, name };
  }

  const district = normalizeDistrict(dname);
  const subdistrict = String(sname || "").trim();
  const address = [subdistrict, String(dname || "").trim(), "กรุงเทพมหานคร"]
    .filter(Boolean)
    .join(" ");

  const type = String(typeName || "").trim();
  const noteParts = [];
  if (dcode) noteParts.push(`รหัสเขต ${dcode}`);
  if (scode) noteParts.push(`รหัสแขวง ${scode}`);

  const pin = {
    id: String(oid || `row-${index}`).trim(),
    name: String(name || "").trim(),
    district,
    address,
    lat,
    lng,
  };
  if (type) pin.type = type;
  const typeIdStr = String(typeId || "").trim();
  if (typeIdStr) pin.typeId = typeIdStr;
  const note = noteParts.join(" · ");
  if (note) pin.note = note;
  return pin;
}

async function loadCsvText(csvArg) {
  if (csvArg) {
    const filePath = path.resolve(csvArg);
    return decodeCsvBuffer(fs.readFileSync(filePath));
  }

  if (fs.existsSync(cachePath)) {
    console.log(`Using cached ${path.relative(process.cwd(), cachePath)}`);
    return decodeCsvBuffer(fs.readFileSync(cachePath));
  }

  console.log("Downloading community.csv from Open Data...");
  const buffer = await download(DEFAULT_CSV_URL);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, buffer);
  console.log(`Cached to ${path.relative(process.cwd(), cachePath)}`);
  return decodeCsvBuffer(buffer);
}

async function main() {
  const csvArg = process.argv[2];
  const text = await loadCsvText(csvArg);
  const lines = text.trim().split(/\r?\n/);

  if (lines.length < 2) {
    console.error("CSV is empty or missing header");
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]);
  const expected = [
    "OID_",
    "name",
    "dcode",
    "scode",
    "type_id",
    "latitude",
    "longitude",
    "dname",
    "sname",
    "type_name",
  ];
  if (header.join(",") !== expected.join(",")) {
    console.warn("Unexpected header:", header.join(","));
  }

  const pins = [];
  const errors = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCsvLine(line);
    if (row.length !== expected.length) {
      errors.push({ line: i + 1, reason: `expected ${expected.length} columns, got ${row.length}` });
      continue;
    }

    const pin = rowToPin(row, i);
    if (pin.error) {
      errors.push({ line: i + 1, reason: pin.error, name: pin.name });
      continue;
    }
    if (!pin.name) {
      errors.push({ line: i + 1, reason: "missing name" });
      continue;
    }
    pins.push(pin);
  }

  const districtsPath = path.join(__dirname, "..", "data", "districts.json");
  let knownDistricts = null;
  if (fs.existsSync(districtsPath)) {
    const geo = JSON.parse(fs.readFileSync(districtsPath, "utf8"));
    knownDistricts = new Set(geo.features.map((f) => f.properties.district));
    const unknown = [...new Set(pins.map((p) => p.district))].filter((d) => !knownDistricts.has(d));
    if (unknown.length) {
      console.warn(`Districts not in districts.json (${unknown.length}):`, unknown.slice(0, 10).join(", "));
      if (unknown.length > 10) console.warn("...");
    }
  }

  fs.writeFileSync(outPath, `${JSON.stringify(pins, null, 2)}\n`, "utf8");

  console.log(`Wrote ${pins.length} pins to ${path.relative(process.cwd(), outPath)}`);
  if (errors.length) {
    console.warn(`Skipped ${errors.length} rows:`);
    errors.slice(0, 5).forEach((e) => console.warn(`  line ${e.line}: ${e.reason}`));
    if (errors.length > 5) console.warn(`  ... and ${errors.length - 5} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
