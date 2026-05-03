import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

import {
  addPoint,
  clearPoints,
  createRoute,
  deletePoint,
  setLoop,
  totalDistanceMeters,
} from './route-model.js';
import { APP_VERSION } from './version.js';

const INITIAL_CENTER = [43.6426, -72.2518];
const INITIAL_ZOOM = 13;

let route = createRoute({ name: 'Hello route' });
let map;
let pointLayer;
let lineLayer;

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Walk Bike Run</p>
        <h1>Hello, map.</h1>
        <p class="subtitle">Desktop/mobile sanity test for the route planner shell.</p>
      </div>
      <div class="version-pill" title="App version">v${APP_VERSION}</div>
    </header>

    <main class="app-main">
      <section class="map-card" aria-label="Map test area">
        <div id="map" class="map" data-testid="map"></div>
      </section>

      <aside class="panel" aria-label="Hello world controls">
        <section class="panel-section">
          <h2>Hello world</h2>
          <p>
            If you can see this panel and the map, the basic app shell is working.
            Click or tap the map to add test points.
          </p>
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
          <h2>Test route</h2>
          <p id="distanceText" class="distance-text">Distance: 0.00 mi</p>
          <label class="checkbox-row">
            <input id="loopToggle" type="checkbox" />
            Loop back to start
          </label>
          <div class="button-row">
            <button id="addSamplePoint" type="button">Add sample point</button>
            <button id="clearPoints" type="button" class="secondary">Clear</button>
          </div>
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
  loopToggle: document.querySelector('#loopToggle'),
  addSamplePoint: document.querySelector('#addSamplePoint'),
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

  pointLayer = L.layerGroup().addTo(map);
  lineLayer = L.layerGroup().addTo(map);

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
  renderPointList();
  renderMapRoute();
  elements.pointCount.textContent = String(route.points.length);
  elements.distanceText.textContent = `Distance: ${formatMiles(totalDistanceMeters(route))}`;
}

function renderPointList() {
  if (route.points.length === 0) {
    elements.pointList.innerHTML = '<li class="empty-row">No points yet.</li>';
    return;
  }

  elements.pointList.innerHTML = route.points
    .map(
      (point, index) => `
        <li>
          <span>${index + 1}. ${escapeHtml(point.name)}</span>
          <button type="button" class="small-button" data-delete-point="${point.id}">Delete</button>
        </li>
      `,
    )
    .join('');
}

function renderMapRoute() {
  pointLayer.clearLayers();
  lineLayer.clearLayers();

  const latLngs = route.points.map((point) => [point.lat, point.lng]);

  route.points.forEach((point, index) => {
    L.circleMarker([point.lat, point.lng], {
      radius: 8,
      weight: 2,
      fillOpacity: 0.85,
    })
      .bindTooltip(`${index + 1}. ${point.name}`)
      .addTo(pointLayer);
  });

  if (latLngs.length > 1) {
    const linePoints = route.loop && latLngs.length > 2 ? [...latLngs, latLngs[0]] : latLngs;
    L.polyline(linePoints, {
      weight: 4,
    }).addTo(lineLayer);
  }
}

function updateDeviceStatus() {
  const touchCapable = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  elements.inputStatus.textContent = touchCapable ? 'Touch capable' : 'Mouse/trackpad';
  elements.viewportStatus.textContent = `${window.innerWidth}x${window.innerHeight}`;
}

function formatMiles(meters) {
  return `${(meters / 1609.344).toFixed(2)} mi`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

elements.addSamplePoint.addEventListener('click', () => {
  const offset = route.points.length * 0.003;
  addRoutePoint(INITIAL_CENTER[0] + offset, INITIAL_CENTER[1] + offset, `Sample point ${route.points.length + 1}`);
});

elements.clearPoints.addEventListener('click', () => {
  route = clearPoints(route);
  renderRoute();
});

elements.loopToggle.addEventListener('change', (event) => {
  route = setLoop(route, event.target.checked);
  renderRoute();
});

elements.pointList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-point]');
  if (!button) return;

  route = deletePoint(route, button.dataset.deletePoint);
  renderRoute();
});

window.addEventListener('resize', updateDeviceStatus);

initMap();
updateDeviceStatus();
renderRoute();
