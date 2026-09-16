import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ImageList from '../ImageList';

describe('components/ImageList', () => {
  it('показывает заглушку, если изображений нет', () => {
    render(<ImageList images={[]} onDelete={jest.fn()} />);

    expect(screen.getByText('Изображений пока нет')).toBeTruthy();
  });

  it('рендерит изображение для каждой записи', () => {
    const images = [
      { id: 1, markerId: 1, uri: 'file://a.jpg', createdAt: 'a' },
      { id: 2, markerId: 1, uri: 'file://b.jpg', createdAt: 'b' },
    ];
    render(<ImageList images={images} onDelete={jest.fn()} />);

    expect(screen.queryByText('Изображений пока нет')).toBeNull();
    expect(screen.getAllByText('✕')).toHaveLength(2);
  });

  it('вызывает onDelete с id изображения при нажатии на крестик', () => {
    const images = [{ id: 7, markerId: 1, uri: 'file://a.jpg', createdAt: 'a' }];
    const onDelete = jest.fn();
    render(<ImageList images={images} onDelete={onDelete} />);

    fireEvent.press(screen.getByText('✕'));

    expect(onDelete).toHaveBeenCalledWith(7);
  });
});
