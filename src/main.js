import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

import {
  activitySpeedMph,
  addPoint,
  createRoute,
  deletePoint,
  distanceMeters,
  movePoint,
  estimatedDurationMinutes,
  renamePoint,
  setLoop,
  totalDistanceMeters,
  updatePoint,
  updateRoute,
} from './route-model.js';
import {
  createSavedRoute,
  deleteSavedRoute,
  getSavedRoute,
  loadRouteLibrary,
  saveRouteLibrary,
  savedRouteToRoute,
  upsertSavedRoute,
} from './route-library.js';
import {
  parseRouteLibraryBackup,
  serializeRouteLibraryBackup,
} from './route-backup.js';
import { parseRouteFile, serializeRouteFile } from './route-file.js';
import { parseRouteGpx, serializeRouteGpx } from './gpx.js';
import {
  DEFAULT_LIBRARY_SORT_DIRECTIONS,
  getVisibleSavedRoutes,
} from './route-library-view.js';
import { APP_VERSION } from './version.js';

const INITIAL_CENTER = [43.6426, -72.2518];
const INITIAL_ZOOM = 13;

let route = createRoute({ name: 'New route', activityType: 'walk' });
let routeLibrary = loadRouteLibrary();
let activeRouteTab = 'current';
let librarySortBy = 'saved';
let librarySortDirection = DEFAULT_LIBRARY_SORT_DIRECTIONS.saved;
let libraryActivityFilter = 'all';
let libraryNameFilter = '';
let libraryDistanceFilter = 'all';
let libraryDurationFilter = 'all';
let activeLibraryFilterKey = null;
let activeSavedRouteId = null;
let routeDirty = false;
let pendingRouteImport = null;
let pendingLibraryImport = null;
let map;
let pointLayer;
let lineLayer;

