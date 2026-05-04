import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

import {
  activitySpeedMph,
  addPoint,
  clearPoints,
  createRoute,
  deletePoint,
  movePoint,
  estimatedDurationMinutes,
  renamePoint,
  setLoop,
  totalDistanceMeters,
  updatePoint,
  updateRoute,
} from "./route-model.js";
import {
  createSavedRoute,
  deleteSavedRoute,
  duplicateSavedRoute,
  getSavedRoute,
  loadRouteLibrary,
  saveRouteLibrary,
  savedRouteToRoute,
  upsertSavedRoute,
} from "./route-library.js";
import {
  parseRouteLibraryBackup,
  serializeRouteLibraryBackup,
} from "./route-backup.js";
import { parseRouteFile, serializeRouteFile } from "./route-file.js";
import { parseRouteGpx, serializeRouteGpx } from "./gpx.js";
import { APP_VERSION } from "./version.js";

const INITIAL_CENTER = [43.6426, -72.2518];
const INITIAL_ZOOM = 13;

let route = createRoute({ name: "New route", activityType: "walk" });
let routeLibrary = loadRouteLibrary();
let activeSavedRouteId = null;
let routeDirty = false;
let pendingRouteImport = null;
let pendingLibraryImport = null;
let map;
let pointLayer;
let lineLayer;

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Walk Bike Run</p>
        <h1>Build a route.</h1>
        <p class="subtitle">Click or tap the map to add points. Drag markers to move them.</p>
      </div>
      <div class="version-pill" title="App version">v${APP_VERSION}</div>
    </header>

    <main class="app-main">
      <section class="map-card" aria-label="Route map">
        <div id="map" class="map" data-testid="map"></div>
      </section>

      <aside class="panel" aria-label="Route controls">
        <section class="panel-section">
          <h2>Route</h2>
          <label class="field-row">
            <span>Route name</span>
            <input id="routeName" type="text" autocomplete="off" />
          </label>
          <label class="field-row">
            <span>Activity</span>
            <select id="activityType">
              <option value="walk">Walk</option>
              <option value="bike">Bike</option>
              <option value="run">Run</option>
            </select>
          </label>
          <label class="checkbox-row">
            <input id="loopToggle" type="checkbox" />
            Loop back to start
          </label>
          <div class="route-stats" aria-label="Route stats">
            <div class="route-stat-card">
              <span>Distance</span>
              <strong id="distanceText" data-testid="distance-text">0.00 mi</strong>
            </div>
            <div class="route-stat-card">
              <span>Estimated time</span>
              <strong id="estimatedTimeText" data-testid="estimated-time">0 min</strong>
            </div>
            <div class="route-stat-card">
              <span>Default pace</span>
              <strong id="paceText" data-testid="pace-text">20:00 / mi</strong>
            </div>
          </div>
          <p id="saveStatus" class="save-status" data-testid="save-status">Unsaved route</p>
          <p class="hint-text">Stats use straight-line distance and simple default speeds for now. Road/path routing comes later.</p>
        </section>

        <section class="panel-section status-grid" aria-label="Status">
          <div class="status-card">
            <span class="status-label">Map</span>
            <strong id="mapStatus">Starting</strong>
          </div>
          <div class="status-card">
            <span class="status-label">Input</span>
            <strong id="inputStatus">Checking</strong>
          </div>
          <div class="status-card">
            <span class="status-label">Viewport</span>
            <strong id="viewportStatus">Checking</strong>
          </div>
          <div class="status-card">
            <span class="status-label">Points</span>
            <strong id="pointCount" data-testid="point-count">0</strong>
          </div>
        </section>

        <section class="panel-section">
          <h2>Actions</h2>
          <div class="button-row">
            <button id="addCenterPoint" type="button">Add point at map center</button>
            <button id="fitRoute" type="button" class="secondary">Fit route</button>
            <button id="clearPoints" type="button" class="danger">Clear</button>
          </div>
        </section>

        <section class="panel-section">
          <h2>Route file</h2>
          <div class="button-row">
            <button id="exportCurrentRoute" type="button" class="secondary">Export current route JSON</button>
            <button id="importCurrentRouteButton" type="button" class="secondary">Import current route JSON</button>
            <input id="importCurrentRouteFile" class="sr-only" type="file" accept="application/json,.json" />
            <button id="exportCurrentRouteGpx" type="button" class="secondary">Export current route GPX</button>
            <button id="importCurrentRouteGpxButton" type="button" class="secondary">Import current route GPX</button>
            <input id="importCurrentRouteGpxFile" class="sr-only" type="file" accept="application/gpx+xml,application/xml,text/xml,.gpx,.xml" />
          </div>
          <p id="routeFileStatus" class="hint-text" data-testid="route-file-status">Export or import one route as app JSON or GPX.</p>
          <div id="routeImportPreview" class="import-preview is-hidden" data-testid="route-import-preview" hidden>
            <p id="routeImportPreviewText"></p>
            <div class="button-row">
              <button id="confirmImportCurrentRoute" type="button">Replace current route</button>
              <button id="cancelImportCurrentRoute" type="button" class="secondary">Cancel route import</button>
            </div>
          </div>
        </section>

        <section class="panel-section">
          <h2>Library</h2>
          <div class="button-row">
            <button id="saveRoute" type="button">Save route</button>
            <button id="saveRouteCopy" type="button" class="secondary">Save as copy</button>
            <button id="newRoute" type="button" class="secondary">New route</button>
          </div>
          <ol id="savedRouteList" class="saved-route-list" data-testid="saved-route-list"></ol>
        </section>

        <section class="panel-section">
          <h2>Library backup</h2>
          <div class="button-row">
            <button id="exportLibrary" type="button" class="secondary">Export JSON</button>
            <button id="importLibraryButton" type="button" class="secondary">Import JSON</button>
            <input id="importLibraryFile" class="sr-only" type="file" accept="application/json,.json" />
          </div>
          <p id="backupStatus" class="hint-text" data-testid="backup-status">Back up saved routes as app JSON.</p>
          <div id="importPreview" class="import-preview is-hidden" data-testid="import-preview" hidden>
            <p id="importPreviewText"></p>
            <div class="button-row">
              <button id="confirmImportLibrary" type="button" class="danger">Replace library</button>
              <button id="cancelImportLibrary" type="button" class="secondary">Cancel import</button>
            </div>
          </div>
        </section>

        <section class="panel-section">
          <h2>Route list</h2>
          <ol id="pointList" class="point-list" data-testid="point-list"></ol>
        </section>
      </aside>
    </main>
  </div>
