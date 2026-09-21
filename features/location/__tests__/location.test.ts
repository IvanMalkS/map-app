const mockRequestForegroundPermissionsAsync = jest.fn();
const mockWatchPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestForegroundPermissionsAsync(...args),
  watchPositionAsync: (...args: unknown[]) => mockWatchPositionAsync(...args),
}));

import {
  DEFAULT_LOCATION_CONFIG,
  calculateDistance,
  requestLocationPermissions,
  startLocationUpdates,
} from '../location';

describe('services/location', () => {
  beforeEach(() => {
    mockRequestForegroundPermissionsAsync.mockReset();
    mockWatchPositionAsync.mockReset();
  });

  describe('requestLocationPermissions', () => {
    it('разрешается, когда доступ предоставлен', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });

      await expect(requestLocationPermissions()).resolves.toBeUndefined();
    });

    it('выбрасывает ошибку, когда в доступе отказано', async () => {
      mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await expect(requestLocationPermissions()).rejects.toThrow(
        'Доступ к местоположению не разрешён'
      );
    });
  });

  describe('startLocationUpdates', () => {
    it('подписывается с конфигурацией по умолчанию, если своя не передана', async () => {
      const subscription = { remove: jest.fn() };
      mockWatchPositionAsync.mockResolvedValue(subscription);
      const onLocation = jest.fn();

      const result = await startLocationUpdates(onLocation);

      expect(mockWatchPositionAsync).toHaveBeenCalledWith(
        DEFAULT_LOCATION_CONFIG,
        onLocation
      );
      expect(result).toBe(subscription);
    });

    it('подписывается с переданной пользовательской конфигурацией', async () => {
      mockWatchPositionAsync.mockResolvedValue({ remove: jest.fn() });
      const onLocation = jest.fn();
      const config = { accuracy: 1, timeInterval: 1000, distanceInterval: 1 };

      await startLocationUpdates(onLocation, config as any);

      expect(mockWatchPositionAsync).toHaveBeenCalledWith(config, onLocation);
    });
  });

  describe('calculateDistance (формула Хаверсина)', () => {
    it('возвращает 0 для одинаковых координат', () => {
      expect(calculateDistance(55.75, 37.6, 55.75, 37.6)).toBe(0);
    });

    it('совпадает с известным расстоянием Москва — Санкт-Петербург (~635 км)', () => {
      const distance = calculateDistance(55.7558, 37.6173, 59.9311, 30.3609);
      expect(distance).toBeGreaterThan(630000);
      expect(distance).toBeLessThan(640000);
    });

    it('возвращает небольшое расстояние для близких точек (~111 м на 0.001° широты)', () => {
      const distance = calculateDistance(55.7558, 37.6173, 55.7568, 37.6173);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });

    it('симметрична относительно порядка точек', () => {
      const a = calculateDistance(10, 20, 30, 40);
      const b = calculateDistance(30, 40, 10, 20);
      expect(a).toBeCloseTo(b, 6);
    });
  });
});
