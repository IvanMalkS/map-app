import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Marker, MarkerImage } from '../../../types';
import { markerImagesTable, markersTable } from './tables';

function toMarker(row: typeof markersTable.$inferSelect): Marker {
  return { id: row.id, latitude: row.latitude, longitude: row.longitude, createdAt: row.createdAt };
}

function toMarkerImage(row: typeof markerImagesTable.$inferSelect): MarkerImage {
  return { id: row.id, markerId: row.markerId, uri: row.uri, createdAt: row.createdAt };
}

export function getMarkers(sqlite: SQLiteDatabase): Marker[] {
  return drizzle(sqlite).select().from(markersTable).orderBy(desc(markersTable.createdAt)).all().map(toMarker);
}

export function getMarker(sqlite: SQLiteDatabase, id: number): Marker | null {
  const row = drizzle(sqlite).select().from(markersTable).where(eq(markersTable.id, id)).get();
  return row ? toMarker(row) : null;
}

export function addMarker(sqlite: SQLiteDatabase, latitude: number, longitude: number): number {
  return drizzle(sqlite).insert(markersTable).values({ latitude, longitude }).returning({ id: markersTable.id }).get().id;
}

export function deleteMarker(sqlite: SQLiteDatabase, id: number): void {
  const db = drizzle(sqlite);
  db.transaction((tx) => {
    tx.delete(markerImagesTable).where(eq(markerImagesTable.markerId, id)).run();
    tx.delete(markersTable).where(eq(markersTable.id, id)).run();
  });
}

export function getMarkerImages(sqlite: SQLiteDatabase, markerId: number): MarkerImage[] {
  return drizzle(sqlite).select().from(markerImagesTable).where(eq(markerImagesTable.markerId, markerId)).orderBy(desc(markerImagesTable.createdAt)).all().map(toMarkerImage);
}

export function addImage(sqlite: SQLiteDatabase, markerId: number, uri: string): number {
  try {
    return drizzle(sqlite).insert(markerImagesTable).values({ markerId, uri }).returning({ id: markerImagesTable.id }).get().id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('FOREIGN KEY constraint failed')) throw new Error(`Метка с id=${markerId} не существует`);
    throw error;
  }
}

export function deleteImage(sqlite: SQLiteDatabase, id: number): void {
  drizzle(sqlite).delete(markerImagesTable).where(eq(markerImagesTable.id, id)).run();
}
