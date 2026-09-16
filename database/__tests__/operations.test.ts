import {
  addImage,
  addMarker,
  deleteImage,
  deleteMarker,
  getMarker,
  getMarkerImages,
  getMarkers,
} from '../operations';

function createDbMock() {
  return {
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    execAsync: jest.fn(),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
  };
}

describe('database/operations', () => {
  describe('getMarkers', () => {
    it('преобразует строки таблицы markers в доменный тип Marker', async () => {
      const db = createDbMock();
      db.getAllAsync.mockResolvedValue([
        { id: 1, latitude: 10, longitude: 20, created_at: '2026-01-01' },
      ]);

      const result = await getMarkers(db as any);

      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM markers ORDER BY created_at DESC'
      );
      expect(result).toEqual([
        { id: 1, latitude: 10, longitude: 20, createdAt: '2026-01-01' },
      ]);
    });

    it('возвращает пустой массив, если меток нет', async () => {
      const db = createDbMock();
      db.getAllAsync.mockResolvedValue([]);

      await expect(getMarkers(db as any)).resolves.toEqual([]);
    });
  });

  describe('getMarker', () => {
    it('возвращает найденную метку в доменном формате', async () => {
      const db = createDbMock();
      db.getFirstAsync.mockResolvedValue({
        id: 5,
        latitude: 1,
        longitude: 2,
        created_at: 'now',
      });

      const result = await getMarker(db as any, 5);

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM markers WHERE id = ?',
        [5]
      );
      expect(result).toEqual({ id: 5, latitude: 1, longitude: 2, createdAt: 'now' });
    });

    it('возвращает null, если метка не найдена', async () => {
      const db = createDbMock();
      db.getFirstAsync.mockResolvedValue(null);

      await expect(getMarker(db as any, 999)).resolves.toBeNull();
    });
  });

  describe('addMarker', () => {
    it('добавляет метку и возвращает её новый id', async () => {
      const db = createDbMock();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 42, changes: 1 });

      const id = await addMarker(db as any, 55.75, 37.6);

      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO markers (latitude, longitude) VALUES (?, ?)',
        [55.75, 37.6]
      );
      expect(id).toBe(42);
    });
  });

  describe('deleteMarker', () => {
    it('удаляет изображения метки и саму метку в одной транзакции', async () => {
      const db = createDbMock();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await deleteMarker(db as any, 7);

      expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(db.runAsync).toHaveBeenNthCalledWith(
        1,
        'DELETE FROM marker_images WHERE marker_id = ?',
        [7]
      );
      expect(db.runAsync).toHaveBeenNthCalledWith(
        2,
        'DELETE FROM markers WHERE id = ?',
        [7]
      );
    });

    it('пробрасывает ошибку и не удаляет метку, если не удалось удалить изображения', async () => {
      const db = createDbMock();
      db.withTransactionAsync.mockImplementation(async (task: () => Promise<void>) => {
        await task();
      });
      db.runAsync.mockRejectedValueOnce(new Error('disk I/O error'));

      await expect(deleteMarker(db as any, 7)).rejects.toThrow('disk I/O error');
      expect(db.runAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMarkerImages', () => {
    it('преобразует строки таблицы marker_images в доменный тип MarkerImage', async () => {
      const db = createDbMock();
      db.getAllAsync.mockResolvedValue([
        { id: 1, marker_id: 9, uri: 'file://a.jpg', created_at: 't' },
      ]);

      const result = await getMarkerImages(db as any, 9);

      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM marker_images WHERE marker_id = ? ORDER BY created_at DESC',
        [9]
      );
      expect(result).toEqual([{ id: 1, markerId: 9, uri: 'file://a.jpg', createdAt: 't' }]);
    });
  });

  describe('addImage', () => {
    it('добавляет изображение и возвращает его новый id', async () => {
      const db = createDbMock();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 3, changes: 1 });

      const id = await addImage(db as any, 9, 'file://photo.jpg');

      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)',
        [9, 'file://photo.jpg']
      );
      expect(id).toBe(3);
    });

    it('переводит нарушение внешнего ключа в понятную ошибку домена', async () => {
      const db = createDbMock();
      db.runAsync.mockRejectedValue(
        new Error('FOREIGN KEY constraint failed (code 787 SQLITE_CONSTRAINT_FOREIGNKEY)')
      );

      await expect(addImage(db as any, 404, 'file://x.jpg')).rejects.toThrow(
        'Метка с id=404 не существует'
      );
    });

    it('пробрасывает не связанные с ограничением ошибки без изменений', async () => {
      const db = createDbMock();
      db.runAsync.mockRejectedValue(new Error('disk full'));

      await expect(addImage(db as any, 1, 'file://x.jpg')).rejects.toThrow('disk full');
    });
  });

  describe('deleteImage', () => {
    it('удаляет изображение по id', async () => {
      const db = createDbMock();
      db.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await deleteImage(db as any, 11);

      expect(db.runAsync).toHaveBeenCalledWith(
        'DELETE FROM marker_images WHERE id = ?',
        [11]
      );
    });
  });
});
