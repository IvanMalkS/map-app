import type { Region } from 'react-native-maps';

export const MAP_READY_TIMEOUT_MS = 10000;

export const DEFAULT_REGION: Region = {
  latitude: 55.7558,
  longitude: 37.6173,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
