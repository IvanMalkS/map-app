import React from 'react';
import { Alert } from 'react-native';
import { render, act, screen, fireEvent } from '@testing-library/react-native';
import MarkerDetailsScreen from '../../../app/marker/[id]';
import { useDatabase } from '../../../contexts/DatabaseContext';
import * as ImagePicker from 'expo-image-picker';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '1' }),
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
  useFocusEffect: (callback: () => void) => {
    (global as any).__focusEffectCallback = callback;
  },
}));

jest.mock('../../../contexts/DatabaseContext', () => ({
  useDatabase: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: {
    Current: 'current',
  },
}));

const marker = { id: 1, latitude: 10, longitude: 20, createdAt: '2026-01-01' };
const images = [{ id: 1, markerId: 1, uri: 'file://a.jpg', createdAt: 'a' }];

function runFocusEffect() {
  (global as any).__focusEffectCallback?.();
}

function pressAlertButton(alertSpy: jest.SpyInstance, buttonText: string) {
  const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const buttons = call[2] as Array<{ text: string; onPress?: () => void }>;
  const button = buttons.find((b) => b.text === buttonText);
  return button?.onPress?.();
}

describe('app/marker/[id] (экран деталей метки)', () => {
  let getMarker: jest.Mock;
  let getMarkerImages: jest.Mock;
  let addImage: jest.Mock;
  let deleteImage: jest.Mock;
  let deleteMarker: jest.Mock;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
    (global as any).__focusEffectCallback = undefined;

    getMarker = jest.fn().mockResolvedValue(marker);
    getMarkerImages = jest.fn().mockResolvedValue(images);
    addImage = jest.fn().mockResolvedValue(undefined);
    deleteImage = jest.fn().mockResolvedValue(undefined);
    deleteMarker = jest.fn().mockResolvedValue(undefined);

    (useDatabase as jest.Mock).mockReturnValue({
      getMarker,
      getMarkerImages,
      addImage,
      deleteImage,
      deleteMarker,
    });

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('показывает индикатор загрузки, а затем данные метки', async () => {
    render(<MarkerDetailsScreen />);

    await act(async () => {
      runFocusEffect();
    });

    expect(screen.getByText('Метка #1')).toBeTruthy();
    expect(screen.getByText(/10\.000000, 20\.000000/)).toBeTruthy();
  });

  it('показывает ошибку, если метка не найдена', async () => {
    getMarker.mockResolvedValue(null);
    render(<MarkerDetailsScreen />);

    await act(async () => {
      runFocusEffect();
    });

    expect(screen.getByText('Метка не найдена')).toBeTruthy();
  });

  it('показывает ошибку при сбое загрузки данных', async () => {
    getMarker.mockRejectedValue(new Error('сбой сети'));
    render(<MarkerDetailsScreen />);

    await act(async () => {
      runFocusEffect();
    });

    expect(screen.getByText('Не удалось загрузить данные метки')).toBeTruthy();
  });

  it('добавляет изображение после выбора из галереи', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://new.jpg' }],
    });

    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Добавить изображение'));
    });

    expect(addImage).toHaveBeenCalledWith(1, 'file://new.jpg');
    expect(getMarker).toHaveBeenCalledTimes(2);
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ['images'],
        quality: 1,
      })
    );
  });

  it('не добавляет изображение, если доступ к галерее не предоставлен', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    });

    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Добавить изображение'));
    });

    expect(addImage).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Нет доступа',
      'Разрешите доступ к галерее в настройках устройства'
    );
  });

  it('ничего не делает, если выбор изображения отменён', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true });

    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Добавить изображение'));
    });

    expect(addImage).not.toHaveBeenCalled();
  });

  it('показывает алерт, если выбор изображения выбросил ошибку', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockRejectedValue(
      new Error('boom')
    );

    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Добавить изображение'));
    });

    expect(alertSpy).toHaveBeenCalledWith('Ошибка', 'Не удалось выбрать изображение');
  });

  it('удаляет изображение после подтверждения в алерте', async () => {
    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    act(() => {
      fireEvent.press(screen.getByText('✕'));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Удалить изображение?',
      undefined,
      expect.any(Array)
    );

    await act(async () => {
      await pressAlertButton(alertSpy, 'Удалить');
    });

    expect(deleteImage).toHaveBeenCalledWith(1);
  });

  it('показывает алерт, если удаление изображения не удалось', async () => {
    deleteImage.mockRejectedValue(new Error('сбой удаления'));
    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    act(() => {
      fireEvent.press(screen.getByText('✕'));
    });

    await act(async () => {
      await pressAlertButton(alertSpy, 'Удалить');
    });

    expect(alertSpy).toHaveBeenCalledWith('Ошибка', 'Не удалось удалить изображение');
  });

  it('удаляет метку и возвращается назад после подтверждения', async () => {
    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    act(() => {
      fireEvent.press(screen.getByText('Удалить метку'));
    });

    await act(async () => {
      await pressAlertButton(alertSpy, 'Удалить');
    });

    expect(deleteMarker).toHaveBeenCalledWith(1);
    expect(mockBack).toHaveBeenCalled();
  });

  it('переходит на карту через replace, если некуда возвращаться', async () => {
    mockCanGoBack = false;
    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    act(() => {
      fireEvent.press(screen.getByText('Удалить метку'));
    });

    await act(async () => {
      await pressAlertButton(alertSpy, 'Удалить');
    });

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('показывает алерт, если удаление метки не удалось', async () => {
    deleteMarker.mockRejectedValue(new Error('сбой'));
    render(<MarkerDetailsScreen />);
    await act(async () => {
      runFocusEffect();
    });

    act(() => {
      fireEvent.press(screen.getByText('Удалить метку'));
    });

    await act(async () => {
      await pressAlertButton(alertSpy, 'Удалить');
    });

    expect(alertSpy).toHaveBeenCalledWith('Ошибка', 'Не удалось удалить метку');
  });
});
