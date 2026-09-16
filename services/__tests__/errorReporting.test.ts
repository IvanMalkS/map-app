import {
  clearError,
  reportError,
  setupGlobalErrorHandlers,
  subscribeToErrors,
} from '../errorReporting';

describe('services/errorReporting', () => {
  afterEach(() => {
    clearError();
  });

  describe('reportError и подписка', () => {
    it('уведомляет подписчика о новой ошибке из объекта Error', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToErrors(listener);
      listener.mockClear();

      reportError(new Error('что-то сломалось'));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'что-то сломалось' })
      );
      unsubscribe();
    });

    it('преобразует не-Error значение в строковое сообщение', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToErrors(listener);
      listener.mockClear();

      reportError('строковая ошибка');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'строковая ошибка' })
      );
      unsubscribe();
    });

    it('сразу сообщает новому подписчику текущее состояние ошибки', () => {
      reportError(new Error('уже произошедшая ошибка'));

      const listener = jest.fn();
      subscribeToErrors(listener);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'уже произошедшая ошибка' })
      );
    });

    it('передаёт null новому подписчику, если ошибок нет', () => {
      const listener = jest.fn();
      subscribeToErrors(listener);

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('перестаёт уведомлять после отписки', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToErrors(listener);
      unsubscribe();
      listener.mockClear();

      reportError(new Error('после отписки'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('не показывает баннер для известной некритичной ошибки expo-notifications в Expo Go', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToErrors(listener);
      listener.mockClear();

      reportError(
        new Error(
          'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53.'
        )
      );

      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('clearError', () => {
    it('сбрасывает ошибку и уведомляет подписчиков значением null', () => {
      reportError(new Error('ошибка'));
      const listener = jest.fn();
      const unsubscribe = subscribeToErrors(listener);
      listener.mockClear();

      clearError();

      expect(listener).toHaveBeenCalledWith(null);
      unsubscribe();
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('устанавливает глобальный обработчик ErrorUtils только один раз', () => {
      const setGlobalHandler = jest.fn();
      const getGlobalHandler = jest.fn().mockReturnValue(jest.fn());
      (globalThis as any).ErrorUtils = { getGlobalHandler, setGlobalHandler };

      setupGlobalErrorHandlers();
      setupGlobalErrorHandlers();

      expect(setGlobalHandler).toHaveBeenCalledTimes(1);

      delete (globalThis as any).ErrorUtils;
    });
  });
});
