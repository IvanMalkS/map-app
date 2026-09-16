import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Marker } from '../types';

interface MarkerListProps {
  markers: Marker[];
  onSelect: (markerId: number) => void;
}

/**
 * Горизонтальный список сохранённых меток поверх карты — быстрый доступ
 * к деталям метки без необходимости искать её на карте.
 */
export default function MarkerList({ markers, onSelect }: MarkerListProps) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <FlatList
        horizontal
        data={markers}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.chip} onPress={() => onSelect(item.id)}>
            <Text style={styles.chipTitle}>Метка #{item.id}</Text>
            <Text style={styles.chipSubtitle}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
  },
  list: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chipTitle: {
    fontWeight: '600',
    fontSize: 13,
  },
  chipSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});