const app = document.querySelector('#app');

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
        <section class="panel-section route-summary-section">
          <h2>Route</h2>
          <label class="field-row">
            <span class="route-name-label">Route name <span class="route-name-note">change and save to copy</span></span>
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
              <span>Dist</span>
              <strong id="distanceText" data-testid="distance-text">0.00 mi</strong>
            </div>
            <div class="route-stat-card">
              <span>Time</span>
              <strong id="estimatedTimeText" data-testid="estimated-time">0m</strong>
            </div>
            <div class="route-stat-card">
              <span>Pace</span>
              <strong id="paceText" data-testid="pace-text">20:00 m/mi</strong>
            </div>
          </div>
          <div class="button-row route-action-row">
            <button id="saveRoute" type="button" data-testid="save-route-button">Save</button>
            <button id="fitRoute" type="button" class="secondary">Fit</button>
            <button id="clearPoints" type="button" class="secondary">Clear</button>
          </div>
          <p id="saveStatus" class="save-status" data-testid="save-status">Unsaved route</p>
          <p class="hint-text">Stats use straight-line distance and simple default speeds for now.</p>
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


        <section class="panel-section route-workspace">
          <div class="section-title-row">
            <h2>Routes</h2>
          </div>
          <div class="tab-list" role="tablist" aria-label="Route workspace">
            <button id="currentRouteTab" class="tab-button is-active" type="button" role="tab" aria-selected="true" aria-controls="currentRoutePanel">Current route</button>
            <button id="libraryTab" class="tab-button" type="button" role="tab" aria-selected="false" aria-controls="libraryPanel">Library</button>
          </div>

          <div id="currentRoutePanel" class="tab-panel" role="tabpanel" aria-labelledby="currentRouteTab">
            <h3 class="tab-subtitle">Route list</h3>
            <div class="point-list-header" aria-hidden="true">
              <span>Point</span>
              <span>Segment</span>
              <span>Move</span>
            </div>
            <ol id="pointList" class="point-list" data-testid="point-list"></ol>
          </div>

          <div id="libraryPanel" class="tab-panel" role="tabpanel" aria-labelledby="libraryTab" hidden>
            <p id="libraryStatus" class="hint-text library-status" data-testid="library-status">No saved routes yet.</p>
            <div class="library-table-header" aria-label="Saved route sort and filter controls">
              ${libraryHeaderCell('name', 'Route', 'library-sort-name', 'library-filter-name')}
              ${libraryHeaderCell('activity', 'Mode', 'library-sort-activity', 'library-filter-activity')}
              ${libraryHeaderCell('distance', 'Distance', 'library-sort-distance', 'library-filter-distance')}
              ${libraryHeaderCell('estimatedTime', 'Time', 'library-sort-estimated-time', 'library-filter-estimated-time')}
            </div>
            <div id="libraryFilterPanel" class="library-filter-panel" data-testid="library-filter-panel" hidden>
              <label class="field-row compact-field" data-library-filter-control="name">
                <span>Route contains</span>
                <input id="libraryNameFilter" type="text" autocomplete="off" data-testid="library-name-filter" />
              </label>
              <label class="field-row compact-field" data-library-filter-control="activity">
                <span>Mode</span>
                <select id="libraryActivityFilter" data-testid="library-activity-filter">
                  <option value="all">All activities</option>
                  <option value="walk">Walk</option>
                  <option value="bike">Bike</option>
                  <option value="run">Run</option>
                </select>
              </label>
              <label class="field-row compact-field" data-library-filter-control="distance">
                <span>Distance</span>
                <select id="libraryDistanceFilter" data-testid="library-distance-filter">
                  <option value="all">All distances</option>
                  <option value="lt3">Under 3 mi</option>
                  <option value="3to10">3-10 mi</option>
                  <option value="gte10">10+ mi</option>
                </select>
              </label>
              <label class="field-row compact-field" data-library-filter-control="estimatedTime">
                <span>Time</span>
                <select id="libraryDurationFilter" data-testid="library-duration-filter">
                  <option value="all">All times</option>
                  <option value="lt30">Under 0:30</option>
                  <option value="30to60">0:30-1:00</option>
                  <option value="gte60">1:00+</option>
                </select>
              </label>
              <button id="clearLibraryColumnFilter" type="button" class="small-button secondary">Clear filter</button>
            </div>
            <ol id="savedRouteList" class="saved-route-list" data-testid="saved-route-list"></ol>
          </div>
        </section>

        <section class="panel-section backup-section">
          <h2 id="backupHeading">Current route backup</h2>
          <div id="currentRouteBackupControls">
            <div class="button-row">
              <button id="exportCurrentRoute" type="button" class="secondary">Export route JSON</button>
              <button id="importCurrentRouteButton" type="button" class="secondary">Import route JSON</button>
              <input id="importCurrentRouteFile" class="sr-only" type="file" accept="application/json,.json" />
              <button id="exportCurrentRouteGpx" type="button" class="secondary">Export GPX</button>
              <button id="importCurrentRouteGpxButton" type="button" class="secondary">Import GPX</button>
              <input id="importCurrentRouteGpxFile" class="sr-only" type="file" accept="application/gpx+xml,application/xml,text/xml,.gpx,.xml" />
            </div>
            <p id="routeFileStatus" class="hint-text" data-testid="route-file-status">Back up or restore the current route as app JSON or GPX.</p>
            <div id="routeImportPreview" class="import-preview is-hidden" data-testid="route-import-preview" hidden>
              <p id="routeImportPreviewText"></p>
              <div class="button-row">
                <button id="confirmImportCurrentRoute" type="button">Replace current route</button>
                <button id="cancelImportCurrentRoute" type="button" class="secondary">Cancel route import</button>
              </div>
            </div>
          </div>
          <div id="libraryBackupControls" hidden>
            <div class="button-row">
              <button id="exportLibrary" type="button" class="secondary">Export library JSON</button>
              <button id="importLibraryButton" type="button" class="secondary">Import library JSON</button>
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
          </div>
        </section>

      </aside>
    </main>
  </div>
