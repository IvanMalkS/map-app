import * as Location from 'expo-location';
import type { LocationConfig } from '../types';

/** Конфигурация подписки на обновления геолокации, используемая по умолчанию. */
export const DEFAULT_LOCATION_CONFIG: LocationConfig = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5000,
  distanceInterval: 5,
};

/**
 * Запрашивает разрешение на доступ к геолокации переднего плана.
 * @throws {Error} если пользователь не предоставил доступ
 */
export async function requestLocationPermissions(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Доступ к местоположению не разрешён');
  }
}

/**
 * Подписывается на обновления геолокации устройства.
 * @param onLocation - вызывается при каждом новом местоположении
 * @returns подписку, которую нужно отменить (`.remove()`) при размонтировании
 */
export async function startLocationUpdates(
  onLocation: (location: Location.LocationObject) => void,
  config: LocationConfig = DEFAULT_LOCATION_CONFIG
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(config, onLocation);
}

const EARTH_RADIUS_METERS = 6371000;

/** Переводит градусы в радианы. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Формула Хаверсина: расстояние между двумя точками на сфере в метрах.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}
