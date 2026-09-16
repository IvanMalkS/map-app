import type * as Location from 'expo-location';

/** Данные маркера, хранящиеся в базе данных. */
export interface Marker {
  id: number;
  latitude: number;
  longitude: number;
  createdAt: string;
}

/** Данные изображения, привязанного к маркеру. */
export interface MarkerImage {
  id: number;
  markerId: number;
  uri: string;
  createdAt: string;
}

/** Параметры маршрута экрана деталей маркера (app/marker/[id].tsx). */
export type MarkerDetailsParams = {
  id: string;
};

/** Активное уведомление о приближении к метке. */
export interface ActiveNotification {
  markerId: number;
  notificationId: string;
  timestamp: number;
}

/** Параметры подписки на обновления геолокации (см. services/location.ts). */
export interface LocationConfig {
  accuracy: Location.Accuracy;
  /** Как часто обновлять местоположение, мс. */
  timeInterval: number;
  /** Минимальное расстояние между обновлениями, метры. */
  distanceInterval: number;
}

/** Состояние геолокации, предоставляемое LocationContext. */
export interface LocationState {
  location: Location.LocationObject | null;
  errorMsg: string | null;
}
