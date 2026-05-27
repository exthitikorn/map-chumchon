const BANGKOK_CENTER = [13.7563, 100.5018];
const DEFAULT_ZOOM = 12;
const COMMUNITY_FOCUS_ZOOM = 17;
/** แสดง polygon รายเขตเมื่อ zoom >= ค่านี้ */
const ZONE_DETAIL_MIN_ZOOM = 13;
/** รวมทั้งกรุงเทพเป็น 1 ชิ้นเมื่อ zoom <= ค่านี้ */
const ZONE_SINGLE_MAX_ZOOM = 9;
const STORAGE_KEY = "customCommunityPins";
const OVERRIDES_KEY = "communityPinOverrides";
const DELETED_IDS_KEY = "deletedCommunityPinIds";

const ALL_DISTRICTS_LABEL = "ทุกเขต";
const COMMUNITY_TYPE_PREFIXES = [
  "ชุมชนหมู่บ้านจัดสรร",
  "ชุมชนอาคารสูง",
  "ชุมชนชานเมือง",
  "ชุมชนแออัด",
  "ชุมชนเมือง"
];
const COMMUNITY_TYPE_LIST = [
  "ชุมชนเมือง",
  "ชุมชนแออัด",
  "ชุมชนชานเมือง",
  "ชุมชนอาคารสูง",
  "ชุมชนหมู่บ้านจัดสรร"
];
const COMMUNITY_TYPE_COLORS = {
  ชุมชนเมือง: "#4f46e5",
  ชุมชนแออัด: "#dc2626",
  ชุมชนชานเมือง: "#16a34a",
  ชุมชนอาคารสูง: "#9333ea",
  ชุมชนหมู่บ้านจัดสรร: "#0891b2",
  default: "#6b7280"
};
const COMMUNITY_TYPE_LEGEND_LABELS = {
  all: "ทั้งหมด",
  ชุมชนเมือง: "เมือง",
  ชุมชนแออัด: "แออัด",
  ชุมชนชานเมือง: "ชานเมือง",
  ชุมชนอาคารสูง: "อาคารสูง",
  ชุมชนหมู่บ้านจัดสรร: "จัดสรร"
};
const districtFilterInput = document.getElementById("districtFilter");
const typeFilterSelect = document.getElementById("typeFilter");
const districtFilterValue = document.getElementById("districtFilterValue");
const districtFilterSuggestions = document.getElementById("districtFilterSuggestions");
const pinForm = document.getElementById("pinForm");
const pinModal = document.getElementById("pinModal");
const openPinModalBtn = document.getElementById("openPinModalBtn");
const closePinModalBtn = document.getElementById("closePinModalBtn");
const districtNameInput = document.getElementById("districtName");
const districtSuggestions = document.getElementById("districtSuggestions");
const refreshMapBtn = document.getElementById("refreshMapBtn");
const openPinListBtn = document.getElementById("openPinListBtn");
const openSearchBtn = document.getElementById("openSearchBtn");
const searchShell = document.getElementById("searchShell");
const searchBar = document.getElementById("searchBar");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const searchResultsList = document.getElementById("searchResultsList");
const searchResultsEmpty = document.getElementById("searchResultsEmpty");
const closeSearchBtn = document.getElementById("closeSearchBtn");
const pinListSheet = document.getElementById("pinListSheet");
const pinTableBody = document.getElementById("pinTableBody");
const closePinListBtn = document.getElementById("closePinListBtn");
const sheetAddPinBtn = document.getElementById("sheetAddPinBtn");
const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");
const pinModalTitle = document.getElementById("pinModalTitle");
const pinSubmitBtn = document.getElementById("pinSubmitBtn");
const communityNameInput = document.getElementById("communityName");
const addressInput = document.getElementById("address");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const noteInput = document.getElementById("note");
const communityTypeInput = document.getElementById("communityType");
const pinDetailDrawer = document.getElementById("pinDetailDrawer");
const pinDrawerTitle = document.getElementById("pinDrawerTitle");
const pinDrawerDistrict = document.getElementById("pinDrawerDistrict");
const pinDrawerTypeRow = document.getElementById("pinDrawerTypeRow");
const pinDrawerType = document.getElementById("pinDrawerType");
const pinDrawerAddress = document.getElementById("pinDrawerAddress");
const pinDrawerNote = document.getElementById("pinDrawerNote");
const pinDrawerNavLink = document.getElementById("pinDrawerNavLink");
const closePinDrawerBtn = document.getElementById("closePinDrawerBtn");
const communityList = document.getElementById("communityList");
const communityListCount = document.getElementById("communityListCount");
const communityListEmpty = document.getElementById("communityListEmpty");
const typeLegend = document.getElementById("typeLegend");

