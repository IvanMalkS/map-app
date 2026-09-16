import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker as MapMarker, LongPressEvent, Region } from 'react-native-maps';
import type { Marker } from '../types';

// react-native-maps не предоставляет событие onError, поэтому загрузку карты
// считаем неудачной, если onMapReady не сработал за отведённое время.
const MAP_READY_TIMEOUT_MS = 10000;

interface MapProps {
  markers: Marker[];
  initialRegion?: Region;
  onLongPress: (latitude: number, longitude: number) => void;
  onMarkerPress: (markerId: number) => void;
  onMapError?: (error: string) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 55.7558,
  longitude: 37.6173,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/**
 * Карта с сохранёнными метками. Долгое нажатие добавляет новую метку,
 * нажатие на маркер открывает его детали. Если карта не успевает
 * инициализироваться за {@link MAP_READY_TIMEOUT_MS}, вызывает `onMapError`.
 */
export default function Map({
  markers,
  initialRegion,
  onLongPress,
  onMarkerPress,
  onMapError,
}: MapProps) {
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!isReady) {
        onMapError?.('Не удалось загрузить карту');
      }
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
      <MapView
        style={styles.map}
        initialRegion={initialRegion ?? DEFAULT_REGION}
        onLongPress={handleLongPress}
        showsUserLocation
        showsMyLocationButton
        onMapReady={() => {
          setIsReady(true);
          clearTimeout(timeoutRef.current);
        }}
      >
        {markers.map((marker) => (
          <MapMarker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            onPress={() => onMarkerPress(marker.id)}
          />
        ))}
      </MapView>
      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>Долгое нажатие — добавить метку</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  hint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: {
    color: '#fff',
    fontSize: 13,
  },
});
