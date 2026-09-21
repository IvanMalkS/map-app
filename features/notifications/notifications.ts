import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ActiveNotification, Marker } from '../../types';
import type * as NotificationsModule from 'expo-notifications';

type NotificationsApi = typeof NotificationsModule;

function isUnsupportedEnvironment(): boolean {
  return Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

let notificationsApi: NotificationsApi | null | undefined;

function getNotificationsApi(): NotificationsApi | null {
  if (isUnsupportedEnvironment()) return null;
  if (notificationsApi !== undefined) {
    return notificationsApi;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: NotificationsApi = require('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationsApi = mod;
  } catch (error) {
    if (__DEV__) {
      console.warn('[notifications] expo-notifications недоступен в этом окружении:', error);
    }
    notificationsApi = null;
  }

  return notificationsApi;
}

/**
 * Запрашивает разрешение на показ уведомлений и настраивает канал
 * уведомлений о приближении к меткам на Android.
 * @throws {Error} если пользователь не предоставил доступ или уведомления
 *   недоступны в текущем окружении (например, Expo Go на Android)
 */
export async function requestNotificationPermissions(): Promise<void> {
  if (isUnsupportedEnvironment()) return;
  const Notifications = getNotificationsApi();
  if (!Notifications) {
    throw new Error('Уведомления недоступны в этом окружении');
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Доступ к уведомлениям не разрешён');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('proximity', {
      name: 'Приближение к меткам',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/**
 * Отслеживает уже показанные уведомления по markerId, чтобы не дублировать их,
 * пока пользователь остаётся в радиусе метки.
 */
export class NotificationManager {
  private activeNotifications: Map<number, ActiveNotification> = new Map();

  /** Показано ли сейчас уведомление о приближении к указанной метке. */
  isActive(markerId: number): boolean {
    return this.activeNotifications.has(markerId);
  }

  /**
   * Показывает уведомление о приближении к метке, если оно ещё не показано.
   * @param marker - метка, к которой приблизился пользователь
   */
  async showNotification(marker: Marker): Promise<void> {
    if (this.activeNotifications.has(marker.id)) {
      return;
    }

    const Notifications = getNotificationsApi();
    if (!Notifications) {
      return;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Вы рядом с меткой!',
          body: `Вы находитесь рядом с сохранённой точкой (#${marker.id}).`,
        },
        trigger: null,
      });

      this.activeNotifications.set(marker.id, {
        markerId: marker.id,
        notificationId,
        timestamp: Date.now(),
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[NotificationManager] failed to show notification:', error);
      }
    }
  }

  /**
   * Отменяет и убирает из отслеживания уведомление для указанной метки,
   * если оно активно.
   * @param markerId - идентификатор метки
   */
  async removeNotification(markerId: number): Promise<void> {
    const notification = this.activeNotifications.get(markerId);
    if (!notification) {
      return;
    }

    try {
      const Notifications = getNotificationsApi();
      if (Notifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[NotificationManager] failed to cancel notification:', error);
      }
    } finally {
      this.activeNotifications.delete(markerId);
    }
  }

  /** Отменяет все активные уведомления, отслеживаемые менеджером. */
  async removeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.activeNotifications.keys()).map((markerId) =>
        this.removeNotification(markerId)
      )
    );
  }
}
