import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema.ts';

export const createPool = () => mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.SQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.SQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? process.env.SQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || process.env.SQL_DB_NAME || 'qr_attendance',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  charset: 'utf8mb4'
});

export const pool = createPool();
export const db = drizzle(pool, { schema, mode: 'default' });
