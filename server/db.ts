/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { db } from "../src/db/index.ts";
import { 
  users as usersTable, 
  students as studentsTable, 
  departments as departmentsTable, 
  programs as programsTable, 
  sections as sectionsTable, 
  events as eventsTable, 
  attendance as attendanceTable 
} from "../src/db/schema.ts";
import { eq } from "drizzle-orm";
import { csvStudents } from './csvSeedData.ts';
import { buildConsolidatedAttendance } from './csvImporter.ts';
import { 
  User, 
  Student, 
  Department, 
  Program, 
  Section, 
  Event, 
  AttendanceRecord 
} from '../src/types.ts';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Interface for serialized database
interface DatabaseSchema {
  users: User[];
  students: Student[];
  departments: Department[];
  programs: Program[];
  sections: Section[];
  events: Event[];
  attendance: AttendanceRecord[];
  activeScanMode?: 'in' | 'out';
}

// Initial/default database layout
const initialStudents: Student[] = csvStudents.map(s => ({
  studentId: s.studentId,
  fullName: s.fullName,
  department: s.department,
  program: s.program,
  yearLevel: s.yearLevel,
  section: s.section,
  createdAt: new Date().toISOString()
}));

const initialAttendance: AttendanceRecord[] = buildConsolidatedAttendance();

const DEFAULT_DB: DatabaseSchema = {
  users: [
    { id: '1', username: 'admin', role: 'admin', fullName: 'Institution Admin', password: 'admin123' },
    { id: '2', username: 'staff', role: 'staff', fullName: 'Activity Staff', password: 'staff123' }
  ],
  departments: [
    { id: '1', name: 'College of Engineering and Technology', code: 'CET' }
  ],
  programs: [
    { id: '1', name: 'BS Information Technology', code: 'BSIT', departmentCode: 'CET' },
    { id: '2', name: 'BS Geodetic Engineering', code: 'BSGE', departmentCode: 'CET' },
    { id: '3', name: 'BS Agricultural and Biosystems Engineering', code: 'BSABE', departmentCode: 'CET' }
  ],
  sections: [
    { id: '1', name: 'A' },
    { id: '2', name: 'B' },
    { id: '3', name: 'C' },
    { id: '4', name: 'D' }
  ],
  events: [
    { id: 'e1', name: 'CASH-LITE Program', description: 'Institutional CASH-LITE Student Orientation and Financial Literacy Program', date: '2026-07-24', isActive: true, sanctionTime: '4 hours Community Service', sanctionHours: 4 }
  ],
  students: initialStudents,
  attendance: initialAttendance,
  activeScanMode: 'in'
};

async function safeDbWrite(operation: () => Promise<any>, description: string) {
  try {
    await operation();
    console.log(`[SQL] ${description} synced successfully.`);
  } catch (err) {
    console.error(`[SQL Error] Failed to sync ${description}:`, err);
  }
}

