import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import { reportError } from '../../services/errorReporting';

jest.mock('../../services/errorReporting', () => ({
  reportError: jest.fn(),
}));

function Bomb(): React.ReactElement {
  throw new Error('сбой рендера');
}

describe('components/GlobalErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('рендерит детей, если ошибок не было', () => {
    render(
      <GlobalErrorBoundary>
        <Text>всё хорошо</Text>
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('всё хорошо')).toBeTruthy();
  });

  it('перехватывает ошибку рендера, показывает заглушку и сообщает о ней', () => {
    render(
      <GlobalErrorBoundary>
        <Bomb />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();
    expect(screen.getByText('сбой рендера')).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'сбой рендера' }));
  });

  it('возвращается к дереву детей после нажатия «Повторить»', () => {
    let shouldThrow = true;
    function Sometimes() {
      if (shouldThrow) throw new Error('временная ошибка');
      return <Text>восстановлено</Text>;
    }

    render(
      <GlobalErrorBoundary>
        <Sometimes />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(screen.getByText('Повторить'));

    expect(screen.getByText('восстановлено')).toBeTruthy();
  });
});
