import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker as MapMarker, LongPressEvent } from 'react-native-maps';
import { DEFAULT_REGION, MAP_READY_TIMEOUT_MS } from './mapConstants';
import type { MapProps } from './mapTypes';

/** Native Apple Maps implementation used on iOS. */
export default function AppleMap({ markers, initialRegion, onLongPress, onMarkerPress, onMapError }: MapProps) {
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const region = initialRegion ?? DEFAULT_REGION;

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

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} onLongPress={handleLongPress} showsUserLocation showsMyLocationButton onMapReady={() => { setIsReady(true); clearTimeout(timeoutRef.current); }}>
        {markers.map((marker) => <MapMarker key={marker.id} coordinate={{ latitude: marker.latitude, longitude: marker.longitude }} onPress={() => onMarkerPress(marker.id)} />)}
      </MapView>
      <View style={styles.hint} pointerEvents="none"><Text style={styles.hintText}>Долгое нажатие — добавить метку</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, map: { flex: 1 },
  hint: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  hintText: { color: '#fff', fontSize: 13 },
});
