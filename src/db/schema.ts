import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  role: text("role").$type<"admin" | "staff">().notNull(),
  fullName: text("full_name").notNull(),
  password: text("password")
});

export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull()
});

export const programs = pgTable("programs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  departmentCode: text("department_code").notNull()
});

export const sections = pgTable("sections", {
  id: text("id").primaryKey(),
  name: text("name").notNull()
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sanctionTime: text("sanction_time"),
  sanctionHours: integer("sanction_hours"),
  createdAt: text("created_at"),
  sessions: text("sessions").$type<"AM" | "PM" | "Both">()
});

export const students = pgTable("students", {
  studentId: text("student_id").primaryKey(),
  fullName: text("full_name").notNull(),
  department: text("department").notNull(),
  program: text("program").notNull(),
  yearLevel: text("year_level").notNull(),
  section: text("section").notNull(),
  createdAt: text("created_at")
});

export const attendance = pgTable("attendance", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  studentName: text("student_name").notNull(),
  department: text("department").notNull(),
  program: text("program").notNull(),
  yearLevel: text("year_level").notNull(),
  section: text("section").notNull(),
  eventId: text("event_id").notNull(),
  eventName: text("event_name").notNull(),
  date: text("date").notNull(),
  timeIn: text("time_in").notNull(),
  timeOut: text("time_out"),
  scannedBy: text("scanned_by").notNull()
});