const map = L.map("map", { zoomControl: false }).setView(BANGKOK_CENTER, DEFAULT_ZOOM);
L.control.zoom({ position: "topleft" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
map.on("zoomend", onMapZoomEnd);

let districtGeoJson;
let zoneMerges;
let districtLayer;
let currentZoneMergeLevel = null;
let districtNamesCache = null;
let closeDistrictNameAutocomplete = () => {};
let openDistrictNameAutocomplete = () => {};
let closeDistrictFilterAutocomplete = () => {};
let bangkokBounds;
let markerLayer = L.layerGroup().addTo(map);
let districtCountLayer = L.layerGroup().addTo(map);
const markerById = new Map();
const markerIconByType = new Map();
let districtPinCounts = new Map();
let staticPinsCache = [];
let allPins = [];
let searchQuery = "";
let editingPinId = null;
let confirmResolver = null;

function isPinDrawerOpen() {
  return !pinDetailDrawer.hidden;
}

function getPinType(pin) {
  return pin.type || "";
}

function getCommunityTypeColor(type) {
  return COMMUNITY_TYPE_COLORS[type] || COMMUNITY_TYPE_COLORS.default;
}

function getTypeBadgeStyle(type) {
  if (!type) {
    return "";
  }
  const color = getCommunityTypeColor(type);
  return ` style="background:${color}1f;color:${color};border:1px solid ${color}66"`;
}

function createPinMarkerIcon(pin) {
  const type = getPinType(pin) || "__default__";
  if (!markerIconByType.has(type)) {
    const color = getCommunityTypeColor(getPinType(pin));
    markerIconByType.set(
      type,
      L.divIcon({
        className: "community-marker",
        html: `<svg class="community-marker__svg" viewBox="0 0 24 32" width="22" height="30" aria-hidden="true">
          <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 1C6.48 1 2 5.48 2 11c0 7.25 10 20 10 20s10-12.75 10-20C22 5.48 17.52 1 12 1z"/>
          <circle cx="12" cy="11" r="3.5" fill="#ffffff"/>
        </svg>`,
        iconSize: [22, 30],
        iconAnchor: [11, 30]
      })
    );
  }
  return markerIconByType.get(type);
}

function normalizePin(pin) {
  if (pin.type) {
    return pin;
  }
  const note = pin.note || "";
  for (const type of COMMUNITY_TYPE_PREFIXES) {
    if (!note.startsWith(type)) {
      continue;
    }
    const rest = note.slice(type.length).replace(/^ · /u, "");
    return {
      ...pin,
      type,
      ...(rest ? { note: rest } : { note: undefined })
    };
  }
  return pin;
}

function fillPinDrawer(pin) {
  pinDrawerTitle.textContent = pin.name;
  pinDrawerDistrict.textContent = pin.district;
  const type = getPinType(pin);
  if (type) {
    pinDrawerType.textContent = type;
    pinDrawerTypeRow.hidden = false;
  } else {
    pinDrawerTypeRow.hidden = true;
  }
  pinDrawerAddress.textContent = pin.address || "-";
  pinDrawerNote.textContent = pin.note || "-";
  pinDrawerNavLink.href = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;
}

function openPinDrawer(pin) {
  if (!pin) {
    return;
  }

  fillPinDrawer(pin);
  pinDetailDrawer.hidden = false;
  pinDetailDrawer.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    pinDetailDrawer.classList.add("pin-drawer--open");
  });
  initLucideIcons(pinDetailDrawer);
  closePinDrawerBtn.focus();
}

function closePinDrawer() {
  if (pinDetailDrawer.hidden) {
    return;
  }

  pinDetailDrawer.classList.remove("pin-drawer--open");

  let closed = false;
  const finishClose = () => {
    if (closed) {
      return;
    }
    closed = true;
    pinDetailDrawer.hidden = true;
    pinDetailDrawer.setAttribute("aria-hidden", "true");
  };

  const panel = pinDetailDrawer.querySelector(".pin-drawer__panel");
  const onTransitionEnd = (event) => {
    if (event.target !== panel) {
      return;
    }
    panel.removeEventListener("transitionend", onTransitionEnd);
    finishClose();
  };

  panel.addEventListener("transitionend", onTransitionEnd);
  window.setTimeout(finishClose, 320);
}

function geoJsonStyle(feature) {
  const p = feature.properties;
  return {
    color: p.strokeColor || "#ffffff",
    weight: 2,
    fillColor: p.fillColor || "#cc0000",
    fillOpacity: p.fillOpacity != null ? p.fillOpacity : 0.5
  };
}

function readCustomPins() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Cannot parse custom pins", error);
    return [];
  }
}

function saveCustomPins(customPins) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customPins));
}

function readOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Cannot parse pin overrides", error);
    return {};
  }
}

function saveOverrides(overrides) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

function readDeletedIds() {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Cannot parse deleted pin ids", error);
    return [];
  }
}

function saveDeletedIds(ids) {
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
}

function isCustomPin(id) {
  return id.startsWith("custom-");
}

function rebuildAllPins() {
  const deleted = new Set(readDeletedIds());
  const overrides = readOverrides();

  allPins = [
    ...staticPinsCache
      .filter((pin) => !deleted.has(pin.id))
      .map((pin) => normalizePin({ ...pin, ...(overrides[pin.id] || {}) })),
    ...readCustomPins()
      .filter((pin) => !deleted.has(pin.id))
      .map((pin) => normalizePin({ ...pin, ...(overrides[pin.id] || {}) }))
  ];
  rebuildDistrictPinCounts();
}

function getFilterDistrict() {
  return districtFilterValue.value || "all";
}

function setFilterDistrict(value) {
  const district = value === "all" ? "all" : value;
  districtFilterValue.value = district;
  districtFilterInput.value = district === "all" ? ALL_DISTRICTS_LABEL : district;
}

function applyFilterDistrict(selection) {
  const district = selection === ALL_DISTRICTS_LABEL ? "all" : selection;
  setFilterDistrict(district);
  refreshMapData();
  fitMapToSelection();
}

