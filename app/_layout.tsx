import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBanner } from '../components/ErrorBanner';
import { GlobalErrorBoundary } from '../components/GlobalErrorBoundary';
import { DatabaseProvider } from '../contexts/DatabaseContext';
import { LocationProvider } from '../contexts/LocationContext';
import { setupGlobalErrorHandlers } from '../services/errorReporting';

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
