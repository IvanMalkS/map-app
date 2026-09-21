import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBanner } from '../features/shared/components/ErrorBanner';
import { GlobalErrorBoundary } from '../features/shared/components/GlobalErrorBoundary';
import { DatabaseProvider } from '../features/markers/data/DatabaseContext';
import { LocationProvider } from '../features/location/LocationContext';
import { setupGlobalErrorHandlers } from '../features/shared/services/errorReporting';

// Перехватывает необработанные JS-исключения и отклонённые промисы за
// пределами дерева React — устанавливается один раз при загрузке модуля.
setupGlobalErrorHandlers();

/**
 * Корневой layout приложения: оборачивает навигационный стек провайдерами
 * базы данных и геолокации/уведомлений, глобальным перехватчиком ошибок
 * рендера и объявляет экраны маршрутизатора.
 */
export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <DatabaseProvider>
        <LocationProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerTitleAlign: 'center' }}>
            <Stack.Screen name="index" options={{ title: 'Карта' }} />
            <Stack.Screen
              name="marker/[id]"
              options={{ title: 'Метка' }}
            />
          </Stack>
          <ErrorBanner />
        </LocationProvider>
      </DatabaseProvider>
    </GlobalErrorBoundary>
  );
}