function getFilterType() {
  return typeFilterSelect?.value || "all";
}

function pinMatchesFilters(pin) {
  const selectedDistrict = getFilterDistrict();
  const selectedType = getFilterType();
  if (selectedDistrict !== "all" && pin.district !== selectedDistrict) {
    return false;
  }
  if (selectedType !== "all" && getPinType(pin) !== selectedType) {
    return false;
  }
  return true;
}

function getFilteredPins() {
  if (isDistrictOverviewMode()) {
    return [];
  }
  return allPins.filter(pinMatchesFilters);
}

function getActiveFilterPool() {
  return allPins.filter(pinMatchesFilters);
}

function isDistrictOverviewMode() {
  return getFilterDistrict() === "all";
}

function rebuildDistrictPinCounts() {
  districtPinCounts = new Map();
  for (const pin of allPins) {
    const district = pin.district;
    districtPinCounts.set(district, (districtPinCounts.get(district) || 0) + 1);
  }
}

function getDistrictPinCount(district) {
  const selectedType = getFilterType();
  if (selectedType === "all") {
    return districtPinCounts.get(district) || 0;
  }
  return allPins.filter(
    (pin) => pin.district === district && getPinType(pin) === selectedType
  ).length;
}

function getFeatureCenter(feature) {
  return L.geoJSON(feature).getBounds().getCenter();
}

function getZoneMergeLevel(zoom = map.getZoom()) {
  if (zoom <= ZONE_SINGLE_MAX_ZOOM) {
    return "single";
  }
  if (zoom < ZONE_DETAIL_MIN_ZOOM) {
    return "color";
  }
  return "detail";
}

function getMergedFeatureDistricts(feature) {
  const districts = feature.properties.districts;
  if (Array.isArray(districts) && districts.length) {
    return districts;
  }
  if (feature.properties.district) {
    return [feature.properties.district];
  }
  return [];
}

function getMergedFeaturePinCount(feature) {
  return getMergedFeatureDistricts(feature).reduce(
    (sum, district) => sum + getDistrictPinCount(district),
    0
  );
}

function getDistrictDisplayFeatures() {
  const selectedDistrict = getFilterDistrict();
  if (!districtGeoJson) {
    return [];
  }
  if (selectedDistrict !== "all") {
    return districtGeoJson.features.filter(
      (feature) => feature.properties.district === selectedDistrict
    );
  }
  if (!zoneMerges) {
    return districtGeoJson.features;
  }
  const level = getZoneMergeLevel();
  if (level === "single") {
    return zoneMerges.single.features;
  }
  if (level === "color") {
    return zoneMerges.byColor.features;
  }
  return districtGeoJson.features;
}

function getDistrictLayerTooltip(feature) {
  const overview = isDistrictOverviewMode();
  const mergeLevel = feature.properties.mergeLevel;
  const count = getMergedFeaturePinCount(feature);
  const districts = getMergedFeatureDistricts(feature);

  if (mergeLevel === "all") {
    return `กรุงเทพมหานคร<br><strong>${count}</strong> ชุมชน`;
  }
  if (mergeLevel === "color") {
    return `${districts.length} เขต · <strong>${count}</strong> ชุมชน`;
  }

  const district = feature.properties.district;
  return overview
    ? `เขต${district}<br><strong>${count}</strong> ชุมชน`
    : `เขต${district} · ${count} ชุมชน`;
}

function handleDistrictLayerClick(feature, layer) {
  const mergeLevel = feature.properties.mergeLevel;
  if (mergeLevel === "all") {
    map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: ZONE_DETAIL_MIN_ZOOM - 1 });
    return;
  }
  if (mergeLevel === "color") {
    map.fitBounds(layer.getBounds(), { padding: [48, 48], maxZoom: ZONE_DETAIL_MIN_ZOOM });
    return;
  }
  focusDistrict(feature.properties.district);
}

function onMapZoomEnd() {
  if (!isDistrictOverviewMode() || !zoneMerges) {
    return;
  }
  const level = getZoneMergeLevel();
  if (level === currentZoneMergeLevel) {
    return;
  }
  currentZoneMergeLevel = level;
  renderDistricts();
  renderDistrictCounts();
}

function normalizeSearchText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function getPinSearchFields(pin) {
  return [pin.name, pin.district, getPinType(pin), pin.address, pin.note].filter(Boolean);
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }

  const row = Array.from({ length: n + 1 }, (_, index) => index);
  for (let i = 1; i <= m; i++) {
    let previous = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = temp;
    }
  }
  return row[n];
}

function textSimilarity(a, b) {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) {
    return 1;
  }
  return 1 - levenshteinDistance(a, b) / maxLength;
}

function isSubsequenceMatch(text, query) {
  if (!query) {
    return true;
  }

  let textIndex = 0;
  for (let queryIndex = 0; queryIndex < query.length; queryIndex++) {
    textIndex = text.indexOf(query[queryIndex], textIndex);
    if (textIndex === -1) {
      return false;
    }
    textIndex += 1;
  }
  return true;
}

