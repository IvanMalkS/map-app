import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Text, View } from 'react-native';
import { DATABASE_NAME, migrateDbIfNeeded } from './schema';
import * as ops from './repository';
import type { Marker, MarkerImage } from '../../../types';

interface DatabaseContextType {
  addMarker: (latitude: number, longitude: number) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  getMarkers: () => Promise<Marker[]>;
  getMarker: (id: number) => Promise<Marker | null>;
  addImage: (markerId: number, uri: string) => Promise<void>;
  deleteImage: (id: number) => Promise<void>;
  getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;

  isLoading: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

// Внутренний провайдер, использующий уже открытое соединение из SQLiteProvider.
function DatabaseOperationsProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [error, setError] = useState<Error | null>(null);

  // Оборачивает операцию с БД, чтобы централизованно ловить и сохранять ошибки,
  // не прерывая работу остального приложения, и логировать операции в dev-режиме.
  const withErrorHandling = useCallback(
    async <T,>(operation: () => Promise<T>, fallback: T, label: string): Promise<T> => {
      try {
        const result = await operation();
        setError(null);
        if (__DEV__) {
          console.log(`[DatabaseContext] ${label} ok`);
        }
        return result;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        if (__DEV__) {
          console.error(`[DatabaseContext] ${label} failed:`, wrapped);
        }
        setError(wrapped);
        throw wrapped;
      }
    },
    []
  );

  const contextValue = useMemo<DatabaseContextType>(
    () => ({
      addMarker: (latitude, longitude) =>
        withErrorHandling(async () => ops.addMarker(db, latitude, longitude), -1, 'addMarker'),
      deleteMarker: (id) =>
        withErrorHandling(async () => ops.deleteMarker(db, id), undefined, 'deleteMarker'),
      getMarkers: () => withErrorHandling(async () => ops.getMarkers(db), [], 'getMarkers'),
      getMarker: (id) => withErrorHandling(async () => ops.getMarker(db, id), null, 'getMarker'),
      addImage: (markerId, uri) =>
        withErrorHandling(async () => {
          ops.addImage(db, markerId, uri);
        }, undefined, 'addImage'),
      deleteImage: (id) =>
        withErrorHandling(async () => ops.deleteImage(db, id), undefined, 'deleteImage'),
      getMarkerImages: (markerId) =>
        withErrorHandling(async () => ops.getMarkerImages(db, markerId), [], 'getMarkerImages'),
      isLoading: false,
      error,
    }),
    [db, error, withErrorHandling]
  );

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
}

/** Экран-заглушка, показываемый вместо приложения при ошибке инициализации БД. */
function DatabaseErrorFallback({ error }: { error: Error }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
        Не удалось открыть базу данных
      </Text>
      <Text style={{ color: '#666', textAlign: 'center' }}>{error.message}</Text>
    </View>
  );
}

/**
 * Открывает соединение с базой данных, применяет миграции и предоставляет
 * дочерним компонентам доступ к операциям над маркерами и изображениями
 * через {@link useDatabase}. При ошибке инициализации рендерит {@link DatabaseErrorFallback}.
 *
 * Очистка соединения при размонтировании: `SQLiteProvider` из `expo-sqlite`
 * сам вызывает `db.closeAsync()` в cleanup-функции своего `useEffect` при
 * размонтировании — вручную закрывать соединение здесь не нужно и опасно
 * (повторное закрытие уже закрытой БД).
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [initError, setInitError] = useState<Error | null>(null);

  if (initError) {
    return <DatabaseErrorFallback error={initError} />;
  }

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={migrateDbIfNeeded}
      onError={(error) => {
        if (__DEV__) {
          console.error('[DatabaseContext] init failed:', error);
        }
        setInitError(error);
      }}
    >
      <DatabaseOperationsProvider>{children}</DatabaseOperationsProvider>
    </SQLiteProvider>
  );
}

/**
 * Возвращает операции над базой данных (маркеры, изображения) и текущее
 * состояние ошибки. Должен вызываться внутри {@link DatabaseProvider}.
 * @throws {Error} если вызван вне DatabaseProvider
 */
export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
