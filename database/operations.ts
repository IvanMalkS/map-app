import { type SQLiteDatabase } from 'expo-sqlite';
import type { Marker, MarkerImage } from '../types';

interface MarkerRow {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface MarkerImageRow {
  id: number;
  marker_id: number;
  uri: string;
  created_at: string;
}

/** Преобразует строку таблицы `markers` (snake_case) в доменный тип {@link Marker}. */
function mapMarker(row: MarkerRow): Marker {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };
}

/** Преобразует строку таблицы `marker_images` (snake_case) в доменный тип {@link MarkerImage}. */
function mapMarkerImage(row: MarkerImageRow): MarkerImage {
  return {
    id: row.id,
    markerId: row.marker_id,
    uri: row.uri,
    createdAt: row.created_at,
  };
}

/**
 * Возвращает все маркеры, отсортированные от новых к старым.
 * @param db - открытое соединение с базой данных
 */
export async function getMarkers(db: SQLiteDatabase): Promise<Marker[]> {
  const rows = await db.getAllAsync<MarkerRow>(
    'SELECT * FROM markers ORDER BY created_at DESC'
  );
  return rows.map(mapMarker);
}

/**
 * Возвращает маркер по идентификатору или `null`, если он не найден.
 * @param db - открытое соединение с базой данных
 * @param id - идентификатор маркера
 */
export async function getMarker(
  db: SQLiteDatabase,
  id: number
): Promise<Marker | null> {
  const row = await db.getFirstAsync<MarkerRow>(
    'SELECT * FROM markers WHERE id = ?',
    [id]
  );
  return row ? mapMarker(row) : null;
}

/**
 * Создаёт новый маркер с указанными координатами.
 * @param db - открытое соединение с базой данных
 * @param latitude - широта
 * @param longitude - долгота
 * @returns идентификатор созданного маркера
 */
export async function addMarker(
  db: SQLiteDatabase,
  latitude: number,
  longitude: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO markers (latitude, longitude) VALUES (?, ?)',
    [latitude, longitude]
  );
  return result.lastInsertRowId;
}

/**
 * Удаляет маркер по идентификатору вместе со всеми его изображениями.
 * Операция затрагивает две таблицы, поэтому выполняется в транзакции:
 * если удаление изображений не удастся, удаление маркера будет отменено
 * (откат транзакции), и наоборот. `ON DELETE CASCADE` в схеме служит
 * дополнительной защитой на уровне БД, а не заменяет транзакцию.
 * @param db - открытое соединение с базой данных
 * @param id - идентификатор маркера
 */
export async function deleteMarker(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM marker_images WHERE marker_id = ?', [id]);
    await db.runAsync('DELETE FROM markers WHERE id = ?', [id]);
  });
}

/**
 * Возвращает все изображения, привязанные к маркеру, от новых к старым.
 * @param db - открытое соединение с базой данных
 * @param markerId - идентификатор маркера
 */
export async function getMarkerImages(
  db: SQLiteDatabase,
  markerId: number
): Promise<MarkerImage[]> {
  const rows = await db.getAllAsync<MarkerImageRow>(
    'SELECT * FROM marker_images WHERE marker_id = ? ORDER BY created_at DESC',
    [markerId]
  );
  return rows.map(mapMarkerImage);
}

/**
 * Привязывает изображение к маркеру.
 *
 * `marker_id` в таблице `marker_images` — внешний ключ на `markers.id`,
 * поэтому вставка для несуществующего маркера нарушает ограничение
 * (`FOREIGN KEY constraint failed`, PRAGMA foreign_keys = ON). Такое
 * нарушение ловится и переводится в понятную ошибку домена.
 * @param db - открытое соединение с базой данных
 * @param markerId - идентификатор маркера
 * @param uri - локальный URI изображения
 * @returns идентификатор созданной записи изображения
 * @throws {Error} если маркер с указанным id не существует
 */
export async function addImage(
  db: SQLiteDatabase,
  markerId: number,
  uri: string
): Promise<number> {
  try {
    const result = await db.runAsync(
      'INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)',
      [markerId, uri]
    );
    return result.lastInsertRowId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('FOREIGN KEY constraint failed')) {
      throw new Error(`Метка с id=${markerId} не существует`);
    }
    throw err;
  }
}

/**
 * Удаляет изображение по идентификатору.
 * @param db - открытое соединение с базой данных
 * @param id - идентификатор изображения
 */
export async function deleteImage(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM marker_images WHERE id = ?', [id]);
}