function scoreFieldMatch(text, query) {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedText === normalizedQuery) {
    return 1000;
  }
  if (normalizedText.startsWith(normalizedQuery)) {
    return 900;
  }
  if (normalizedText.includes(normalizedQuery)) {
    return 700;
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => scoreFieldMatch(normalizedText, token) >= 400)) {
    return 650;
  }

  if (normalizedQuery.length >= 2 && isSubsequenceMatch(normalizedText, normalizedQuery)) {
    return 500;
  }

  if (normalizedQuery.length < 3) {
    return 0;
  }

  const fuzzyThreshold = normalizedQuery.length <= 4 ? 0.72 : 0.8;
  const candidates = [normalizedText, ...normalizedText.split(/\s+/)];
  let bestFuzzyScore = 0;

  for (const candidate of candidates) {
    if (candidate.length < 2) {
      continue;
    }

    const ratio = textSimilarity(candidate, normalizedQuery);
    if (ratio >= fuzzyThreshold) {
      bestFuzzyScore = Math.max(bestFuzzyScore, Math.round(400 * ratio));
      continue;
    }

    if (normalizedText.length <= normalizedQuery.length + 2) {
      continue;
    }

    for (let index = 0; index <= normalizedText.length - normalizedQuery.length; index++) {
      const slice = normalizedText.slice(index, index + normalizedQuery.length);
      const sliceRatio = textSimilarity(slice, normalizedQuery);
      if (sliceRatio >= fuzzyThreshold) {
        bestFuzzyScore = Math.max(bestFuzzyScore, Math.round(380 * sliceRatio));
      }
    }
  }

  return bestFuzzyScore;
}

function scorePinForSearch(pin, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return 0;
  }

  let bestScore = 0;
  for (const field of getPinSearchFields(pin)) {
    const fieldScore = scoreFieldMatch(field, normalizedQuery);
    if (fieldScore <= 0) {
      continue;
    }
    const weightedScore = field === pin.name ? fieldScore + 50 : fieldScore;
    bestScore = Math.max(bestScore, weightedScore);
  }
  return bestScore;
}

function searchPins(pins, query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return pins.map((pin) => ({ pin, score: Number.POSITIVE_INFINITY, isApproximate: false }));
  }

  return pins
    .map((pin) => {
      const score = scorePinForSearch(pin, normalized);
      return { pin, score, isApproximate: score > 0 && score < 700 };
    })
    .filter((result) => result.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.pin.name.localeCompare(b.pin.name, "th")
    );
}

function getVisiblePinResults() {
  const pool = searchQuery.trim() ? getActiveFilterPool() : getFilteredPins();
  return searchPins(pool, searchQuery);
}

function getVisiblePins() {
  return getVisiblePinResults().map((result) => result.pin);
}

function renderPins() {
  markerLayer.clearLayers();
  markerById.clear();

  if (isDistrictOverviewMode()) {
    return;
  }

  getVisiblePins().forEach((pin) => {
    const marker = L.marker([pin.lat, pin.lng], { icon: createPinMarkerIcon(pin) });
    marker.on("click", () => focusPin(pin));
    if (pin.id) {
      markerById.set(pin.id, marker);
    }
    markerLayer.addLayer(marker);
  });
}

function highlightDistrict(event) {
  event.target.setStyle({ weight: 3, fillOpacity: 0.7 });
  event.target.bringToFront();
}

function resetDistrictHighlight(event) {
  districtLayer?.resetStyle(event.target);
}

function focusDistrict(district) {
  setFilterDistrict(district);
  refreshMapData();
  fitMapToSelection();
}

