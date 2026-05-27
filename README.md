# แผนที่ชุมชนกรุงเทพฯ

เว็บแอปตัวอย่างสำหรับดูตำแหน่งชุมชนในกรุงเทพมหานครบนแผนที่  
ใช้ [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) ไม่ต้องติดตั้ง backend

---

## เริ่มต้นใช้งาน

เปิดไฟล์ `index.html` ตรงๆ ในเบราว์เซอร์ **ไม่ได้** — ต้องรันผ่านเว็บเซิร์ฟเวอร์เพราะแอปโหลดข้อมูลจากไฟล์ JSON

1. เปิดเทอร์มินัลที่โฟลเดอร์โปรเจกต์
2. รันคำสั่งใดคำสั่งหนึ่งด้านล่าง
3. เปิดเบราว์เซอร์ไปที่ `http://localhost:5500`

**Python (แนะนำ — มักมีอยู่แล้วบนเครื่อง)**

```bash
python -m http.server 5500
```

**Node.js (ถ้ามี `npx`)**

```bash
npx --yes serve -p 5500
```

---

## ใช้งานบนเว็บ

แผงควบคุมด้านข้างแผนที่ใช้กรองและจัดการหมุดได้ดังนี้

| สิ่งที่ทำได้ | วิธีใช้ |
| --- | --- |
| กรองตามเขต | พิมพ์หรือเลือกชื่อเขตในช่อง **Filter เขต** |
| กรองตามประเภทชุมชน | เลือกจากรายการ เช่น ชุมชนเมือง, แออัด, ชานเมือง |
| กรองจาก legend | คลิกสีหมุดมุมล่างซ้ายของแผนที่ |
| ดูรายละเอียด | คลิกหมุดบนแผนที่ หรือเลือกจากรายการ **ชุมชนในระบบ** |
| นำทาง | ปุ่ม Google Maps ใน popup ของหมุด |
| เพิ่มหมุด | กรอกฟอร์ม **เพิ่มหมุดชุมชน** (พิกัด lat/lng) |
| แก้ไข / ลบ | เปิดหมุดแล้วใช้ปุ่มในหน้าต่างรายละเอียด |

**หมายเหตุเกี่ยวกับข้อมูล**

- หมุดจากไฟล์ `data/community-pins.json` เป็นข้อมูลตั้งต้นจาก Open Data กทม.
- หมุดที่คุณเพิ่ม แก้ หรือลบ จะเก็บใน **localStorage** ของเบราว์เซอร์เครื่องนั้นเท่านั้น ไม่ถูกบันทึกลงไฟล์ในโปรเจกต์
- ล้าง cache หรือเปลี่ยนเบราว์เซอร์ การแก้ไขใน localStorage อาจหายไป

---

## โครงสร้างโปรเจกต์

```
map/
├── index.html              # หน้าเว็บหลัก
├── styles.css              # สไตล์ UI
├── app.js                  # แผนที่, filter, หมุด, localStorage
├── data/
│   ├── districts.json      # polygon เขต 50 เขต + สี
│   └── community-pins.json # หมุดชุมชนตั้งต้น
└── scripts/
    ├── extract-districts.js      # แปลง HTML → districts.json
    └── import-community-csv.js   # แปลง CSV กทม. → community-pins.json
```

---

## ที่มาข้อมูล

### หมุดชุมชน

แปลงจากชุดข้อมูลเปิดของกรุงเทพมหานคร

| รายการ | ลิงก์ |
| --- | --- |
| ชุดข้อมูล | [ที่ตั้งชุมชนในพื้นที่เขตกรุงเทพมหานคร](https://data.bangkok.go.th/dataset/chumchon) |
| ผู้เผยแพร่ | [Open Data Bangkok](https://data.bangkok.go.th) |
| ไฟล์ CSV ต้นทาง | [community.csv](https://data.bangkok.go.th/dataset/4d05e37a-2f09-48c5-9905-d5c65176a4a6/resource/d5c69e37-5c8f-48ef-9275-97c125939352/download/community.csv) |

ในโปรเจกต์เก็บเป็น JSON ฟิลด์หลัก: `id`, `name`, `district`, `type`, `address`, `lat`, `lng`, `note`

### เขต (polygon)

มาจากการแปลงหน้า Bangkok Health Map (สคริปต์ `extract-districts.js`) — ครบ 50 เขต

---

## อัปเดตข้อมูล (สำหรับนักพัฒนา)

ต้องมี **Node.js** ติดตั้งแล้ว

### ดึงหมุดชุมชนใหม่จาก Open Data

สคริปต์จะดาวน์โหลด `community.csv` อัตโนมัติ (หรือใช้ `data/community-source.csv` ถ้ามีไฟล์นั้นอยู่แล้ว) แล้วเขียนทับ `data/community-pins.json`

```bash
node scripts/import-community-csv.js
```

ใช้ไฟล์ CSV ที่ดาวน์โหลดเอง:

```bash
node scripts/import-community-csv.js path/to/community.csv
```

### ดึง polygon เขตใหม่

1. บันทึกหน้า Bangkok Health Map เป็นไฟล์ HTML (เช่น `page28.html`) — ไฟล์นี้ไม่ต้อง commit
2. รัน:

```bash
node scripts/extract-districts.js path/to/downloaded-page.html
```

ผลลัพธ์จะเขียนทับ `data/districts.json`

3. สร้าง polygon รวมตามสี (ใช้ตอน zoom out บนแผนที่):

```bash
npm install
npm run build:zones
```

ผลลัพธ์จะเขียนทับ `data/zone-merges.json`

### โหมดแสดงเขตตามระดับ zoom (โหมด «ทุกเขต»)

| Zoom | การแสดง |
|------|---------|
| ≥ 13 | แสดง polygon รายเขต (50 เขต) |
| 10–12 | รวม polygon ตามสีเดิม (8 กลุ่ม) |
| ≤ 9 | รวมเป็น 1 พื้นที่ทั้งกรุงเทพ |

คลิกพื้นที่ที่รวมแล้วจะซูมเข้าเพื่อดูรายละเอียด

---

## รูปแบบข้อมูล (อ้างอิง)

**เขต** — GeoJSON Feature ใน `data/districts.json`:

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

**หมุดชุมชน** — อ็อบเจ็กต์ในอาร์เรย์ `data/community-pins.json`:

```json
{
  "id": "c004",
  "name": "ชุมชนตัวอย่าง",
  "district": "เขตตัวอย่าง",
  "type": "ชุมชนเมือง",
  "address": "ที่อยู่ตัวอย่าง",
  "lat": 13.71,
  "lng": 100.51,
  "note": "รายละเอียดเพิ่มเติม"
}
```

---

## เทคโนโลยีที่ใช้

- [Leaflet](https://leafletjs.com/) 1.9 — แผนที่
- [OpenStreetMap](https://www.openstreetmap.org/) — แผนที่ฐาน
- ไม่มี build step — HTML, CSS, JavaScript ล้วนๆ