export class JSONDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = { ...DEFAULT_DB };
    this.loadLocalBackup();
  }

  private loadLocalBackup() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        try {
          const parsed = JSON.parse(fileContent);
          
          // Events now match students/attendance: any valid array is trusted,
          // including an empty one. Previously this required events.length > 0,
          // so deleting the LAST event would silently bring back the default
          // CASH-LITE event on the next `npm run dev` restart.
          const parsedStudents = Array.isArray(parsed.students) ? parsed.students : DEFAULT_DB.students;
          const parsedEvents = Array.isArray(parsed.events) ? parsed.events : DEFAULT_DB.events;
          const parsedAttendance = Array.isArray(parsed.attendance) ? parsed.attendance : DEFAULT_DB.attendance;

          this.data = {
            users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_DB.users,
            students: parsedStudents,
            departments: Array.isArray(parsed.departments) && parsed.departments.length > 0 ? parsed.departments : DEFAULT_DB.departments,
            programs: Array.isArray(parsed.programs) && parsed.programs.length > 0 ? parsed.programs : DEFAULT_DB.programs,
            sections: Array.isArray(parsed.sections) && parsed.sections.length > 0 ? parsed.sections : DEFAULT_DB.sections,
            events: parsedEvents,
            attendance: parsedAttendance,
            activeScanMode: parsed.activeScanMode === 'out' ? 'out' : 'in'
          };

          // Save back updated layout
          this.save();
        } catch (e) {
          console.error('[DB] Corrupted database file, backing up and reset to default.');
          fs.writeFileSync(`${DB_FILE}.bak`, fileContent);
          this.data = { ...DEFAULT_DB };
          this.save();
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error('[DB] Failed to load local backup:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed to save database file:', e);
    }
  }

  async initialize(): Promise<void> {
    console.log('[SQL] Initializing database and pre-loading cache from PostgreSQL...');
    try {
      const sqlUsers = await db.select().from(usersTable);
      
      if (sqlUsers.length === 0) {
        console.log('[SQL] SQL database is empty. Seeding it from the local session cache (data/db.json) so your last saved session is preserved...');

        // IMPORTANT: seed Postgres from `this.data` (already loaded from the local
        // db.json backup in the constructor / loadLocalBackup()), NOT from DEFAULT_DB.
        // Seeding from DEFAULT_DB here is what previously wiped out whatever you had
        // saved before restarting `npm run dev`, since DEFAULT_DB is always rebuilt
        // fresh from csvSeedData/csvImporter on every process start.
        for (const user of this.data.users) {
          await db.insert(usersTable).values(user);
        }
        for (const dept of this.data.departments) {
          await db.insert(departmentsTable).values(dept);
        }
        for (const prog of this.data.programs) {
          await db.insert(programsTable).values(prog);
        }
        for (const sec of this.data.sections) {
          await db.insert(sectionsTable).values(sec);
        }
        for (const ev of this.data.events) {
          await db.insert(eventsTable).values(ev);
        }
        for (const s of this.data.students) {
          await db.insert(studentsTable).values(s);
        }
        for (const a of this.data.attendance) {
          await db.insert(attendanceTable).values(a);
        }

        console.log('[SQL] SQL database seeded from local session cache successfully.');
        // Do NOT reset this.data here — keep the session that was already loaded
        // from the local backup so it survives the restart.
      } else {
        // Load from SQL
        const sqlDepts = await db.select().from(departmentsTable);
        const sqlProgs = await db.select().from(programsTable);
        const sqlSecs = await db.select().from(sectionsTable);
        const sqlEvents = await db.select().from(eventsTable);
        const sqlStudents = await db.select().from(studentsTable);
        const sqlAttendance = await db.select().from(attendanceTable);
        
        this.data = {
          users: sqlUsers as User[],
          departments: sqlDepts as Department[],
          programs: sqlProgs as Program[],
          sections: sqlSecs as Section[],
          events: sqlEvents.map(e => ({
            ...e,
            sessions: e.sessions || undefined
          })) as Event[],
          students: sqlStudents as Student[],
          attendance: sqlAttendance.map(a => ({
            ...a,
            timeOut: a.timeOut || null
          })) as AttendanceRecord[]
        };
        console.log(`[SQL] Successfully pre-loaded:`);
        console.log(`      - ${this.data.users.length} users`);
        console.log(`      - ${this.data.students.length} students`);
        console.log(`      - ${this.data.attendance.length} attendance records`);
      }
      
      this.save();
    } catch (err) {
      console.error('[SQL Error] Failed to connect or initialize SQL database. Operating with high-fidelity local cache.', err);
    }
  }

  // --- Users API ---
  getUsers(): User[] {
    return this.data.users;
  }

  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  addUser(user: Omit<User, 'id'>): User {
    const id = 'u-' + Date.now().toString();
    const newUser: User = {
      id,
      ...user,
      password: user.password || '123456'
    };
    this.data.users.push(newUser);
    this.save();

    safeDbWrite(async () => {
      await db.insert(usersTable).values(newUser);
    }, `add user ${newUser.username}`);

    return newUser;
  }

  updateUser(id: string, updatedFields: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;

    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updatedFields,
      id
    };
    this.save();

    safeDbWrite(async () => {
      await db.update(usersTable).set(updatedFields).where(eq(usersTable.id, id));
    }, `update user ${id}`);

    return this.data.users[idx];
  }

  deleteUser(id: string): boolean {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return false;
    if (user.username === 'admin') return false;

    this.data.users = this.data.users.filter(u => u.id !== id);
    this.save();

    safeDbWrite(async () => {
      await db.delete(usersTable).where(eq(usersTable.id, id));
    }, `delete user ${id}`);

    return true;
  }

  // --- Students API ---
  getStudents(): Student[] {
    return this.data.students;
  }

  getStudentById(studentId: string): Student | undefined {
    if (!studentId) return undefined;
    const target = studentId.trim().toLowerCase();
    return this.data.students.find(s => s.studentId && s.studentId.trim().toLowerCase() === target);
  }

  addStudent(student: Student): Student {
    this.data.students = this.data.students.filter(s => s.studentId !== student.studentId);
    
    const newStudent: Student = {
      ...student,
      createdAt: student.createdAt || new Date().toISOString()
    };
    this.data.students.push(newStudent);
    this.save();

    safeDbWrite(async () => {
      await db.insert(studentsTable)
        .values(newStudent)
        .onConflictDoUpdate({
          target: studentsTable.studentId,
          set: {
            fullName: newStudent.fullName,
            department: newStudent.department,
            program: newStudent.program,
            yearLevel: newStudent.yearLevel,
            section: newStudent.section,
            createdAt: newStudent.createdAt
          }
        });
    }, `upsert student ${newStudent.studentId}`);

    return newStudent;
  }

  addStudentsBatch(students: Student[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;
    const batchList: Student[] = [];

    students.forEach(s => {
      this.ensureSystemSetupEntities(s.program, s.section, s.department);
      const exists = this.getStudentById(s.studentId);
      if (exists) {
        updated++;
      } else {
        added++;
      }
      
      this.data.students = this.data.students.filter(stud => stud.studentId !== s.studentId);
      const newStudent: Student = {
        ...s,
        createdAt: s.createdAt || new Date().toISOString()
      };
      this.data.students.push(newStudent);
      batchList.push(newStudent);
    });

    this.save();

    safeDbWrite(async () => {
      for (const s of batchList) {
        await db.insert(studentsTable)
          .values(s)
          .onConflictDoUpdate({
            target: studentsTable.studentId,
            set: {
              fullName: s.fullName,
              department: s.department,
              program: s.program,
              yearLevel: s.yearLevel,
              section: s.section,
              createdAt: s.createdAt
            }
          });
      }
    }, `batch insert/update ${batchList.length} students`);

    return { added, updated };
  }

  updateStudent(studentId: string, updatedFields: Partial<Student>): Student | undefined {
    const sIndex = this.data.students.findIndex(s => s.studentId === studentId);
    if (sIndex === -1) return undefined;

    this.data.students[sIndex] = {
      ...this.data.students[sIndex],
      ...updatedFields,
      studentId
    };
    this.save();

    safeDbWrite(async () => {
      await db.update(studentsTable).set(updatedFields).where(eq(studentsTable.studentId, studentId));
    }, `update student ${studentId}`);

    return this.data.students[sIndex];
  }

  deleteStudent(studentId: string): boolean {
    const prevLen = this.data.students.length;
    this.data.students = this.data.students.filter(s => s.studentId !== studentId);
    this.data.attendance = this.data.attendance.filter(a => a.studentId !== studentId);
    this.save();

    safeDbWrite(async () => {
      await db.delete(attendanceTable).where(eq(attendanceTable.studentId, studentId));
      await db.delete(studentsTable).where(eq(studentsTable.studentId, studentId));
    }, `delete student ${studentId} and logs`);

    return this.data.students.length < prevLen;
  }

  deleteAllStudents(): number {
    const count = this.data.students.length;
    this.data.students = [];
    this.data.attendance = [];
    this.save();

    safeDbWrite(async () => {
      await db.delete(attendanceTable);
      await db.delete(studentsTable);
    }, `clear all students and logs`);

    return count;
  }

  // --- Departments API ---
  getDepartments(): Department[] {
    return this.data.departments;
  }

  addDepartment(dept: Omit<Department, 'id'>): Department {
    const id = Date.now().toString();
    const newDept = { id, ...dept };
    this.data.departments.push(newDept);
    this.save();

    safeDbWrite(async () => {
      await db.insert(departmentsTable).values(newDept);
    }, `add department ${dept.code}`);

    return newDept;
  }

  deleteDepartment(id: string): boolean {
    this.data.departments = this.data.departments.filter(d => d.id !== id);
    this.save();

    safeDbWrite(async () => {
      await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
    }, `delete department ${id}`);

    return true;
  }

  // --- Programs API ---
  getPrograms(): Program[] {
    return this.data.programs;
  }

  addProgram(prog: Omit<Program, 'id'>): Program {
    const id = Date.now().toString();
    const newProg = { id, ...prog };
    this.data.programs.push(newProg);
    this.save();

    safeDbWrite(async () => {
      await db.insert(programsTable).values(newProg);
    }, `add program ${prog.code}`);

    return newProg;
  }

  deleteProgram(id: string): boolean {
    this.data.programs = this.data.programs.filter(p => p.id !== id);
    this.save();

    safeDbWrite(async () => {
      await db.delete(programsTable).where(eq(programsTable.id, id));
    }, `delete program ${id}`);

    return true;
  }

  // --- Sections API ---
  getSections(): Section[] {
    return this.data.sections;
  }

  addSection(sec: Omit<Section, 'id'>): Section {
    const id = Date.now().toString();
    const newSec = { id, ...sec };
    this.data.sections.push(newSec);
    this.save();

    safeDbWrite(async () => {
      await db.insert(sectionsTable).values(newSec);
    }, `add section ${sec.name}`);

    return newSec;
  }

  deleteSection(id: string): boolean {
    this.data.sections = this.data.sections.filter(s => s.id !== id);
    this.save();

    safeDbWrite(async () => {
      await db.delete(sectionsTable).where(eq(sectionsTable.id, id));
    }, `delete section ${id}`);

    return true;
  }

  ensureSystemSetupEntities(programCode?: string, sectionName?: string, departmentCode?: string, eventName?: string) {
    if (programCode) {
      const cleanProg = programCode.trim();
      if (cleanProg && !this.data.programs.some(p => p.code.toLowerCase() === cleanProg.toLowerCase() || p.name.toLowerCase() === cleanProg.toLowerCase())) {
        this.addProgram({
          code: cleanProg.toUpperCase(),
          name: cleanProg,
          departmentCode: departmentCode ? departmentCode.trim().toUpperCase() : 'CET'
        });
      }
    }

    if (sectionName) {
      const cleanSec = sectionName.trim();
      if (cleanSec && !this.data.sections.some(s => s.name.toLowerCase() === cleanSec.toLowerCase())) {
        this.addSection({
          name: cleanSec
        });
      }
    }

    if (departmentCode) {
      const cleanDept = departmentCode.trim();
      if (cleanDept && !this.data.departments.some(d => d.code.toLowerCase() === cleanDept.toLowerCase())) {
        this.addDepartment({
          code: cleanDept.toUpperCase(),
          name: cleanDept
        });
      }
    }

    if (eventName) {
      const cleanEv = eventName.trim();
      if (cleanEv && cleanEv.toLowerCase() !== 'cash-lite program' && !this.data.events.some(e => e.name.toLowerCase() === cleanEv.toLowerCase())) {
        this.addEvent({
          name: cleanEv,
          description: 'Auto-created via Import',
          date: new Date().toISOString().split('T')[0],
          sanctionTime: '4 hours Community Service',
          sanctionHours: 4,
          sessions: 'Both'
        });
      }
    }
  }

  // --- Events API ---
  getEvents(): Event[] {
    return this.data.events;
  }

  getEventById(id: string): Event | undefined {
    return this.data.events.find(e => e.id === id);
  }

  addEvent(event: Omit<Event, 'id' | 'isActive'>): Event {
    const id = 'ev-' + Date.now().toString();
    const newEvent: Event = {
      id,
      ...event,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    this.data.events.forEach(e => {
      e.isActive = false;
    });

    this.data.events.push(newEvent);
    this.save();

    safeDbWrite(async () => {
      await db.update(eventsTable).set({ isActive: false });
      await db.insert(eventsTable).values(newEvent);
    }, `add active event ${event.name}`);

    return newEvent;
  }

  setActiveEvent(eventId: string): Event | undefined {
    const event = this.data.events.find(e => e.id === eventId);
    if (!event) return undefined;

    this.data.events.forEach(e => {
      e.isActive = e.id === eventId;
    });

    this.save();

    safeDbWrite(async () => {
      await db.update(eventsTable).set({ isActive: false });
      await db.update(eventsTable).set({ isActive: true }).where(eq(eventsTable.id, eventId));
    }, `activate event ${eventId}`);

    return event;
  }

  deleteEvent(id: string): boolean {
    this.data.events = this.data.events.filter(e => e.id !== id);
    this.data.attendance = this.data.attendance.filter(a => a.eventId !== id);
    this.save();

    safeDbWrite(async () => {
      await db.delete(attendanceTable).where(eq(attendanceTable.eventId, id));
      await db.delete(eventsTable).where(eq(eventsTable.id, id));
    }, `delete event ${id} and logs`);

    return true;
  }

  // --- Attendance API ---
  getAttendance(): AttendanceRecord[] {
    return this.data.attendance;
  }

  clearTimeOut(id: string): AttendanceRecord | undefined {
    const record = this.data.attendance.find(a => a.id === id);
    if (record) {
      record.timeOut = null;
      this.save();

      safeDbWrite(async () => {
        await db.update(attendanceTable).set({ timeOut: null }).where(eq(attendanceTable.id, id));
      }, `clear timeout ${id}`);

      return record;
    }
    return undefined;
  }

  scanQRCode(
    studentId: string, 
    eventId: string, 
    scannerUsername: string,
    scanType: 'in' | 'out' = 'in'
  ): { success: boolean; message: string; type?: 'in' | 'out'; record?: AttendanceRecord; student?: Student } {
    const student = this.getStudentById(studentId);
    if (!student) {
      return { success: false, message: `Student ID "${studentId}" is not registered in the system.` };
    }

    const event = this.getEventById(eventId);
    if (!event) {
      return { success: false, message: 'Select an event before scanning.' };
    }

    const todayString = new Date().toISOString().split('T')[0];
    const scanDate = event.date || todayString;
    const nowISO = new Date();
    const timeString = nowISO.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    // Look for existing log for this event & student (from scan or import)
    const existingLog = this.data.attendance.find(
      a => a.studentId === student.studentId && (a.eventId === eventId || (a.eventName && a.eventName.toLowerCase() === event.name.toLowerCase()))
    );

    if (scanType === 'in') {
      // Check if student ALREADY timed in
      if (existingLog && existingLog.timeIn) {
        return {
          success: false,
          message: `Student "${student.fullName}" has ALREADY timed in for this event today (${existingLog.timeIn}). Second time-in blocked.`,
          student,
          record: existingLog
        };
      }

      if (existingLog) {
        // Record had timeOut only, now timing in
        existingLog.timeIn = timeString;
        existingLog.scannedBy = scannerUsername;
        this.save();

        safeDbWrite(async () => {
          await db.update(attendanceTable)
            .set({ timeIn: timeString, scannedBy: scannerUsername })
            .where(eq(attendanceTable.id, existingLog.id));
        }, `update timeIn scanning student ${studentId}`);

        return {
          success: true,
          message: `Time-IN recorded for Student: ${student.fullName} (${studentId})`,
          type: 'in',
          record: existingLog,
          student
        };
      } else {
        const newRecord: AttendanceRecord = {
          id: 'att-' + Date.now().toString(),
          studentId: student.studentId,
          studentName: student.fullName,
          department: student.department,
          program: student.program,
          yearLevel: student.yearLevel,
          section: student.section,
          eventId: event.id,
          eventName: event.name,
          date: scanDate,
          timeIn: timeString,
          timeOut: null,
          scannedBy: scannerUsername
        };
        this.data.attendance.push(newRecord);
        this.save();

        safeDbWrite(async () => {
          await db.insert(attendanceTable).values(newRecord);
        }, `insert scanning attendance ${newRecord.id}`);

        return {
          success: true,
          message: `Registered Time-IN for Student: ${student.fullName} (${studentId})`,
          type: 'in',
          record: newRecord,
          student
        };
      }
    } else {
      // scanType === 'out'
      if (existingLog && existingLog.timeOut) {
        return {
          success: false,
          message: `Student "${student.fullName}" has ALREADY timed out for this event today (${existingLog.timeOut}). Second time-out blocked.`,
          student,
          record: existingLog
        };
      }

      if (existingLog) {
        existingLog.timeOut = timeString;
        existingLog.scannedBy = scannerUsername;
        this.save();

        safeDbWrite(async () => {
          await db.update(attendanceTable)
            .set({ timeOut: timeString, scannedBy: scannerUsername })
            .where(eq(attendanceTable.id, existingLog.id));
        }, `record timeout scanning student ${studentId}`);

        return {
          success: true,
          message: `Time-OUT recorded for Student: ${student.fullName} (${studentId})`,
          type: 'out',
          record: existingLog,
          student
        };
      } else {
        // Student didn't time in (cut off or missed time in), but scanning time out now!
        const newRecord: AttendanceRecord = {
          id: 'att-' + Date.now().toString(),
          studentId: student.studentId,
          studentName: student.fullName,
          department: student.department,
          program: student.program,
          yearLevel: student.yearLevel,
          section: student.section,
          eventId: event.id,
          eventName: event.name,
          date: scanDate,
          timeIn: null,
          timeOut: timeString,
          scannedBy: scannerUsername
        };
        this.data.attendance.push(newRecord);
        this.save();

        safeDbWrite(async () => {
          await db.insert(attendanceTable).values(newRecord);
        }, `insert timeout-only attendance ${newRecord.id}`);

        return {
          success: true,
          message: `Time-OUT recorded (No Time-IN) for Student: ${student.fullName} (${studentId})`,
          type: 'out',
          record: newRecord,
          student
        };
      }
    }
  }

  manuallyRecordAttendance(studentId: string, eventId: string, type: 'in' | 'out', time: string, date: string, scannerUsername: string): AttendanceRecord | undefined {
    const student = this.getStudentById(studentId);
    if (!student) return undefined;
    const event = this.getEventById(eventId);
    if (!event) return undefined;

    if (type === 'in') {
      const newRecord: AttendanceRecord = {
        id: 'att-' + Date.now().toString(),
        studentId: student.studentId,
        studentName: student.fullName,
        department: student.department,
        program: student.program,
        yearLevel: student.yearLevel,
        section: student.section,
        eventId: event.id,
        eventName: event.name,
        date: date,
        timeIn: time,
        timeOut: null,
        scannedBy: scannerUsername
      };
      this.data.attendance.push(newRecord);
      this.save();

      safeDbWrite(async () => {
        await db.insert(attendanceTable).values(newRecord);
      }, `manual insert attendance ${newRecord.id}`);

      return newRecord;
    } else {
      const record = this.data.attendance.find(
         a => a.studentId === studentId && a.eventId === eventId && a.date === date && !a.timeOut
      );
      if (record) {
        record.timeOut = time;
        record.scannedBy = scannerUsername;
        this.save();

        safeDbWrite(async () => {
          await db.update(attendanceTable)
            .set({ timeOut: time, scannedBy: scannerUsername })
            .where(eq(attendanceTable.id, record.id));
        }, `manual update attendance timeout ${record.id}`);

        return record;
      }
    }
    return undefined;
  }

  deleteAttendanceRecord(id: string): boolean {
    const prevLen = this.data.attendance.length;
    this.data.attendance = this.data.attendance.filter(a => a.id !== id);
    if (this.data.attendance.length < prevLen) {
      this.save();
      safeDbWrite(async () => {
        await db.delete(attendanceTable).where(eq(attendanceTable.id, id));
      }, `delete attendance record ${id}`);
      return true;
    }
    return false;
  }

  importAttendanceBatch(
    records: Partial<AttendanceRecord>[],
    sanctionOptions?: {
      eventId?: string;
      eventName?: string;
      date?: string;
      sanctionTime?: string;
      sanctionHours?: number;
    }
  ): { added: number; updated: number } {
    let added = 0;
    let updated = 0;
    const activeEvents = this.getEvents();
    let targetEvent = sanctionOptions?.eventId ? activeEvents.find(e => e.id === sanctionOptions.eventId) : undefined;

    if (!targetEvent && sanctionOptions?.eventName) {
      targetEvent = activeEvents.find(e => e.name.toLowerCase() === sanctionOptions.eventName!.toLowerCase());
    }

    if (sanctionOptions) {
      if (targetEvent) {
        if (sanctionOptions.sanctionTime !== undefined) targetEvent.sanctionTime = sanctionOptions.sanctionTime;
        if (sanctionOptions.sanctionHours !== undefined) targetEvent.sanctionHours = sanctionOptions.sanctionHours;
        if (sanctionOptions.eventName && sanctionOptions.eventName.trim()) targetEvent.name = sanctionOptions.eventName.trim();
        if (sanctionOptions.date) targetEvent.date = sanctionOptions.date;
      } else if (sanctionOptions.eventName && sanctionOptions.eventName.trim()) {
        targetEvent = this.addEvent({
          name: sanctionOptions.eventName.trim(),
          description: 'Event created via Report Log Import',
          date: sanctionOptions.date || new Date().toISOString().split('T')[0],
          sanctionTime: sanctionOptions.sanctionTime || '4 hours Community Service',
          sanctionHours: sanctionOptions.sanctionHours !== undefined ? sanctionOptions.sanctionHours : 4,
          sessions: 'Both'
        });
      }
    }

    if (!targetEvent) {
      targetEvent = activeEvents[0] || this.data.events[0];
    }

    if (targetEvent) {
      this.setActiveEvent(targetEvent.id);
    }

    const defaultEventName = targetEvent ? targetEvent.name : 'General Event';
    const defaultEventId = targetEvent ? targetEvent.id : 'e1';
    const defaultDate = (targetEvent && 'date' in targetEvent) ? targetEvent.date : new Date().toISOString().split('T')[0];

    records.forEach((rec, idx) => {
      if (!rec.studentId) return;
      const studentId = String(rec.studentId).trim();
      const student = this.getStudentById(studentId);

      const studentName = rec.studentName || (student ? student.fullName : `Student ${studentId}`);
      const department = rec.department || (student ? student.department : 'CET');
      const program = rec.program || (student ? student.program : 'BSIT');
      const yearLevel = rec.yearLevel || (student ? student.yearLevel : '1');
      const section = rec.section !== undefined && rec.section !== null ? String(rec.section).trim() : (student ? student.section : 'A');
      
      const cleanRecEvName = (rec.eventName && rec.eventName.trim() !== 'CASH-LITE Program') ? rec.eventName.trim() : undefined;
      const eventId = rec.eventId || defaultEventId;
      const eventName = cleanRecEvName || defaultEventName;
      const date = rec.date || defaultDate;
      const timeIn = rec.timeIn !== undefined ? rec.timeIn : null;
      const timeOut = rec.timeOut !== undefined && rec.timeOut !== 'On Premises' ? rec.timeOut : null;
      const scannedBy = rec.scannedBy || 'XLSX Import';

      // Auto register Program, Section, Department, Event in System Setup Registers
      this.ensureSystemSetupEntities(program, section, department, cleanRecEvName || eventName);

      // Auto register student in roster directory if missing
      if (!student) {
        this.addStudent({
          studentId,
          fullName: studentName,
          department,
          program,
          yearLevel,
          section
        });
      }

      // Check if existing attendance log exists for student & this specific event
      const existing = this.data.attendance.find(
        a => a.studentId === studentId && (a.eventId === eventId || (a.eventName && cleanRecEvName && a.eventName.trim().toLowerCase() === cleanRecEvName.trim().toLowerCase()))
      );

      if (existing) {
        let changed = false;
        if (timeIn !== undefined && timeIn !== null && timeIn !== '') {
          existing.timeIn = timeIn;
          changed = true;
        }
        if (timeOut !== undefined) {
          existing.timeOut = timeOut;
          changed = true;
        }
        existing.studentName = studentName;
        existing.program = program;
        existing.yearLevel = yearLevel;
        existing.section = section;
        existing.department = department;

        if (changed) {
          updated++;
          safeDbWrite(async () => {
            await db.update(attendanceTable)
              .set({
                studentName,
                program,
                yearLevel,
                section,
                department,
                timeIn: existing.timeIn,
                timeOut: existing.timeOut
              })
              .where(eq(attendanceTable.id, existing.id));
          }, `import update attendance ${existing.id}`);
        }
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          studentId,
          studentName,
          department,
          program,
          yearLevel,
          section,
          eventId,
          eventName,
          date,
          timeIn,
          timeOut,
          scannedBy,
          isFromCsv: true
        };
        this.data.attendance.push(newRecord);
        added++;

        safeDbWrite(async () => {
          await db.insert(attendanceTable).values(newRecord);
        }, `import insert attendance ${newRecord.id}`);
      }
    });

    this.save();
    return { added, updated };
  }

  getScanMode(): 'in' | 'out' {
    return this.data.activeScanMode || 'in';
  }

  setScanMode(mode: 'in' | 'out'): 'in' | 'out' {
    this.data.activeScanMode = mode === 'out' ? 'out' : 'in';
    this.save();
    return this.data.activeScanMode;
  }
}
