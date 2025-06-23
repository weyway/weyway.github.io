// Leaflet Game Map Initialization

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.leaflet-map').forEach(async (mapEl) => {
    const id = mapEl.id;
    const configUrl = mapEl.dataset.config;
    if (!configUrl) return;

    // 1) FETCH JSON CONFIG
    let config = {};
    try {
      const res = await fetch(configUrl);
      config = await res.json();
    } catch (err) {
      console.error("Failed to load map config:", err);
      return;
    }

    // 2) MAP BOUNDS IN GAME UNITS
    // config.bounds = [[minY, minX], [maxY, maxX]]
    const [[minY, minX], [maxY, maxX]] = config.bounds;
    const bounds = [[minY, minX], [maxY, maxX]];

    // 3) INIT MAP
    const map = L.map(id, {
      crs: L.CRS.Simple,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 4,
      maxZoom: 6,
      zoomSnap: 1,
      zoomDelta: 1
    });

    // 4) BASE LAYER
    if (config.baseLayers?.[0]) {
      L.imageOverlay(config.baseLayers[0].image, bounds).addTo(map);
    }
    map.fitBounds(bounds);

    // 5) OVERLAY LAYERS
    const overlayImageLayers = {};
    (config.overlays || []).forEach(def => {
      const layer = L.imageOverlay(def.image, bounds);
      overlayImageLayers[def.name] = layer;
      if (def.enabled) layer.addTo(map);
    });

    // 6) MARKERS
    const markerLayers = {};
    (config.markers || []).forEach(m => {
      const layerName = m.layer || "Markers";
      if (!markerLayers[layerName]) markerLayers[layerName] = L.layerGroup();

      // Flip Y: map Y coordinate = maxY + minY - game Y
      const lat = maxY + minY - m.pos[1];
      const lng = m.pos[0];
      const latlng = [lat, lng];

      const icon = L.icon({
        iconUrl:    m.icon,
        iconSize:   [32, 32],
        iconAnchor: [16, 16],
        popupAnchor:[0, -32]
      });

      L.marker(latlng, { icon })
        .bindPopup(m.popup || "")
        .addTo(markerLayers[layerName]);
    });
    // Add enabled marker groups
    Object.entries(markerLayers).forEach(([name, layer]) => {
      if (config.markers.some(m => (m.layer||"Markers")==name && m.enabled)) {
        layer.addTo(map);
      }
    });

    // 7) COORDINATE DISPLAY
    let coordDiv;
    const coordsControl = L.control({ position: 'bottomleft' });
    coordsControl.onAdd = () => {
      coordDiv = L.DomUtil.create('div', 'coords-control');
      coordDiv.innerHTML = 'Move cursor';
      return coordDiv;
    };
    coordsControl.addTo(map);
    map.on('mousemove', e => {
      const gx = e.latlng.lng;
      // Flip display Y: game Y = maxY + minY - map Y
      const gy = maxY + minY - e.latlng.lat;
      coordDiv.innerHTML = `X:${gx.toFixed(2)}, Y:${gy.toFixed(2)}`;
    });
    map.on('mouseout', () => { coordDiv.innerHTML = 'Move cursor'; });

    // 8) LAYER CONTROLS
    const overlays = Object.assign({}, overlayImageLayers, markerLayers);
    L.control.layers(null, overlays, { collapsed: false }).addTo(map);

    // 9) STOP FOCUS SCROLL JUMP
    const container = L.control.layers().getContainer();
    container.querySelectorAll('a').forEach(link => {
      link.removeAttribute('href');
      link.addEventListener('click', e => { e.preventDefault(); link.blur(); });
    });
  });
});
