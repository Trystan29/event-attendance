/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  fullName: string;
  password?: string;
}

export interface Student {
  studentId: string; // Unique Identifier
  fullName: string;
  department: string;
  program: string;
  yearLevel: string; // "1", "2", "3", "4", "5" etc.
  section: string;   // "A", "B", "C" etc.
  qrCodeUrl?: string; // Client cached QR dataURL for easy rendering
  createdAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string; // e.g. "CCS", "COE"
}

export interface Program {
  id: string;
  name: string;
  code: string; // e.g. "BSIT", "BSGE"
  departmentCode: string; // FK to Department
}

export interface Section {
  id: string;
  name: string; // e.g. "A", "4-A", etc.
}

export interface Event {
  id: string;
  name: string; // e.g. "Intramurals 2026", "Flag Ceremony"
  description?: string;
  date: string; // YYYY-MM-DD
  isActive: boolean;
  sanctionTime?: string; // e.g. "4 hours Community Service"
  sanctionHours?: number;
  createdAt?: string;
  sessions?: 'AM' | 'PM' | 'Both';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  program: string;
  yearLevel: string;
  section: string;
  eventId: string;
  eventName: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:MM:SS AM/PM or ISO
  timeOut: string | null; // HH:MM:SS AM/PM or ISO or null
  scannedBy: string; // Staff/Admin username
  isFromCsv?: boolean;
}

export interface ScanResult {
  success: boolean;
  message: string;
  type?: 'in' | 'out';
  student?: Student;
  record?: AttendanceRecord;
}

export interface DashboardStats {
  totalStudents: number;
  totalPresentToday: number;
  recentScans: AttendanceRecord[];
  attendanceByDepartment: { department: string; count: number }[];
  attendanceBySection: { section: string; count: number }[];
  cetTimeIn: number;
  cetTimeOut: number;
  totalCetStudents: number;
  attendanceByProgram: { program: string; count: number }[];
  eventStats: {
    eventId: string;
    eventName: string;
    totalPresent: number;
    scansCount: number;
  }[];
}
