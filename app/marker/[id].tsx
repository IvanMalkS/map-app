import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import ImageList from '../../components/ImageList';
import { useDatabase } from '../../contexts/DatabaseContext';
import type { Marker, MarkerDetailsParams, MarkerImage } from '../../types';

/**
 * Экран деталей метки: координаты, дата создания, привязанные изображения
 * с возможностью добавления/удаления, а также удаление самой метки.
 */
export default function MarkerDetailsScreen() {
  const { id } = useLocalSearchParams<MarkerDetailsParams>();
  const markerId = Number(id);
  const router = useRouter();
  const { getMarker, getMarkerImages, addImage, deleteImage, deleteMarker } =
    useDatabase();

  const [marker, setMarker] = useState<Marker | null>(null);
  const [images, setImages] = useState<MarkerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(markerId)) {
      setError('Некорректный идентификатор метки');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [markerData, imageData] = await Promise.all([
        getMarker(markerId),
        getMarkerImages(markerId),
      ]);

      if (!markerData) {
        setError('Метка не найдена');
      } else {
        setMarker(markerData);
        setImages(imageData);
        setError(null);
      }
    } catch (err) {
      setError('Не удалось загрузить данные метки');
    } finally {
      setIsLoading(false);
    }
  }, [markerId, getMarker, getMarkerImages]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAddImage = useCallback(async () => {
    // Не запускаем второй системный picker, пока первый ещё открыт или
    // обрабатывает выбранный файл.
    if (isPickingImage) {
      return;
    }

    try {
      setIsPickingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках устройства');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        // На iOS это позволяет PHPicker вернуть исходный файл без медленной
        // перекодировки изображения. В частности, так не подвисает системный
        // picker в симуляторе после выбора фото.
        quality: 1,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      });

      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.uri) {
        return;
      }

      await addImage(markerId, asset.uri);
      await load();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    } finally {
      setIsPickingImage(false);
    }
  }, [isPickingImage, markerId, addImage, load]);

  const handleDeleteImage = useCallback(
    (imageId: number) => {
      Alert.alert('Удалить изображение?', undefined, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteImage(imageId);
              await load();
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось удалить изображение');
            }
          },
        },
      ]);
    },
    [deleteImage, load]
  );

  const handleDeleteMarker = useCallback(() => {
    Alert.alert('Удалить метку?', 'Все связанные изображения также будут удалены', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMarker(markerId);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить метку');
          }
        },
      },
    ]);
  }, [deleteMarker, markerId, router]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !marker) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Метка не найдена'}</Text>
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <Text style={styles.secondaryButtonText}>Назад к карте</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBlock}>
        <Text style={styles.title}>Метка #{marker.id}</Text>
        <Text style={styles.coords}>
          {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
        </Text>
        <Text style={styles.createdAt}>Создана: {marker.createdAt}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, isPickingImage && styles.buttonDisabled]}
          onPress={handleAddImage}
          disabled={isPickingImage}
        >
          <Text style={styles.buttonText}>
            {isPickingImage ? 'Открываем галерею…' : 'Добавить изображение'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.dangerButton]}
          onPress={handleDeleteMarker}
        >
          <Text style={styles.buttonText}>Удалить метку</Text>
        </Pressable>
      </View>

      <ImageList images={images} onDelete={handleDeleteImage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  infoBlock: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  coords: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  createdAt: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#2f6feb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#b00020',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: '#e5e5e5',
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    color: '#b00020',
    textAlign: 'center',
  },
});
