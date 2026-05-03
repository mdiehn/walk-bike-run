import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { APP_VERSION } from './version.js';
import './style.css';

const DEFAULT_CENTER = [43.647, -72.319];
const DEFAULT_ZOOM = 13;

function renderApp() {
  const app = document.querySelector('#app');

  app.innerHTML = `
    <header class="app-header">
      <div>
        <h1>Walk Bike Run</h1>
        <p>Personal route planning, starting small.</p>
      </div>
      <span class="version" aria-label="app version">${APP_VERSION}</span>
    </header>
    <main class="app-main">
      <section class="map-panel" aria-label="Map">
        <div id="map"></div>
      </section>
      <aside class="route-panel" aria-label="Route panel">
        <h2>Route</h2>
        <p>Phase 1: app shell, map, dev loop, and tests.</p>
      </aside>
    </main>
  `;

  const map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
}

renderApp();
