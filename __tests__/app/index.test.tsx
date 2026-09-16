import React from 'react';
import { Alert } from 'react-native';
import { render, act, screen } from '@testing-library/react-native';
import MapScreen from '../../app/index';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useLocationContext } from '../../contexts/LocationContext';

const mockPush = jest.fn();
let focusEffectCallback: (() => void | (() => void)) | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    focusEffectCallback = callback;
  },
}));

jest.mock('../../contexts/DatabaseContext', () => ({
  useDatabase: jest.fn(),
}));

jest.mock('../../contexts/LocationContext', () => ({
  useLocationContext: jest.fn(),
}));

jest.mock('../../components/Map', () => {
  const { View } = require('react-native');
  return function MockMap(props: any) {
    (global as any).__mapProps = props;
    return <View testID="map" />;
  };
});

jest.mock('../../components/MarkerList', () => {
  const { View } = require('react-native');
  return function MockMarkerList(props: any) {
    (global as any).__markerListProps = props;
    return <View testID="marker-list" />;
  };
});

const markers = [
  { id: 1, latitude: 10, longitude: 20, createdAt: 'a' },
  { id: 2, latitude: 30, longitude: 40, createdAt: 'b' },
];

describe('app/index (экран карты)', () => {
  let getMarkers: jest.Mock;
  let addMarker: jest.Mock;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    focusEffectCallback = undefined;
    getMarkers = jest.fn().mockResolvedValue(markers);
    addMarker = jest.fn().mockResolvedValue(3);
    (useDatabase as jest.Mock).mockReturnValue({ getMarkers, addMarker });
    (useLocationContext as jest.Mock).mockReturnValue({ errorMsg: null });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('загружает метки при получении фокуса экраном', async () => {
    render(<MapScreen />);

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(getMarkers).toHaveBeenCalled();
    expect((global as any).__markerListProps.markers).toEqual(markers);
  });

  it('показывает баннер ошибки, если загрузка меток не удалась', async () => {
    getMarkers.mockRejectedValue(new Error('нет соединения'));
    render(<MapScreen />);

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(screen.getByText('Не удалось загрузить метки')).toBeTruthy();
  });

  it('показывает баннер ошибки геолокации, если она есть', async () => {
    (useLocationContext as jest.Mock).mockReturnValue({ errorMsg: 'GPS недоступен' });
    render(<MapScreen />);

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(screen.getByText('GPS недоступен')).toBeTruthy();
  });

  it('добавляет метку по долгому нажатию и перезагружает список', async () => {
    render(<MapScreen />);
    await act(async () => {
      focusEffectCallback?.();
    });
    getMarkers.mockClear();

    await act(async () => {
      await (global as any).__mapProps.onLongPress(55.5, 37.5);
    });

    expect(addMarker).toHaveBeenCalledWith(55.5, 37.5);
    expect(getMarkers).toHaveBeenCalled();
  });

  it('показывает алерт, если добавление метки не удалось', async () => {
    addMarker.mockRejectedValue(new Error('сбой'));
    render(<MapScreen />);
    await act(async () => {
      focusEffectCallback?.();
    });

    await act(async () => {
      await (global as any).__mapProps.onLongPress(1, 2);
    });

    expect(alertSpy).toHaveBeenCalledWith('Ошибка', 'Не удалось добавить метку');
  });

  it('переходит на экран деталей метки при нажатии на маркер', async () => {
    render(<MapScreen />);
    await act(async () => {
      focusEffectCallback?.();
    });

    act(() => {
      (global as any).__mapProps.onMarkerPress(5);
    });

    expect(mockPush).toHaveBeenCalledWith('/marker/5');
  });

  it('показывает алерт при ошибке карты', async () => {
    render(<MapScreen />);
    await act(async () => {
      focusEffectCallback?.();
    });

    act(() => {
      (global as any).__mapProps.onMapError('карта не загрузилась');
    });

    expect(alertSpy).toHaveBeenCalledWith('Ошибка карты', 'карта не загрузилась');
  });
});
