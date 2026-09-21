import type { Region } from 'react-native-maps';
import type { Marker } from '../../../types';

export interface MapProps {
  markers: Marker[];
  initialRegion?: Region;
  onLongPress: (latitude: number, longitude: number) => void;
  onMarkerPress: (markerId: number) => void;
  onMapError?: (error: string) => void;
}
