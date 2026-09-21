import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Map from '../features/map/components/Map';
import MarkerList from '../features/markers/components/MarkerList';
import { useDatabase } from '../features/markers/data/DatabaseContext';
import { useLocationContext } from '../features/location/LocationContext';
import type { Marker } from '../types';

/**
 * Главный экран приложения: карта с сохранёнными метками и горизонтальным
 * списком быстрого доступа. Позволяет добавлять метки долгим нажатием
 * и переходить к деталям метки.
 */
export default function MapScreen() {
  const router = useRouter();
  const { getMarkers, addMarker } = useDatabase();
  const { errorMsg: locationError } = useLocationContext();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMarkers = useCallback(async () => {
    try {
      const data = await getMarkers();
      setMarkers(data);
      setLoadError(null);
    } catch (error) {
      setLoadError('Не удалось загрузить метки');
    }
  }, [getMarkers]);

  // Перезагружаем метки при каждом возврате на экран карты
  // (например, после добавления/удаления изображений на экране деталей).
  useFocusEffect(
    useCallback(() => {
      loadMarkers();
    }, [loadMarkers])
  );

  const handleLongPress = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        await addMarker(latitude, longitude);
        await loadMarkers();
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось добавить метку');
      }
    },
    [addMarker, loadMarkers]
  );

  const handleMarkerPress = useCallback(
    (markerId: number) => {
      try {
        router.push(`/marker/${markerId}`);
      } catch (error) {
        Alert.alert('Ошибка навигации', 'Не удалось открыть экран метки');
      }
    },
    [router]
  );

  const handleMapError = useCallback((message: string) => {
    Alert.alert('Ошибка карты', message);
  }, []);

  return (
    <View style={styles.container}>
      <Map
        markers={markers}
        onLongPress={handleLongPress}
        onMarkerPress={handleMarkerPress}
        onMapError={handleMapError}
      />
      <MarkerList markers={markers} onSelect={handleMarkerPress} />
      {(loadError || locationError) && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{loadError ?? locationError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#b00020',
    padding: 10,
  },
  bannerText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
  },
});
