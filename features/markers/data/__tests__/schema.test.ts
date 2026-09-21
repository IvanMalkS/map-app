import { DATABASE_NAME, migrateDbIfNeeded } from '../schema';

function createDbMock(userVersion: number) {
  return {
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: userVersion }),
    execAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('database/schema', () => {
  it('экспортирует ожидаемое имя файла базы данных', () => {
    expect(DATABASE_NAME).toBe('markers.db');
  });

  it('создаёт схему и поднимает user_version с 0 до текущей версии', async () => {
    const db = createDbMock(0);

    await migrateDbIfNeeded(db as any);

    expect(db.getFirstAsync).toHaveBeenCalledWith('PRAGMA user_version');
    expect(db.execAsync).toHaveBeenCalledTimes(2);

    const createTablesSql = db.execAsync.mock.calls[0][0] as string;
    expect(createTablesSql).toContain('CREATE TABLE IF NOT EXISTS markers');
    expect(createTablesSql).toContain('CREATE TABLE IF NOT EXISTS marker_images');
    expect(createTablesSql).toContain('PRAGMA foreign_keys = ON');
    expect(createTablesSql).toContain(
      'FOREIGN KEY (marker_id) REFERENCES markers (id) ON DELETE CASCADE'
    );

    const setVersionSql = db.execAsync.mock.calls[1][0] as string;
    expect(setVersionSql).toBe('PRAGMA user_version = 1');
  });

  it('ничего не делает, если база уже на текущей версии', async () => {
    const db = createDbMock(1);

    await migrateDbIfNeeded(db as any);

    expect(db.execAsync).not.toHaveBeenCalled();
  });

  it('считает отсутствующую строку user_version версией 0', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      execAsync: jest.fn().mockResolvedValue(undefined),
    };

    await migrateDbIfNeeded(db as any);

    expect(db.execAsync).toHaveBeenCalledTimes(2);
  });
});
