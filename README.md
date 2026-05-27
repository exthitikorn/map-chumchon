# Bangkok Community Map (Demo)

เว็บตัวอย่างแผนที่กรุงเทพมหานครด้วย `Leaflet + OpenStreetMap`

## ความสามารถ

- แสดง polygon แบ่งเขตจากไฟล์ `JSON`
- กำหนดสีเขตได้เอง (`fillColor`, `strokeColor`)
- แสดงหมุดชุมชนจากไฟล์ `JSON`
- เพิ่มหมุดใหม่เองผ่านฟอร์ม (เก็บใน `localStorage`)
- filter ดูเฉพาะเขต และประเภทชุมชน (ชุมชนเมือง, แออัด, ชานเมือง ฯลฯ)
- หมุดสีต่างกันตามประเภทชุมชน (มี legend มุมล่างซ้าย คลิกเพื่อกรองได้)
- คลิกหมุดเพื่อดูรายละเอียด + ปุ่มนำทาง Google Maps
- แก้ไข/ลบหมุด (เก็บการเปลี่ยนแปลงใน `localStorage`)

## โครงสร้างไฟล์

- `index.html` หน้าเว็บหลัก
- `styles.css` สไตล์
- `app.js` logic แผนที่/filter/หมุด
- `data/districts.json` polygon เขต + สี
- `data/community-pins.json` หมุดตั้งต้น

## แหล่งที่มาข้อมูลชุมชน

หมุดชุมชนใน `data/community-pins.json` แปลงมาจากชุดข้อมูลเปิดของกรุงเทพมหานคร (Open Data Bangkok)

| รายการ | รายละเอียด |
| --- | --- |
| ชุดข้อมูล | [ที่ตั้งชุมชนในพื้นที่เขตกรุงเทพมหานคร](https://data.bangkok.go.th/dataset/chumchon) |
| ผู้เผยแพร่ | กรุงเทพมหานคร — [Open Data Bangkok](https://data.bangkok.go.th) |
| ไฟล์ต้นทาง | `community.csv` — [ดาวน์โหลดโดยตรง](https://data.bangkok.go.th/dataset/4d05e37a-2f09-48c5-9905-d5c65176a4a6/resource/d5c69e37-5c8f-48ef-9275-97c125939352/download/community.csv) |
| รูปแบบในโปรเจกต์ | แปลงเป็น JSON (`id`, `name`, `district`, `type`, `address`, `lat`, `lng`, `note`) ด้วย `scripts/import-community-csv.js` |

หมุดที่ผู้ใช้เพิ่ม/แก้ไขผ่านหน้าเว็บเก็บใน `localStorage` ของเบราว์เซอร์ ไม่ได้รวมอยู่ในชุดข้อมูล Open Data ข้างต้น

## วิธีใช้งาน

เนื่องจากมี `fetch()` ไฟล์ JSON ให้เปิดผ่าน local server:

```bash
cd d:\Code\map
python -m http.server 5500
```

จากนั้นเปิด:

- `http://localhost:5500`

## ดึง polygon จาก Bangkok Health Map

1. ดาวน์โหลดหน้าเว็บ Bangkok Health Map เป็นไฟล์ HTML (เช่น `page28.html`)
2. รันสคริปต์แปลงเป็น GeoJSON:

```bash
node scripts/extract-districts.js path/to/downloaded-page.html
```

ไฟล์ HTML ต้นทางไม่ต้องเก็บใน repo (ระบุ path ตอนรันสคริปต์ได้)

ผลลัพธ์จะเขียนทับ `data/districts.json` (ครบ 50 เขต จาก `generateBoundary`)

## ดึงหมุดชุมชนจาก Open Data กทม. (มี lat/lng)

ดู [แหล่งที่มาข้อมูลชุมชน](#แหล่งที่มาข้อมูลชุมชน) — สคริปต์จะดาวน์โหลด `community.csv` (หรือใช้ไฟล์ใน `data/community-source.csv` ถ้ามี) แล้วเขียนทับ `data/community-pins.json`

```bash
node scripts/import-community-csv.js
# หรือระบุ path ไฟล์ CSV เอง
node scripts/import-community-csv.js path/to/community.csv
```

## ตัวอย่างการเพิ่มเขตใน `data/districts.json`

```json
{
  "type": "Feature",
  "properties": {
    "district": "เขตตัวอย่าง",
    "fillColor": "#c084fc",
    "strokeColor": "#7e22ce"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[100.5, 13.7], [100.52, 13.7], [100.52, 13.72], [100.5, 13.72], [100.5, 13.7]]]
  }
}
```

## ตัวอย่างการเพิ่มหมุดใน `data/community-pins.json`

```json
{
  "id": "c004",
  "name": "ชุมชนตัวอย่าง",
  "district": "เขตตัวอย่าง",
  "address": "ที่อยู่ตัวอย่าง",
  "lat": 13.71,
  "lng": 100.51,
  "note": "รายละเอียดเพิ่มเติม"
}
```
