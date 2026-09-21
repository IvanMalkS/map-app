interface MapCenter {
  latitude: number;
  longitude: number;
}

/** Builds the standalone Leaflet page rendered by the Android WebView. */
export function getOpenStreetMapHtml(center: MapCenter): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>html, body, #map { width: 100%; height: 100%; margin: 0; }</style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const send = (message) => window.ReactNativeWebView.postMessage(JSON.stringify(message));
      const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 13);
      window.invalidateMap = () => map.invalidateSize();
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const mapMarkers = new Map();
      window.setMapMarkers = (markers) => {
        mapMarkers.forEach((marker) => marker.remove());
        mapMarkers.clear();
        markers.forEach((marker) => {
          const leafMarker = L.marker([marker.latitude, marker.longitude]).addTo(map);
          leafMarker.on('click', () => send({ type: 'marker-press', id: marker.id }));
          mapMarkers.set(marker.id, leafMarker);
        });
      };

      let longPressTimer;
      const clearLongPress = () => clearTimeout(longPressTimer);
      const startLongPress = (latlng) => {
        const { lat, lng } = latlng;
        clearLongPress();
        longPressTimer = setTimeout(() => send({ type: 'long-press', latitude: lat, longitude: lng }), 600);
      };
      map.on('mousedown', (event) => startLongPress(event.latlng));
      map.on('mouseup dragstart', clearLongPress);

      const container = map.getContainer();
      container.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        startLongPress(map.mouseEventToLatLng(touch));
      }, { passive: true });
      container.addEventListener('touchend', clearLongPress, { passive: true });
      container.addEventListener('touchmove', clearLongPress, { passive: true });
      container.addEventListener('touchcancel', clearLongPress, { passive: true });
      send({ type: 'ready' });
    </script>
  </body>
</html>`;
}
