import { mysqlTable, varchar, text, int, boolean } from 'drizzle-orm/mysql-core';

const id = (name: string) => varchar(name, { length: 191 });
const value = (name: string) => varchar(name, { length: 255 });

export const users = mysqlTable('users', {
  id: id('id').primaryKey(),
  username: value('username').notNull().unique(),
  role: value('role').$type<'admin' | 'staff'>().notNull(),
  fullName: value('full_name').notNull(),
  password: value('password')
});

export const departments = mysqlTable('departments', {
  id: id('id').primaryKey(),
  name: value('name').notNull(),
  code: value('code').notNull()
});

export const programs = mysqlTable('programs', {
  id: id('id').primaryKey(),
  name: value('name').notNull(),
  code: value('code').notNull(),
  departmentCode: value('department_code').notNull()
});

export const sections = mysqlTable('sections', {
  id: id('id').primaryKey(),
  name: value('name').notNull()
});

export const events = mysqlTable('events', {
  id: id('id').primaryKey(),
  name: value('name').notNull(),
  description: text('description'),
  date: value('date').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sanctionTime: value('sanction_time'),
  sanctionHours: int('sanction_hours'),
  createdAt: value('created_at'),
  sessions: value('sessions').$type<'AM' | 'PM' | 'Both'>()
});

export const students = mysqlTable('students', {
  studentId: id('student_id').primaryKey(),
  qrCodeId: id('qr_code_id'),
  fullName: value('full_name').notNull(),
  department: value('department').notNull(),
  program: value('program').notNull(),
  yearLevel: value('year_level').notNull(),
  section: value('section').notNull(),
  createdAt: value('created_at')
});

export const attendance = mysqlTable('attendance', {
  id: id('id').primaryKey(),
  studentId: id('student_id').notNull(),
  studentName: value('student_name').notNull(),
  department: value('department').notNull(),
  program: value('program').notNull(),
  yearLevel: value('year_level').notNull(),
  section: value('section').notNull(),
  eventId: id('event_id').notNull(),
  eventName: value('event_name').notNull(),
  date: value('date').notNull(),
  timeIn: value('time_in').notNull(),
  timeOut: value('time_out'),
  scannedBy: value('scanned_by').notNull()
});
