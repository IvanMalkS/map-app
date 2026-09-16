import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError, clearError, subscribeToErrors } from '../services/errorReporting';

/**
 * Плавающий баннер, который появляется поверх приложения при любой
 * необработанной ошибке (JS-исключение, отклонённый промис) и позволяет
 * его закрыть. Подписывается на {@link subscribeToErrors}.
 */
export function ErrorBanner() {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => subscribeToErrors(setError), []);

  if (!error) return null;

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.banner}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.message} numberOfLines={3}>
            {error.message}
          </Text>
        </View>
        <Pressable onPress={clearError} hitSlop={8} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  message: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
