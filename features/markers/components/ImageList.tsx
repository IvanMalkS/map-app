import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MarkerImage } from '../../../types';

interface ImageListProps {
  images: MarkerImage[];
  onDelete: (imageId: number) => void;
}

/**
 * Сетка изображений, привязанных к метке, с возможностью удаления
 * каждого изображения. Показывает заглушку, если изображений нет.
 */
export default function ImageList({ images, onDelete }: ImageListProps) {
  if (images.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Изображений пока нет</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => String(item.id)}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
          <Pressable
            style={styles.deleteButton}
            onPress={() => onDelete(item.id)}
            hitSlop={8}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },
  row: {
    gap: 8,
  },
  imageWrapper: {
    flex: 1,
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
  },
});
