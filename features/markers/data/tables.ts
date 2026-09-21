import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const markersTable = sqliteTable('markers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const markerImagesTable = sqliteTable('marker_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  markerId: integer('marker_id')
    .notNull()
    .references(() => markersTable.id, { onDelete: 'cascade' }),
  uri: text('uri').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
