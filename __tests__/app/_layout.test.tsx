import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';
import { setupGlobalErrorHandlers } from '../../services/errorReporting';

jest.mock('../../services/errorReporting', () => ({
  setupGlobalErrorHandlers: jest.fn(),
  reportError: jest.fn(),
  clearError: jest.fn(),
  subscribeToErrors: jest.fn(() => () => {}),
}));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('../../contexts/DatabaseContext', () => {
  const { View } = require('react-native');
  return {
    DatabaseProvider: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('../../contexts/LocationContext', () => {
  const { View } = require('react-native');
  return {
    LocationProvider: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Stack = ({ children }: any) => <View>{children}</View>;
  Stack.Screen = () => null;
  return { Stack };
});

describe('app/_layout (корневой layout)', () => {
  it('устанавливает глобальные обработчики ошибок при загрузке модуля', () => {
    expect(setupGlobalErrorHandlers).toHaveBeenCalled();
  });

  it('рендерится без ошибок вместе со всеми провайдерами', () => {
    expect(() => render(<RootLayout />)).not.toThrow();
  });
});
