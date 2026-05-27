/**
 * Apply deleted pin IDs to data/community-pins.json
 *
 * แนวคิด:
 * 1) ลบหมุดผ่าน UI ตามปกติ (เบราว์เซอร์จะเก็บ id ไว้ใน localStorage.DELETED_IDS_KEY)
 * 2) เปิด DevTools แล้วคัดลอกค่าจาก:
 *      localStorage.getItem("deletedCommunityPinIds")
 *    ซึ่งจะได้ string เป็น JSON array ของ id
 * 3) วางค่า JSON นั้นลงในไฟล์:
 *      data/deletedCommunityPinIds.json
 * 4) รัน:
 *      node scripts/apply-deleted-pins.js
 *
 * สคริปต์จะ:
 * - อ่าน id ที่ต้องลบจาก data/deletedCommunityPinIds.json
 * - อ่าน data/community-pins.json
 * - ลบ record ที่ id ตรงกันออก
 * - สำรองไฟล์เดิมเป็น data/community-pins.backup-<timestamp>.json
 * - เขียนไฟล์ data/community-pins.json ใหม่
 */

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const pinsPath = path.join(dataDir, "community-pins.json");
const deletedIdsPath = path.join(dataDir, "deletedCommunityPinIds.json");

function loadJsonArray(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ไม่พบไฟล์ ${description}: ${path.relative(process.cwd(), filePath)}`);
  }
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) {
    throw new Error(`ไฟล์ ${description} ว่างเปล่า: ${path.relative(process.cwd(), filePath)}`);
  }
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error(`ไฟล์ ${description} ต้องเป็น JSON array`);
  }
  return data;
}

function backupFile(srcPath) {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const { dir, name, ext } = path.parse(srcPath);
  const backupName = `${name}.backup-${stamp}${ext}`;
  const backupPath = path.join(dir, backupName);
  fs.copyFileSync(srcPath, backupPath);
  return backupPath;
}

function main() {
  if (!fs.existsSync(pinsPath)) {
    console.error(
      "ไม่พบไฟล์ community-pins.json ที่:",
      path.relative(process.cwd(), pinsPath)
    );
    process.exit(1);
  }

  const deletedIds = loadJsonArray(deletedIdsPath, "deletedCommunityPinIds.json")
    .map((id) => String(id))
    .filter((id) => id.trim().length > 0);

  if (!deletedIds.length) {
    console.log("ไม่มี id สำหรับลบ (deletedCommunityPinIds.json ว่าง)");
    return;
  }

  const deletedSet = new Set(deletedIds);

  const pins = JSON.parse(fs.readFileSync(pinsPath, "utf8"));
  if (!Array.isArray(pins)) {
    throw new Error("community-pins.json ต้องเป็น JSON array");
  }

  const beforeCount = pins.length;
  const keptPins = pins.filter((pin) => !deletedSet.has(String(pin.id)));
  const removedCount = beforeCount - keptPins.length;

  if (removedCount === 0) {
    console.log(
      "ไม่มีหมุดใดใน community-pins.json ที่มี id ตรงกับ deletedCommunityPinIds.json"
    );
    return;
  }

  const backupPath = backupFile(pinsPath);
  fs.writeFileSync(pinsPath, `${JSON.stringify(keptPins, null, 2)}\n`, "utf8");

  console.log(
    `ลบหมุด ${removedCount} รายการ จากทั้งหมด ${beforeCount} รายการ และเขียนไฟล์ใหม่ที่`,
    path.relative(process.cwd(), pinsPath)
  );
  console.log("สำรองไฟล์เดิมไว้ที่:", path.relative(process.cwd(), backupPath));
}

main();

