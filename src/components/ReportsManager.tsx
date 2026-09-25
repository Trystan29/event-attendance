/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Search, 
  Download, 
  Trash2, 
  Plus, 
  RefreshCw, 
  UserCheck, 
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  X,
  RotateCcw,
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AttendanceRecord, Event, Department, Program, Section, Student } from '../types';

export function formatSanctionDuration(hours: number): string {
  const totalMinutes = Math.round((hours || 0) * 60);
  if (totalMinutes <= 0) return '0 mins';
  if (totalMinutes < 60) return `${totalMinutes} mins`;
  
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hStr = `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  
  if (m === 0) return hStr;
  return `${hStr} ${m} mins`;
}

export function getEventSanctionHours(ev?: { sanctionHours?: number; sanctionTime?: string } | null): number {
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

interface ReportsManagerProps {
  currentUsername: string;
}

export default function ReportsManager({ currentUsername }: ReportsManagerProps) {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const filteredSections = sections.filter(s => s.name.toUpperCase() !== 'E');
  const [loading, setLoading] = useState(true);

  // Sub tab view switcher: logs chronological tab vs summary matrix tab
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'summary'>('logs');
  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState<Student | null>(null);
  const [summaryFilterSearch, setSummaryFilterSearch] = useState('');

  // Report XLSX/CSV import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSelectedEventId, setImportSelectedEventId] = useState<string>('e1');
  const [importSanctionHours, setImportSanctionHours] = useState<number>(4);
  const [importSanctionUnit, setImportSanctionUnit] = useState<'hours' | 'mins'>('hours');

  // Filters state
  const [filterEvent, setFilterEvent] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSec, setFilterSec] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'present' | 'absent'>('');
  const [filterSanction, setFilterSanction] = useState<'all' | 'sanctioned' | 'none'>('all');

  // Quick targeted dynamic event report-specific downloader state
  const [quickEventId, setQuickEventId] = useState('');
  const [quickEventDate, setQuickEventDate] = useState('');

  const fetchFiltersAndLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [logsRes, evRes, deptRes, progRes, secRes, studRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/events'),
        fetch('/api/departments'),
        fetch('/api/programs'),
        fetch('/api/sections'),
        fetch('/api/students')
      ]);

      if (logsRes.ok) setLogs(await logsRes.json());
      if (evRes.ok) setEvents(await evRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (progRes.ok) setPrograms(await progRes.json());
      if (secRes.ok) setSections(await secRes.json());
      if (studRes.ok) setStudents(await studRes.json());
    } catch (e) {
      console.error('[REPORTS] Error pulling catalog systems: ', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndLogs();
    
    const today = new Date().toISOString().split('T')[0];
    setQuickEventDate(today);

    // Periodic background silent synchronization with the db
    const interval = setInterval(() => {
      fetchFiltersAndLogs(true);
    }, 2500);

    // Real-time WebSocket connection for instant scan updates
    let ws: WebSocket | null = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'attendance:updated') {
              fetchFiltersAndLogs(true);
            }
          } catch (e) {
            // Ignore parse errors
          }
        };
      } catch (e) {
        // Fallback to polling interval
      }
    };

    connectWebSocket();

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  // Filter logic executed locally on lists previewer
  const rawFilteredLogs = logs.filter(log => {
    const matchesEvent = filterEvent === '' || log.eventId === filterEvent;
    const matchesDept = filterDept === '' || log.department === filterDept;
    const matchesCourse = filterCourse === '' || log.program === filterCourse;
    const matchesSec = filterSec === '' ? true : (filterSec === 'FREE' ? ((log.section || '') === '' || (log.section || '').toUpperCase() === 'FREE') : log.section === filterSec);
    const matchesDate = filterDate === '' || log.date === filterDate;

    return matchesEvent && matchesDept && matchesCourse && matchesSec && matchesDate;
  });

  // Sort reverse chronologically so newly scanned records always appear at the top
  const filteredLogs = [...rawFilteredLogs].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    const getTs = (rec: typeof a) => {
      if (rec.id && rec.id.startsWith('att-')) {
        const num = parseInt(rec.id.replace('att-', ''), 10);
        if (!isNaN(num)) return num;
      }
      return 0;
    };
    const tsA = getTs(a);
    const tsB = getTs(b);
    if (tsA !== tsB) {
      return tsB - tsA;
    }
    return logs.indexOf(b) - logs.indexOf(a);
  });

  // Helper to determine morning (AM) vs afternoon (PM) session from timeIn
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

  // Compute distinct event dates and morning/afternoon session slots dynamically
  const computeSlots = () => {
    const dynamicSlotsList: { eventId: string; eventName: string; date: string; session: 'AM' | 'PM'; key: string }[] = [];
    const seenKeys = new Set<string>();

    // 1. Build list of slots with active attendance logs
    logs.forEach(log => {
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

    // 2. Pre-populate default expected slots for events in registry database
    events.forEach(ev => {
      if (ev.date) {
        let showAM = false;
        let showPM = false;

        if (ev.sessions) {
          if (ev.sessions === 'AM') {
            showAM = true;
          } else if (ev.sessions === 'PM') {
            showPM = true;
          } else if (ev.sessions === 'Both') {
            showAM = true;
            showPM = true;
          }
        } else {
          // Default backwards compatible behavior when not specified:
          // AM is default
          showAM = true;
          // PM is only for multi-session words
          const isMultiSession = ev.name.toLowerCase().includes('intramural') || 
                                 ev.name.toLowerCase().includes('sports') || 
                                 ev.name.toLowerCase().includes('fest') ||
                                 ev.name.toLowerCase().includes('athletic');
          if (isMultiSession) {
            showPM = true;
          }
        }

        if (showAM) {
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
        }

        if (showPM) {
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

    // 3. Chronological sorting
    dynamicSlotsList.sort((a, b) => {
      const dayCmp = a.date.localeCompare(b.date);
      if (dayCmp !== 0) return dayCmp;
      return a.session.localeCompare(b.session); // AM before PM
    });

    return dynamicSlotsList;
  };

  const dynamicSlots = computeSlots();

  // Calculate total sanction hours for a student based on attendance & absences
  const getStudentSanctions = (studentId: string) => {
    let totalHours = 0;
    const details: { eventId: string; eventName: string; date: string; hours: number }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    events.forEach(ev => {
      if (ev.date && ev.date <= todayStr) {
        const studentLog = logs.find(
          a => a.studentId === studentId && (
            a.eventId === ev.id || 
            (a.eventName && ev.name && a.eventName.trim().toLowerCase() === ev.name.trim().toLowerCase())
          )
        );

        const fullHours = getEventSanctionHours(ev);

        const hasTimeIn = Boolean(studentLog && studentLog.timeIn && studentLog.timeIn.trim() !== '');
        const hasTimeOut = Boolean(studentLog && studentLog.timeOut && studentLog.timeOut.trim() !== '' && studentLog.timeOut !== 'On Premises');

        let hours = 0;
        if (hasTimeIn && hasTimeOut) {
          hours = 0; // Both check-ins present -> 0 hrs sanction
        } else if (hasTimeIn || hasTimeOut) {
          hours = fullHours * 0.5; // Single check-in (Time-In ONLY or Time-Out ONLY) -> HALVED sanction!
        } else {
          hours = fullHours * 1.0; // Completely absent -> FULL sanction
        }

        if (hours > 0) {
          totalHours += hours;
          details.push({
            eventId: ev.id,
            eventName: ev.name,
            date: ev.date,
            hours
          });
        }
      }
    });

    return { totalHours, details };
  };

  // Filtered students list for search + course + section matching in Summary tab
  const filteredStudents = students.filter(student => {
    const matchesSearch = summaryFilterSearch === '' || 
      student.fullName.toLowerCase().includes(summaryFilterSearch.toLowerCase()) ||
      student.studentId.toLowerCase().includes(summaryFilterSearch.toLowerCase());
    const matchesCourse = filterCourse === '' || student.program === filterCourse;
    const matchesSec = filterSec === '' ? true : (filterSec === 'FREE' ? ((student.section || '') === '' || (student.section || '').toUpperCase() === 'FREE') : student.section === filterSec);
    const matchesDept = filterDept === '' || student.department === filterDept;

    let matchesStatus = true;
    if (filterStatus === 'present') {
      if (filterEvent) {
        matchesStatus = logs.some(log => log.studentId === student.studentId && log.eventId === filterEvent);
      } else {
        matchesStatus = logs.some(log => log.studentId === student.studentId);
      }
    } else if (filterStatus === 'absent') {
      if (filterEvent) {
        matchesStatus = !logs.some(log => log.studentId === student.studentId && log.eventId === filterEvent);
      } else {
        matchesStatus = !logs.some(log => log.studentId === student.studentId);
      }
    }

    let matchesSanction = true;
    if (filterSanction !== 'all') {
      const { totalHours } = getStudentSanctions(student.studentId);
      if (filterSanction === 'sanctioned') {
        matchesSanction = totalHours > 0;
      } else if (filterSanction === 'none') {
        matchesSanction = totalHours === 0;
      }
    }

    return matchesSearch && matchesCourse && matchesSec && matchesDept && matchesStatus && matchesSanction;
  }).sort((a, b) => {
    const progA = (a.program || '').toUpperCase().trim();
    const progB = (b.program || '').toUpperCase().trim();
    if (progA !== progB) {
      return progA.localeCompare(progB);
    }

    const ya = String(a.yearLevel || '');
    const yb = String(b.yearLevel || '');
    const cmpYear = ya.localeCompare(yb, undefined, { numeric: true });
    if (cmpYear !== 0) return cmpYear;

    const sa = (a.section || '').toUpperCase().trim();
    const sb = (b.section || '').toUpperCase().trim();
    const cmpSec = sa.localeCompare(sb);
    if (cmpSec !== 0) return cmpSec;

    const nameA = (a.fullName || '').toLowerCase().trim();
    const nameB = (b.fullName || '').toLowerCase().trim();
    return nameA.localeCompare(nameB);
  });

  // Dynamic specific organized event report exporter handler
  const handleQuickDownload = () => {
    if (!quickEventId || !quickEventDate) return;
    const params = new URLSearchParams();
    params.append('event', quickEventId);
    params.append('date', quickEventDate);
    const cached = localStorage.getItem('qr_attend_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.token) params.append('token', parsed.token);
      } catch (e) {}
    }
    window.location.href = `/api/reports/download?${params.toString()}`;
  };

  // Export multi-sheet sorted spreadsheet downloader using API trigger
  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (filterEvent) params.append('event', filterEvent);
    if (filterDept) params.append('department', filterDept);
    if (filterCourse) params.append('program', filterCourse);
    if (filterSec) params.append('section', filterSec);
    if (filterDate) params.append('date', filterDate);

    const cached = localStorage.getItem('qr_attend_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.token) params.append('token', parsed.token);
      } catch (e) {}
    }
    window.location.href = `/api/reports/download?${params.toString()}`;
  };

  // Export summary matrix spreadsheet downloader using API trigger
  const handleExportSummaryExcel = () => {
    const params = new URLSearchParams();
    params.append('mode', 'summary');
    if (filterDept) params.append('department', filterDept);
    if (filterCourse) params.append('program', filterCourse);
    if (filterSec) params.append('section', filterSec);
    if (filterEvent) params.append('event', filterEvent);
    if (filterStatus) params.append('status', filterStatus);

    const cached = localStorage.getItem('qr_attend_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.token) params.append('token', parsed.token);
      } catch (e) {}
    }
    window.location.href = `/api/reports/download?${params.toString()}`;
  };

  // Import report logs spreadsheet handler
  const handleReportLogsImport = async (file: File) => {
    setIsImporting(true);
    setImportError(null);
    setImportStatus('Parsing spreadsheet attendance report file...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      let parsedRecords: Partial<AttendanceRecord>[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        rows.forEach(row => {
          const findVal = (possibleKeys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const pk of possibleKeys) {
                if (cleanKey === pk.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                  return String(row[k]).trim();
                }
              }
            }
            return '';
          };

          const studentId = findVal(['student id', 'studentid', 'id', 'student no', 'student_no']);
          if (!studentId) return;

          const studentName = findVal(['full name', 'fullname', 'name', 'student name']);
          const department = findVal(['department', 'dept']) || 'CET';
          const program = findVal(['program/course', 'program', 'course']);
          const yearLevel = findVal(['year level', 'yearlevel', 'year']);
          const section = findVal(['section', 'sec']);
          const rowEventName = findVal(['event name', 'event', 'event_name']);
          const date = findVal(['date', 'scan date']) || new Date().toISOString().split('T')[0];
          const timeIn = findVal(['time in', 'timein', 'morning in', 'in']);
          const timeOut = findVal(['time out', 'timeout', 'afternoon out', 'out']);

          parsedRecords.push({
            studentId,
            studentName,
            department,
            program,
            yearLevel,
            section,
            eventName: rowEventName || undefined,
            date,
            timeIn: timeIn || '',
            timeOut: (timeOut && timeOut !== 'On Premises') ? timeOut : null,
            scannedBy: currentUsername + ' (Imported Log)'
          });
        });
      });

      if (parsedRecords.length === 0) {
        throw new Error('No valid attendance rows found in file. Please ensure spreadsheet contains "Student ID" or "ID" columns.');
      }

      setImportStatus(`Sending ${parsedRecords.length} report log records to database...`);

      const cached = localStorage.getItem('qr_attend_session');
      let token = '';
      if (cached) {
        try { token = JSON.parse(cached).token; } catch (e) {}
      }

      const computedSanctionTime = `${importSanctionHours} ${importSanctionUnit === 'hours' ? 'hours' : 'mins'} Community Service`;
      const computedSanctionHoursNum = importSanctionUnit === 'mins' ? (importSanctionHours / 60) : importSanctionHours;
      const targetEv = events.find(e => e.id === importSelectedEventId);

      const res = await fetch('/api/attendance/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          records: parsedRecords,
          eventId: importSelectedEventId,
          eventName: targetEv ? targetEv.name : undefined,
          date: targetEv ? targetEv.date : new Date().toISOString().split('T')[0],
          sanctionTime: computedSanctionTime,
          sanctionHours: computedSanctionHoursNum
        })
      });

      const response = await res.json();
      if (!res.ok) {
        throw new Error(response.error || 'Failed importing attendance records');
      }

      setImportStatus(`Import successful! ${response.added} new records added, ${response.updated} records updated.`);
      fetchFiltersAndLogs(true);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatus(null);
      }, 2500);
    } catch (err: any) {
      setImportError(err.message || 'Failed processing spreadsheet file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearTimeOut = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete/undo this student\'s Time-Out? This will set them back to "On Premises" status.')) {
      return;
    }
    try {
      const res = await fetch(`/api/attendance/${id}/clear-timeout`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to clear timeout');
      }
      // Refresh list silently
      fetchFiltersAndLogs(true);
    } catch (err: any) {
      alert(err.message || 'Error occurred clearing timeout');
    }
  };

  const handleDeleteAttendanceLog = async (id: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to completely delete the attendance record for ${studentName}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete attendance record');
      }
      // Refresh list silently
      fetchFiltersAndLogs(true);
    } catch (err: any) {
      alert(err.message || 'Error occurred deleting attendance record');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper context title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reports and Logs Console</h2>
          <p className="text-xs text-slate-500">
            Generate and export institutional Excel spreadsheet attendance reports.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg transition cursor-pointer"
          >
            <FileUp className="w-4 h-4" /> Import Report Logs (.xlsx)
          </button>
          
          {activeSubTab === 'logs' ? (
            <button
              onClick={handleExportExcel}
              disabled={filteredLogs.length === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition cursor-pointer ${
                filteredLogs.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Download className="w-4 h-4" /> Export Logs Excel (.xlsx)
            </button>
          ) : (
            <button
              onClick={handleExportSummaryExcel}
              disabled={filteredStudents.length === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition cursor-pointer ${
                filteredStudents.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Download className="w-4 h-4" /> Export Summary Matrix (.xlsx)
            </button>
          )}
        </div>
      </div>

      {/* Event-Specific Spreadsheet Exporter Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] tracking-wide uppercase select-none">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Organized Event Downloader
          </div>
          <h3 className="text-base font-extrabold text-slate-900 font-display">Event-Specific Attendance Download</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Quickly export a focused, organized MS Excel-compatible spreadsheet for a specific event on a specific date. This isolates only the selected event's logs for tidy records.
          </p>
          
          {/* Quick Click Event Markers Shortcuts */}
          <div className="pt-2">
            <span className="block text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">📅 Marked Event Dates (Quick Auto-Fill):</span>
            <div className="flex flex-wrap gap-1.5">
              {events.filter(ev => ev.date).map((ev) => {
                const isSelected = quickEventId === ev.id && quickEventDate === ev.date;
                return (
                  <button
                    key={`dl-btn-${ev.id}`}
                    onClick={() => {
                      setQuickEventId(ev.id);
                      setQuickEventDate(ev.date);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {ev.name} ({ev.date})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-end bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs shrink-0 w-full lg:w-auto lg:min-w-[580px]">
          <div className="space-y-1 text-left">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">1. Select Target Event</label>
            <select
              value={quickEventId}
              onChange={(e) => {
                const val = e.target.value;
                setQuickEventId(val);
                // Auto-set date to the selected event's defined date as a helpful starting point!
                const selectedEv = events.find(ev => ev.id === val);
                if (selectedEv && selectedEv.date) {
                  setQuickEventDate(selectedEv.date);
                }
              }}
              className="w-full text-xs py-2 px-3 border border-slate-200 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-250 rounded-lg bg-slate-50 text-slate-800 font-bold"
            >
              <option value="">-- Choose Event --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">2. Select Date</label>
            <input
              type="date"
              value={quickEventDate}
              onChange={(e) => setQuickEventDate(e.target.value)}
              className="w-full text-xs py-2 px-3 border border-slate-200 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-250 rounded-lg bg-slate-50 text-slate-800 font-bold focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <button
              onClick={handleQuickDownload}
              disabled={!quickEventId || !quickEventDate}
              className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs shadow-xs transition-all tracking-wide cursor-pointer ${
                !quickEventId || !quickEventDate
                  ? 'bg-slate-100 text-slate-400 border border-slate-250 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
              }`}
            >
              <Download className="w-4 h-4" /> Download Event Excel
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Active Event Calendar-Marked Selector Registry shortcuts for easy filter auto-setting */}
      <div className="bg-[#f0f9ff]/50 border border-blue-100 rounded-2xl p-4 shadow-sm space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Calendar-Marked Active Days Shortcut Registry:
          </span>
        </div>
        <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
          The following dates have been auto-marked from scheduled institutional events. Click any event badge below to instantly jump to that date and focus filters without manually searching through the calendar date-picker.
        </p>
        <div className="flex flex-wrap gap-2">
          {events.map((ev) => {
            if (!ev.date) return null;
            
            // Format friendly dates, e.g. 2026-05-25 to May 25, 2026
            const dateObj = new Date(ev.date);
            const formatted = isNaN(dateObj.getTime()) 
              ? ev.date 
              : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

            // Detect if this event's date is currently active/selected
            const isSelected = filterEvent === ev.id && filterDate === ev.date;

            return (
              <button
                key={`filter-badge-${ev.id}`}
                onClick={() => {
                  setFilterEvent(ev.id);
                  setFilterDate(ev.date);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border shrink-0 cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-100'
                    : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-350 hover:bg-slate-50 shadow-2xs'
                }`}
                title={`Instantly select event "${ev.name}" and date "${ev.date}"`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white animate-pulseScale' : 'bg-blue-500'}`} />
                <span className="font-bold">{ev.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({formatted})</span>
              </button>
            );
          })}
          
          {/* Quick Clear shortcut */}
          {(filterEvent || filterDate || filterStatus || filterSanction !== 'all') && (
            <button
              onClick={() => {
                setFilterEvent('');
                setFilterDate('');
                setFilterStatus('');
                setFilterSanction('all');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold text-slate-500 hover:text-slate-850 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-md transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}

          {events.filter(e => e.date).length === 0 && (
            <span className="text-xs text-slate-400 italic">No scheduled events with dates found in the database.</span>
          )}
        </div>
      </div>

      {/* Structured Filters board */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Event Scope</label>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white"
          >
            <option value="">All Events</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Program course</label>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white"
          >
            <option value="">All Courses</option>
            {programs.map(prog => (
              <option key={prog.id} value={prog.code}>{prog.code}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Class Section</label>
          <select
            value={filterSec}
            onChange={(e) => setFilterSec(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white"
          >
            <option value="">All Sections</option>
            <option value="FREE">Free Section</option>
            {filteredSections.map(sec => (
              <option key={sec.id} value={sec.name}>Section {sec.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Scan Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full text-xs py-1.5 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Attendance Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="present">Only Present</option>
            <option value="absent">Only Absent (No-Show)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sanction Status</label>
          <select
            value={filterSanction}
            onChange={(e) => setFilterSanction(e.target.value as any)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All (Sanction / Clear)</option>
            <option value="sanctioned">Only With Sanctions</option>
            <option value="none">No Sanctions (Clear)</option>
          </select>
        </div>
      </div>

      {/* Main Results database tabular table preview or Student Matrix Summary view */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between min-h-[380px]">
        {/* Sub-tab selection controls header */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 items-center justify-between px-2 pr-4 flex-wrap gap-2">
          <div className="flex">
            <button
              onClick={() => setActiveSubTab('logs')}
              className={`px-4 py-3 text-xs font-extrabold border-b-2 transition duration-150 cursor-pointer ${
                activeSubTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Chronological Scan Logs ({filteredLogs.length})
            </button>
            <button
              onClick={() => setActiveSubTab('summary')}
              className={`px-4 py-3 text-xs font-extrabold border-b-2 transition duration-150 cursor-pointer ${
                activeSubTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Student Activity Summary Matrix ({filteredStudents.length})
            </button>
          </div>

          {activeSubTab === 'summary' && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-2xs my-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={summaryFilterSearch}
                onChange={(e) => setSummaryFilterSearch(e.target.value)}
                placeholder="Search class rows..."
                className="text-[11px] font-bold focus:outline-none bg-transparent w-36 text-slate-700"
              />
              {summaryFilterSearch && (
                <button onClick={() => setSummaryFilterSearch('')} className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-2.5 text-xs text-slate-500">Querying registry database...</span>
          </div>
        ) : activeSubTab === 'logs' ? (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-220 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Program</th>
                  <th className="p-4 text-center">Class Year & Sec</th>
                  <th className="p-4">Log Location Event</th>
                  <th className="p-4">Scan Date</th>
                  <th className="p-4 text-center">Time In</th>
                  <th className="p-4 text-center">Time Out</th>
                  <th className="p-4 text-center bg-amber-50/50 text-amber-800">Total Sanction Time</th>
                  <th className="p-4 text-right">Logged By</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => {
                    const ev = events.find(e => e.id === log.eventId || (log.eventName && e.name.trim().toLowerCase() === log.eventName.trim().toLowerCase()));
                    const fullHours = getEventSanctionHours(ev);
                    const hasIn = Boolean(log.timeIn && log.timeIn.trim() !== '');
                    const hasOut = Boolean(log.timeOut && log.timeOut.trim() !== '' && log.timeOut !== 'On Premises');
                    let logSanctionHours = 0;
                    if (hasIn && hasOut) {
                      logSanctionHours = 0;
                    } else if (hasIn || hasOut) {
                      logSanctionHours = fullHours * 0.5;
                    } else {
                      logSanctionHours = fullHours;
                    }

                    const studentTotalSanction = getStudentSanctions(log.studentId).totalHours;

                    return (
                    <tr key={log.id} className="hover:bg-blue-50/10 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{log.studentId}</td>
                      <td className="p-4 font-semibold text-slate-800">{log.studentName}</td>
                      <td className="p-4 text-slate-500">{log.department}</td>
                      <td className="p-4 font-mono text-xs">{log.program}</td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-50 border px-2 py-0.5 rounded-md font-bold text-slate-500">
                          {log.yearLevel}{log.section ? `-${log.section}` : ''}
                        </span>
                      </td>
                      <td className="p-4 truncate max-w-[150px] font-semibold text-blue-900" title={log.eventName}>
                        {log.eventName}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">{log.date}</td>
                      <td className="p-4 text-center text-emerald-600 font-semibold">{log.timeIn || '-'}</td>
                      <td className="p-4 text-center text-rose-500 font-semibold">
                        {log.timeOut ? (
                          <div className="flex items-center justify-center gap-1.5 group">
                            <span className="tabular-nums">{log.timeOut}</span>
                            <button
                              onClick={() => handleClearTimeOut(log.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Delete/Undo Time-Out"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-50 border px-1.5 py-0.5 rounded">
                            On Premises
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold" title={`This Event: ${formatSanctionDuration(logSanctionHours)} | Total Student Accumulated Sanction: ${formatSanctionDuration(studentTotalSanction)}`}>
                        {studentTotalSanction > 0.001 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200/90 rounded-md font-extrabold text-[11px] shadow-2xs">
                            {formatSanctionDuration(studentTotalSanction)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 rounded text-[10px] font-semibold">
                            0 mins
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right text-slate-400 capitalize">{log.scannedBy}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteAttendanceLog(log.id, log.studentName)}
                          className="p-1 text-slate-450 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Attendance Log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
                ) : (
                  <tr>
                    <td colSpan={12} className="p-16 text-center text-slate-400 italic">
                      No matching attendance records found matching filters selected. Add filters or trigger mock scans.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-205 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                  <th className="p-4 sticky left-0 bg-slate-50 border-r min-w-[130px] z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] text-[10px]">Student ID</th>
                  <th className="p-4 sticky left-[130px] bg-slate-50 border-r min-w-[200px] z-10 shadow-[2px_0_0_0_rgba(226,232,240,1)] text-[10px]">Full Name</th>
                  <th className="p-4 border-r text-center min-w-[90px] text-[10px]">Year-Sec</th>
                  <th className="p-4 border-r text-center min-w-[125px] text-[10px] bg-red-55/60 text-red-700 font-extrabold">Sanction Hours</th>
                  {dynamicSlots.length > 0 ? (
                    dynamicSlots.map(slot => (
                      <th key={slot.key} className="p-3 text-center border-r min-w-[145px] bg-slate-100/30">
                        <div className="truncate font-extrabold text-slate-700 font-display" title={slot.eventName}>
                          {slot.eventName}
                        </div>
                        <div className="text-[9px] font-mono font-semibold text-slate-400 mt-0.5">
                          {slot.date} ({slot.session})
                        </div>
                      </th>
                    ))
                  ) : (
                    <th className="p-4 text-slate-400 italic font-medium text-[10px]">No event slots detected</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => {
                    const { totalHours } = getStudentSanctions(student.studentId);
                    return (
                      <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 font-bold text-blue-600 sticky left-0 bg-white group-hover:bg-slate-50/80 z-10 border-r shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForSummary(student)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold text-left cursor-pointer focus:outline-none"
                          >
                            {student.studentId}
                          </button>
                        </td>
                        <td className="p-4 font-extrabold text-slate-800 sticky left-[130px] bg-white group-hover:bg-slate-50/80 z-10 border-r shadow-[2px_0_0_0_rgba(226,232,240,1)]">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForSummary(student)}
                            className="hover:text-blue-600 hover:underline text-left cursor-pointer focus:outline-none"
                          >
                            {student.fullName}
                          </button>
                        </td>
                        <td className="p-4 text-center border-r font-bold text-slate-500">
                          {student.program} {student.yearLevel}{student.section ? `-${student.section}` : ''}
                        </td>
                        <td className="p-4 text-center border-r font-extrabold">
                          {totalHours > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 rounded font-black text-[11px] shadow-2xs">
                              {formatSanctionDuration(totalHours)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold text-[11px]">
                              0 mins
                            </span>
                          )}
                        </td>
                        {dynamicSlots.map(slot => {
                          const matchedLog = logs.find(
                            a => a.studentId === student.studentId &&
                                 a.eventId === slot.eventId &&
                                 a.date === slot.date &&
                                 getSessionType(a.timeIn) === slot.session
                          );

                          return (
                            <td key={`cell-${student.studentId}-${slot.key}`} className="p-3 text-center border-r font-semibold">
                              {matchedLog ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black transition shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-200/50 rounded-full text-[10px] font-medium opacity-60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  Absent
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3 + Math.max(1, dynamicSlots.length)} className="p-16 text-center text-slate-400 italic">
                      No student records found matching filters selected. Please double check student catalogs or database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t bg-slate-50 flex flex-wrap justify-between items-center bg-slate-100/40 text-[11px] text-slate-400">
          <span>
            {activeSubTab === 'logs' ? (
              <>Preview matches <strong className="font-bold text-slate-600">{filteredLogs.length}</strong> attendance registers</>
            ) : (
              <>Filtered classroom of <strong className="font-bold text-slate-600">{filteredStudents.length}</strong> registered students matrix</>
            )}
          </span>
          <span className="font-bold text-slate-505">
            Export generates clean, multi-sheet MS Excel (.xlsx) workbooks categorized by course
          </span>
        </div>
      </div>

      {/* STUDENT DETAILED PERFORMANCE TIMELINE SUMMARY MODAL */}
      {selectedStudentForSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b bg-slate-50">
              <div>
                <span className="text-[10px] tracking-wider uppercase font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  Student Activity Profile Summary
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg mt-1 font-display">
                  {selectedStudentForSummary.fullName}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                  <span>Student ID: <strong className="font-semibold text-slate-700">{selectedStudentForSummary.studentId}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Class: <strong className="font-semibold text-slate-700">{selectedStudentForSummary.program} {selectedStudentForSummary.yearLevel}{selectedStudentForSummary.section ? `-${selectedStudentForSummary.section}` : ''}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentForSummary(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Statistics Overview Card */}
              <div className="grid grid-cols-4 gap-4 bg-blue-50/30 p-4 border border-blue-100/50 rounded-xl">
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Total Sessions</span>
                  <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">{dynamicSlots.length}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-emerald-650 uppercase tracking-wider">Present</span>
                  <span className="text-lg font-black text-emerald-600 font-mono mt-0.5 block">
                    {dynamicSlots.filter(slot => logs.some(
                      a => a.studentId === selectedStudentForSummary.studentId && 
                           a.eventId === slot.eventId && 
                           a.date === slot.date && 
                           getSessionType(a.timeIn) === slot.session
                    )).length}
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-rose-505 uppercase tracking-wider">Absent</span>
                  <span className="text-lg font-black text-rose-600 font-mono mt-0.5 block">
                    {dynamicSlots.filter(slot => !logs.some(
                      a => a.studentId === selectedStudentForSummary.studentId && 
                           a.eventId === slot.eventId && 
                           a.date === slot.date && 
                           getSessionType(a.timeIn) === slot.session
                    )).length}
                  </span>
                </div>
                <div className="text-center border-l pl-2.5 border-slate-200">
                  <span className="block text-[10px] font-bold text-red-600 uppercase tracking-wider">Sanctions</span>
                  <span className="text-lg font-black text-red-650 font-mono mt-0.5 block">
                    {formatSanctionDuration(getStudentSanctions(selectedStudentForSummary.studentId).totalHours)}
                  </span>
                </div>
              </div>

              {/* Attendance Timeline track */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Attended Activities Checklist</h4>
                <div className="space-y-2.5">
                  {dynamicSlots.map((slot, index) => {
                    const matchedLog = logs.find(
                      a => a.studentId === selectedStudentForSummary.studentId && 
                           a.eventId === slot.eventId && 
                           a.date === slot.date && 
                           getSessionType(a.timeIn) === slot.session
                    );

                    // Calculate sanction hours for this slot specifically
                    const ev = events.find(e => e.id === slot.eventId);
                    const sanctionHours = getEventSanctionHours(ev);

                    // Form friendly dates
                    const dateObj = new Date(slot.date);
                    const formattedDate = isNaN(dateObj.getTime()) 
                      ? slot.date 
                      : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

                    return (
                      <div 
                        key={`profile-slot-${slot.key}-${index}`}
                        className={`p-3.5 rounded-xl border transition flex items-center justify-between text-xs ${
                          matchedLog 
                            ? 'bg-emerald-50/40 border-emerald-100' 
                            : 'bg-slate-50/50 border-slate-200/65'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-extrabold text-slate-800 text-[13px]">{slot.eventName}</div>
                          <div className="text-[11px] text-slate-505 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-slate-450">{formattedDate}</span>
                            <span className="text-slate-300">•</span>
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                              slot.session === 'AM' 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200/60' 
                                : 'bg-indigo-50 text-indigo-800 border border-indigo-200/60'
                            }`}>
                              {slot.session} Session
                            </span>
                            {!matchedLog && sanctionHours > 0 && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                                  {formatSanctionDuration(sanctionHours)} Sanction
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          {matchedLog ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border-emerald-250 border rounded-full font-extrabold text-[10px] tracking-wider uppercase inline-flex items-center gap-1.5 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Present
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">
                                In: {matchedLog.timeIn} {matchedLog.timeOut ? `| Out: ${matchedLog.timeOut}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="px-3 py-1 bg-slate-105 text-slate-500 border border-slate-200 rounded-full font-bold text-[10px] tracking-wider uppercase inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Absent
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.append('mode', 'summary');
                  params.append('studentId', selectedStudentForSummary.studentId);
                  window.location.href = `/api/reports/download?${params.toString()}`;
                }}
                className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" /> Export Student Report (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentForSummary(null)}
                className="px-4.5 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-105 border border-slate-200 rounded-lg transition cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Report Logs Spreadsheet (.xlsx / .csv) Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileUp className="w-5 h-5 text-blue-600" />
                Import Attendance Report Logs (.xlsx / .csv)
              </h3>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                  setImportStatus(null);
                }}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your attendance spreadsheet report file (.xlsx, .xls, .csv). The system will parse student records, automatically mapping <strong>Student ID</strong>, <strong>Time In</strong>, <strong>Time Out</strong>, and <strong>Date</strong> directly into the system database.
              </p>

              {/* Event Selector & Sanction Config */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Import Event & Sanction Time Setting
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                      Target Event
                    </label>
                    <select
                      value={importSelectedEventId}
                      onChange={(e) => setImportSelectedEventId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name} ({ev.date || 'No Date'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                        Sanction Rate Amount
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={importSanctionHours}
                        onChange={(e) => setImportSanctionHours(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        placeholder="4"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                        Time Unit
                      </label>
                      <select
                        value={importSanctionUnit}
                        onChange={(e) => setImportSanctionUnit(e.target.value as 'hours' | 'mins')}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="hours">Hours Community Service</option>
                        <option value="mins">Minutes Community Service</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
                      <span>Automatic Sanction Calculation Rules:</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                        Rate: {formatSanctionDuration(importSanctionUnit === 'mins' ? importSanctionHours / 60 : importSanctionHours)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-medium text-center">
                      <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded border border-emerald-200">
                        <div className="font-bold">Both In & Out</div>
                        <div className="text-[11px] font-black text-emerald-900 mt-0.5">0 mins</div>
                      </div>
                      <div className="bg-amber-50 text-amber-800 p-1.5 rounded border border-amber-200">
                        <div className="font-bold">In-Only / Out-Only</div>
                        <div className="text-[11px] font-black text-amber-900 mt-0.5">
                          {formatSanctionDuration((importSanctionUnit === 'mins' ? importSanctionHours / 60 : importSanctionHours) * 0.5)}
                        </div>
                      </div>
                      <div className="bg-rose-50 text-rose-800 p-1.5 rounded border border-rose-200">
                        <div className="font-bold">Absent (Neither)</div>
                        <div className="text-[11px] font-black text-rose-900 mt-0.5">
                          {formatSanctionDuration(importSanctionUnit === 'mins' ? importSanctionHours / 60 : importSanctionHours)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>{importError}</div>
                </div>
              )}

              {importStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs font-semibold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <div>{importStatus}</div>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 text-center bg-slate-50/50 transition">
                <input
                  type="file"
                  id="importReportFile"
                  accept=".xlsx,.xls,.csv"
                  disabled={isImporting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleReportLogsImport(file);
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="importReportFile"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 hover:underline">Click to browse file</span>
                    <span className="text-xs text-slate-500"> or drag and drop spreadsheet here</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Supports MS Excel (.xlsx, .xls) and CSV (.csv)
                  </p>
                </label>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" /> Expected Columns in Spreadsheet:
                </div>
                <div className="text-slate-600 leading-snug font-sans text-[11px]">
                  Headers like <strong>Student ID</strong>, <strong>Full Name</strong>, <strong>Program</strong>, <strong>Year Level</strong>, <strong>Section</strong>, <strong>Date</strong>, <strong>Time In</strong>, and <strong>Time Out</strong> will be parsed automatically.
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportError(null);
                    setImportStatus(null);
                  }}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
