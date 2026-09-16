import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { ErrorBanner } from '../ErrorBanner';
import { clearError, reportError } from '../../services/errorReporting';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

describe('components/ErrorBanner', () => {
  afterEach(() => {
    act(() => {
      clearError();
    });
  });

  it('ничего не рендерит, если ошибки нет', () => {
    const { toJSON } = render(<ErrorBanner />);

    expect(toJSON()).toBeNull();
  });

  it('показывает сообщение об ошибке после reportError', () => {
    render(<ErrorBanner />);

    act(() => {
      reportError(new Error('сеть недоступна'));
    });

    expect(screen.getByText('сеть недоступна')).toBeTruthy();
    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();
  });

  it('скрывает баннер после нажатия на кнопку закрытия', () => {
    render(<ErrorBanner />);

    act(() => {
      reportError(new Error('ошибка загрузки'));
    });
    expect(screen.getByText('ошибка загрузки')).toBeTruthy();

    fireEvent.press(screen.getByText('✕'));

    expect(screen.queryByText('ошибка загрузки')).toBeNull();
  });
});
