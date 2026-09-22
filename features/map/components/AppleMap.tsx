import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker as MapMarker, LongPressEvent, Region } from 'react-native-maps';
import { DEFAULT_REGION, MAP_READY_TIMEOUT_MS } from './mapConstants';
import type { MapProps } from './mapTypes';

/** Native Apple Maps implementation used on iOS. */
export default function AppleMap({ markers, initialRegion, onLongPress, onMarkerPress, onMapError }: MapProps) {
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const region = initialRegion ?? DEFAULT_REGION;
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(region);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!isReady) onMapError?.('Не удалось загрузить карту');
    }, MAP_READY_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLongPress = (event: LongPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onLongPress(latitude, longitude);
  };

  const changeZoom = (factor: number) => {
    const currentRegion = regionRef.current;
    const nextRegion = {
      ...currentRegion,
      latitudeDelta: Math.max(0.001, Math.min(180, currentRegion.latitudeDelta * factor)),
      longitudeDelta: Math.max(0.001, Math.min(360, currentRegion.longitudeDelta * factor)),
    };

    regionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 200);
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={region} onLongPress={handleLongPress} onRegionChangeComplete={(nextRegion) => { regionRef.current = nextRegion; }} showsUserLocation showsMyLocationButton onMapReady={() => { setIsReady(true); clearTimeout(timeoutRef.current); }}>
        {markers.map((marker) => <MapMarker key={marker.id} coordinate={{ latitude: marker.latitude, longitude: marker.longitude }} onPress={() => onMarkerPress(marker.id)} />)}
      </MapView>
      <View style={styles.zoomControls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Приблизить карту" style={styles.zoomButton} onPress={() => changeZoom(0.5)}>
          <Text style={styles.zoomButtonText}>+</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Отдалить карту" style={styles.zoomButton} onPress={() => changeZoom(2)}>
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
      </View>
      <View style={styles.hint} pointerEvents="none"><Text style={styles.hintText}>Долгое нажатие — добавить метку</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, map: { flex: 1 },
  zoomControls: { position: 'absolute', right: 16, top: 76, overflow: 'hidden', borderRadius: 10, backgroundColor: '#fff', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  zoomButton: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d1d5db' },
  zoomButtonText: { color: '#111827', fontSize: 28, fontWeight: '500', lineHeight: 32 },
  hint: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  hintText: { color: '#fff', fontSize: 13 },
});
