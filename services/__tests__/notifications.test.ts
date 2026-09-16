const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: (...args: unknown[]) => mockSetNotificationHandler(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  setNotificationChannelAsync: (...args: unknown[]) =>
    mockSetNotificationChannelAsync(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) =>
    mockCancelScheduledNotificationAsync(...args),
}));

describe('services/notifications', () => {
  const originalOS = require('react-native').Platform.OS;

  afterEach(() => {
    require('react-native').Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  it('не обращается к expo-notifications сразу при загрузке модуля (ленивая загрузка)', () => {
    jest.isolateModules(() => {
      require('../notifications');
    });
    expect(mockSetNotificationHandler).not.toHaveBeenCalled();
  });

  it('регистрирует обработчик уведомлений при первом реальном использовании API', async () => {
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const { requestNotificationPermissions } = require('../notifications');

    await requestNotificationPermissions();

    expect(mockSetNotificationHandler).toHaveBeenCalled();
  });

  describe('requestNotificationPermissions', () => {
    it('разрешается и настраивает канал на Android при выданном разрешении', async () => {
      require('react-native').Platform.OS = 'android';
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      const { requestNotificationPermissions } = require('../notifications');

      await requestNotificationPermissions();

      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
        'proximity',
        expect.objectContaining({ name: expect.any(String) })
      );
    });

    it('не настраивает канал на iOS', async () => {
      require('react-native').Platform.OS = 'ios';
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      const { requestNotificationPermissions } = require('../notifications');

      await requestNotificationPermissions();

      expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('выбрасывает ошибку, когда в разрешении отказано', async () => {
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      const { requestNotificationPermissions } = require('../notifications');

      await expect(requestNotificationPermissions()).rejects.toThrow(
        'Доступ к уведомлениям не разрешён'
      );
    });
  });

  describe('NotificationManager', () => {
    const marker = { id: 1, latitude: 1, longitude: 2, createdAt: 'now' };

    it('неактивен для неизвестной метки', () => {
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();
      expect(manager.isActive(1)).toBe(false);
    });

    it('показывает уведомление и отмечает метку как активную', async () => {
      mockScheduleNotificationAsync.mockResolvedValue('notif-1');
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();

      await manager.showNotification(marker);

      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(manager.isActive(1)).toBe(true);
    });

    it('не дублирует уведомление для одной и той же метки', async () => {
      mockScheduleNotificationAsync.mockResolvedValue('notif-1');
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();

      await manager.showNotification(marker);
      await manager.showNotification(marker);

      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('не выбрасывает исключение при ошибке планирования уведомления', async () => {
      mockScheduleNotificationAsync.mockRejectedValue(new Error('boom'));
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();

      await expect(manager.showNotification(marker)).resolves.toBeUndefined();
      expect(manager.isActive(1)).toBe(false);
    });

    it('удаляет активное уведомление и отменяет его', async () => {
      mockScheduleNotificationAsync.mockResolvedValue('notif-1');
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();
      await manager.showNotification(marker);

      await manager.removeNotification(1);

      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
      expect(manager.isActive(1)).toBe(false);
    });

    it('ничего не делает при удалении метки без активного уведомления', async () => {
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();

      await manager.removeNotification(999);

      expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });

    it('забывает метку, даже если отмена уведомления завершилась ошибкой', async () => {
      mockScheduleNotificationAsync.mockResolvedValue('notif-1');
      mockCancelScheduledNotificationAsync.mockRejectedValue(new Error('cancel failed'));
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();
      await manager.showNotification(marker);

      await manager.removeNotification(1);

      expect(manager.isActive(1)).toBe(false);
    });

    it('removeAll отменяет все активные уведомления', async () => {
      mockScheduleNotificationAsync
        .mockResolvedValueOnce('notif-1')
        .mockResolvedValueOnce('notif-2');
      const { NotificationManager } = require('../notifications');
      const manager = new NotificationManager();
      await manager.showNotification(marker);
      await manager.showNotification({ ...marker, id: 2 });

      await manager.removeAll();

      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(manager.isActive(1)).toBe(false);
      expect(manager.isActive(2)).toBe(false);
    });
  });
});
