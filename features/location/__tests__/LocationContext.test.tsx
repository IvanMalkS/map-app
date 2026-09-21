import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { LocationProvider, useLocationContext } from '../LocationContext';
import { useDatabase } from '../../markers/data/DatabaseContext';
import {
  calculateDistance,
  requestLocationPermissions,
  startLocationUpdates,
} from '../location';
import { NotificationManager, requestNotificationPermissions } from '../../notifications/notifications';

jest.mock('../../markers/data/DatabaseContext', () => ({
  useDatabase: jest.fn(),
}));

jest.mock('../location', () => ({
  calculateDistance: jest.fn(),
  requestLocationPermissions: jest.fn(),
  startLocationUpdates: jest.fn(),
}));

jest.mock('../../notifications/notifications', () => {
  const showNotification = jest.fn().mockResolvedValue(undefined);
  const removeNotification = jest.fn().mockResolvedValue(undefined);
  const removeAll = jest.fn().mockResolvedValue(undefined);
  return {
    requestNotificationPermissions: jest.fn(),
    NotificationManager: jest.fn().mockImplementation(() => ({
      showNotification,
      removeNotification,
      removeAll,
    })),
  };
});

const markerNear = { id: 1, latitude: 10, longitude: 10, createdAt: 'now' };
const markerFar = { id: 2, latitude: 20, longitude: 20, createdAt: 'now' };

function Probe({ onReady }: { onReady: (value: ReturnType<typeof useLocationContext>) => void }) {
  const value = useLocationContext();
  onReady(value);
  return <Text>ready</Text>;
}

describe('contexts/LocationContext', () => {
  let subscription: { remove: jest.Mock };
  let onLocationCallback: ((location: any) => Promise<void> | void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    subscription = { remove: jest.fn() };
    onLocationCallback = undefined;

    (useDatabase as jest.Mock).mockReturnValue({
      getMarkers: jest.fn().mockResolvedValue([markerNear, markerFar]),
    });
    (requestLocationPermissions as jest.Mock).mockResolvedValue(undefined);
    (requestNotificationPermissions as jest.Mock).mockResolvedValue(undefined);
    (startLocationUpdates as jest.Mock).mockImplementation(async (onLocation: any) => {
      onLocationCallback = onLocation;
      return subscription;
    });
    (calculateDistance as jest.Mock).mockImplementation((lat1: number, lon1: number, lat2: number) =>
      lat2 === markerNear.latitude ? 50 : 500
    );
  });

  it('показывает уведомление для метки в радиусе и убирает для метки за пределами радиуса', async () => {
    let received: ReturnType<typeof useLocationContext> | undefined;

    await act(async () => {
      create(
        <LocationProvider>
          <Probe onReady={(value) => (received = value)} />
        </LocationProvider>
      );
    });

    await act(async () => {
      await onLocationCallback?.({ coords: { latitude: 10, longitude: 10 } });
    });

    const managerInstance = (NotificationManager as jest.Mock).mock.results[0].value;
    expect(managerInstance.showNotification).toHaveBeenCalledWith(markerNear);
    expect(managerInstance.removeNotification).toHaveBeenCalledWith(markerFar.id);
    expect(received!.location).toEqual({ coords: { latitude: 10, longitude: 10 } });
    expect(received!.errorMsg).toBeNull();
  });

  it('сохраняет сообщение об ошибке, если доступ к геолокации не предоставлен', async () => {
    (requestLocationPermissions as jest.Mock).mockRejectedValue(
      new Error('Доступ к местоположению не разрешён')
    );
    let received: ReturnType<typeof useLocationContext> | undefined;

    await act(async () => {
      create(
        <LocationProvider>
          <Probe onReady={(value) => (received = value)} />
        </LocationProvider>
      );
    });

    expect(received!.errorMsg).toBe('Доступ к местоположению не разрешён');
  });

  it('продолжает работу с местоположением, даже если в уведомлениях отказано', async () => {
    (requestNotificationPermissions as jest.Mock).mockRejectedValue(
      new Error('Доступ к уведомлениям не разрешён')
    );
    let received: ReturnType<typeof useLocationContext> | undefined;

    await act(async () => {
      create(
        <LocationProvider>
          <Probe onReady={(value) => (received = value)} />
        </LocationProvider>
      );
    });

    expect(startLocationUpdates).toHaveBeenCalled();
    expect(received!.errorMsg).toBeNull();
  });

  it('отписывается от геолокации и снимает все уведомления при размонтировании', async () => {
    let tree: ReturnType<typeof create> | undefined;

    await act(async () => {
      tree = create(
        <LocationProvider>
          <Probe onReady={() => {}} />
        </LocationProvider>
      );
    });

    const managerInstance = (NotificationManager as jest.Mock).mock.results[0].value;

    act(() => {
      tree!.unmount();
    });

    expect(subscription.remove).toHaveBeenCalled();
    expect(managerInstance.removeAll).toHaveBeenCalled();
  });
});
