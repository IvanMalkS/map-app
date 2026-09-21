import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import MarkerList from '../MarkerList';

describe('components/MarkerList', () => {
  it('ничего не рендерит, если список меток пуст', () => {
    const { toJSON } = render(<MarkerList markers={[]} onSelect={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it('рендерит по чипу с координатами для каждой метки', () => {
    const markers = [
      { id: 1, latitude: 55.7558, longitude: 37.6173, createdAt: 'a' },
      { id: 2, latitude: 10, longitude: 20, createdAt: 'b' },
    ];
    render(<MarkerList markers={markers} onSelect={jest.fn()} />);

    expect(screen.getByText('Метка #1')).toBeTruthy();
    expect(screen.getByText('Метка #2')).toBeTruthy();
    expect(screen.getByText('55.7558, 37.6173')).toBeTruthy();
  });

  it('вызывает onSelect с id метки при нажатии на чип', () => {
    const markers = [{ id: 42, latitude: 1, longitude: 2, createdAt: 'a' }];
    const onSelect = jest.fn();
    render(<MarkerList markers={markers} onSelect={onSelect} />);

    fireEvent.press(screen.getByText('Метка #42'));

    expect(onSelect).toHaveBeenCalledWith(42);
  });
});
