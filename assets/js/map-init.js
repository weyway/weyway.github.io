console.log('map-init.js loaded');
document.addEventListener("DOMContentLoaded", function () {
  var maps = document.querySelectorAll('.leaflet-map');

  maps.forEach(function(mapEl) {
    var id = mapEl.id;
    var imageUrl = mapEl.dataset.image;

    // Parse bounds, expects "x1,y1,x2,y2"
    var boundsArr = mapEl.dataset.bounds.split(',').map(Number);
    var bounds = [[boundsArr[1], boundsArr[0]], [boundsArr[3], boundsArr[2]]]; // Leaflet uses [lat, lng]

    var markersData = [];
    try {
      markersData = JSON.parse(mapEl.dataset.markers);
    } catch(e) {
      console.warn('Invalid markers JSON for map:', id, e);
    }

    var map = L.map(id, {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 4,
    });

    L.imageOverlay(imageUrl, bounds).addTo(map);
    map.fitBounds(bounds);

    markersData.forEach(function(marker) {
      var icon = L.icon({
        iconUrl: marker.icon,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker(marker.pos, {icon: icon}).addTo(map)
        .bindPopup(marker.popup);
    });
  });
});
