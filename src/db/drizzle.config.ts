import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.MYSQL_HOST || process.env.SQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? process.env.SQL_ADMIN_PASSWORD ?? process.env.SQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE || process.env.SQL_DB_NAME || 'qr_attendance'
  },
  verbose: true
});
