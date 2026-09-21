import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  calculateDistance,
  requestLocationPermissions,
  startLocationUpdates,
} from './location';
import {
  NotificationManager,
  requestNotificationPermissions,
} from '../notifications/notifications';
import { useDatabase } from '../markers/data/DatabaseContext';
import type { LocationState } from '../../types';

const PROXIMITY_THRESHOLD_METERS = 100;

type LocationContextType = LocationState;

const LocationContext = createContext<LocationContextType>({
  location: null,
  errorMsg: null,
});

/**
 * Отслеживает текущее местоположение пользователя и автоматически
 * показывает/скрывает уведомления о приближении к сохранённым меткам
 * в радиусе {@link PROXIMITY_THRESHOLD_METERS}. Предоставляет местоположение
 * и текст ошибки через {@link useLocationContext}.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { getMarkers } = useDatabase();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const notificationManagerRef = useRef(new NotificationManager());

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    let isMounted = true;

    const setup = async () => {
      try {
        await requestLocationPermissions();

        try {
          await requestNotificationPermissions();
        } catch (notificationError) {
          // Уведомления не критичны для базовой работы карты — продолжаем без них.
          if (__DEV__) {
            console.warn('[LocationProvider] notifications unavailable:', notificationError);
          }
        }

        subscription = await startLocationUpdates(async (nextLocation) => {
          if (!isMounted) return;
          setLocation(nextLocation);
          setErrorMsg(null);

          try {
            const markers = await getMarkers();
            const manager = notificationManagerRef.current;

            for (const marker of markers) {
              const distance = calculateDistance(
                nextLocation.coords.latitude,
                nextLocation.coords.longitude,
                marker.latitude,
                marker.longitude
              );

              if (distance <= PROXIMITY_THRESHOLD_METERS) {
                await manager.showNotification(marker);
              } else {
                await manager.removeNotification(marker.id);
              }
            }
          } catch (proximityError) {
            if (__DEV__) {
              console.error('[LocationProvider] proximity check failed:', proximityError);
            }
          }
        });
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Ошибка геолокации';
        setErrorMsg(message);
      }
    };

    setup();

    return () => {
      isMounted = false;
      subscription?.remove();
      notificationManagerRef.current.removeAll();
    };
  }, [getMarkers]);

  return (
    <LocationContext.Provider value={{ location, errorMsg }}>
      {children}
    </LocationContext.Provider>
  );
}

/** Возвращает текущее местоположение пользователя и текст ошибки геолокации, если она есть. */
export function useLocationContext(): LocationContextType {
  return useContext(LocationContext);
}
