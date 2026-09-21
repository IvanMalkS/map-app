import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { DEFAULT_REGION, MAP_READY_TIMEOUT_MS } from './mapConstants';
import type { MapProps } from './mapTypes';
import { getOpenStreetMapHtml } from './openStreetMapHtml';

/** Leaflet and OpenStreetMap implementation used on Android. */
export default function AndroidOpenStreetMap({ markers, initialRegion, onLongPress, onMarkerPress, onMapError }: MapProps) {
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const webViewRef = useRef<WebView>(null);
  const region = initialRegion ?? DEFAULT_REGION;

  useEffect(() => {
    timeoutRef.current = setTimeout(() => { if (!isReady) onMapError?.('Не удалось загрузить карту'); }, MAP_READY_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isReady) webViewRef.current?.injectJavaScript(`window.setMapMarkers(${JSON.stringify(markers)}); true;`);
  }, [isReady, markers]);

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (!message || typeof message !== 'object') return;
      const data = message as Record<string, unknown>;
      if (data.type === 'ready') {
        setIsReady(true);
        clearTimeout(timeoutRef.current);
        webViewRef.current?.injectJavaScript('requestAnimationFrame(() => requestAnimationFrame(() => window.invalidateMap())); true;');
      } else if (data.type === 'long-press' && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        onLongPress(data.latitude, data.longitude);
      } else if (data.type === 'marker-press' && typeof data.id === 'number') {
        onMarkerPress(data.id);
      }
    } catch {
      // Messages from the embedded map are ignored when malformed.
    }
  };

  return (
    <View style={styles.container}>
      <WebView ref={webViewRef} style={styles.map} originWhitelist={['*']} source={{ html: getOpenStreetMapHtml(region) }} onMessage={handleWebViewMessage} onError={() => onMapError?.('Не удалось загрузить карту')} />
      <View style={styles.hint} pointerEvents="none"><Text style={styles.hintText}>Долгое нажатие — добавить метку</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, map: { flex: 1 },
  hint: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  hintText: { color: '#fff', fontSize: 13 },
});