`;

const elements = {
  mapStatus: document.querySelector("#mapStatus"),
  inputStatus: document.querySelector("#inputStatus"),
  viewportStatus: document.querySelector("#viewportStatus"),
  pointCount: document.querySelector("#pointCount"),
  distanceText: document.querySelector("#distanceText"),
  estimatedTimeText: document.querySelector("#estimatedTimeText"),
  paceText: document.querySelector("#paceText"),
  saveStatus: document.querySelector("#saveStatus"),
  routeName: document.querySelector("#routeName"),
  activityType: document.querySelector("#activityType"),
  loopToggle: document.querySelector("#loopToggle"),
  addCenterPoint: document.querySelector("#addCenterPoint"),
  fitRoute: document.querySelector("#fitRoute"),
  clearPoints: document.querySelector("#clearPoints"),
  saveRoute: document.querySelector("#saveRoute"),
  saveRouteCopy: document.querySelector("#saveRouteCopy"),
  newRoute: document.querySelector("#newRoute"),
  exportCurrentRoute: document.querySelector("#exportCurrentRoute"),
  importCurrentRouteButton: document.querySelector("#importCurrentRouteButton"),
  importCurrentRouteFile: document.querySelector("#importCurrentRouteFile"),
  exportCurrentRouteGpx: document.querySelector("#exportCurrentRouteGpx"),
  importCurrentRouteGpxButton: document.querySelector(
    "#importCurrentRouteGpxButton",
  ),
  importCurrentRouteGpxFile: document.querySelector(
    "#importCurrentRouteGpxFile",
  ),
  routeImportPreview: document.querySelector("#routeImportPreview"),
  routeImportPreviewText: document.querySelector("#routeImportPreviewText"),
  confirmImportCurrentRoute: document.querySelector(
    "#confirmImportCurrentRoute",
  ),
  cancelImportCurrentRoute: document.querySelector("#cancelImportCurrentRoute"),
  routeFileStatus: document.querySelector("#routeFileStatus"),
  exportLibrary: document.querySelector("#exportLibrary"),
  importLibraryButton: document.querySelector("#importLibraryButton"),
  importLibraryFile: document.querySelector("#importLibraryFile"),
  importPreview: document.querySelector("#importPreview"),
  importPreviewText: document.querySelector("#importPreviewText"),
  confirmImportLibrary: document.querySelector("#confirmImportLibrary"),
  cancelImportLibrary: document.querySelector("#cancelImportLibrary"),
  backupStatus: document.querySelector("#backupStatus"),
  savedRouteList: document.querySelector("#savedRouteList"),
  pointList: document.querySelector("#pointList"),
};

function initMap() {
  map = L.map("map", {
    zoomControl: true,
  }).setView(INITIAL_CENTER, INITIAL_ZOOM);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  lineLayer = L.layerGroup().addTo(map);
  pointLayer = L.layerGroup().addTo(map);

  map.on("click", (event) => {
    addRoutePoint(
      event.latlng.lat,
      event.latlng.lng,
      `Map point ${route.points.length + 1}`,
    );
  });

  elements.mapStatus.textContent = "Ready";
}

function addRoutePoint(lat, lng, name) {
  route = addPoint(route, { lat, lng, name });
  markRouteDirty();
}

function setRoute(
  nextRoute,
  { savedRouteId = activeSavedRouteId, dirty = true } = {},
) {
  route = nextRoute;
  activeSavedRouteId = savedRouteId;
  routeDirty = dirty;
  renderRoute();
}

function markRouteDirty() {
  routeDirty = true;
  renderRoute();
}

function renderRoute() {
  renderRouteFields();
  renderPointList();
  renderLibraryList();
  renderMapRoute();
  const distanceMeters = totalDistanceMeters(route);
  elements.pointCount.textContent = String(route.points.length);
  elements.distanceText.textContent = formatMiles(distanceMeters);
  elements.estimatedTimeText.textContent = formatDuration(
    estimatedDurationMinutes(route),
  );
  elements.paceText.textContent = formatDefaultPace(route.activityType);
  elements.saveStatus.textContent = getSaveStatusText();
}

function renderRouteFields() {
  if (document.activeElement !== elements.routeName) {
    elements.routeName.value = route.name;
  }
  elements.activityType.value = route.activityType;
  elements.loopToggle.checked = route.loop;
}

function renderPointList() {
  if (route.points.length === 0) {
    elements.pointList.innerHTML = '<li class="empty-row">No points yet.</li>';
    return;
  }

  elements.pointList.innerHTML = route.points
    .map(
      (point, index) => `
        <li class="point-row" data-point-id="${escapeAttr(point.id)}">
          <div class="point-main">
            <span class="point-number">${index + 1}</span>
            <label class="point-name-field">
              <span class="sr-only">Point ${index + 1} name</span>
              <input type="text" value="${escapeAttr(point.name)}" data-rename-point="${escapeAttr(point.id)}" />
            </label>
          </div>
          <div class="point-actions">
            <button type="button" class="small-button secondary" data-move-point="${escapeAttr(point.id)}" data-move-delta="-1" ${index === 0 ? "disabled" : ""}>Up</button>
            <button type="button" class="small-button secondary" data-move-point="${escapeAttr(point.id)}" data-move-delta="1" ${index === route.points.length - 1 ? "disabled" : ""}>Down</button>
            <button type="button" class="small-button danger" data-delete-point="${escapeAttr(point.id)}">Delete</button>
          </div>
        </li>
      `,
    )
    .join("");
}

function renderLibraryList() {
  if (routeLibrary.length === 0) {
    elements.savedRouteList.innerHTML =
      '<li class="empty-row">No saved routes yet.</li>';
    return;
  }

  elements.savedRouteList.innerHTML = routeLibrary
    .map((savedRoute) => {
      const isActive = savedRoute.id === activeSavedRouteId;
      const activeLabel = isActive
        ? '<span class="active-route-label">Current</span>'
        : "";

      return `
        <li class="saved-route-row ${isActive ? "is-active" : ""}" data-saved-route-id="${escapeAttr(savedRoute.id)}">
          <div class="saved-route-main">
            <strong>${escapeHtml(savedRoute.name)}</strong>
            ${activeLabel}
            <span>${formatActivityType(savedRoute.activityType)} · ${savedRoute.points.length} point${savedRoute.points.length === 1 ? "" : "s"} · ${formatMiles(savedRoute.distanceMeters)}</span>
            <span>Updated ${formatDate(savedRoute.updatedAt)}</span>
          </div>
          <div class="saved-route-actions">
            <button type="button" class="small-button secondary" data-load-route="${escapeAttr(savedRoute.id)}">Load</button>
            <button type="button" class="small-button secondary" data-copy-route="${escapeAttr(savedRoute.id)}">Copy</button>
            <button type="button" class="small-button danger" data-delete-route="${escapeAttr(savedRoute.id)}">Delete</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderMapRoute() {
  pointLayer.clearLayers();
  lineLayer.clearLayers();

  const latLngs = route.points.map((point) => [point.lat, point.lng]);

  if (latLngs.length > 1) {
    const linePoints =
      route.loop && latLngs.length > 2 ? [...latLngs, latLngs[0]] : latLngs;
    L.polyline(linePoints, {
      className: "route-line",
      weight: 4,
    }).addTo(lineLayer);
  }

  route.points.forEach((point, index) => {
    const marker = L.marker([point.lat, point.lng], {
      draggable: true,
      icon: L.divIcon({
        className: "route-marker-shell",
        html: `<div class="route-marker">${index + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
      title: point.name,
    });

    marker.on("dragend", (event) => {
      const latLng = event.target.getLatLng();
      route = updatePoint(route, point.id, {
        lat: latLng.lat,
        lng: latLng.lng,
      });
      markRouteDirty();
    });

    marker.bindTooltip(`${index + 1}. ${point.name}`);
    marker.addTo(pointLayer);
  });
}

function fitRouteToMap() {
  if (route.points.length === 0) return;

  if (route.points.length === 1) {
    const point = route.points[0];
    map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15));
    return;
  }

  const bounds = L.latLngBounds(
    route.points.map((point) => [point.lat, point.lng]),
  );
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
}

function saveCurrentRoute({ asCopy = false } = {}) {
  const now = new Date().toISOString();
  let savedRoute;

  if (asCopy || !activeSavedRouteId) {
    const routeToSave = asCopy
      ? updateRoute(route, { name: `${route.name} copy` })
      : route;
    savedRoute = createSavedRoute(routeToSave, { now });
    routeLibrary = upsertSavedRoute(routeLibrary, savedRoute, {
      id: savedRoute.id,
      now,
    });
    route = savedRouteToRoute(savedRoute);
  } else {
    const existing = getSavedRoute(routeLibrary, activeSavedRouteId);
    savedRoute = createSavedRoute(route, { id: activeSavedRouteId, now });
    if (existing) savedRoute.createdAt = existing.createdAt;
    routeLibrary = upsertSavedRoute(routeLibrary, savedRoute, {
      id: savedRoute.id,
      now,
    });
  }

  activeSavedRouteId = savedRoute.id;
  routeDirty = false;
  persistLibrary();
  renderRoute();
}

function loadSavedRoute(savedRouteId) {
  const savedRoute = getSavedRoute(routeLibrary, savedRouteId);
  if (!savedRoute) return;

  setRoute(savedRouteToRoute(savedRoute), { savedRouteId, dirty: false });
  fitRouteToMap();
}

function copySavedRoute(savedRouteId) {
  routeLibrary = duplicateSavedRoute(routeLibrary, savedRouteId);
  persistLibrary();
  renderRoute();
}

function removeSavedRoute(savedRouteId) {
  routeLibrary = deleteSavedRoute(routeLibrary, savedRouteId);
  if (activeSavedRouteId === savedRouteId) {
    activeSavedRouteId = null;
    routeDirty = true;
  }
  persistLibrary();
  renderRoute();
}

function startNewRoute() {
  setRoute(
    createRoute({ name: "New route", activityType: route.activityType }),
    {
      savedRouteId: null,
      dirty: false,
    },
  );
}

function exportCurrentRouteJson() {
  const json = serializeRouteFile(route, {
    appVersion: APP_VERSION,
  });
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `${slugify(route.name)}-${dateStamp}.wbr-route.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  elements.routeFileStatus.textContent = `Exported current route: ${route.name}.`;
}

async function stageCurrentRouteImport(file) {
  if (!file) return;

  try {
    const importedRoute = parseRouteFile(await file.text());
    pendingRouteImport = {
      fileName: file.name || "selected file",
      route: importedRoute,
    };
    renderRouteImportPreview();
    elements.routeFileStatus.textContent =
      "Review the route import before replacing the current route.";
  } catch (error) {
    pendingRouteImport = null;
    renderRouteImportPreview();
    elements.routeFileStatus.textContent = error.message;
  }
}

function confirmCurrentRouteImport() {
  if (!pendingRouteImport) return;

  const importedRoute = pendingRouteImport.route;
  pendingRouteImport = null;
  setRoute(importedRoute, { savedRouteId: null, dirty: true });
  renderRouteImportPreview();
  fitRouteToMap();
  elements.routeFileStatus.textContent = `Imported route: ${route.name}.`;
}

function cancelCurrentRouteImport() {
  pendingRouteImport = null;
  renderRouteImportPreview();
  elements.routeFileStatus.textContent = "Route import canceled.";
}

function renderRouteImportPreview() {
  if (!pendingRouteImport) {
    elements.routeImportPreview.hidden = true;
    elements.routeImportPreview.classList.add("is-hidden");
    elements.routeImportPreviewText.textContent = "";
    elements.confirmImportCurrentRoute.disabled = true;
    elements.cancelImportCurrentRoute.disabled = true;
    return;
  }

  const importedRoute = pendingRouteImport.route;
  elements.routeImportPreview.hidden = false;
  elements.routeImportPreview.classList.remove("is-hidden");
  elements.confirmImportCurrentRoute.disabled = false;
  elements.cancelImportCurrentRoute.disabled = false;
  elements.routeImportPreviewText.textContent = `${pendingRouteImport.fileName} contains "${importedRoute.name}" with ${importedRoute.points.length} point${importedRoute.points.length === 1 ? "" : "s"}. Replacing will overwrite the current unsaved route view, but it will not change saved library routes.`;
}

function exportCurrentRouteGpx() {
  const gpx = serializeRouteGpx(route, {
    appVersion: APP_VERSION,
  });
  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `${slugify(route.name)}-${dateStamp}.gpx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  elements.routeFileStatus.textContent = `Exported current route GPX: ${route.name}.`;
}

async function stageCurrentRouteGpxImport(file) {
  if (!file) return;

  try {
    const importedRoute = parseRouteGpx(await file.text());
    pendingRouteImport = {
      fileName: file.name || "selected GPX file",
      route: importedRoute,
    };
    renderRouteImportPreview();
    elements.routeFileStatus.textContent =
      "Review the GPX import before replacing the current route.";
  } catch (error) {
    pendingRouteImport = null;
    renderRouteImportPreview();
    elements.routeFileStatus.textContent = error.message;
  }
}

function exportLibraryJson() {
  const json = serializeRouteLibraryBackup(routeLibrary, {
    appVersion: APP_VERSION,
  });
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `walk-bike-run-routes-${dateStamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  elements.backupStatus.textContent = `Exported ${routeLibrary.length} saved route${routeLibrary.length === 1 ? "" : "s"}.`;
}

async function stageLibraryImport(file) {
  if (!file) return;

  try {
    const importedLibrary = parseRouteLibraryBackup(await file.text());
    pendingLibraryImport = {
      fileName: file.name || "selected file",
      library: importedLibrary,
    };
    renderImportPreview();
    elements.backupStatus.textContent =
      "Review the import before replacing your library.";
  } catch (error) {
    pendingLibraryImport = null;
    renderImportPreview();
    elements.backupStatus.textContent = error.message;
  }
}

function confirmLibraryImport() {
  if (!pendingLibraryImport) return;

  const importedLibrary = pendingLibraryImport.library;
  routeLibrary = importedLibrary;
  activeSavedRouteId = null;
  routeDirty = true;
  pendingLibraryImport = null;
  persistLibrary();
  renderRoute();
  renderImportPreview();
  elements.backupStatus.textContent = `Imported ${routeLibrary.length} saved route${routeLibrary.length === 1 ? "" : "s"}.`;
}

function cancelLibraryImport() {
  pendingLibraryImport = null;
  renderImportPreview();
  elements.backupStatus.textContent = "Import canceled.";
}

function renderImportPreview() {
  if (!pendingLibraryImport) {
    elements.importPreview.hidden = true;
    elements.importPreview.classList.add("is-hidden");
    elements.importPreviewText.textContent = "";
    elements.confirmImportLibrary.disabled = true;
    elements.cancelImportLibrary.disabled = true;
    return;
  }

  const importCount = pendingLibraryImport.library.length;
  const currentCount = routeLibrary.length;
  elements.importPreview.hidden = false;
  elements.importPreview.classList.remove("is-hidden");
  elements.confirmImportLibrary.disabled = false;
  elements.cancelImportLibrary.disabled = false;
  elements.importPreviewText.textContent = `${pendingLibraryImport.fileName} contains ${importCount} saved route${importCount === 1 ? "" : "s"}. Replacing will remove your current ${currentCount} saved route${currentCount === 1 ? "" : "s"}.`;
}

function persistLibrary() {
  saveRouteLibrary(routeLibrary);
}

function getSaveStatusText() {
  if (!activeSavedRouteId)
    return routeDirty ? "Unsaved route changes" : "Unsaved route";
  return routeDirty
    ? "Saved route has unsaved changes"
    : "Saved in route library";
}

function updateDeviceStatus() {
  const touchCapable =
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;
  elements.inputStatus.textContent = touchCapable
    ? "Touch capable"
    : "Mouse/trackpad";
  elements.viewportStatus.textContent = `${window.innerWidth}x${window.innerHeight}`;
}

function formatMiles(meters) {
  return `${(meters / 1609.344).toFixed(2)} mi`;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  if (minutes < 1) return "<1 min";

  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainderMinutes = roundedMinutes % 60;

  if (hours === 0) return `${roundedMinutes} min`;
  if (remainderMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainderMinutes} min`;
}

function formatDefaultPace(activityType) {
  const speedMph = activitySpeedMph(activityType);
  if (activityType === "bike") return `${speedMph.toFixed(1)} mph`;

  const paceMinutes = 60 / speedMph;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")} / mi`;
}

function formatActivityType(activityType) {
  return activityType.charAt(0).toUpperCase() + activityType.slice(1);
}

function slugify(value) {
  return (
    String(value ?? "route")
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "") || "route"
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

elements.routeName.addEventListener("change", (event) => {
  route = updateRoute(route, { name: event.target.value });
  markRouteDirty();
});

elements.activityType.addEventListener("change", (event) => {
  route = updateRoute(route, { activityType: event.target.value });
  markRouteDirty();
});

elements.addCenterPoint.addEventListener("click", () => {
  const center = map.getCenter();
  addRoutePoint(center.lat, center.lng, `Map point ${route.points.length + 1}`);
});

elements.fitRoute.addEventListener("click", fitRouteToMap);

elements.clearPoints.addEventListener("click", () => {
  route = clearPoints(route);
  markRouteDirty();
});

elements.loopToggle.addEventListener("change", (event) => {
  route = setLoop(route, event.target.checked);
  markRouteDirty();
});

elements.saveRoute.addEventListener("click", () => saveCurrentRoute());
elements.saveRouteCopy.addEventListener("click", () =>
  saveCurrentRoute({ asCopy: true }),
);
elements.newRoute.addEventListener("click", startNewRoute);
elements.exportCurrentRoute.addEventListener("click", exportCurrentRouteJson);
elements.importCurrentRouteButton.addEventListener("click", () =>
  elements.importCurrentRouteFile.click(),
);
elements.importCurrentRouteFile.addEventListener("change", async (event) => {
  await stageCurrentRouteImport(event.target.files?.[0]);
  event.target.value = "";
});
elements.exportCurrentRouteGpx.addEventListener("click", exportCurrentRouteGpx);
elements.importCurrentRouteGpxButton.addEventListener("click", () =>
  elements.importCurrentRouteGpxFile.click(),
);
elements.importCurrentRouteGpxFile.addEventListener("change", async (event) => {
  await stageCurrentRouteGpxImport(event.target.files?.[0]);
  event.target.value = "";
});
elements.confirmImportCurrentRoute.addEventListener(
  "click",
  confirmCurrentRouteImport,
);
elements.cancelImportCurrentRoute.addEventListener(
  "click",
  cancelCurrentRouteImport,
);
elements.exportLibrary.addEventListener("click", exportLibraryJson);
elements.importLibraryButton.addEventListener("click", () =>
  elements.importLibraryFile.click(),
);
elements.importLibraryFile.addEventListener("change", async (event) => {
  await stageLibraryImport(event.target.files?.[0]);
  event.target.value = "";
});
elements.confirmImportLibrary.addEventListener("click", confirmLibraryImport);
elements.cancelImportLibrary.addEventListener("click", cancelLibraryImport);

elements.pointList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-point]");
  if (deleteButton) {
    route = deletePoint(route, deleteButton.dataset.deletePoint);
    markRouteDirty();
    return;
  }

  const moveButton = event.target.closest("[data-move-point]");
  if (moveButton) {
    route = movePoint(
      route,
      moveButton.dataset.movePoint,
      Number(moveButton.dataset.moveDelta),
    );
    markRouteDirty();
  }
});

elements.pointList.addEventListener("change", (event) => {
  const input = event.target.closest("[data-rename-point]");
  if (!input) return;

  route = renamePoint(route, input.dataset.renamePoint, input.value);
  markRouteDirty();
});

elements.savedRouteList.addEventListener("click", (event) => {
  const loadButton = event.target.closest("[data-load-route]");
  if (loadButton) {
    loadSavedRoute(loadButton.dataset.loadRoute);
    return;
  }

  const copyButton = event.target.closest("[data-copy-route]");
  if (copyButton) {
    copySavedRoute(copyButton.dataset.copyRoute);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-route]");
  if (deleteButton) {
    removeSavedRoute(deleteButton.dataset.deleteRoute);
  }
});

window.addEventListener("resize", updateDeviceStatus);

initMap();
updateDeviceStatus();
renderRouteImportPreview();
renderImportPreview();
renderRoute();
