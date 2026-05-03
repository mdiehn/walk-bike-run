import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

import {
  addPoint,
  clearPoints,
  createRoute,
  deletePoint,
  movePoint,
  renamePoint,
  setLoop,
  totalDistanceMeters,
  updatePoint,
  updateRoute,
} from './route-model.js';
import { APP_VERSION } from './version.js';

const INITIAL_CENTER = [43.6426, -72.2518];
const INITIAL_ZOOM = 13;

let route = createRoute({ name: 'New route', activityType: 'walk' });
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
          <p id="distanceText" class="distance-text">Distance: 0.00 mi</p>
          <p class="hint-text">Distance is straight-line for now. Road/path routing comes later.</p>
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
          <h2>Route list</h2>
          <ol id="pointList" class="point-list" data-testid="point-list"></ol>
        </section>
      </aside>
    </main>
  </div>
`;

const elements = {
  mapStatus: document.querySelector('#mapStatus'),
  inputStatus: document.querySelector('#inputStatus'),
  viewportStatus: document.querySelector('#viewportStatus'),
  pointCount: document.querySelector('#pointCount'),
  distanceText: document.querySelector('#distanceText'),
  routeName: document.querySelector('#routeName'),
  activityType: document.querySelector('#activityType'),
  loopToggle: document.querySelector('#loopToggle'),
  addCenterPoint: document.querySelector('#addCenterPoint'),
  fitRoute: document.querySelector('#fitRoute'),
  clearPoints: document.querySelector('#clearPoints'),
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
    addRoutePoint(event.latlng.lat, event.latlng.lng, `Map point ${route.points.length + 1}`);
  });

  elements.mapStatus.textContent = 'Ready';
}

function addRoutePoint(lat, lng, name) {
  route = addPoint(route, { lat, lng, name });
  renderRoute();
}

function renderRoute() {
  renderRouteFields();
  renderPointList();
  renderMapRoute();
  elements.pointCount.textContent = String(route.points.length);
  elements.distanceText.textContent = `Distance: ${formatMiles(totalDistanceMeters(route))}`;
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
            <button type="button" class="small-button secondary" data-move-point="${escapeAttr(point.id)}" data-move-delta="-1" ${index === 0 ? 'disabled' : ''}>Up</button>
            <button type="button" class="small-button secondary" data-move-point="${escapeAttr(point.id)}" data-move-delta="1" ${index === route.points.length - 1 ? 'disabled' : ''}>Down</button>
            <button type="button" class="small-button danger" data-delete-point="${escapeAttr(point.id)}">Delete</button>
          </div>
        </li>
      `,
    )
    .join('');
}

function renderMapRoute() {
  pointLayer.clearLayers();
  lineLayer.clearLayers();

  const latLngs = route.points.map((point) => [point.lat, point.lng]);

  if (latLngs.length > 1) {
    const linePoints = route.loop && latLngs.length > 2 ? [...latLngs, latLngs[0]] : latLngs;
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
      route = updatePoint(route, point.id, { lat: latLng.lat, lng: latLng.lng });
      renderRoute();
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

  const bounds = L.latLngBounds(route.points.map((point) => [point.lat, point.lng]));
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
}

function updateDeviceStatus() {
  const touchCapable = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  elements.inputStatus.textContent = touchCapable ? 'Touch capable' : 'Mouse/trackpad';
  elements.viewportStatus.textContent = `${window.innerWidth}x${window.innerHeight}`;
}

function formatMiles(meters) {
  return `${(meters / 1609.344).toFixed(2)} mi`;
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

elements.routeName.addEventListener('change', (event) => {
  route = updateRoute(route, { name: event.target.value });
  renderRoute();
});

elements.activityType.addEventListener('change', (event) => {
  route = updateRoute(route, { activityType: event.target.value });
  renderRoute();
});

elements.addCenterPoint.addEventListener('click', () => {
  const center = map.getCenter();
  addRoutePoint(center.lat, center.lng, `Map point ${route.points.length + 1}`);
});

elements.fitRoute.addEventListener('click', fitRouteToMap);

elements.clearPoints.addEventListener('click', () => {
  route = clearPoints(route);
  renderRoute();
});

elements.loopToggle.addEventListener('change', (event) => {
  route = setLoop(route, event.target.checked);
  renderRoute();
});

elements.pointList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-point]');
  if (deleteButton) {
    route = deletePoint(route, deleteButton.dataset.deletePoint);
    renderRoute();
    return;
  }

  const moveButton = event.target.closest('[data-move-point]');
  if (moveButton) {
    route = movePoint(route, moveButton.dataset.movePoint, Number(moveButton.dataset.moveDelta));
    renderRoute();
  }
});

elements.pointList.addEventListener('change', (event) => {
  const input = event.target.closest('[data-rename-point]');
  if (!input) return;

  route = renamePoint(route, input.dataset.renamePoint, input.value);
  renderRoute();
});

window.addEventListener('resize', updateDeviceStatus);

initMap();
updateDeviceStatus();
renderRoute();