function renderDistrictCounts() {
  districtCountLayer.clearLayers();

  if (!isDistrictOverviewMode() || !districtGeoJson) {
    return;
  }

  const features = getDistrictDisplayFeatures();
  for (const feature of features) {
    const count = getMergedFeaturePinCount(feature);
    const center = getFeatureCenter(feature);
    const districts = getMergedFeatureDistricts(feature);
    const mergeLevel = feature.properties.mergeLevel;
    const tooltip =
      mergeLevel === "all"
        ? `กรุงเทพฯ · ${count} ชุมชน`
        : mergeLevel === "color"
          ? `${districts.length} เขต · ${count} ชุมชน`
          : `เขต${feature.properties.district} · ${count} ชุมชน`;

    const label = L.marker(center, {
      icon: L.divIcon({
        className: "district-count-label",
        html: `<span class="district-count-label__inner" aria-hidden="true">${count}</span>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 400
    });
    label.bindTooltip(tooltip, {
      direction: "top",
      offset: [0, -20]
    });
    districtCountLayer.addLayer(label);
  }
}

function renderDistricts() {
  if (districtLayer) {
    map.removeLayer(districtLayer);
  }

  if (!districtGeoJson) {
    return;
  }

  const overview = isDistrictOverviewMode();
  const filteredFeatures = getDistrictDisplayFeatures();
  currentZoneMergeLevel = overview && zoneMerges ? getZoneMergeLevel() : "detail";

  districtLayer = L.geoJSON(
    { type: "FeatureCollection", features: filteredFeatures },
    {
      style: geoJsonStyle,
      onEachFeature(feature, layer) {
        layer.bindTooltip(getDistrictLayerTooltip(feature), { sticky: overview });
        layer.on({
          click: () => handleDistrictLayerClick(feature, layer),
          mouseover: highlightDistrict,
          mouseout: resetDistrictHighlight
        });
      }
    }
  ).addTo(map);
}

function getDistrictNames() {
  if (!districtNamesCache && districtGeoJson) {
    districtNamesCache = [
      ...new Set(districtGeoJson.features.map((feature) => feature.properties.district))
    ].sort((a, b) => a.localeCompare(b, "th"));
  }
  return districtNamesCache || [];
}

function isValidDistrict(name) {
  return getDistrictNames().includes(name);
}

function filterDistrictOptions(query, { includeAll = false } = {}) {
  const normalized = query.trim().toLowerCase();
  const names = getDistrictNames();
  const filtered = !normalized
    ? names
    : names.filter((name) => name.toLowerCase().includes(normalized));

  if (!includeAll) {
    return filtered;
  }

  const showAll =
    !normalized || ALL_DISTRICTS_LABEL.toLowerCase().includes(normalized);
  return showAll ? [ALL_DISTRICTS_LABEL, ...filtered] : filtered;
}

function createDistrictAutocompleteController({ input, list, includeAll, onSelect }) {
  let activeIndex = -1;

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  }

  function highlight(items) {
    items.forEach((item, index) => {
      const isActive = index === activeIndex;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.scrollIntoView({ block: "nearest" });
        input.setAttribute("aria-activedescendant", item.id);
      }
    });
  }

  function open() {
    const matches = filterDistrictOptions(input.value, { includeAll });
    if (!matches.length) {
      close();
      return;
    }

    list.innerHTML = matches
      .map(
        (name, index) =>
          `<li id="${list.id}-option-${index}" role="option" data-value="${escapeHtml(name)}">${escapeHtml(name)}</li>`
      )
      .join("");
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    activeIndex = -1;
  }

  function select(value) {
    onSelect(value);
    close();
  }

  input.addEventListener("input", open);
  input.addEventListener("focus", open);
  input.addEventListener("keydown", (event) => {
    const items = [...list.querySelectorAll('[role="option"]')];
    if (!items.length) {
      if (event.key === "Escape") {
        close();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      highlight(items);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlight(items);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(items[activeIndex].dataset.value);
      return;
    }

    if (event.key === "Escape") {
      close();
    }
  });

  list.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  list.addEventListener("click", (event) => {
    const option = event.target.closest('[role="option"]');
    if (!option) {
      return;
    }
    select(option.dataset.value);
  });

  return { close, open };
}

function initDistrictAutocompletes() {
  const nameAutocomplete = createDistrictAutocompleteController({
    input: districtNameInput,
    list: districtSuggestions,
    includeAll: false,
    onSelect(value) {
      districtNameInput.value = value;
    }
  });
  closeDistrictNameAutocomplete = nameAutocomplete.close;
  openDistrictNameAutocomplete = nameAutocomplete.open;

  const filterAutocomplete = createDistrictAutocompleteController({
    input: districtFilterInput,
    list: districtFilterSuggestions,
    includeAll: true,
    onSelect: applyFilterDistrict
  });
  closeDistrictFilterAutocomplete = filterAutocomplete.close;

  districtFilterInput.addEventListener("blur", () => {
    const raw = districtFilterInput.value.trim();
    if (!raw || raw === ALL_DISTRICTS_LABEL) {
      applyFilterDistrict(ALL_DISTRICTS_LABEL);
      return;
    }
    if (isValidDistrict(raw)) {
      applyFilterDistrict(raw);
      return;
    }
    setFilterDistrict(getFilterDistrict());
    closeDistrictFilterAutocomplete();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".district-autocomplete")) {
      closeDistrictNameAutocomplete();
      closeDistrictFilterAutocomplete();
    }
  });
}

function showFullBangkokMap() {
  if (bangkokBounds?.isValid()) {
    map.fitBounds(bangkokBounds, { padding: [32, 32] });
    return;
  }
  map.setView(BANGKOK_CENTER, DEFAULT_ZOOM);
}

function fitMapToSelection() {
  const selectedDistrict = getFilterDistrict();
  if (selectedDistrict === "all") {
    showFullBangkokMap();
    return;
  }
  if (!districtLayer) {
    return;
  }
  const bounds = districtLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }
}

function renderCommunityList() {
  if (isDistrictOverviewMode()) {
    const selectedType = getFilterType();
    const pool =
      selectedType === "all"
        ? allPins
        : allPins.filter((pin) => getPinType(pin) === selectedType);
    communityListCount.textContent = String(pool.length);
    communityListEmpty.textContent =
      selectedType === "all"
        ? "คลิกเขตบนแผนที่ หรือเลือกเขต เพื่อดูรายชื่อชุมชน"
        : `เลือกเขตเพื่อดูรายชื่อ (${pool.length} ชุมชนประเภทนี้ทั่วกรุงเทพ)`;
    communityListEmpty.hidden = false;
    communityList.innerHTML = "";
    return;
  }

  const pins = [...getFilteredPins()].sort((a, b) =>
    a.name.localeCompare(b.name, "th")
  );

  communityListCount.textContent = String(pins.length);
  communityListEmpty.textContent =
    getFilterType() === "all"
      ? "ยังไม่มีชุมชนในเขตที่เลือก"
      : "ยังไม่มีชุมชนประเภทนี้ในเขตที่เลือก";
  communityListEmpty.hidden = pins.length > 0;

  if (!pins.length) {
    communityList.innerHTML = "";
    return;
  }

  communityList.innerHTML = pins
    .map(
      (pin) => `
      <li role="listitem">
        <button
          type="button"
          class="community-card"
          data-pin-id="${escapeHtml(pin.id)}"
        >
          <span class="community-card__name">${escapeHtml(pin.name)}</span>
          <span class="community-card__district">เขต${escapeHtml(pin.district)}</span>
          ${
            getPinType(pin)
              ? `<span class="community-card__type"${getTypeBadgeStyle(getPinType(pin))}>${escapeHtml(getPinType(pin))}</span>`
              : ""
          }
          ${
            pin.address
              ? `<span class="community-card__address">${escapeHtml(pin.address)}</span>`
              : ""
          }
        </button>
      </li>
    `
    )
    .join("");
}

function hideSearchResults() {
  searchResults.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
}

function renderSearchResults() {
  const query = searchQuery.trim();
  if (!query) {
    hideSearchResults();
    return;
  }

  const results = getVisiblePinResults();
  searchResults.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");

  if (!results.length) {
    searchResultsList.innerHTML = "";
    searchResultsEmpty.hidden = false;
    return;
  }

  searchResultsEmpty.hidden = true;
  searchResultsList.innerHTML = results
    .map(
      ({ pin, isApproximate }) => `
      <li role="presentation">
        <button
          type="button"
          class="search-result${isApproximate ? " search-result--approximate" : ""}"
          role="option"
          data-pin-id="${escapeHtml(pin.id)}"
        >
          <span class="search-result__name">
            ${escapeHtml(pin.name)}
            ${
              isApproximate
                ? '<span class="search-result__tag">ใกล้เคียง</span>'
                : ""
            }
          </span>
          <span class="search-result__meta">เขต${escapeHtml(pin.district)}</span>
          ${
            getPinType(pin)
              ? `<span class="search-result__meta">${escapeHtml(getPinType(pin))}</span>`
              : ""
          }
          ${
            pin.address
              ? `<span class="search-result__meta search-result__meta--address">${escapeHtml(pin.address)}</span>`
              : ""
          }
        </button>
      </li>
    `
    )
    .join("");
}

function applyFilterType(value) {
  if (!typeFilterSelect) {
    return;
  }
  typeFilterSelect.value = value;
  refreshMapData();
}

function renderTypeLegend() {
  if (!typeLegend) {
    return;
  }

  const activeType = getFilterType();
  const items = [
    { value: "all", label: "ทุกประเภท", color: null },
    ...COMMUNITY_TYPE_LIST.map((type) => ({
      value: type,
      label: type,
      color: getCommunityTypeColor(type)
    }))
  ];

  typeLegend.innerHTML = `
    <span class="type-legend__title">สีหมุด</span>
    <ul class="type-legend__list">
      ${items
        .map(({ value, label, color }) => {
          const isActive = value === activeType;
          const isDimmed = activeType !== "all" && value !== "all" && !isActive;
          const swatch = color
            ? `<span class="type-legend__swatch" style="background:${color}"></span>`
            : `<span class="type-legend__swatch type-legend__swatch--all" aria-hidden="true"></span>`;
          const shortLabel = COMMUNITY_TYPE_LEGEND_LABELS[value] || label;
          return `
            <li>
              <button
                type="button"
                class="type-legend__item${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}"
                data-type-filter="${escapeHtml(value)}"
                aria-pressed="${isActive}"
                title="${escapeHtml(label)}"
              >
                ${swatch}
                <span>${escapeHtml(shortLabel)}</span>
              </button>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function refreshMapData() {
  renderDistricts();
  renderDistrictCounts();
  renderPins();
  renderCommunityList();
  renderSearchResults();
  renderTypeLegend();
}

function resetMapView() {
  setFilterDistrict("all");
  if (typeFilterSelect) {
    typeFilterSelect.value = "all";
  }
  searchQuery = "";
  searchInput.value = "";
  closeSearch();
  refreshMapData();
  showFullBangkokMap();
}

function initLucideIcons(root = document) {
  window.lucide?.createIcons({ nameAttr: "data-lucide", root });
}

function showConfirm({
  title = "ยืนยัน",
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  danger = false
}) {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCancelBtn.textContent = cancelText;
    confirmOkBtn.textContent = confirmText;
    confirmOkBtn.className = danger ? "btn-danger" : "btn-primary";
    confirmModal.hidden = false;
    confirmCancelBtn.focus();
  });
}

function closeConfirm(result) {
  confirmModal.hidden = true;
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
}

function openSearch() {
  if (narrowLayoutMq.matches) {
    setMapPanelCollapsed(true);
  }
  searchShell.hidden = false;
  openSearchBtn.classList.add("is-active");
  searchInput.focus();
  initLucideIcons(searchShell);
  renderSearchResults();
  scheduleMapResize();
}

function closeSearch() {
  searchShell.hidden = true;
  openSearchBtn.classList.remove("is-active");
  hideSearchResults();
  scheduleMapResize();
}

function renderPinTable() {
  const sortedPins = [...allPins].sort((a, b) =>
    a.name.localeCompare(b.name, "th")
  );

  if (!sortedPins.length) {
    pinTableBody.innerHTML = `
      <tr class="pin-table__empty">
        <td colspan="8">ยังไม่มีหมุดชุมชน — กดปุ่มเพิ่มเพื่อสร้างหมุดใหม่</td>
      </tr>
    `;
    return;
  }

  pinTableBody.innerHTML = sortedPins
    .map(
      (pin) => `
      <tr data-pin-id="${escapeHtml(pin.id)}">
        <td>${escapeHtml(pin.name)}</td>
        <td>${escapeHtml(pin.district)}</td>
        <td>${escapeHtml(getPinType(pin) || "-")}</td>
        <td class="pin-table__address">${escapeHtml(pin.address || "-")}</td>
        <td>${pin.lat.toFixed(5)}</td>
        <td>${pin.lng.toFixed(5)}</td>
        <td class="pin-table__note">${escapeHtml(pin.note || "-")}</td>
        <td>
          <div class="pin-table__actions">
            <button type="button" class="pin-table__action pin-table__action--view" data-action="view" data-pin-id="${escapeHtml(pin.id)}" aria-label="ดูบนแผนที่">
              <i data-lucide="map-pin"></i>
            </button>
            <button type="button" class="pin-table__action pin-table__action--edit" data-action="edit" data-pin-id="${escapeHtml(pin.id)}" aria-label="แก้ไข">
              <i data-lucide="pencil"></i>
            </button>
            <button type="button" class="pin-table__action pin-table__action--delete" data-action="delete" data-pin-id="${escapeHtml(pin.id)}" aria-label="ลบ">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  initLucideIcons(pinListSheet);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function openPinListSheet() {
  renderPinTable();
  pinListSheet.hidden = false;
  initLucideIcons(pinListSheet);
}

function closePinListSheet() {
  pinListSheet.hidden = true;
}

function focusPin(pin) {
  if (!pin) {
    return;
  }

  if (searchQuery.trim()) {
    searchQuery = "";
    searchInput.value = "";
    closeSearch();
  }

  if (isDistrictOverviewMode() || getFilterDistrict() !== pin.district) {
    setFilterDistrict(pin.district);
    refreshMapData();
  } else {
    renderPins();
  }

  hideSearchResults();

  const marker = markerById.get(pin.id);
  if (!marker) {
    return;
  }

  map.flyTo([pin.lat, pin.lng], COMMUNITY_FOCUS_ZOOM, { duration: 0.8 });
  openPinDrawer(pin);
}

function getPinById(id) {
  return allPins.find((pin) => pin.id === id);
}

function upsertPin(pin) {
  if (isCustomPin(pin.id)) {
    const customPins = readCustomPins();
    const index = customPins.findIndex((item) => item.id === pin.id);
    if (index >= 0) {
      customPins[index] = pin;
    } else {
      customPins.push(pin);
    }
    saveCustomPins(customPins);
    return;
  }

  const overrides = readOverrides();
  overrides[pin.id] = pin;
  saveOverrides(overrides);
}

async function deletePin(id) {
  const pin = getPinById(id);
  if (!pin) {
    return;
  }

  const confirmed = await showConfirm({
    title: "ลบหมุด",
    message: `ต้องการลบหมุด "${pin.name}" ใช่หรือไม่?`,
    confirmText: "ลบ",
    cancelText: "ยกเลิก",
    danger: true
  });
  if (!confirmed) {
    return;
  }

  if (isCustomPin(id)) {
    saveCustomPins(readCustomPins().filter((item) => item.id !== id));
  } else {
    const deletedIds = readDeletedIds();
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      saveDeletedIds(deletedIds);
    }
    const overrides = readOverrides();
    delete overrides[id];
    saveOverrides(overrides);
  }

  rebuildAllPins();
  refreshMapData();
  if (!pinListSheet.hidden) {
    renderPinTable();
  }
}

async function loadData() {
  const [districtRes, mergeRes, pinRes] = await Promise.all([
    fetch("./data/districts.json"),
    fetch("./data/zone-merges.json"),
    fetch("./data/community-pins.json")
  ]);

  districtGeoJson = await districtRes.json();
  zoneMerges = await mergeRes.json();
  bangkokBounds = L.geoJSON(districtGeoJson).getBounds();
  staticPinsCache = await pinRes.json();
  rebuildAllPins();

  setFilterDistrict("all");
  refreshMapData();
  showFullBangkokMap();
  scheduleMapResize();
}

function openPinModalForCreate() {
  editingPinId = null;
  pinForm.reset();
  pinModalTitle.textContent = "เพิ่มหมุดชุมชน";
  pinSubmitBtn.textContent = "เพิ่มหมุด";
  if (getFilterDistrict() !== "all") {
    districtNameInput.value = getFilterDistrict();
  }
  pinModal.hidden = false;
  communityNameInput.focus();
}

function openPinModalForEdit(pin) {
  editingPinId = pin.id;
  communityNameInput.value = pin.name;
  districtNameInput.value = pin.district;
  addressInput.value = pin.address || "";
  latitudeInput.value = pin.lat;
  longitudeInput.value = pin.lng;
  noteInput.value = pin.note || "";
  communityTypeInput.value = getPinType(pin);
  pinModalTitle.textContent = "แก้ไขหมุดชุมชน";
  pinSubmitBtn.textContent = "บันทึก";
  pinModal.hidden = false;
  communityNameInput.focus();
}

function closePinModal() {
  pinModal.hidden = true;
  editingPinId = null;
  pinForm.reset();
  closeDistrictNameAutocomplete();
}

function parsePinFromForm() {
  const formData = new FormData(pinForm);
  const type = formData.get("communityType")?.toString().trim();
  const fields = {
    name: formData.get("communityName")?.toString().trim(),
    district: formData.get("districtName")?.toString().trim(),
    address: formData.get("address")?.toString().trim(),
    lat: Number(formData.get("latitude")),
    lng: Number(formData.get("longitude")),
    note: formData.get("note")?.toString().trim()
  };
  if (type) {
    fields.type = type;
  }
  return fields;
}

function savePinFromForm(event) {
  event.preventDefault();

  const fields = parsePinFromForm();
  if (!fields.name || !fields.district || Number.isNaN(fields.lat) || Number.isNaN(fields.lng)) {
    alert("กรุณากรอกข้อมูลให้ครบและถูกต้อง");
    return;
  }

  if (!isValidDistrict(fields.district)) {
    alert("กรุณาเลือกเขตจากรายการที่แนะนำ");
    districtNameInput.focus();
    openDistrictNameAutocomplete();
    return;
  }

  const pin = {
    ...fields,
    id: editingPinId || `custom-${Date.now()}`
  };
  if (!pin.type) {
    delete pin.type;
  }

  upsertPin(pin);
  rebuildAllPins();
  closePinModal();
  refreshMapData();
  if (!pinListSheet.hidden) {
    renderPinTable();
  }
}

refreshMapBtn.addEventListener("click", resetMapView);
openPinListBtn.addEventListener("click", openPinListSheet);
closePinListBtn.addEventListener("click", closePinListSheet);
pinListSheet.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-sheet]")) {
    closePinListSheet();
  }
});
sheetAddPinBtn.addEventListener("click", openPinModalForCreate);
pinTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const pin = getPinById(button.dataset.pinId);
  if (!pin) {
    return;
  }

  if (button.dataset.action === "view") {
    focusPin(pin);
    return;
  }

  if (button.dataset.action === "edit") {
    openPinModalForEdit(pin);
    return;
  }

  if (button.dataset.action === "delete") {
    deletePin(pin.id);
  }
});
openSearchBtn.addEventListener("click", () => {
  if (searchShell.hidden) {
    openSearch();
  } else {
    searchQuery = "";
    searchInput.value = "";
    renderPins();
    closeSearch();
  }
});
closeSearchBtn.addEventListener("click", () => {
  searchQuery = "";
  searchInput.value = "";
  renderPins();
  closeSearch();
});
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  renderPins();
  renderSearchResults();
});
searchResultsList.addEventListener("click", (event) => {
  const button = event.target.closest(".search-result");
  if (!button) {
    return;
  }
  const pin = getPinById(button.dataset.pinId);
  if (pin) {
    focusPin(pin);
  }
});
openPinModalBtn.addEventListener("click", openPinModalForCreate);
closePinModalBtn.addEventListener("click", closePinModal);
pinModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) {
    closePinModal();
  }
});
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
confirmOkBtn.addEventListener("click", () => closeConfirm(true));
confirmModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-confirm]")) {
    closeConfirm(false);
  }
});
closePinDrawerBtn.addEventListener("click", closePinDrawer);
pinDetailDrawer.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-drawer]")) {
    closePinDrawer();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (!confirmModal.hidden) {
    closeConfirm(false);
    return;
  }
  if (isPinDrawerOpen()) {
    closePinDrawer();
    return;
  }
  if (!pinModal.hidden) {
    closePinModal();
  }
  if (!pinListSheet.hidden) {
    closePinListSheet();
  }
  if (!searchShell.hidden) {
    searchQuery = "";
    searchInput.value = "";
    renderPins();
    closeSearch();
  }
});
pinForm.addEventListener("submit", savePinFromForm);

