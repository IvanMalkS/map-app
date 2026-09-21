import React from 'react';
import { Platform } from 'react-native';
import AndroidOpenStreetMap from './AndroidOpenStreetMap';
import AppleMap from './AppleMap';
import type { MapProps } from './mapTypes';

/**
 * Общий менеджер карты: предоставляет единый интерфейс экрану приложения и
 * выбирает реализацию для текущей платформы.
 */
export default function Map(props: MapProps) {
  return Platform.OS === 'android' ? <AndroidOpenStreetMap {...props} /> : <AppleMap {...props} />;
}