`;

function libraryHeaderCell(sortKey, label, sortTestId, filterTestId) {
  const escapedLabel = escapeAttr(label);
  return `
    <div class="library-header-cell" data-library-header-cell="${escapeAttr(sortKey)}">
      <button type="button" class="library-filter-button" data-library-filter-key="${escapeAttr(sortKey)}" data-testid="${escapeAttr(filterTestId)}" aria-label="Filter by ${escapedLabel}">${escapeHtml(label)}</button>
      <span class="sort-arrow-group" aria-label="Sort ${escapedLabel}">
        <button type="button" class="sort-arrow-button" data-library-sort-key="${escapeAttr(sortKey)}" data-library-sort-direction="asc" data-testid="${escapeAttr(sortTestId)}-asc" aria-label="Sort ${escapedLabel} ascending">▲</button>
        <button type="button" class="sort-arrow-button" data-library-sort-key="${escapeAttr(sortKey)}" data-library-sort-direction="desc" data-testid="${escapeAttr(sortTestId)}-desc" aria-label="Sort ${escapedLabel} descending">▼</button>
      </span>
    </div>
  `;
}

const elements = {
  mapStatus: document.querySelector('#mapStatus'),
  inputStatus: document.querySelector('#inputStatus'),
  viewportStatus: document.querySelector('#viewportStatus'),
  pointCount: document.querySelector('#pointCount'),
  distanceText: document.querySelector('#distanceText'),
  estimatedTimeText: document.querySelector('#estimatedTimeText'),
  paceText: document.querySelector('#paceText'),
  saveStatus: document.querySelector('#saveStatus'),
  routeName: document.querySelector('#routeName'),
  activityType: document.querySelector('#activityType'),
  loopToggle: document.querySelector('#loopToggle'),
  fitRoute: document.querySelector('#fitRoute'),
  clearPoints: document.querySelector('#clearPoints'),
  saveRoute: document.querySelector('#saveRoute'),
  exportCurrentRoute: document.querySelector('#exportCurrentRoute'),
  importCurrentRouteButton: document.querySelector('#importCurrentRouteButton'),
  importCurrentRouteFile: document.querySelector('#importCurrentRouteFile'),
  exportCurrentRouteGpx: document.querySelector('#exportCurrentRouteGpx'),
  importCurrentRouteGpxButton: document.querySelector(
    '#importCurrentRouteGpxButton',
  ),
  importCurrentRouteGpxFile: document.querySelector(
    '#importCurrentRouteGpxFile',
  ),
  routeImportPreview: document.querySelector('#routeImportPreview'),
  routeImportPreviewText: document.querySelector('#routeImportPreviewText'),
  confirmImportCurrentRoute: document.querySelector(
    '#confirmImportCurrentRoute',
  ),
  cancelImportCurrentRoute: document.querySelector('#cancelImportCurrentRoute'),
  routeFileStatus: document.querySelector('#routeFileStatus'),
  exportLibrary: document.querySelector('#exportLibrary'),
  importLibraryButton: document.querySelector('#importLibraryButton'),
  importLibraryFile: document.querySelector('#importLibraryFile'),
  importPreview: document.querySelector('#importPreview'),
  importPreviewText: document.querySelector('#importPreviewText'),
  confirmImportLibrary: document.querySelector('#confirmImportLibrary'),
  cancelImportLibrary: document.querySelector('#cancelImportLibrary'),
  backupHeading: document.querySelector('#backupHeading'),
  currentRouteBackupControls: document.querySelector(
    '#currentRouteBackupControls',
  ),
  libraryBackupControls: document.querySelector('#libraryBackupControls'),
  backupStatus: document.querySelector('#backupStatus'),
  currentRouteTab: document.querySelector('#currentRouteTab'),
  libraryTab: document.querySelector('#libraryTab'),
  currentRoutePanel: document.querySelector('#currentRoutePanel'),
  libraryPanel: document.querySelector('#libraryPanel'),
  librarySortButtons: document.querySelectorAll('[data-library-sort-key]'),
  libraryFilterButtons: document.querySelectorAll('[data-library-filter-key]'),
  libraryFilterPanel: document.querySelector('#libraryFilterPanel'),
  libraryFilterControls: document.querySelectorAll(
    '[data-library-filter-control]',
  ),
  libraryNameFilter: document.querySelector('#libraryNameFilter'),
  libraryActivityFilter: document.querySelector('#libraryActivityFilter'),
  libraryDistanceFilter: document.querySelector('#libraryDistanceFilter'),
  libraryDurationFilter: document.querySelector('#libraryDurationFilter'),
  clearLibraryColumnFilter: document.querySelector('#clearLibraryColumnFilter'),
  libraryStatus: document.querySelector('#libraryStatus'),
  savedRouteList: document.querySelector('#savedRouteList'),
  pointList: document.querySelector('#pointList'),
};

function initMap() {
  map = L.map('map', {
    zoomControl: true,
  }).setView(INITIAL_CENTER, INITIAL_ZOOM);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  lineLayer = L.layerGroup().addTo(map);
  pointLayer = L.layerGroup().addTo(map);

  map.on('click', (event) => {
    addRoutePoint(
      event.latlng.lat,
      event.latlng.lng,
      `Point ${route.points.length + 1}`,
    );
  });

  elements.mapStatus.textContent = 'Ready';
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

function confirmDiscardUnsavedChanges(actionLabel) {
  if (!routeDirty) return true;
  return window.confirm(
    `${actionLabel} will discard unsaved route changes. Continue?`,
  );
}

function confirmClearRoute() {
  if (route.points.length === 0) return true;
  if (routeDirty) {
    return window.confirm(
      'Clear this route and discard unsaved route changes?',
    );
  }
  return window.confirm('Clear this route?');
}

function renderRoute() {
  renderRouteFields();
  renderPointList();
  renderLibraryList();
  renderMapRoute();
  const distanceMeters = totalDistanceMeters(route);
  elements.pointCount.textContent = String(route.points.length);
  elements.distanceText.textContent = formatMiles(distanceMeters);
  elements.estimatedTimeText.textContent = formatStatsDuration(
    estimatedDurationMinutes(route),
  );
  elements.paceText.textContent = formatDefaultPace(route.activityType);
  elements.saveStatus.textContent = getSaveStatusText();
  elements.saveRoute.textContent = routeDirty ? 'Save' : 'Saved';
  elements.saveRoute.disabled = !routeDirty;
  elements.saveRoute.classList.toggle('is-dirty', routeDirty);
  renderBackupPanel();
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
    .map((point, index) => {
      const segmentText = formatPointSegment(index);
      const loopText = formatLoopReturnSegment(index);

      return `
        <li class="point-row" data-point-id="${escapeAttr(point.id)}" data-testid="point-row">
          <div class="point-grid">
            <div class="point-name-cell">
              <span class="point-number">${index + 1}</span>
              <label class="point-name-field">
                <span class="sr-only">Point ${index + 1} name</span>
                <input type="text" value="${escapeAttr(point.name)}" data-rename-point="${escapeAttr(point.id)}" />
              </label>
            </div>
            <div class="point-segment-cell" data-testid="point-segment">
              ${segmentText}
              ${loopText}
            </div>
            <div class="point-actions" aria-label="Point ${index + 1} actions">
              <button type="button" class="icon-button secondary" data-move-point="${escapeAttr(point.id)}" data-move-delta="-1" aria-label="Up" title="Move up" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="icon-button secondary" data-move-point="${escapeAttr(point.id)}" data-move-delta="1" aria-label="Down" title="Move down" ${index === route.points.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="small-button danger" data-delete-point="${escapeAttr(point.id)}" aria-label="Delete point ${index + 1}">Del</button>
            </div>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderLibraryList() {
  const visibleRoutes = getVisibleSavedRoutes(routeLibrary, {
    activityFilter: libraryActivityFilter,
    nameFilter: libraryNameFilter,
    distanceFilter: libraryDistanceFilter,
    durationFilter: libraryDurationFilter,
    sortBy: librarySortBy,
    sortDirection: librarySortDirection,
  });

  elements.libraryNameFilter.value = libraryNameFilter;
  elements.libraryActivityFilter.value = libraryActivityFilter;
  elements.libraryDistanceFilter.value = libraryDistanceFilter;
  elements.libraryDurationFilter.value = libraryDurationFilter;
  elements.libraryStatus.textContent = formatLibraryStatus(
    visibleRoutes.length,
  );
  renderLibrarySortControls();
  renderLibraryFilterControls();

  if (routeLibrary.length === 0) {
    elements.savedRouteList.innerHTML =
      '<li class="empty-row">No saved routes yet.</li>';
    return;
  }

  if (visibleRoutes.length === 0) {
    elements.savedRouteList.innerHTML =
      '<li class="empty-row">No saved routes match this filter.</li>';
    return;
  }

  elements.savedRouteList.innerHTML = visibleRoutes
    .map((savedRoute) => {
      const isCurrent = savedRoute.id === activeSavedRouteId;
      const currentLabel = isCurrent
        ? '<span class="current-route-label">Current</span>'
        : '';

      return `
        <li class="saved-route-row ${isCurrent ? 'is-current' : ''}" data-saved-route-id="${escapeAttr(savedRoute.id)}" data-testid="saved-route-row">
          <div class="saved-route-grid">
            <div class="saved-route-name-cell">
              <strong data-testid="saved-route-name">${escapeHtml(savedRoute.name)}</strong>
              ${currentLabel}
            </div>
            <div class="saved-route-cell saved-route-mode" data-testid="saved-route-mode">
              <span class="cell-label">Activity</span>
              <span>${formatActivityType(savedRoute.activityType)}</span>
            </div>
            <div class="saved-route-cell" data-testid="saved-route-distance">
              <span class="cell-label">Distance</span>
              <span>${formatMiles(savedRoute.distanceMeters)}</span>
            </div>
            <div class="saved-route-cell" data-testid="saved-route-estimate">
              <span class="cell-label">Estimate</span>
              <span>${formatLibraryDuration(estimatedDurationMinutes(savedRoute))}</span>
            </div>
            <div class="saved-route-actions" aria-label="${escapeAttr(savedRoute.name)} actions">
              <button type="button" class="small-button secondary" data-load-saved-route="${escapeAttr(savedRoute.id)}">Load</button>
              <button type="button" class="small-button secondary" data-update-saved-route="${escapeAttr(savedRoute.id)}">Update</button>
              <button type="button" class="small-button danger" data-delete-saved-route="${escapeAttr(savedRoute.id)}" aria-label="Delete ${escapeAttr(savedRoute.name)}">Del</button>
            </div>
          </div>
          <div class="saved-route-meta-line" data-testid="saved-route-meta">
            <span>Created <time datetime="${escapeAttr(savedRoute.createdAt)}">${formatDate(savedRoute.createdAt)}</time></span>
            <span data-testid="saved-route-updated">Updated <time datetime="${escapeAttr(savedRoute.updatedAt)}">${formatDate(savedRoute.updatedAt)}</time></span>
            <span>${formatPointCount(savedRoute.points.length)}</span>
            <span>Last followed —</span>
            <span>Completion —</span>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderLibrarySortControls() {
  elements.librarySortButtons.forEach((button) => {
    const sortKey = button.dataset.librarySortKey;
    const sortDirection = button.dataset.librarySortDirection;
    const isActive =
      sortKey === librarySortBy && sortDirection === librarySortDirection;

    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function renderLibraryFilterControls() {
  const hasActiveFilter = Boolean(activeLibraryFilterKey);

  elements.libraryFilterPanel.hidden = !hasActiveFilter;
  elements.libraryFilterButtons.forEach((button) => {
    const isActive = button.dataset.libraryFilterKey === activeLibraryFilterKey;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });

  elements.libraryFilterControls.forEach((control) => {
    control.hidden =
      control.dataset.libraryFilterControl !== activeLibraryFilterKey;
  });
}


function renderMapRoute() {
  pointLayer.clearLayers();
  lineLayer.clearLayers();

  const latLngs = route.points.map((point) => [point.lat, point.lng]);

  if (latLngs.length > 1) {
    const linePoints =
      route.loop && latLngs.length > 2 ? [...latLngs, latLngs[0]] : latLngs;
    L.polyline(linePoints, {
      className: 'route-line',
      weight: 4,
    }).addTo(lineLayer);
  }

  route.points.forEach((point, index) => {
    const marker = L.marker([point.lat, point.lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'route-marker-shell',
        html: `<div class="route-marker">${index + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
      title: point.name,
    });

    marker.on('dragend', (event) => {
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
  if (!confirmDiscardUnsavedChanges('Loading a saved route')) return;

  setRoute(savedRouteToRoute(savedRoute), { savedRouteId, dirty: false });
  fitRouteToMap();
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


function updateSavedRouteFromCurrent(savedRouteId) {
  const existing = getSavedRoute(routeLibrary, savedRouteId);
  if (!existing) return;

  const shouldUpdate = window.confirm(
    `Update "${existing.name}" with the current route?`,
  );
  if (!shouldUpdate) return;

  const now = new Date().toISOString();
  let savedRoute = createSavedRoute(route, { id: savedRouteId, now });
  savedRoute.createdAt = existing.createdAt;
  routeLibrary = upsertSavedRoute(routeLibrary, savedRoute, {
    id: savedRoute.id,
    now,
  });
  savedRoute = getSavedRoute(routeLibrary, savedRouteId) ?? savedRoute;
  route = savedRouteToRoute(savedRoute);
  activeSavedRouteId = savedRouteId;
  routeDirty = false;
  persistLibrary();
  renderRoute();
}

function setActiveRouteTab(tabName) {
  activeRouteTab = tabName === 'library' ? 'library' : 'current';

  const showLibrary = activeRouteTab === 'library';
  elements.currentRoutePanel.hidden = showLibrary;
  elements.libraryPanel.hidden = !showLibrary;
  elements.currentRouteTab.classList.toggle('is-active', !showLibrary);
  elements.libraryTab.classList.toggle('is-active', showLibrary);
  elements.currentRouteTab.setAttribute(
    'aria-selected',
    showLibrary ? 'false' : 'true',
  );
  elements.libraryTab.setAttribute(
    'aria-selected',
    showLibrary ? 'true' : 'false',
  );
  renderBackupPanel();
}

function renderBackupPanel() {
  const showLibraryBackup = activeRouteTab === 'library';

  elements.backupHeading.textContent = showLibraryBackup
    ? 'Library backup'
    : 'Current route backup';
  elements.currentRouteBackupControls.hidden = showLibraryBackup;
  elements.libraryBackupControls.hidden = !showLibraryBackup;
}

function setLibrarySort(sortKey, sortDirection) {
  librarySortBy = sortKey;
  librarySortDirection =
    sortDirection ?? DEFAULT_LIBRARY_SORT_DIRECTIONS[sortKey] ?? 'asc';
  renderRoute();
}

function toggleLibraryFilter(filterKey) {
  activeLibraryFilterKey =
    activeLibraryFilterKey === filterKey ? null : filterKey;
  renderRoute();
}

function clearLibraryColumnFilter() {
  if (activeLibraryFilterKey === 'name') libraryNameFilter = '';
  if (activeLibraryFilterKey === 'activity') libraryActivityFilter = 'all';
  if (activeLibraryFilterKey === 'distance') libraryDistanceFilter = 'all';
  if (activeLibraryFilterKey === 'estimatedTime') libraryDurationFilter = 'all';
  renderRoute();
}

function exportCurrentRouteJson() {
  const json = serializeRouteFile(route, {
    appVersion: APP_VERSION,
  });
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
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
      fileName: file.name || 'selected file',
      route: importedRoute,
    };
    renderRouteImportPreview();
    elements.routeFileStatus.textContent =
      'Review the route import before replacing the current route.';
  } catch (error) {
    pendingRouteImport = null;
    renderRouteImportPreview();
    elements.routeFileStatus.textContent = error.message;
  }
}

function confirmCurrentRouteImport() {
  if (!pendingRouteImport) return;
  if (!confirmDiscardUnsavedChanges('Importing this route')) return;

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
  elements.routeFileStatus.textContent = 'Route import canceled.';
}

function renderRouteImportPreview() {
  if (!pendingRouteImport) {
    elements.routeImportPreview.hidden = true;
    elements.routeImportPreview.classList.add('is-hidden');
    elements.routeImportPreviewText.textContent = '';
    elements.confirmImportCurrentRoute.disabled = true;
    elements.cancelImportCurrentRoute.disabled = true;
    return;
  }

  const importedRoute = pendingRouteImport.route;
  elements.routeImportPreview.hidden = false;
  elements.routeImportPreview.classList.remove('is-hidden');
  elements.confirmImportCurrentRoute.disabled = false;
  elements.cancelImportCurrentRoute.disabled = false;
  elements.routeImportPreviewText.textContent = `${pendingRouteImport.fileName} contains "${importedRoute.name}" with ${importedRoute.points.length} point${importedRoute.points.length === 1 ? '' : 's'}. Replacing will overwrite the current unsaved route view, but it will not change saved library routes.`;
}

function exportCurrentRouteGpx() {
  const gpx = serializeRouteGpx(route, {
    appVersion: APP_VERSION,
  });
  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
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
      fileName: file.name || 'selected GPX file',
      route: importedRoute,
    };
    renderRouteImportPreview();
    elements.routeFileStatus.textContent =
      'Review the GPX import before replacing the current route.';
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
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `walk-bike-run-routes-${dateStamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  elements.backupStatus.textContent = `Exported ${routeLibrary.length} saved route${routeLibrary.length === 1 ? '' : 's'}.`;
}

async function stageLibraryImport(file) {
  if (!file) return;

  try {
    const importedLibrary = parseRouteLibraryBackup(await file.text());
    pendingLibraryImport = {
      fileName: file.name || 'selected file',
      library: importedLibrary,
    };
    renderImportPreview();
    elements.backupStatus.textContent =
      'Review the import before replacing your library.';
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
  elements.backupStatus.textContent = `Imported ${routeLibrary.length} saved route${routeLibrary.length === 1 ? '' : 's'}.`;
}

function cancelLibraryImport() {
  pendingLibraryImport = null;
  renderImportPreview();
  elements.backupStatus.textContent = 'Import canceled.';
}

function renderImportPreview() {
  if (!pendingLibraryImport) {
    elements.importPreview.hidden = true;
    elements.importPreview.classList.add('is-hidden');
    elements.importPreviewText.textContent = '';
    elements.confirmImportLibrary.disabled = true;
    elements.cancelImportLibrary.disabled = true;
    return;
  }

  const importCount = pendingLibraryImport.library.length;
  const currentCount = routeLibrary.length;
  elements.importPreview.hidden = false;
  elements.importPreview.classList.remove('is-hidden');
  elements.confirmImportLibrary.disabled = false;
  elements.cancelImportLibrary.disabled = false;
  elements.importPreviewText.textContent = `${pendingLibraryImport.fileName} contains ${importCount} saved route${importCount === 1 ? '' : 's'}. Replacing will remove your current ${currentCount} saved route${currentCount === 1 ? '' : 's'}.`;
}

function persistLibrary() {
  saveRouteLibrary(routeLibrary);
}

function formatLibraryStatus(visibleCount) {
  if (routeLibrary.length === 0) return 'No saved routes yet.';

  const routeText = `${visibleCount} of ${routeLibrary.length} saved route${routeLibrary.length === 1 ? '' : 's'}`;
  const filters = formatLibraryFilterSummary();

  return `${routeText} shown. ${filters}. Sort: ${formatLibrarySortLabel()}.`;
}

function formatLibraryFilterSummary() {
  const activeFilters = [];

  if (libraryNameFilter.trim()) {
    activeFilters.push(`route contains "${libraryNameFilter.trim()}"`);
  }
  if (libraryActivityFilter !== 'all') {
    activeFilters.push(formatActivityType(libraryActivityFilter));
  }
  if (libraryDistanceFilter !== 'all') {
    activeFilters.push(formatDistanceFilterLabel(libraryDistanceFilter));
  }
  if (libraryDurationFilter !== 'all') {
    activeFilters.push(formatDurationFilterLabel(libraryDurationFilter));
  }

  return activeFilters.length
    ? `Filters: ${activeFilters.join(', ')}`
    : 'No filters';
}

function formatDistanceFilterLabel(filter) {
  const labels = {
    lt3: 'under 3 mi',
    '3to10': '3-10 mi',
    gte10: '10+ mi',
  };
  return labels[filter] ?? filter;
}

function formatDurationFilterLabel(filter) {
  const labels = {
    lt30: 'under 0:30',
    '30to60': '0:30-1:00',
    gte60: '1:00+',
  };
  return labels[filter] ?? filter;
}

function formatLibrarySortLabel() {
  if (librarySortBy === 'saved') return 'saved order';

  const labels = {
    activity: 'mode',
    created: 'created',
    distance: 'distance',
    estimatedTime: 'estimated time',
    name: 'route',
    points: 'points',
    updated: 'updated',
  };
  const directionText =
    librarySortDirection === 'asc' ? 'ascending' : 'descending';

  return `${labels[librarySortBy] ?? librarySortBy} ${directionText}`;
}

function getSaveStatusText() {
  if (!activeSavedRouteId) return 'New unsaved route';
  return routeDirty ? 'Unsaved changes' : 'Saved';
}

function formatPointSegment(index) {
  if (index === 0) return '<span class="point-segment-muted">Start</span>';

  const meters = distanceMeters(route.points[index - 1], route.points[index]);
  return formatSegmentDistanceAndTime('From prev', meters);
}

function formatLoopReturnSegment(index) {
  const isLastPoint = index === route.points.length - 1;
  if (!route.loop || !isLastPoint || route.points.length < 3) return '';

  const meters = distanceMeters(route.points[index], route.points[0]);
  return formatSegmentDistanceAndTime('Return', meters);
}

function formatSegmentDistanceAndTime(label, meters) {
  return `
    <span class="point-segment-line">
      <span class="point-segment-label">${escapeHtml(label)}</span>
      <strong>${formatMiles(meters)}</strong>
      <span>${formatLibraryDuration(estimatedSegmentDurationMinutes(meters))}</span>
    </span>
  `;
}

function estimatedSegmentDurationMinutes(distanceMetersValue) {
  const speedMph = activitySpeedMph(route.activityType);
  if (!speedMph || !Number.isFinite(distanceMetersValue)) return 0;

  const distanceMiles = distanceMetersValue / 1609.344;
  return (distanceMiles / speedMph) * 60;
}


function updateDeviceStatus() {
  const touchCapable =
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;
  elements.inputStatus.textContent = touchCapable
    ? 'Touch capable'
    : 'Mouse/trackpad';
  elements.viewportStatus.textContent = `${window.innerWidth}x${window.innerHeight}`;
}

function formatMiles(meters) {
  return `${(meters / 1609.344).toFixed(2)} mi`;
}

function formatStatsDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';

  const roundedMinutes = Math.round(minutes);
  const days = Math.floor(roundedMinutes / 1440);
  const hours = Math.floor((roundedMinutes % 1440) / 60);
  const remainderMinutes = roundedMinutes % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(remainderMinutes).padStart(2, '0')}m`;
  }
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(remainderMinutes).padStart(2, '0')}m`;
  }
  return `${roundedMinutes}m`;
}

function formatLibraryDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0:00';

  const roundedMinutes = Math.round(minutes);
  const days = Math.floor(roundedMinutes / 1440);
  const hours = Math.floor((roundedMinutes % 1440) / 60);
  const remainderMinutes = roundedMinutes % 60;
  const timeText = `${hours}:${String(remainderMinutes).padStart(2, '0')}`;

  return days > 0 ? `${days}+${timeText}` : timeText;
}

function formatDefaultPace(activityType) {
  const speedMph = activitySpeedMph(activityType);
  if (activityType === 'bike') return `${speedMph.toFixed(1)} mph`;

  const paceMinutes = 60 / speedMph;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')} m/mi`;
}