typeFilterSelect?.addEventListener("change", refreshMapData);

typeLegend?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-type-filter]");
  if (!button) {
    return;
  }
  applyFilterType(button.dataset.typeFilter);
});

communityList.addEventListener("click", (event) => {
  const card = event.target.closest(".community-card");
  if (!card) {
    return;
  }
  const pin = getPinById(card.dataset.pinId);
  if (pin) {
    focusPin(pin);
  }
});

const mapPanel = document.getElementById("mapPanel");
const togglePanelBtn = document.getElementById("togglePanelBtn");
const narrowLayoutMq = window.matchMedia("(max-width: 768px)");

function setMapPanelCollapsed(collapsed) {
  if (!mapPanel || !togglePanelBtn) {
    return;
  }
  mapPanel.classList.toggle("map-panel--collapsed", collapsed);
  togglePanelBtn.setAttribute("aria-expanded", String(!collapsed));
  togglePanelBtn.setAttribute(
    "aria-label",
    collapsed ? "ขยายแผงควบคุม" : "ย่อแผงควบคุม"
  );
}

togglePanelBtn?.addEventListener("click", () => {
  setMapPanelCollapsed(!mapPanel.classList.contains("map-panel--collapsed"));
});

function refreshMapSize() {
  map.invalidateSize({ animate: false });
}

let mapResizeTimer;
function scheduleMapResize() {
  window.clearTimeout(mapResizeTimer);
  mapResizeTimer = window.setTimeout(refreshMapSize, 120);
}

function initResponsiveLayout() {
  if (narrowLayoutMq.matches) {
    setMapPanelCollapsed(true);
  }

  narrowLayoutMq.addEventListener("change", scheduleMapResize);
  window.addEventListener("resize", scheduleMapResize);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(refreshMapSize, 150);
  });
}

initResponsiveLayout();

initLucideIcons();
initDistrictAutocompletes();
setFilterDistrict("all");

loadData().catch((error) => {
  console.error(error);
  alert("ไม่สามารถโหลดข้อมูลแผนที่ได้");
});
