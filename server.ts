/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import http from 'http';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import * as xlsx from 'xlsx';
import { JSONDatabase } from './server/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize central database helper
  const db = new JSONDatabase();
  await db.initialize();

  const JWT_SECRET = process.env.SESSION_SECRET || 'cet_attendance_system_secure_key_2026';

  function formatSanctionDuration(hours: number): string {
    const totalMinutes = Math.round((hours || 0) * 60);
    if (totalMinutes <= 0) return '0 mins';
    if (totalMinutes < 60) return `${totalMinutes} mins`;
    
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hStr = `${h} ${h === 1 ? 'hr' : 'hrs'}`;
    
    if (m === 0) return hStr;
    return `${hStr} ${m} mins`;
  }

  function getEventSanctionHours(ev?: { sanctionHours?: number; sanctionTime?: string } | null): number {
    if (!ev) return 4;

    const sanctionTime = ev.sanctionTime || '';
    const isMins = sanctionTime.toLowerCase().includes('min') || sanctionTime.toLowerCase().includes('minute');

    if (typeof ev.sanctionHours === 'number' && !isNaN(ev.sanctionHours) && ev.sanctionHours > 0) {
      if (isMins) {
        if (ev.sanctionHours >= 1) {
          return ev.sanctionHours / 60;
        } else {
          return ev.sanctionHours;
        }
      } else {
        return ev.sanctionHours;
      }
    }

    if (sanctionTime) {
      const parsed = parseFloat(sanctionTime);
      if (!isNaN(parsed) && parsed > 0) {
        return isMins ? (parsed / 60) : parsed;
      }
    }

    return 4;
  }

  function generateToken(userPayload: { id: string; username: string; role: 'admin' | 'staff' }) {
    const payloadStr = JSON.stringify(userPayload);
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('hex');
    return Buffer.from(payloadStr + '.' + signature).toString('base64');
  }

  function verifyToken(token: string): { id: string; username: string; role: 'admin' | 'staff' } | null {
    try {
      const raw = Buffer.from(token, 'base64').toString('utf-8');
      const parts = raw.split('.');
      if (parts.length !== 2) return null;
      const payloadStr = parts[0];
      const signature = parts[1];
      const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('hex');
      
      const buf1 = Buffer.from(signature);
      const buf2 = Buffer.from(expectedSignature);
      if (buf1.length === buf2.length && crypto.timingSafeEqual(buf1, buf2)) {
        return JSON.parse(payloadStr);
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }

  // Authentication middleware
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Session expired or token is invalid. Please sign in again.' });
    }
    (req as any).user = user;
    next();
  };

  // Authorization Level: Admin only
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
    }
    next();
  };

  // Create HTTP Server wrap
  const server = http.createServer(app);

  // Initialize WebSocket server on same port
  const wss = new WebSocketServer({ server });

  // Connected client tracking
  const activeClients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    activeClients.add(ws);

    ws.on('close', () => {
      activeClients.delete(ws);
    });

    // Send immediate initial real-time stats update on connection
    try {
      ws.send(JSON.stringify({
        type: 'attendance:updated',
        stats: getDashboardStats()
      }));
    } catch (err) {
      console.error('[WS] Initial sync payload failure:', err);
    }
  });

  // Calculate high-fidelity stats centrally
  function getDashboardStats() {
    const students = db.getStudents();
    const attendance = db.getAttendance();
    const events = db.getEvents();

    const todayDateStr = new Date().toISOString().split('T')[0];
    
    // Total present relative to today or the currently designated active event
    const activeEvent = events.find(e => e.isActive);
    const activeEventId = activeEvent?.id || '';

    // Filter active event's logs
    const activeLogs = activeEventId 
      ? attendance.filter(a => a.eventId === activeEventId)
      : attendance;

    // Filter unique students checked in today
    const presentTodayCount = new Set(
      attendance
        .filter(a => a.date === todayDateStr)
        .map(a => a.studentId)
    ).size;

    // Sort logs descending for recent scans (filtered by the currently active event)
    const sortedAttendance = [...activeLogs].sort((a, b) => {
      return b.id.localeCompare(a.id);
    });
    const recentScans = sortedAttendance.slice(0, 10);

    // Compute department stats
    const deptMap: { [key: string]: number } = {};
    activeLogs.forEach(entry => {
      const dept = entry.department || 'UNKNOWN';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const attendanceByDepartment = Object.entries(deptMap).map(([department, count]) => ({
      department,
      count
    }));

    // Match CET department string robustly (case-insensitive, trim and support full name)
    const isCet = (dept: string) => {
      if (!dept) return false;
      const d = dept.trim().toUpperCase();
      return d === 'CET' || d === 'COLLEGE OF ENGINEERING AND TECHNOLOGY' || d === 'COLLEGE OF ENGINEERING & TECHNOLOGY';
    };

    // Calculate total registered CET students
    const totalCetStudents = students.filter(s => isCet(s.department)).length;

    // Compute CET Time-In & Time-Out details
    const cetTimeIn = new Set(
      activeLogs
        .filter(a => isCet(a.department) && a.timeIn !== null && a.timeIn !== undefined && a.timeIn !== '')
        .map(a => a.studentId)
    ).size;

    const cetTimeOut = new Set(
      activeLogs
        .filter(a => isCet(a.department) && a.timeOut !== null && a.timeOut !== undefined && a.timeOut !== '' && a.timeOut !== 'On Premises')
        .map(a => a.studentId)
    ).size;

    // Compute program stats (BSIT, BSGE, BSABE)
    const progMap: { [key: string]: number } = {
      'BSIT': 0,
      'BSGE': 0,
      'BSABE': 0
    };
    
    const seenStudents = new Set<string>();
    activeLogs.forEach(entry => {
      if (!seenStudents.has(entry.studentId)) {
        seenStudents.add(entry.studentId);
        const prog = (entry.program || '').toUpperCase().trim();
        if (progMap[prog] !== undefined) {
          progMap[prog]++;
        } else if (prog) {
          progMap[prog] = 1;
        }
      }
    });
    
    const attendanceByProgram = Object.entries(progMap).map(([program, count]) => ({
      program,
      count
    }));

    // Compute section stats
    const secMap: { [key: string]: number } = {};
    activeLogs.forEach(entry => {
      const sec = `${entry.yearLevel}-${entry.section}` || 'UNKNOWN';
      secMap[sec] = (secMap[sec] || 0) + 1;
    });
    const attendanceBySection = Object.entries(secMap).map(([section, count]) => ({
      section,
      count
    }));

    // Computed event statistics
    const eventStats = events.map(ev => {
      const logsForEvent = attendance.filter(a => a.eventId === ev.id);
      const uniqueScanned = new Set(logsForEvent.map(l => l.studentId)).size;
      return {
        eventId: ev.id,
        eventName: ev.name,
        totalPresent: uniqueScanned,
        scansCount: logsForEvent.length
      };
    });

    return {
      totalStudents: students.length,
      totalPresentToday: presentTodayCount,
      recentScans,
      attendanceByDepartment,
      attendanceBySection,
      cetTimeIn,
      cetTimeOut,
      totalCetStudents,
      attendanceByProgram,
      eventStats,
      activeScanMode: db.getScanMode()
    };
  }

  // Broadcaster function for real-time updates
  const broadcastStats = () => {
    const stats = getDashboardStats();
    const payload = JSON.stringify({
      type: 'attendance:updated',
      stats
    });

    activeClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          console.error('[WS] Client broadcast transmission failure:', err);
        }
      }
    });
  };

  // --- API ROUTES ---

  // Diagnostic Endpoint to listen to client-side runtime errors
  app.post('/api/client-error', (req, res) => {
    const errorLogPath = path.join(process.cwd(), 'data', 'client_errors.log');
    const logItem = {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || 'Unknown',
      ...req.body
    };
    
    console.error('\n⚠️ [CLIENT CRASH LOGGED]:\n', JSON.stringify(logItem, null, 2), '\n');
    
    try {
      if (!fs.existsSync(path.dirname(errorLogPath))) {
        fs.mkdirSync(path.dirname(errorLogPath), { recursive: true });
      }
      fs.appendFileSync(errorLogPath, JSON.stringify(logItem) + '\n');
    } catch (e) {
      console.error('[SERVER] Failed to write client error log to disk:', e);
    }
    
    res.json({ success: true });
  });

  // Authenticate user
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'User not found in system' });
    }

    // Dynamic database credential comparison (handles both defaults and custom user accounts)
    if (user.password === password) {
      const token = generateToken({ id: user.id, username: user.username, role: user.role });
      return res.json({ id: user.id, username: user.username, role: user.role, fullName: user.fullName, token });
    }

    return res.status(401).json({ error: 'Invalid password credentials' });
  });

  // --- Users APIs ---
  app.get('/api/users', authenticate, requireAdmin, (req, res) => {
    // Expose fields with actual passwords so admin can edit or reference them easily in the user manager
    const users = db.getUsers().map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      fullName: u.fullName,
      password: u.password
    }));
    res.json(users);
  });

  app.post('/api/users', authenticate, requireAdmin, (req, res) => {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Please supply username, password, full name, and role for the new user.' });
    }

    const existing = db.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: `Username "${username}" is already taken.` });
    }

    const newUser = db.addUser({ username, password, fullName, role });
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      fullName: newUser.fullName,
      password: newUser.password
    });
  });

  app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { username, password, fullName, role } = req.body;

    if (username) {
      const existing = db.getUserByUsername(username);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: `Username "${username}" is already taken.` });
      }
    }

    const updated = db.updateUser(userId, { username, password, fullName, role });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      fullName: updated.fullName,
      password: updated.password
    });
  });

  app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const success = db.deleteUser(userId);
    if (!success) {
      return res.status(400).json({ error: 'Failed to delete user. The main admin/system users are locked.' });
    }
    res.json({ success: true });
  });

  // Fetch Dashboard Stats
  app.get('/api/dashboard/stats', authenticate, (req, res) => {
    res.json(getDashboardStats());
  });

  // --- Students APIs ---
  app.get('/api/students', authenticate, (req, res) => {
    res.json(db.getStudents());
  });

  app.post('/api/students', authenticate, requireAdmin, (req, res) => {
    const student = req.body;
    if (!student.studentId || !student.fullName || !student.department || !student.program || !student.yearLevel) {
      return res.status(400).json({ error: 'Please supply all required collegiate fields (ID, Name, College, Program, Year) for the student.' });
    }
    const normalizedStudent = {
      ...student,
      section: student.section ? String(student.section).trim() : ''
    };
    const newStudent = db.addStudent(normalizedStudent);
    broadcastStats();
    res.status(201).json(newStudent);
  });

  app.post('/api/students/import', authenticate, requireAdmin, (req, res) => {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: 'Expected students field as structured array' });
    }
    
    // Filter and normalize
    const validStudents = students.filter(s => {
      return s.studentId && s.fullName;
    }).map(s => ({
      studentId: String(s.studentId).trim(),
      fullName: String(s.fullName).trim(),
      department: String(s.department || 'CET').trim(),
      program: String(s.program || 'General').trim(),
      yearLevel: String(s.yearLevel || '1').trim(),
      section: s.section !== undefined && s.section !== null ? String(s.section).trim() : ''
    }));

    if (validStudents.length === 0) {
      return res.status(400).json({ error: 'No valid student records found in payload.' });
    }

    const { added, updated } = db.addStudentsBatch(validStudents);
    broadcastStats();
    res.json({ message: `Successfully parsed student rosters format.`, added, updated });
  });

  app.put('/api/students/:id', authenticate, requireAdmin, (req, res) => {
    const studentId = req.params.id;
    const result = db.updateStudent(studentId, req.body);
    if (!result) {
      return res.status(404).json({ error: 'Student not found in institutional rosters' });
    }
    broadcastStats();
    res.json(result);
  });

  app.delete('/api/students', authenticate, requireAdmin, (req, res) => {
    try {
      const count = db.deleteAllStudents();
      broadcastStats();
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error executing batch student deleting' });
    }
  });

  app.delete('/api/students/:id', authenticate, requireAdmin, (req, res) => {
    const success = db.deleteStudent(req.params.id);
    if (success) {
      broadcastStats();
    }
    res.json({ success });
  });

  // --- Categories API ---
  app.get('/api/departments', authenticate, (req, res) => {
    res.json(db.getDepartments());
  });

  app.post('/api/departments', authenticate, requireAdmin, (req, res) => {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Provide Department details' });
    const newDept = db.addDepartment({ name, code });
    broadcastStats();
    res.status(201).json(newDept);
  });

  app.delete('/api/departments/:id', authenticate, requireAdmin, (req, res) => {
    db.deleteDepartment(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });

  app.get('/api/programs', authenticate, (req, res) => {
    res.json(db.getPrograms());
  });

  app.post('/api/programs', authenticate, requireAdmin, (req, res) => {
    const { name, code, departmentCode } = req.body;
    if (!name || !code || !departmentCode) return res.status(400).json({ error: 'Provide Course fields' });
    const newProg = db.addProgram({ name, code, departmentCode });
    broadcastStats();
    res.status(201).json(newProg);
  });

  app.delete('/api/programs/:id', authenticate, requireAdmin, (req, res) => {
    db.deleteProgram(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });

  app.get('/api/sections', authenticate, (req, res) => {
    res.json(db.getSections());
  });

  app.post('/api/sections', authenticate, requireAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Provide Section name' });
    const newSec = db.addSection({ name });
    broadcastStats();
    res.status(201).json(newSec);
  });

  app.delete('/api/sections/:id', authenticate, requireAdmin, (req, res) => {
    db.deleteSection(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });

  // --- Events API ---
  app.get('/api/events', authenticate, (req, res) => {
    res.json(db.getEvents());
  });

  app.post('/api/events', authenticate, requireAdmin, (req, res) => {
    const { name, description, date, sanctionTime, sanctionHours, sessions } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Specify Event name and execution date.' });
    const newEvent = db.addEvent({ name, description, date, sanctionTime, sanctionHours, sessions });
    broadcastStats();
    res.status(201).json(newEvent);
  });

  app.post('/api/events/:id/activate', authenticate, requireAdmin, (req, res) => {
    const result = db.setActiveEvent(req.params.id);
    if (!result) return res.status(404).json({ error: 'Target event is missing.' });
    broadcastStats();
    res.json(result);
  });

  app.delete('/api/events/:id', authenticate, requireAdmin, (req, res) => {
    db.deleteEvent(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });

  // Global Scan Mode API
  app.get('/api/scan-mode', authenticate, (req, res) => {
    res.json({ scanMode: db.getScanMode() });
  });

  app.post('/api/scan-mode', authenticate, requireAdmin, (req, res) => {
    const { scanMode } = req.body;
    if (scanMode === 'in' || scanMode === 'out') {
      db.setScanMode(scanMode);
      broadcastStats();
      return res.json({ success: true, scanMode: db.getScanMode() });
    }
    return res.status(400).json({ error: 'Invalid scan mode' });
  });

  // --- Scanning & Transactions ---
  app.post('/api/attendance/scan', authenticate, (req, res) => {
    const { studentId, eventId, scannerUsername, scanType } = req.body;
    if (!studentId || !eventId || !scannerUsername) {
      return res.status(400).json({ error: 'Missing scanning contextual metadata' });
    }

    const result = db.scanQRCode(studentId, eventId, scannerUsername, scanType || 'in');
    if (!result.success) {
      return res.status(400).json(result);
    }
    broadcastStats();
    return res.json(result);
  });

  app.post('/api/attendance/manual', authenticate, (req, res) => {
    const { studentId, eventId, type, time, date, scannerUsername } = req.body;
    if (!studentId || !eventId || !type || !time || !date || !scannerUsername) {
      return res.status(400).json({ error: 'Incomplete manual attendance inputs' });
    }

    const record = db.manuallyRecordAttendance(studentId, eventId, type, time, date, scannerUsername);
    if (!record) {
      return res.status(404).json({ error: 'Make sure student ID exists and has prior Time-In if logging a Time-Out' });
    }
    broadcastStats();
    res.json({ success: true, record });
  });

  app.get('/api/attendance', authenticate, (req, res) => {
    res.json(db.getAttendance());
  });

  app.post('/api/attendance/:id/clear-timeout', authenticate, (req, res) => {
    const record = db.clearTimeOut(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    broadcastStats();
    res.json({ success: true, record });
  });

  app.delete('/api/attendance/:id', authenticate, (req, res) => {
    const success = db.deleteAttendanceRecord(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Attendance record not found or could not be deleted' });
    }
    broadcastStats();
    res.json({ success: true });
  });

  app.post('/api/attendance/import', authenticate, requireAdmin, (req, res) => {
    const { records, eventId, eventName, date, sanctionTime, sanctionHours } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Expected records array in body' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No attendance records provided in import body' });
    }

    const result = db.importAttendanceBatch(records, {
      eventId,
      eventName,
      date,
      sanctionTime,
      sanctionHours: typeof sanctionHours === 'number' ? sanctionHours : (sanctionHours ? parseFloat(sanctionHours) : undefined)
    });
    broadcastStats();
    res.json({
      message: `Successfully imported attendance report logs.`,
      added: result.added,
      updated: result.updated,
      totalProcessed: records.length
    });
  });

  // --- Reports Excel Spreadsheet (XLSX) Download ---
  app.get('/api/reports/download', (req, res) => {
    const queryToken = req.query.token as string;
    const authHeader = req.headers['authorization'];
    let token = queryToken;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).send('Authentication required. Missing verification token.');
    }
    const userPayload = verifyToken(token);
    if (!userPayload) {
      return res.status(401).send('Session expired or token is invalid. Please sign in again.');
    }

    const { event, department, program, section, date, mode, studentId, status } = req.query;

    const allLogs = db.getAttendance();
    const isSummaryMode = mode === 'summary';

    const getSessionType = (timeInStr: any): 'AM' | 'PM' => {
      if (!timeInStr) return 'AM';
      const str = String(timeInStr).toUpperCase();
      if (str.includes('PM')) return 'PM';
      if (str.includes('AM')) return 'AM';
      const match = str.match(/^(\d+):/);
      if (match) {
        const hr = parseInt(match[1], 10);
        if (hr >= 12) return 'PM';
      }
      return 'AM';
    };

    // Build SheetJS Excel workbook
    const wb = xlsx.utils.book_new();

    if (isSummaryMode) {
      // 1. Gather all student directories to build class list registry rows
      let students = db.getStudents();
      if (studentId) {
        students = students.filter(s => s.studentId === studentId);
      }
      if (department) {
        students = students.filter(s => s.department.toLowerCase() === (department as string).toLowerCase());
      }
      if (program) {
        students = students.filter(s => s.program.toLowerCase() === (program as string).toLowerCase());
      }
      if (section) {
        students = students.filter(s => s.section.toLowerCase() === (section as string).toLowerCase());
      }
      if (status === 'present') {
        if (event) {
          students = students.filter(s => allLogs.some(log => log.studentId === s.studentId && log.eventId === event));
        } else {
          students = students.filter(s => allLogs.some(log => log.studentId === s.studentId));
        }
      } else if (status === 'absent') {
        if (event) {
          students = students.filter(s => !allLogs.some(log => log.studentId === s.studentId && log.eventId === event));
        } else {
          students = students.filter(s => !allLogs.some(log => log.studentId === s.studentId));
        }
      }

      // 2. Compute the exact same global ordered list of event slots (AM vs PM) as the UI
      interface Slot {
        eventId: string;
        eventName: string;
        date: string;
        session: 'AM' | 'PM';
        key: string;
      }
      const eventsList = db.getEvents();
      const dynamicSlotsList: Slot[] = [];
      const seenKeys = new Set<string>();

      // Active Logs Slots
      allLogs.forEach(log => {
        const session = getSessionType(log.timeIn);
        const key = `${log.eventId}_${log.date}_${session}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          dynamicSlotsList.push({
            eventId: log.eventId,
            eventName: log.eventName,
            date: log.date,
            session,
            key
          });
        }
      });

      // Scheduled Events Slots
      eventsList.forEach(ev => {
        if (ev.date) {
          const keyAM = `${ev.id}_${ev.date}_AM`;
          if (!seenKeys.has(keyAM)) {
            seenKeys.add(keyAM);
            dynamicSlotsList.push({
              eventId: ev.id,
              eventName: ev.name,
              date: ev.date,
              session: 'AM',
              key: keyAM
            });
          }
          const isMultiSession = ev.name.toLowerCase().includes('intramural') || 
                                 ev.name.toLowerCase().includes('sports') || 
                                 ev.name.toLowerCase().includes('fest') ||
                                 ev.name.toLowerCase().includes('athletic');
          if (isMultiSession) {
            const keyPM = `${ev.id}_${ev.date}_PM`;
            if (!seenKeys.has(keyPM)) {
              seenKeys.add(keyPM);
              dynamicSlotsList.push({
                eventId: ev.id,
                eventName: ev.name,
                date: ev.date,
                session: 'PM',
                key: keyPM
              });
            }
          }
        }
      });

      // Chronological sort
      dynamicSlotsList.sort((a, b) => {
        const dayCmp = a.date.localeCompare(b.date);
        if (dayCmp !== 0) return dayCmp;
        return a.session.localeCompare(b.session);
      });

      // 3. Group students by coursework program (BSIT, BSGE, etc.) for multi-sheet layout
      const studentsByProgram: { [prog: string]: any[] } = {};
      students.forEach(s => {
        const progName = s.program ? s.program.toUpperCase().trim() : 'OTHER';
        if (!studentsByProgram[progName]) {
          studentsByProgram[progName] = [];
        }
        studentsByProgram[progName].push(s);
      });

      const sortedPrograms = Object.keys(studentsByProgram).sort();

      if (sortedPrograms.length === 0) {
        const ws = xlsx.utils.aoa_to_sheet([
          ['Student ID', 'Full Name', 'Program/Course', 'Year Level', 'Section']
        ]);
        xlsx.utils.book_append_sheet(wb, ws, 'Empty Summary');
      } else {
        sortedPrograms.forEach(prog => {
          const list = studentsByProgram[prog];

          // Sort by year level and section code
          list.sort((a, b) => {
            const ya = String(a.yearLevel || '');
            const yb = String(b.yearLevel || '');
            const cmpYear = ya.localeCompare(yb, undefined, { numeric: true });
            if (cmpYear !== 0) return cmpYear;

            const sa = String(a.section || '');
            const sb = String(b.section || '');
            const cmpSec = sa.localeCompare(sb);
            if (cmpSec !== 0) return cmpSec;

            const nameA = String(a.fullName || '').toLowerCase();
            const nameB = String(b.fullName || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });

          // Layout headers list: Student ID, Full Name, Program/Course, Year Level, Section, Total Sanction Time, then dynamic slots
          const headers = [
            'Student ID',
            'Full Name',
            'Program/Course',
            'Year Level',
            'Section',
            'Total Sanction Time',
            ...dynamicSlotsList.map(slot => `${slot.eventName} (${slot.date} ${slot.session})`)
          ];

          const todayStr = new Date().toISOString().split('T')[0];

          const rows = list.map(student => {
            // Calculate total sanction hours based on attendance across events
            let totalSanctionHours = 0;
            eventsList.forEach(ev => {
              if (ev.date && ev.date <= todayStr) {
                const studentLog = allLogs.find(
                  a => a.studentId === student.studentId && (a.eventId === ev.id || (a.eventName && ev.name && a.eventName.trim().toLowerCase() === ev.name.trim().toLowerCase()))
                );

                const fullHours = getEventSanctionHours(ev);

                const hasTimeIn = Boolean(studentLog && studentLog.timeIn && studentLog.timeIn.trim() !== '');
                const hasTimeOut = Boolean(studentLog && studentLog.timeOut && studentLog.timeOut.trim() !== '' && studentLog.timeOut !== 'On Premises');

                if (hasTimeIn && hasTimeOut) {
                  totalSanctionHours += 0;
                } else if (hasTimeIn || hasTimeOut) {
                  totalSanctionHours += fullHours * 0.5; // Single check-in -> HALVED!
                } else {
                  totalSanctionHours += fullHours * 1.0; // Completely absent -> FULL sanction
                }
              }
            });

            const rowData = [
              student.studentId,
              student.fullName,
              student.program,
              student.yearLevel,
              student.section,
              formatSanctionDuration(totalSanctionHours)
            ];

            dynamicSlotsList.forEach(slot => {
              const attended = allLogs.some(
                a => a.studentId === student.studentId &&
                     a.eventId === slot.eventId &&
                     a.date === slot.date &&
                     getSessionType(a.timeIn) === slot.session
              );
              rowData.push(attended ? 'Present' : 'Absent');
            });

            return rowData;
          });

          const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
          const cleanSheetName = prog.replace(/[\\/?*\[\]:]/g, '').substring(0, 31) || 'Sheet';
          xlsx.utils.book_append_sheet(wb, ws, cleanSheetName);
        });
      }

    } else {
      // Standard Detailed Chronological Scan Logs
      let records = allLogs;

      if (studentId) {
        records = records.filter(r => r.studentId === studentId);
      }
      if (event) {
        records = records.filter(r => r.eventId === event || r.eventName === event);
      }
      if (department) {
        records = records.filter(r => r.department.toLowerCase() === (department as string).toLowerCase());
      }
      if (program) {
        records = records.filter(r => r.program.toLowerCase() === (program as string).toLowerCase());
      }
      if (section) {
        records = records.filter(r => r.section.toLowerCase() === (section as string).toLowerCase());
      }
      if (date) {
        records = records.filter(r => r.date === date);
      }

      // Group records by Student Program (e.g. BSIT, BSGE, BSABE)
      const recordsByProgram: { [prog: string]: any[] } = {};
      records.forEach(r => {
        const progName = r.program ? r.program.toUpperCase().trim() : 'OTHER';
        if (!recordsByProgram[progName]) {
          recordsByProgram[progName] = [];
        }
        recordsByProgram[progName].push(r);
      });

      const sortedPrograms = Object.keys(recordsByProgram).sort();

      if (sortedPrograms.length === 0) {
        const ws = xlsx.utils.aoa_to_sheet([
          ['Student ID', 'Full Name', 'Program/Course', 'Year Level', 'Section', 'Event Name', 'Date', 'Time In', 'Time Out', 'Total Sanction Time']
        ]);
        xlsx.utils.book_append_sheet(wb, ws, 'Empty Report');
      } else {
        const getStudentSanctionHours = (stId: string) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const eventsList = db.getEvents();
          let hours = 0;
          eventsList.forEach(ev => {
            if (ev.date && ev.date <= todayStr) {
              const studentLog = allLogs.find(
                a => a.studentId === stId && (a.eventId === ev.id || (a.eventName && ev.name && a.eventName.trim().toLowerCase() === ev.name.trim().toLowerCase()))
              );

              const fullHours = getEventSanctionHours(ev);

              const hasTimeIn = Boolean(studentLog && studentLog.timeIn && studentLog.timeIn.trim() !== '');
              const hasTimeOut = Boolean(studentLog && studentLog.timeOut && studentLog.timeOut.trim() !== '' && studentLog.timeOut !== 'On Premises');

              if (hasTimeIn && hasTimeOut) {
                hours += 0; // Both present -> 0 hrs sanction
              } else if (hasTimeIn || hasTimeOut) {
                hours += fullHours * 0.5; // Single check-in (In-only OR Out-only) -> HALVED sanction!
              } else {
                hours += fullHours * 1.0; // Completely absent -> FULL sanction
              }
            }
          });
          return hours;
        };

        sortedPrograms.forEach(prog => {
          const list = recordsByProgram[prog];

          // Sort records by year level (numeric) then section code alphabetically
          list.sort((a, b) => {
            const ya = String(a.yearLevel || '');
            const yb = String(b.yearLevel || '');
            const cmpYear = ya.localeCompare(yb, undefined, { numeric: true });
            if (cmpYear !== 0) return cmpYear;

            const sa = String(a.section || '');
            const sb = String(b.section || '');
            return sa.localeCompare(sb);
          });

          // Map strictly to requested columns layout including Total Sanction Time
          const aoa = [
            ['Student ID', 'Full Name', 'Program/Course', 'Year Level', 'Section', 'Event Name', 'Date', 'Time In', 'Time Out', 'Total Sanction Time'],
            ...list.map(r => {
              const sancHrs = getStudentSanctionHours(r.studentId);
              return [
                r.studentId,
                r.studentName,
                r.program,
                r.yearLevel,
                r.section,
                r.eventName || 'CASH-LITE Program',
                r.date,
                r.timeIn || 'None',
                r.timeOut || 'On Premises',
                formatSanctionDuration(sancHrs)
              ];
            })
          ];

          const ws = xlsx.utils.aoa_to_sheet(aoa);
          const cleanSheetName = prog.replace(/[\\/?*\[\]:]/g, '').substring(0, 31) || 'Sheet';
          xlsx.utils.book_append_sheet(wb, ws, cleanSheetName);
        });
      }
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Generating clean, organized dynamic filenames for specific event and date exports
    let filenameParts = isSummaryMode ? ['activity_summary_report'] : ['attendance_report'];
    if (event) {
      const selectedEvent = db.getEvents().find(ev => ev.id === event || ev.name.toLowerCase() === (event as string).toLowerCase());
      const rawName = selectedEvent ? selectedEvent.name : (event as string);
      const eventNameClean = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      filenameParts.push(eventNameClean);
    }
    if (date) {
      filenameParts.push(date as string);
    } else {
      filenameParts.push(new Date().toISOString().split('T')[0]);
    }
    const finalFilename = `${filenameParts.join('_')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
    res.send(buffer);
  });


  // --- VITE DEV / PROD ASSET SERVING MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Success! Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SERVER] Critical Boot Failure:', err);
});