function formatActivityType(activityType) {
  return activityType.charAt(0).toUpperCase() + activityType.slice(1);
}

function formatPointCount(pointCount) {
  return `${pointCount} point${pointCount === 1 ? '' : 's'}`;
}

function slugify(value) {
  return (
    String(value ?? 'route')
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '') || 'route'
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

elements.routeName.addEventListener('change', (event) => {
  route = updateRoute(route, { name: event.target.value });
  markRouteDirty();
});

elements.activityType.addEventListener('change', (event) => {
  route = updateRoute(route, { activityType: event.target.value });
  markRouteDirty();
});

elements.fitRoute.addEventListener('click', fitRouteToMap);

elements.clearPoints.addEventListener('click', () => {
  if (!confirmClearRoute()) return;
  setRoute(
    createRoute({ name: 'New route', activityType: route.activityType }),
    {
      savedRouteId: null,
      dirty: false,
    },
  );
});

elements.loopToggle.addEventListener('change', (event) => {
  route = setLoop(route, event.target.checked);
  markRouteDirty();
});

elements.saveRoute.addEventListener('click', () => saveCurrentRoute());
elements.currentRouteTab.addEventListener('click', () =>
  setActiveRouteTab('current'),
);
elements.libraryTab.addEventListener('click', () =>
  setActiveRouteTab('library'),
);
elements.librarySortButtons.forEach((button) => {
  button.addEventListener('click', () =>
    setLibrarySort(
      button.dataset.librarySortKey,
      button.dataset.librarySortDirection,
    ),
  );
});
elements.libraryFilterButtons.forEach((button) => {
  button.addEventListener('click', () =>
    toggleLibraryFilter(button.dataset.libraryFilterKey),
  );
});
elements.libraryNameFilter.addEventListener('input', (event) => {
  libraryNameFilter = event.target.value;
  renderRoute();
});
elements.libraryActivityFilter.addEventListener('change', (event) => {
  libraryActivityFilter = event.target.value;
  renderRoute();
});
elements.libraryDistanceFilter.addEventListener('change', (event) => {
  libraryDistanceFilter = event.target.value;
  renderRoute();
});
elements.libraryDurationFilter.addEventListener('change', (event) => {
  libraryDurationFilter = event.target.value;
  renderRoute();
});
elements.clearLibraryColumnFilter.addEventListener(
  'click',
  clearLibraryColumnFilter,
);
elements.exportCurrentRoute.addEventListener('click', exportCurrentRouteJson);
elements.importCurrentRouteButton.addEventListener('click', () =>
  elements.importCurrentRouteFile.click(),
);
elements.importCurrentRouteFile.addEventListener('change', async (event) => {
  await stageCurrentRouteImport(event.target.files?.[0]);
  event.target.value = '';
});
elements.exportCurrentRouteGpx.addEventListener('click', exportCurrentRouteGpx);
elements.importCurrentRouteGpxButton.addEventListener('click', () =>
  elements.importCurrentRouteGpxFile.click(),
);
elements.importCurrentRouteGpxFile.addEventListener('change', async (event) => {
  await stageCurrentRouteGpxImport(event.target.files?.[0]);
  event.target.value = '';
});
elements.confirmImportCurrentRoute.addEventListener(
  'click',
  confirmCurrentRouteImport,
);
elements.cancelImportCurrentRoute.addEventListener(
  'click',
  cancelCurrentRouteImport,
);
elements.exportLibrary.addEventListener('click', exportLibraryJson);
elements.importLibraryButton.addEventListener('click', () =>
  elements.importLibraryFile.click(),
);
elements.importLibraryFile.addEventListener('change', async (event) => {
  await stageLibraryImport(event.target.files?.[0]);
  event.target.value = '';
});
elements.confirmImportLibrary.addEventListener('click', confirmLibraryImport);
elements.cancelImportLibrary.addEventListener('click', cancelLibraryImport);

elements.pointList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-point]');
  if (deleteButton) {
    route = deletePoint(route, deleteButton.dataset.deletePoint);
    markRouteDirty();
    return;
  }

  const moveButton = event.target.closest('[data-move-point]');
  if (moveButton) {
    route = movePoint(
      route,
      moveButton.dataset.movePoint,
      Number(moveButton.dataset.moveDelta),
    );
    markRouteDirty();
  }
});

elements.pointList.addEventListener('change', (event) => {
  const input = event.target.closest('[data-rename-point]');
  if (!input) return;

  route = renamePoint(route, input.dataset.renamePoint, input.value);
  markRouteDirty();
});

elements.savedRouteList.addEventListener('click', (event) => {
  const loadButton = event.target.closest('[data-load-saved-route]');
  if (loadButton) {
    loadSavedRoute(loadButton.dataset.loadSavedRoute);
    return;
  }

  const updateButton = event.target.closest('[data-update-saved-route]');
  if (updateButton) {
    updateSavedRouteFromCurrent(updateButton.dataset.updateSavedRoute);
    return;
  }

  const deleteButton = event.target.closest('[data-delete-saved-route]');
  if (deleteButton) {
    removeSavedRoute(deleteButton.dataset.deleteSavedRoute);
    return;
  }

});

window.addEventListener('resize', updateDeviceStatus);

initMap();
setActiveRouteTab(activeRouteTab);
updateDeviceStatus();
renderRouteImportPreview();
renderImportPreview();
renderRoute();
