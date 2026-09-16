import React from 'react';
import { render, act, screen } from '@testing-library/react-native';
import Map from '../Map';

let mockCapturedMapViewProps: any;
let mockCapturedMarkerProps: any[];

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');

  const MockMapView = (props: any) => {
    mockCapturedMapViewProps = props;
    return <View testID="mock-map-view">{props.children}</View>;
  };
  const MockMarker = (props: any) => {
    mockCapturedMarkerProps.push(props);
    return <View testID="mock-marker" />;
  };

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
  };
});

describe('components/Map', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCapturedMapViewProps = undefined;
    mockCapturedMarkerProps = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const markers = [
    { id: 1, latitude: 10, longitude: 20, createdAt: 'a' },
    { id: 2, latitude: 30, longitude: 40, createdAt: 'b' },
  ];

  it('рендерит по маркеру карты для каждой метки', () => {
    render(
      <Map markers={markers} onLongPress={jest.fn()} onMarkerPress={jest.fn()} />
    );

    expect(mockCapturedMarkerProps).toHaveLength(2);
    expect(mockCapturedMarkerProps[0].coordinate).toEqual({ latitude: 10, longitude: 20 });
  });

  it('вызывает onLongPress с координатами долгого нажатия', () => {
    const onLongPress = jest.fn();
    render(<Map markers={[]} onLongPress={onLongPress} onMarkerPress={jest.fn()} />);

    act(() => {
      mockCapturedMapViewProps.onLongPress({
        nativeEvent: { coordinate: { latitude: 1.5, longitude: 2.5 } },
      });
    });

    expect(onLongPress).toHaveBeenCalledWith(1.5, 2.5);
  });

  it('вызывает onMarkerPress с id метки при нажатии на маркер', () => {
    const onMarkerPress = jest.fn();
    render(<Map markers={markers} onLongPress={jest.fn()} onMarkerPress={onMarkerPress} />);

    act(() => {
      mockCapturedMarkerProps[1].onPress();
    });

    expect(onMarkerPress).toHaveBeenCalledWith(2);
  });

  it('вызывает onMapError, если onMapReady не сработал за отведённое время', () => {
    const onMapError = jest.fn();
    render(
      <Map markers={[]} onLongPress={jest.fn()} onMarkerPress={jest.fn()} onMapError={onMapError} />
    );

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onMapError).toHaveBeenCalledWith('Не удалось загрузить карту');
  });

  it('не вызывает onMapError, если карта успела сообщить о готовности', () => {
    const onMapError = jest.fn();
    render(
      <Map markers={[]} onLongPress={jest.fn()} onMarkerPress={jest.fn()} onMapError={onMapError} />
    );

    act(() => {
      mockCapturedMapViewProps.onMapReady();
    });
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onMapError).not.toHaveBeenCalled();
  });

  it('показывает подсказку про долгое нажатие', () => {
    render(<Map markers={[]} onLongPress={jest.fn()} onMarkerPress={jest.fn()} />);

    expect(screen.getByText('Долгое нажатие — добавить метку')).toBeTruthy();
  });
});
