/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Search, 
  Download, 
  Printer, 
  Upload, 
  Trash2, 
  Edit3, 
  CornerDownRight, 
  X, 
  Check, 
  Info,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Student, Department, Program, Section } from '../types';
import { normalizeStudentName, StudentNameOrder, studentNamesMatch } from '../utils/studentName';

interface StudentManagerProps {
  currentUserRole: 'admin' | 'staff';
}

interface ImportWorksheet {
  name: string;
  csv: string;
}

interface StudentDirectoryCache {
  students: Student[];
  departments: Department[];
  programs: Program[];
  sections: Section[];
  cachedAt: number;
}

const ADD_AS_NEW_IMPORT_ROW = '__add_as_new_student__';

interface ImportReviewRow {
  importedStudent: Student;
  selectedStudentId: string;
  searchQuery: string;
  isPickerOpen: boolean;
}

interface PendingImportReview {
  students: Student[];
  rows: ImportReviewRow[];
  reservedStudentIds: string[];
  duplicateIdSkippedCount: number;
  rosterConflictSkippedCount: number;
  headerRowSkipped: boolean;
  duplicateCsvCount: number;
  malformedOrEmptyCount: number;
}

let studentDirectoryCache: StudentDirectoryCache | null = null;
const getFreshStudentDirectoryCache = () =>
  studentDirectoryCache && Date.now() - studentDirectoryCache.cachedAt < 60_000
    ? studentDirectoryCache
    : null;

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let value = '';
  let insideQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === ',' && !insideQuotes) {
      cells.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
};

export default function StudentManager({ currentUserRole }: StudentManagerProps) {
  const [students, setStudents] = useState<Student[]>(() => getFreshStudentDirectoryCache()?.students || []);
  const [departments, setDepartments] = useState<Department[]>(() => getFreshStudentDirectoryCache()?.departments || []);
  const [programs, setPrograms] = useState<Program[]>(() => getFreshStudentDirectoryCache()?.programs || []);
  const [sections, setSections] = useState<Section[]>(() => getFreshStudentDirectoryCache()?.sections || []);
  // Hide 'E' and any section literally named FREE (the "Free Section" option is already built in)
  const filteredSections = sections.filter(s => {
    const n = s.name.trim().toUpperCase();
    return n !== 'E' && n !== 'FREE';
  });
  // Stored year levels can be "FREE", "FREE Year", "free year", etc. - treat all as Free Year
  const isFreeYear = (y: string | undefined | null) => String(y || '').trim().toUpperCase().startsWith('FREE');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSec, setFilterSec] = useState('');
  const [studentPage, setStudentPage] = useState(0);
  const studentsPerPage = 100;

  // Modals / Creators
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintBadgeOpen, setIsPrintBadgeOpen] = useState(false);

  // Single Student focus
  const [viewedStudent, setViewedStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentDraft, setEditingStudentDraft] = useState<Pick<Student, 'studentId' | 'fullName' | 'department' | 'program' | 'yearLevel' | 'section'> | null>(null);

  // Form states
  const [newStudent, setNewStudent] = useState<Omit<Student, 'createdAt'>>({
    studentId: '',
    fullName: '',
    department: 'CET',
    program: '',
    yearLevel: '1',
    section: ''
  });

  const [importCsvInput, setImportCsvInput] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importWorksheets, setImportWorksheets] = useState<ImportWorksheet[]>([]);
  const [selectedImportWorksheet, setSelectedImportWorksheet] = useState('');
  const [importPreviewSearch, setImportPreviewSearch] = useState('');
  const [studentNameOrder, setStudentNameOrder] = useState<StudentNameOrder>('auto');
  const [importMatchBy, setImportMatchBy] = useState<'studentId' | 'fullName'>('studentId');
  const [importUpdateFields, setImportUpdateFields] = useState<Array<'studentId' | 'fullName' | 'department' | 'program' | 'yearLevel' | 'section'>>([
    'fullName', 'department', 'program', 'yearLevel', 'section'
  ]);
  const [updateExistingStudents, setUpdateExistingStudents] = useState(true);
  const [pendingImportReview, setPendingImportReview] = useState<PendingImportReview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrCache, setQrCache] = useState<{ [id: string]: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const getQrIdentity = (student: Student) => student.qrCodeId || student.studentId;

  const normalizeImportedStudentName = (rawName: string) => {
    const cleanedName = rawName.replace(/^\s*\d+\s*:\s*/, '');
    if (studentNameOrder !== 'auto' || cleanedName.includes(',')) {
      return normalizeStudentName(cleanedName, studentNameOrder);
    }

    const candidates = [
      normalizeStudentName(cleanedName, 'given-first'),
      normalizeStudentName(cleanedName, 'surname-first')
    ];
    const matchingCandidates = candidates.filter(candidate =>
      students.some(student => studentNamesMatch(student.fullName, candidate))
    );
    return matchingCandidates.length === 1 ? matchingCandidates[0] : candidates[0];
  };

  // Load rosters and categories
  const fetchData = async () => {
    try {
      const [studRes, deptRes, progRes, secRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/departments'),
        fetch('/api/programs'),
        fetch('/api/sections')
      ]);

      if (studRes.ok) {
        const fetchedStudents: Student[] = await studRes.json();
        setStudents(fetchedStudents);
        setViewedStudent(current =>
          current ? fetchedStudents.find(student => student.studentId === current.studentId) || null : null
        );
      }
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (progRes.ok) setPrograms(await progRes.json());
      if (secRes.ok) setSections(await secRes.json());
    } catch (e) {
      console.error('[STUDENT] Failed retrieving rosters:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    studentDirectoryCache = { students, departments, programs, sections, cachedAt: Date.now() };
  }, [students, departments, programs, sections]);

  // Generate QR images only when requested; building every QR at directory load
  // makes large rosters slow and consumes memory unnecessarily.
  useEffect(() => {
    if (!viewedStudent) return;
    const qrIdentity = getQrIdentity(viewedStudent);
    if (qrCache[qrIdentity]) return;
    let cancelled = false;
    QRCode.toDataURL(qrIdentity, {
      width: 250,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    }).then(qrData => {
      if (!cancelled) setQrCache(prev => ({ ...prev, [qrIdentity]: qrData }));
    }).catch(err => {
      console.error('Failed generating QR base64 code for student ID', viewedStudent.studentId, err);
    });
    return () => { cancelled = true; };
  }, [viewedStudent, qrCache]);

  // Handle single student adding manually
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newStudent.studentId || !newStudent.fullName || !newStudent.department || !newStudent.program) {
      setErrorMessage('Please fill in all requested fields.');
      return;
    }

    // ID Collision checking locally for instant response
    if (students.some(s => s.studentId === newStudent.studentId)) {
      setErrorMessage(`Student ID "${newStudent.studentId}" already exists in the institutional database.`);
      return;
    }

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server error creating student');
      }

      const created = await res.json();
      setStudents(prev => [...prev, created]);
      setSuccessMessage(`Successfully registered student: ${created.fullName}`);
      
      // Reset form
      setNewStudent({
        studentId: '',
        fullName: '',
        department: 'CET',
        program: '',
        yearLevel: '1',
        section: ''
      });
      setIsNewModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error creating student.');
    }
  };

  // Inline update handler
  const handleUpdateStudent = async (id: string, updatedFields: Partial<Student>) => {
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed updating student metadata.');
      }
      const updated = await res.json();
      setStudents(prev => prev.map(s => s.studentId === id ? updated : s));
      setViewedStudent(current => current?.studentId === id ? updated : current);
      setEditingStudentId(null);
      setEditingStudentDraft(null);
      setSuccessMessage(`Updated student record for ${updated.fullName}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed updating student metadata.');
    }
  };

  const saveStudentEdit = () => {
    if (!editingStudentId || !editingStudentDraft) return;
    if (!editingStudentDraft.studentId.trim() || !editingStudentDraft.fullName.trim()) {
      setErrorMessage('Student ID and name are required.');
      return;
    }
    const originalStudent = students.find(student => student.studentId === editingStudentId);
    if (!originalStudent) {
      setErrorMessage('Could not find the student record being edited. Refresh the directory and try again.');
      return;
    }

    const updatedFields = {
      ...editingStudentDraft,
      studentId: editingStudentDraft.studentId.trim(),
      fullName: editingStudentDraft.fullName.trim()
    };
    const fieldLabels: Array<[keyof typeof updatedFields, string]> = [
      ['studentId', 'Student ID'],
      ['fullName', 'Name'],
      ['department', 'College'],
      ['program', 'Program'],
      ['yearLevel', 'Year'],
      ['section', 'Section']
    ];
    const changes = fieldLabels
      .filter(([field]) => (originalStudent[field] || '') !== (updatedFields[field] || ''))
      .map(([field, label]) => `${label}: "${originalStudent[field] || '(blank)'}" -> "${updatedFields[field] || '(blank)'}"`);

    if (changes.length === 0) {
      setEditingStudentId(null);
      setEditingStudentDraft(null);
      return;
    }

    if (!window.confirm(`Save these changes for ${originalStudent.fullName}?\n\n${changes.join('\n')}`)) {
      return;
    }

    void handleUpdateStudent(editingStudentId, updatedFields);
  };

  // Delete handler
  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('WARNING: Deleting this student will also cascade-delete their entire event attendance scan records. Continue?')) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.studentId !== id));
        if (viewedStudent?.studentId === id) {
          setViewedStudent(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!window.confirm('CRITICAL ACTION WARNING: This will permanently delete ALL registered students and cascade clear ALL attendance scan logs from the system! This action CANNOT be undone. Are you sure you want to proceed?')) {
      return;
    }
    if (!window.confirm('FINAL CONFIRMATION: Are you absolutely sure you want to wipe the student directories and delete all attendance logs? This will reset the scanner database totally.')) {
      return;
    }

    try {
      const res = await fetch('/api/students', { method: 'DELETE' });
      if (res.ok) {
        setStudents([]);
        setViewedStudent(null);
        setSuccessMessage('Successfully deleted all students and cascade cleared all attendance scan histories.');
        setErrorMessage(null);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to wipe students database rosters.');
      }
    } catch (err: any) {
      setErrorMessage('Network error wiping student registry.');
    }
  };

  // Core Excel (CSV) Importer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    try {
      if (/\.(xlsx?|xlsm)$/i.test(file.name)) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const worksheets = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          if (!sheet) throw new Error(`Worksheet "${name}" could not be read.`);
          return { name, csv: XLSX.utils.sheet_to_csv(sheet) };
        });
        if (worksheets.length === 0) {
          throw new Error('The selected Excel workbook does not contain a worksheet.');
        }
        setImportWorksheets(worksheets);
        setSelectedImportWorksheet(worksheets[0].name);
        setImportCsvInput(worksheets[0].csv);
      } else {
        setImportWorksheets([]);
        setSelectedImportWorksheet('');
        const fileData = await file.arrayBuffer();
        try {
          setImportCsvInput(new TextDecoder('utf-8', { fatal: true }).decode(fileData));
        } catch {
          setImportCsvInput(new TextDecoder('windows-1252').decode(fileData));
        }
      }
      setImportFileName(file.name);
    } catch (err) {
      setErrorMessage(err instanceof Error ? `Could not read the selected file: ${err.message}` : 'Could not read the selected file.');
    } finally {
      input.value = '';
    }
  };

  const importPreviewCandidates = importCsvInput
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(parseCsvLine)
    .filter(cells => cells[0] && cells[1]);
  const firstPreviewRow = importPreviewCandidates[0] || [];
  const previewHasHeader = firstPreviewRow.some(cell => {
    const normalizedCell = cell.toLocaleLowerCase().replace(/[^a-z]/g, '');
    return normalizedCell === 'studentid' || normalizedCell === 'fullname' || normalizedCell === 'studentnumber';
  });
  const importPreviewDataRows = importPreviewCandidates
    .slice(previewHasHeader ? 1 : 0)
    .map(cells => ({ id: cells[0], name: cells[1] }));
  const matchingPreviewRows = importPreviewDataRows.filter(row =>
    !importPreviewSearch.trim()
    || row.id.toLocaleLowerCase().includes(importPreviewSearch.toLocaleLowerCase())
    || row.name.toLocaleLowerCase().includes(importPreviewSearch.toLocaleLowerCase())
  );
  const importPreviewRows = matchingPreviewRows.slice(0, 6);

  const submitStudentImport = async (review: PendingImportReview, matchOverrides: Array<{ studentId: string; importedName: string; importedStudentId?: string }>) => {
    setIsImportModalOpen(false);
    setPendingImportReview(null);
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: review.students,
          matchBy: importMatchBy,
          updateFields: updateExistingStudents ? importUpdateFields : [],
          replaceExisting: updateExistingStudents,
          addUnmatchedNames: review.rows
            .filter(row => row.selectedStudentId === ADD_AS_NEW_IMPORT_ROW)
            .map(row => row.importedStudent.fullName),
          matchOverrides
        })
      });

      if (!res.ok) {
        const error = await res.json();
        const importError = new Error(error.error || 'Roster import processing failure on backend.') as Error & {
          conflicts?: Array<{ studentId: string; currentOwnerName: string; incomingName: string }>;
        };
        importError.conflicts = Array.isArray(error.conflicts) ? error.conflicts : undefined;
        throw importError;
      }

      const stats = await res.json();
      let message = `Roster successfully imported! Added: ${stats.added} new records, Updated: ${stats.updated} existing records, Skipped: ${stats.skipped || 0} existing records.`;
      if (review.duplicateIdSkippedCount > 0) message += ` Skipped ${review.duplicateIdSkippedCount} row(s) with duplicate student IDs.`;
      if (review.rosterConflictSkippedCount > 0) message += ` Skipped ${review.rosterConflictSkippedCount} row(s) whose IDs were already assigned in the roster.`;
      if (stats.ambiguous > 0) message += ` Ambiguous matches skipped: ${stats.ambiguous}.`;
      if (stats.idUpdated > 0) {
        message += ` Student IDs corrected for ${stats.idUpdated} students; existing QR badges and attendance reports are preserved.`;
      }
      const skipNotes: string[] = [];
      if (review.headerRowSkipped) skipNotes.push('skipped 1 header row');
      if (review.duplicateCsvCount > 0) skipNotes.push(`resolved ${review.duplicateCsvCount} duplicate IDs inside the file`);
      if (review.malformedOrEmptyCount > 0) skipNotes.push(`skipped ${review.malformedOrEmptyCount} malformed/empty rows`);
      if (skipNotes.length > 0) message += ` (${skipNotes.join(', ')}).`;

      setSuccessMessage(message);
      setImportCsvInput('');
      setImportFileName('');
      setImportWorksheets([]);
      setSelectedImportWorksheet('');
      setImportPreviewSearch('');
      setIsImportModalOpen(false);
      setPendingImportReview(null);
      fetchData();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed transmitting batch data.';
      const idConflicts = Array.isArray(err.conflicts) ? err.conflicts as Array<{
        studentId: string;
        currentOwnerName: string;
        incomingName: string;
      }> : [];
      if (idConflicts.length > 0) {
        const conflictList = idConflicts.map(conflict =>
          `• ${conflict.studentId}: currently ${conflict.currentOwnerName}; import assigns it to ${conflict.incomingName}`
        );
        const omittedCount = Math.max(0, conflictList.length - 12);
        const confirmationText = [
          `${idConflicts.length} student ID conflict(s) block this import:`,
          ...conflictList.slice(0, 12),
          ...(omittedCount ? [`…and ${omittedCount} more.`] : []),
          '',
          'Skip all conflicting imported student rows and import the rest?'
        ].join('\n');
        if (!window.confirm(confirmationText)) {
          setErrorMessage(`${errorMessage} No changes were applied. Correct the IDs or matches and import again.`);
          return;
        }

        const conflictKeys = new Set(idConflicts.map(conflict =>
          `${conflict.studentId.trim().toLocaleLowerCase()}\u0000${normalizeStudentName(conflict.incomingName).toLocaleLowerCase()}`
        ));
        const isConflictingImport = (student: Student) =>
          conflictKeys.has(`${student.studentId.trim().toLocaleLowerCase()}\u0000${normalizeStudentName(student.fullName).toLocaleLowerCase()}`);
        const nextReview = {
          ...review,
          students: review.students.filter(student => !isConflictingImport(student)),
          rows: review.rows.filter(row => !isConflictingImport(row.importedStudent)),
          rosterConflictSkippedCount: review.rosterConflictSkippedCount + idConflicts.length
        };
        const nextOverrides = matchOverrides.filter(match =>
          !conflictKeys.has(`${(match.importedStudentId || '').trim().toLocaleLowerCase()}\u0000${normalizeStudentName(match.importedName).toLocaleLowerCase()}`)
        );
        const skippedCount = review.students.length - nextReview.students.length;
        if (skippedCount === 0) {
          setErrorMessage('The conflicting rows could not be located in this pending import, so nothing was retried. Reopen the file and check its IDs and names.');
          return;
        }
        if (nextReview.students.length === 0) {
          setErrorMessage('All imported rows with student ID conflicts were skipped; no changes were applied.');
          return;
        }
        await submitStudentImport(nextReview, nextOverrides);
        return;
      }
      const rosterIdConflict = errorMessage.match(/Student ID "([^"]+)" is still assigned to "([^"]+)" in the existing roster, and the import also assigns it to "([^"]+)"/i);
      if (rosterIdConflict) {
        const [, conflictingId, currentOwnerName, incomingName] = rosterIdConflict;
        if (window.confirm(
          `Student ID "${conflictingId}" already belongs to ${currentOwnerName}, but this import assigns it to ${incomingName}. Skip ${incomingName} and continue importing the other students?`
        )) {
          const normalizedIncomingName = normalizeStudentName(incomingName).toLocaleLowerCase();
          const normalizedConflictingId = conflictingId.trim().toLocaleLowerCase();
          const isConflictingImport = (student: Student) =>
            student.studentId.trim().toLocaleLowerCase() === normalizedConflictingId
            || normalizeStudentName(student.fullName).toLocaleLowerCase() === normalizedIncomingName;
          const nextReview = {
            ...review,
            students: review.students.filter(student => !isConflictingImport(student)),
            rows: review.rows.filter(row => !isConflictingImport(row.importedStudent)),
            rosterConflictSkippedCount: review.rosterConflictSkippedCount + 1
          };
          const nextOverrides = matchOverrides.filter(match =>
            !(
              (match.importedStudentId && match.importedStudentId.trim().toLocaleLowerCase() === normalizedConflictingId)
              || normalizeStudentName(match.importedName).toLocaleLowerCase() === normalizedIncomingName
            )
          );
          if (nextReview.students.length === review.students.length) {
            setErrorMessage(`The conflicting row for ${incomingName} could not be located in the pending import, so it was not retried. Reopen the file and check the imported ID/name values.`);
            return;
          }
          if (nextReview.students.length === 0) {
            setErrorMessage('All imported rows with roster ID conflicts were skipped; no changes were applied.');
            return;
          }
          await submitStudentImport(nextReview, nextOverrides);
          return;
        }
      }
      setErrorMessage(errorMessage);
    }
  };

  const processImport = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!importCsvInput.trim()) {
      setErrorMessage('Please paste or upload a valid CSV list format.');
      return;
    }

    // CSV Parse algorithm: splits lines, resolves quotations and escapes safely.
    const lines = importCsvInput.split(/\r?\n/);
    const parsedStudents = new Map<string, Student>();
    const seenImportKeys = new Set<string>();
    let duplicateCsvCount = 0;
    let malformedOrEmptyCount = 0;
    let headerRowSkipped = false;

    // Robust header detection: check if first line is likely a header row
    let startIdx = 0;
    if (lines.length > 0) {
      const firstLineCols = parseCsvLine(lines[0]).map(c => c.toLowerCase().trim().replace(/["']/g, ''));
      const headerKeywords = ['student id', 'student_id', 'studentno', 'student no', 'student number', 'full name', 'fullname', 'department', 'programCode', 'yearlevel', 'section_name'];
      const isHeader = firstLineCols.some(col => headerKeywords.includes(col)) || 
                       firstLineCols[0] === 'id' || 
                       (firstLineCols[0]?.includes('student') && firstLineCols[0]?.includes('id')) || 
                       (firstLineCols[1]?.includes('name') && firstLineCols[1]?.includes('full'));
      if (isHeader) {
        startIdx = 1;
        headerRowSkipped = true;
      }
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cleaned = parseCsvLine(line);
      const studentId = cleaned[0]?.trim() || '';
      const fullName = cleaned[1]?.trim() || '';

      if (!studentId || !fullName) {
        malformedOrEmptyCount++;
        continue;
      }

      let department = cleaned[2]?.trim() || 'CET';
      let program = cleaned[3]?.trim() || 'General';
      let yearLevel = '1';
      let section = ''; // Default to blank!

      // If we have 6 or more columns, yearLevel is column 5 and section is column 6
      if (cleaned.length >= 6) {
        yearLevel = cleaned[4]?.trim() || '1';
        section = cleaned[5]?.trim() || '';
      }
      // If we only have 5 columns, the 5th column might combine both (e.g., "1 B" or "1-B")
      else if (cleaned.length === 5) {
        const val = cleaned[4]?.trim() || '';
        const match = val.match(/(?:yr|year)?\s*(\d+)\s*[- ]\s*([A-Za-z])/i);
        if (match) {
          yearLevel = match[1];
          section = match[2].toUpperCase();
        } else {
          yearLevel = val || '1';
          section = '';
        }
      }

      const normalizedName = normalizeImportedStudentName(fullName);
      const importKey = importMatchBy === 'fullName'
        ? normalizedName.toLocaleLowerCase()
        : studentId.toLocaleLowerCase();
      if (seenImportKeys.has(importKey)) duplicateCsvCount++;
      seenImportKeys.add(importKey);

      parsedStudents.set(importKey, {
        studentId,
        fullName: normalizedName,
        department,
        program,
        yearLevel,
        section
      });
    }

    if (parsedStudents.size === 0) {
      setErrorMessage('Zero valid student records could be parsed. Check your data formats.');
      return;
    }

    let studentsToImport = Array.from(parsedStudents.values());
    let duplicateIdSkippedCount = 0;
    if (updateExistingStudents && importUpdateFields.includes('studentId')) {
      const rowsByStudentId = new Map<string, Student[]>();
      for (const student of parsedStudents.values()) {
        const normalizedId = student.studentId.trim().toLocaleLowerCase();
        const rows = rowsByStudentId.get(normalizedId) || [];
        rows.push(student);
        rowsByStudentId.set(normalizedId, rows);
      }
      const duplicateIds = [...rowsByStudentId.entries()].filter(([, rows]) => rows.length > 1);
      if (duplicateIds.length > 0) {
        const duplicateIdSet = new Set(duplicateIds.map(([id]) => id));
        const duplicateRows = duplicateIds.map(([id, rows]) =>
          `ID "${rows[0].studentId}" (${rows.map(student => student.fullName).join(', ')})`
        ).join('\n');
        duplicateIdSkippedCount = studentsToImport.filter(student =>
          duplicateIdSet.has(student.studentId.trim().toLocaleLowerCase())
        ).length;
        const shouldContinue = window.confirm(
          `These student IDs appear more than once in the file:\n\n${duplicateRows}\n\nSkip all ${duplicateIdSkippedCount} row(s) using these IDs and import the remaining students?`
        );
        if (!shouldContinue) return;
        studentsToImport = studentsToImport.filter(student =>
          !duplicateIdSet.has(student.studentId.trim().toLocaleLowerCase())
        );
        if (studentsToImport.length === 0) {
          setErrorMessage('Every valid row had a duplicate student ID, so nothing was imported.');
          return;
        }
      }
    }

    const review: PendingImportReview = {
      students: studentsToImport,
      rows: [],
      reservedStudentIds: [],
      duplicateIdSkippedCount,
      rosterConflictSkippedCount: 0,
      headerRowSkipped,
      duplicateCsvCount,
      malformedOrEmptyCount
    };
    if (updateExistingStudents && importMatchBy === 'fullName' && importUpdateFields.includes('studentId')) {
      const alreadyMatched = new Set<string>();
      for (const importedStudent of studentsToImport) {
        let matches = students.filter(student => studentNamesMatch(student.fullName, importedStudent.fullName));
        if (matches.length === 0) {
          matches = students.filter(student => studentNamesMatch(student.fullName, importedStudent.fullName, true));
        }
        if (matches.length === 1 && !alreadyMatched.has(matches[0].studentId)) {
          alreadyMatched.add(matches[0].studentId);
          continue;
        }
        review.rows.push({ importedStudent, selectedStudentId: '', searchQuery: '', isPickerOpen: false });
      }
      review.reservedStudentIds = [...alreadyMatched];
    }

    if (review.rows.length > 0) {
      setPendingImportReview(review);
      setErrorMessage(null);
      return;
    }
    await submitStudentImport(review, []);
  };

  // Highlight searched term in text with safe escaping of regex characters
  const highlightMatch = (text: any, query: string) => {
    const safeText = text !== undefined && text !== null ? String(text) : '';
    if (!query || !query.trim()) return <span>{safeText}</span>;
    // Escape special regex characters
    const escapedQuery = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    try {
      const parts = safeText.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return (
        <span>
          {parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() ? (
              <mark key={index} className="bg-amber-100 text-amber-900 px-0.5 rounded-xs font-semibold border-b border-amber-300">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      );
    } catch (e) {
      return <span>{safeText}</span>;
    }
  };

  // Filter students based on state UI inputs
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return students.filter(s => {
      const matchesSearch = !query
        || (s.fullName || '').toLocaleLowerCase().includes(query)
        || (s.studentId || '').toLocaleLowerCase().includes(query);
      const matchesDept = filterDept === '' || s.department === filterDept;
      const matchesCourse = filterCourse === '' || s.program === filterCourse;
      const matchesYear = filterYear === '' || (filterYear === 'FREE' ? isFreeYear(s.yearLevel) : String(s.yearLevel).trim() === filterYear);
      const matchesSec = filterSec === '' ? true : (filterSec === 'FREE' ? ((s.section || '') === '' || (s.section || '').toUpperCase() === 'FREE') : s.section === filterSec);
      return matchesSearch && matchesDept && matchesCourse && matchesYear && matchesSec;
    }).sort((a, b) => {
      const compareText = (left: string, right: string) =>
        left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
      const yearA = Number(a.yearLevel);
      const yearB = Number(b.yearLevel);
      const yearCompare = Number.isFinite(yearA) && Number.isFinite(yearB)
        ? yearA - yearB
        : compareText(a.yearLevel, b.yearLevel);

      return compareText(a.department, b.department)
        || compareText(a.program, b.program)
        || yearCompare
        || compareText(a.section || 'Free Section', b.section || 'Free Section')
        || compareText(a.fullName, b.fullName)
        || compareText(a.studentId, b.studentId);
    });
  }, [students, searchQuery, filterDept, filterCourse, filterYear, filterSec]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage));
  const visibleStudents = filteredStudents.slice(studentPage * studentsPerPage, (studentPage + 1) * studentsPerPage);
  const pendingReviewIds = pendingImportReview?.rows
    .map(row => row.selectedStudentId)
    .filter(id => id && id !== ADD_AS_NEW_IMPORT_ROW) || [];
  const pendingReviewReady = Boolean(pendingImportReview)
    && pendingImportReview!.rows.every(row => row.selectedStudentId)
    && new Set(pendingReviewIds).size === pendingReviewIds.length;

  useEffect(() => {
    setStudentPage(0);
  }, [searchQuery, filterDept, filterCourse, filterYear, filterSec]);

  useEffect(() => {
    if (studentPage >= totalStudentPages) setStudentPage(totalStudentPages - 1);
  }, [studentPage, totalStudentPages]);

  const getStudentGroupKey = (student: Student) =>
    [student.department, student.program, student.yearLevel, student.section || ''].join('\u0000').toLocaleLowerCase();

  const getStudentGroupLabel = (student: Student) => {
    const year = /^\d+$/.test(student.yearLevel)
      ? `${student.yearLevel}${Number(student.yearLevel) === 1 ? 'st' : Number(student.yearLevel) === 2 ? 'nd' : Number(student.yearLevel) === 3 ? 'rd' : 'th'} Year`
      : student.yearLevel;
    return `${student.department} · ${student.program} · ${year} · ${student.section ? `Section ${student.section}` : 'Free Section'}`;
  };

  const getQrCodesFor = async (targetStudents: Student[]) => {
    const cache = { ...qrCache };
    const uniqueIdentities = [...new Set(targetStudents.map(getQrIdentity))];
    const missing = uniqueIdentities.filter(identity => !cache[identity]);
    for (let index = 0; index < missing.length; index += 40) {
      const batch = missing.slice(index, index + 40);
      const generated = await Promise.all(batch.map(async identity => {
        const qrData = await QRCode.toDataURL(identity, {
          width: 250,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
        return [identity, qrData] as const;
      }));
      generated.forEach(([identity, qrData]) => { cache[identity] = qrData; });
    }
    if (missing.length > 0) setQrCache(previous => ({ ...previous, ...cache }));
    return cache;
  };

  // Printer logic for 8 QR cards per A4 page in portrait PDF layout
  const handlePrintBadge = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Allow browser pop-ups to open printing layout sheets.');
      return;
    }
    const qrCodes = await getQrCodesFor(filteredStudents);

    // Pack students into chunks of up to 8 cards per A4 page
    const chunkArray = (arr: Student[], size: number) => {
      const chunks: Student[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const studentChunks = chunkArray(filteredStudents, 8);

    const pagesHtml = studentChunks.map((chunk) => {
      const cardsHtml = chunk.map(s => {
        const qrData = qrCodes[getQrIdentity(s)] || '';
        return `
          <div class="qr-card">
            <div class="institution">CET Student QR Pass</div>
            <div class="qr-wrapper">
              <img src="${qrData}" alt="QR Code" />
            </div>
            <div class="student-name">${s.fullName}</div>
            <div class="student-id">ID: ${s.studentId}</div>
            <div class="student-meta">${s.program} • ${s.yearLevel}${s.section ? ` ${s.section}` : ' (No Section)'}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="page-container">
          ${cardsHtml}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Institutional QR Badges Print Sheet (A4 - 8 Per Page Portfolio)</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
            
            @media print {
              @page {
                size: A4 portrait;
                margin: 5mm;
              }
              body { 
                margin: 0; 
                background: white !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              .no-print { display: none !important; }
              .page-container {
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
                break-after: page !important;
              }
              .page-container:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
            }
            
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              background: #f1f5f9; 
              padding: 20px;
              margin: 0;
            }
            
            .controls {
              width: 100%;
              text-align: center;
              margin-bottom: 25px;
            }
            
            .btn {
              padding: 10px 24px;
              font-size: 14px;
              font-weight: bold;
              color: white;
              background-color: #2563eb;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              transition: all 0.2s;
            }
            .btn:hover {
              background-color: #1d4ed8;
            }

            .page-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              grid-template-rows: repeat(4, 1fr);
              
              width: 200mm;
              height: 287mm;
              
              margin: 0 auto 15mm auto;
              box-sizing: border-box;
              padding: 4mm;
              gap: 5mm;
              background: white;
              border: 1px dashed #cbd5e1;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
            }
            
            .qr-card {
              border: 1.5px solid #e2e8f0;
              border-radius: 8px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 10px;
              box-sizing: border-box;
              background: white;
              position: relative;
              height: 100%;
            }
            
            .institution {
              font-weight: 800;
              font-size: 9px;
              letter-spacing: 0.8px;
              color: #1e3a8a;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            
            .qr-wrapper {
              margin: 6px 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .qr-wrapper img {
              width: 115px;
              height: 115px;
              display: block;
            }
            
            .student-name {
              font-size: 12px;
              font-weight: bold;
              color: #0f172a;
              text-transform: uppercase;
              margin-top: 1px;
              white-space: normal;
              overflow-wrap: anywhere;
              line-height: 1.2;
              width: 100%;
              max-width: 100%;
              padding: 0 4px;
            }
            
            .student-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              font-weight: 700;
              color: #475569;
              margin-top: 1px;
            }
            
            .student-meta {
              font-size: 9px;
              font-weight: 700;
              color: #1d4ed8;
              margin-top: 2px;
              text-transform: uppercase;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 4px;
              padding: 1px 6px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="controls no-print">
            <button class="btn" onclick="window.print()">Print Badges (A4 Layout)</button>
          </div>
          ${pagesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download all filtered student badges as a self-contained HTML page
  const handleDownloadBulkBadges = async () => {
    const qrCodes = await getQrCodesFor(filteredStudents);
    const chunkArray = (arr: Student[], size: number) => {
      const chunks: Student[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const studentChunks = chunkArray(filteredStudents, 8);

    const pagesHtml = studentChunks.map((chunk) => {
      const cardsHtml = chunk.map(s => {
        const qrData = qrCodes[getQrIdentity(s)] || '';
        return `
          <div class="qr-card">
            <div class="institution">CET Student QR Pass</div>
            <div class="qr-wrapper">
              <img src="${qrData}" alt="QR Code" />
            </div>
            <div class="student-name">${s.fullName}</div>
            <div class="student-id">ID: ${s.studentId}</div>
            <div class="student-meta">${s.program} • ${s.yearLevel}${s.section ? ` ${s.section}` : ' (No Section)'}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="page-container">
          ${cardsHtml}
        </div>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Institutional QR Badges Sheet</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
            
            @media print {
              @page {
                size: A4 portrait;
                margin: 5mm;
              }
              body { 
                margin: 0; 
                background: white !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              .no-print { display: none !important; }
              .page-container {
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
                break-after: page !important;
              }
              .page-container:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
            }
            
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              background: #f1f5f9; 
              padding: 20px;
              margin: 0;
            }
            
            .controls {
              width: 100%;
              text-align: center;
              margin-bottom: 25px;
            }
            
            .btn {
              padding: 10px 24px;
              font-size: 14px;
              font-weight: bold;
              color: white;
              background-color: #2563eb;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              transition: all 0.2s;
            }
            .btn:hover {
              background-color: #1d4ed8;
            }

            .page-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              grid-template-rows: repeat(4, 1fr);
              
              width: 200mm;
              height: 287mm;
              
              margin: 0 auto 15mm auto;
              box-sizing: border-box;
              padding: 4mm;
              gap: 5mm;
              background: white;
              border: 1px dashed #cbd5e1;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
            }
            
            .qr-card {
              border: 1.5px solid #e2e8f0;
              border-radius: 8px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 10px;
              box-sizing: border-box;
              background: white;
              position: relative;
              height: 100%;
            }
            
            .institution {
              font-weight: 800;
              font-size: 9px;
              letter-spacing: 0.8px;
              color: #1e3a8a;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            
            .qr-wrapper {
              margin: 6px 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .qr-wrapper img {
              width: 115px;
              height: 115px;
              display: block;
            }
            
            .student-name {
              font-size: 12px;
              font-weight: bold;
              color: #0f172a;
              text-transform: uppercase;
              margin-top: 1px;
              white-space: normal;
              overflow-wrap: anywhere;
              line-height: 1.2;
              width: 100%;
              max-width: 100%;
              padding: 0 4px;
            }
            
            .student-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              font-weight: 700;
              color: #475569;
              margin-top: 1px;
            }
            
            .student-meta {
              font-size: 9px;
              font-weight: 700;
              color: #1d4ed8;
              margin-top: 2px;
              text-transform: uppercase;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 4px;
              padding: 1px 6px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="controls no-print">
            <button class="btn" onclick="window.print()">Print Badges (A4 Layout)</button>
          </div>
          ${pagesHtml}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bulk_QR_Badges_${filteredStudents.length}_students.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download a single student badge card as a high-quality designed PNG image using HTML5 Canvas
  const downloadSingleCardImage = async (student: Student) => {
    const qrDataUrl = qrCache[getQrIdentity(student)];
    if (!qrDataUrl) return;

    const canvas = document.createElement('canvas');
    // Card dimensions at higher resolution for crispness
    canvas.width = 360;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw solid white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 360, 480);

    // Draw subtle rounded border around the card
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 340, 460);

    // Title / Institution Header
    ctx.font = '800 13px sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.fillText('CET STUDENT QR PASS', 180, 44);

    // Load and draw the QR code image
    const img = new Image();
    img.src = qrDataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Draw QR code image (centered)
    ctx.drawImage(img, 90, 70, 180, 180);

    // Wrap the complete name so long names are not clipped on downloaded badges.
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    const nameWords = student.fullName.toUpperCase().split(/\s+/).filter(Boolean);
    let nameFontSize = 18;
    let nameLines: string[] = [];
    while (nameFontSize >= 12) {
      ctx.font = `bold ${nameFontSize}px sans-serif`;
      nameLines = [];
      let currentLine = '';
      for (const word of nameWords) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (currentLine && ctx.measureText(candidate).width > 320) {
          nameLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = candidate;
        }
      }
      if (currentLine) nameLines.push(currentLine);
      if (nameLines.length <= 3) break;
      nameFontSize -= 2;
    }
    const nameLineHeight = nameFontSize + 3;
    nameLines.forEach((line, index) => {
      ctx.fillText(line, 180, 270 + nameLineHeight * (index + 1));
    });

    // Draw Student ID
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#475569';
    const studentIdY = Math.max(330, 270 + nameLineHeight * (nameLines.length + 1));
    ctx.fillText(`ID: ${student.studentId}`, 180, studentIdY);

    // Draw Program & Section details in a badge pill shape
    const pillText = `${student.program} • ${student.yearLevel}${student.section ? ` ${student.section}` : ' (No Section)'}`.toUpperCase();
    ctx.font = 'bold 11px sans-serif';
    
    const textWidth = ctx.measureText(pillText).width;
    const pillWidth = textWidth + 24;
    const pillHeight = 28;
    const pillX = 180 - pillWidth / 2;
    const pillY = Math.max(365, studentIdY + 35);

    // Light blue pill background
    ctx.fillStyle = '#eff6ff';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 6);
    } else {
      ctx.rect(pillX, pillY, pillWidth, pillHeight);
    }
    ctx.fill();

    // Darker blue pill border
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Blue pill text
    ctx.fillStyle = '#1d4ed8';
    ctx.textAlign = 'center';
    ctx.fillText(pillText, 180, pillY + 18);

    // Trigger download of the PNG
    const imageUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `QR_Badge_${student.studentId}_${student.fullName.replace(/\s+/g, '_')}.png`;
    link.click();
  };


  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Check className="w-4.5 h-4.5" />
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4 cursor-pointer hover:text-emerald-900" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Info className="w-4.5 h-4.5" />
            {errorMessage}
          </span>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4 cursor-pointer hover:text-rose-900" />
          </button>
        </div>
      )}

      {/* Action Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Student Directory</h2>
          <p className="text-xs text-slate-500">
            Import, generate printable QR codes badges, filter registry, and administer students.
          </p>
        </div>
        
        {currentUserRole === 'admin' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDeleteAllStudents}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg transition shadow-sm cursor-pointer"
              title="Permanently erase all registered student records and attendance scan history"
            >
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete All Students
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 hover:text-blue-600 transition shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Import Excel/CSV
            </button>
            <button
              onClick={handlePrintBadge}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-300 rounded-lg text-slate-700 hover:text-indigo-600 transition shadow-sm cursor-pointer"
              title="Print all filtered students barcodes"
            >
              <Printer className="w-4 h-4 text-indigo-600" /> Print Bulk Badges
            </button>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        )}
      </div>

      {/* Filtering Widgets */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-4 h-4 animate-pulse" />
          </span>
          <input
            type="text"
            placeholder="Search Name or ID in real-time..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/30 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Colleges</option>
            {departments.map(department => (
              <option key={department.id} value={department.code}>{department.code}</option>
            ))}
          </select>
        </div>

        {/* Course select */}
        <div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Courses</option>
            {programs.map(p => (
              <option key={p.id} value={p.code}>{p.code}</option>
            ))}
          </select>
        </div>

        {/* Year level */}
        <div>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="5">5th Year</option>
            <option value="FREE">FREE Year</option>
          </select>
        </div>

        {/* Sections selecting */}
        <div>
          <select
            value={filterSec}
            onChange={(e) => setFilterSec(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Sections</option>
            <option value="FREE">Free Section</option>
            {filteredSections.map(s => (
              <option key={s.id} value={s.name}>Section {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Student list table and visualizer sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Table representation */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">College</th>
                  <th className="p-4">Program & Year</th>
                  <th className="p-4">Sec</th>
                  <th className="p-4 text-center">QR Code</th>
                  {currentUserRole === 'admin' && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.length > 0 ? (
                  visibleStudents.map((student, index) => {
                    const isEditing = editingStudentId === student.studentId;
                    const globalIndex = studentPage * studentsPerPage + index;
                    const previousStudent = globalIndex > 0 ? filteredStudents[globalIndex - 1] : undefined;
                    return (
                      <React.Fragment key={student.studentId}>
                        {(index === 0 || !previousStudent || getStudentGroupKey(previousStudent) !== getStudentGroupKey(student)) && (
                          <tr className="bg-slate-50 border-y border-slate-200">
                            <td colSpan={currentUserRole === 'admin' ? 7 : 6} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                              {getStudentGroupLabel(student)}
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`hover:bg-blue-50/20 transition-colors cursor-pointer ${
                            viewedStudent?.studentId === student.studentId ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={() => !isEditing && setViewedStudent(student)}
                        >
                          <td className="p-4 font-semibold text-blue-900">
                            {isEditing && editingStudentDraft ? (
                              <input
                                type="text"
                                value={editingStudentDraft.studentId}
                                onChange={e => setEditingStudentDraft({ ...editingStudentDraft, studentId: e.target.value })}
                                className="w-28 border px-2 py-1 rounded text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                                aria-label="Student ID"
                              />
                            ) : highlightMatch(student.studentId, searchQuery)}
                          </td>
                          <td className="p-4 font-semibold">
                            {isEditing && editingStudentDraft ? (
                              <input
                                type="text"
                                value={editingStudentDraft.fullName}
                                onChange={e => setEditingStudentDraft({ ...editingStudentDraft, fullName: e.target.value })}
                                className="border px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                                aria-label="Full name"
                              />
                            ) : (
                              highlightMatch(student.fullName, searchQuery)
                            )}
                          </td>
                          <td className="p-4 text-slate-500">
                            {isEditing && editingStudentDraft ? (
                              <input
                                type="text"
                                value={editingStudentDraft.department}
                                onChange={e => setEditingStudentDraft({ ...editingStudentDraft, department: e.target.value })}
                                className="w-20 border px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                                aria-label="College"
                              />
                            ) : student.department}
                          </td>
                          <td className="p-4 text-slate-600 font-medium">
                            {isEditing && editingStudentDraft ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={editingStudentDraft.program}
                                  onChange={e => setEditingStudentDraft({ ...editingStudentDraft, program: e.target.value })}
                                  className="w-24 border px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                                  aria-label="Program"
                                />
                                <input
                                  type="text"
                                  value={editingStudentDraft.yearLevel}
                                  onChange={e => setEditingStudentDraft({ ...editingStudentDraft, yearLevel: e.target.value })}
                                  className="w-16 border px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                                  aria-label="Year level"
                                />
                              </div>
                            ) : `${student.program} — ${student.yearLevel}`}
                          </td>
                          <td className="p-4">
                            {isEditing && editingStudentDraft ? (
                              <input
                                type="text"
                                value={editingStudentDraft.section}
                                onChange={e => setEditingStudentDraft({ ...editingStudentDraft, section: e.target.value })}
                                className="w-14 border px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                                aria-label="Section"
                              />
                            ) : (
                              <span className="bg-slate-100 border text-slate-600 px-2 py-0.5 rounded-md font-bold">
                                {student.section || '—'}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewedStudent(student);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 transition-colors rounded text-[10px] font-bold"
                            >
                              <Info className="w-3.5 h-3.5" /> View Badge
                            </button>
                          </td>
                          {currentUserRole === 'admin' && (
                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={saveStudentEdit}
                                      className="p-1 text-emerald-600 hover:text-emerald-700 rounded hover:bg-emerald-50 transition-colors"
                                      title="Save student changes"
                                      aria-label="Save student changes"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingStudentId(null);
                                        setEditingStudentDraft(null);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                                      title="Cancel editing"
                                      aria-label="Cancel editing"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingStudentId(student.studentId);
                                      setEditingStudentDraft({
                                        studentId: student.studentId,
                                        fullName: student.fullName,
                                        department: student.department,
                                        program: student.program,
                                        yearLevel: student.yearLevel,
                                        section: student.section || ''
                                      });
                                      setErrorMessage(null);
                                      setSuccessMessage(null);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                                    title="Edit student roster details"
                                    aria-label="Edit student roster details"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteStudent(student.studentId)}
                                  className="p-1 text-rose-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                                  title="Delete student"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      No student records found in filtered registry query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t bg-slate-50 text-slate-400 text-[11px] flex justify-between items-center bg-slate-100/50">
            <span>
              Showing <strong className="font-bold text-slate-600">{filteredStudents.length === 0 ? 0 : studentPage * studentsPerPage + 1}–{Math.min((studentPage + 1) * studentsPerPage, filteredStudents.length)}</strong> of {filteredStudents.length} matching students ({students.length} total)
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Page {studentPage + 1} of {totalStudentPages}</span>
              <button
                type="button"
                disabled={studentPage === 0}
                onClick={() => setStudentPage(page => Math.max(0, page - 1))}
                className="rounded border px-2 py-1 text-slate-600 disabled:opacity-40"
              >Previous</button>
              <button
                type="button"
                disabled={studentPage + 1 >= totalStudentPages}
                onClick={() => setStudentPage(page => Math.min(totalStudentPages - 1, page + 1))}
                className="rounded border px-2 py-1 text-slate-600 disabled:opacity-40"
              >Next</button>
            </div>
          </div>
        </div>

        {/* QR Badge Focus Viewer Sidebar */}
        <div className="lg:sticky lg:top-4 h-fit bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">
              QR Badge Focus
            </h4>

            {viewedStudent ? (
              <div className="text-center space-y-4">
                {/* Visual rendering of the QR Badge Card styled exactly like the printed/downloaded card */}
                <div className="mx-auto w-full max-w-[280px] bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center text-center relative">
                  <div className="text-[11px] font-extrabold tracking-[0.8px] text-[#1e3a8a] uppercase mb-2">
                    CET Student QR Pass
                  </div>
                  <div className="my-3">
                    {qrCache[getQrIdentity(viewedStudent)] ? (
                      <img 
                        src={qrCache[getQrIdentity(viewedStudent)]}
                        alt="Student QR Code" 
                        className="w-[180px] h-[180px] block mx-auto"
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] bg-slate-50 border border-dashed text-slate-300 flex items-center justify-center text-xs animate-pulse">
                        Generating...
                      </div>
                    )}
                  </div>
                  <h5 className="text-base font-bold text-slate-900 uppercase mt-1 w-full whitespace-normal break-words px-1">
                    {viewedStudent.fullName}
                  </h5>
                  <p className="font-mono text-xs font-bold text-slate-600 mt-1">
                    ID: {viewedStudent.studentId}
                  </p>
                  <div className="text-[11px] font-bold text-blue-700 mt-2 uppercase bg-blue-50 border border-blue-200 rounded px-2.5 py-1 inline-block">
                    {viewedStudent.program} • {viewedStudent.yearLevel}{viewedStudent.section ? ` ${viewedStudent.section}` : ' (No Section)'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4">
                  {qrCache[getQrIdentity(viewedStudent)] && (
                    <button
                      onClick={() => downloadSingleCardImage(viewedStudent)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-600 transition shadow-sm rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" /> Download Badge
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const badgeWindow = window.open('', '_blank');
                      if (badgeWindow) {
                        badgeWindow.document.write(`
                          <html>
                            <head>
                              <title>Student Badge - ${viewedStudent.studentId}</title>
                              <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
                                @media print {
                                  .no-print { display: none !important; }
                                  body { background: white !important; }
                                }
                                body {
                                  font-family: 'Inter', system-ui, -apple-system, sans-serif;
                                  display: flex;
                                  flex-direction: column;
                                  justify-content: center;
                                  align-items: center;
                                  height: 100vh;
                                  margin: 0;
                                  background: #f1f5f9;
                                }
                                .controls {
                                  margin-bottom: 20px;
                                }
                                .btn {
                                  padding: 10px 20px;
                                  font-size: 13px;
                                  font-weight: bold;
                                  color: white;
                                  background-color: #2563eb;
                                  border: none;
                                  border-radius: 6px;
                                  cursor: pointer;
                                  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                                  transition: background-color 0.15s ease;
                                }
                                .btn:hover {
                                  background-color: #1d4ed8;
                                }
                                .qr-card {
                                  border: 1.5px solid #e2e8f0;
                                  border-radius: 8px;
                                  display: flex;
                                  flex-direction: column;
                                  align-items: center;
                                  justify-content: center;
                                  text-align: center;
                                  padding: 24px;
                                  box-sizing: border-box;
                                  background: white;
                                  width: 280px;
                                  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
                                }
                                .institution {
                                  font-weight: 800;
                                  font-size: 11px;
                                  letter-spacing: 0.8px;
                                  color: #1e3a8a;
                                  text-transform: uppercase;
                                  margin-bottom: 8px;
                                }
                                .qr-wrapper {
                                  margin: 12px 0;
                                }
                                .qr-wrapper img {
                                  width: 180px;
                                  height: 180px;
                                  display: block;
                                }
                                .student-name {
                                  font-size: 16px;
                                  font-weight: bold;
                                  color: #0f172a;
                                  text-transform: uppercase;
                                  margin-top: 4px;
                                  width: 100%;
                                  overflow-wrap: anywhere;
                                  line-height: 1.2;
                                }
                                .student-id {
                                  font-family: 'JetBrains Mono', monospace;
                                  font-size: 12px;
                                  font-weight: 700;
                                  color: #475569;
                                  margin-top: 4px;
                                }
                                .student-meta {
                                  font-size: 11px;
                                  font-weight: 700;
                                  color: #1d4ed8;
                                  margin-top: 8px;
                                  text-transform: uppercase;
                                  background: #eff6ff;
                                  border: 1px solid #bfdbfe;
                                  border-radius: 4px;
                                  padding: 3px 10px;
                                  display: inline-block;
                                }
                              </style>
                            </head>
                            <body>
                              <div class="controls no-print">
                                <button class="btn" onclick="window.print()">Print Badge</button>
                              </div>
                              <div class="qr-card">
                                <div class="institution">CET Student QR Pass</div>
                                <div class="qr-wrapper">
                                  <img src="${qrCache[getQrIdentity(viewedStudent)]}" alt="QR Code" />
                                </div>
                                <div class="student-name">${viewedStudent.fullName}</div>
                                <div class="student-id">ID: ${viewedStudent.studentId}</div>
                                <div class="student-meta">${viewedStudent.program} • ${viewedStudent.yearLevel}${viewedStudent.section ? ` ${viewedStudent.section}` : ' (No Section)'}</div>
                              </div>
                              <script>
                                window.onload = function() {
                                  window.print();
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        badgeWindow.document.close();
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm rounded-lg cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Single
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 px-4 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                <p>Click any student badge metadata row to see QR codes individually, download, or trigger printers.</p>
              </div>
            )}
          </div>
          
          <div className="border-t border-slate-100 pt-4 mt-6 text-[10px] text-slate-400 text-center flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Printed passes represent secure student keys for the Event Scan systems.</span>
          </div>
        </div>
      </div>

      {/* MODAL: ADD STUDENT MANUALLY */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
                Add Student manually
              </h3>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="2026-0001"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                    className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-550 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={newStudent.fullName}
                    onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                    className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-550 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Program *</label>
                <select
                  value={newStudent.program}
                  required
                  onChange={(e) => setNewStudent({ ...newStudent, program: e.target.value })}
                  className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select Course / Program</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Year Level</label>
                  <select
                    value={newStudent.yearLevel}
                    onChange={(e) => setNewStudent({ ...newStudent, yearLevel: e.target.value })}
                    className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                    <option value="FREE">FREE Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Section (Optional)</label>
                  <select
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                    className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">No Section (Free Section)</option>
                    {filteredSections.map(s => (
                      <option key={s.id} value={s.name}>Section {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-55"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT EXCEL / CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-slate-900 text-md flex items-center gap-1.5">
                <Upload className="w-5 h-5 text-indigo-500" />
                Upload student rosters
              </h3>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <h5 className="font-bold text-slate-800">Excel / CSV Sheet Setup Instructions</h5>
                <p>Use these columns in this order, keeping each student's ID and name on the same row:</p>
                <code className="block bg-white p-2 border rounded font-mono text-[10px] text-slate-600 select-all">
                  StudentId,FullName,Department,Program,YearLevel,Section<br />
                  2026-0001,Juan dela Cruz,CCS,BSIT,3,A<br />
                  2026-0002,Maria Santos,COE,BSGE,4,B
                </code>
                <p className="text-[10px] text-indigo-700 font-semibold">
                  When sorting in Excel, select the entire table so student numbers remain paired with the correct names.
                </p>
                <p className="italic text-[10px] text-slate-400 mt-2">
                  * Year levels must represent indices (e.g. 1, 2, 3, 4). College departments codes match catalog settings.
                </p>
              </div>

              {/* Drag n drop simulated container */}
              <div 
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50 inline-block w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-semibold text-slate-700">Click to brows files or drop target tables</p>
                <p className="text-[10px] text-slate-450 mt-1">Accepts Excel workbooks (.xlsx, .xls) and CSV or TXT files</p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.xlsm,.csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {importFileName && (
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold text-slate-600">
                    File loaded: <span className="font-bold">{importFileName}</span>
                  </p>
                  {importWorksheets.length > 1 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1" htmlFor="import-worksheet">Worksheet to import</label>
                      <select
                        id="import-worksheet"
                        value={selectedImportWorksheet}
                        onChange={(e) => {
                          const worksheet = importWorksheets.find(sheet => sheet.name === e.target.value);
                          if (worksheet) {
                            setSelectedImportWorksheet(worksheet.name);
                            setImportCsvInput(worksheet.csv);
                          }
                        }}
                        className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white"
                      >
                        {importWorksheets.map(sheet => (
                          <option key={sheet.name} value={sheet.name}>{sheet.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-slate-600">
                    Preview — exact Student ID and name values read from {selectedImportWorksheet ? `“${selectedImportWorksheet}”` : 'the file'}
                  </p>
                  <input
                    type="search"
                    value={importPreviewSearch}
                    onChange={(e) => setImportPreviewSearch(e.target.value)}
                    placeholder="Find a student by name or ID in the imported file"
                    className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg"
                  />
                  <div className="max-h-36 overflow-auto rounded border border-slate-100">
                    {importPreviewRows.length > 0 ? (
                      <table className="w-full text-left text-[10px]">
                        <thead className="sticky top-0 bg-slate-50 text-slate-500">
                          <tr><th className="p-1.5">Student ID</th><th className="p-1.5">Name</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreviewRows.map((row, index) => (
                            <tr key={`${row.id}-${index}`}>
                              <td className="p-1.5 font-mono">{row.id}</td>
                              <td className="p-1.5">{row.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-2 text-[10px] text-slate-500">
                        {importPreviewDataRows.length === 0 ? 'No student rows found in the loaded content.' : 'No rows match that search.'}
                      </p>
                    )}
                  </div>
                  {matchingPreviewRows.length > 6 && (
                    <p className="text-[10px] text-slate-500">
                      Showing 6 of {matchingPreviewRows.length} matching rows. Use the search above to verify any student before importing.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase" htmlFor="student-name-order">Name format in file</label>
                <select
                  id="student-name-order"
                  value={studentNameOrder}
                  onChange={(e) => setStudentNameOrder(e.target.value as StudentNameOrder)}
                  className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="auto">Auto-detect: Last, First Middle or First Middle Last</option>
                  <option value="given-first">First Middle Last (no comma)</option>
                  <option value="surname-first">Last First Middle (no comma)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Auto-detect checks each no-comma name against the existing roster, so a file may mix First Middle Last and Last First Middle rows. Commas explicitly mark Last, First Middle. Unmatched no-comma names default to First Middle Last; use another option if all unmatched rows use a different order.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase" htmlFor="student-match-field">Match existing students by</label>
                <select
                  id="student-match-field"
                  value={importMatchBy}
                  onChange={(e) => setImportMatchBy(e.target.value as 'studentId' | 'fullName')}
                  className="w-full text-xs py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="studentId" disabled={importUpdateFields.includes('studentId')}>Student ID</option>
                  <option value="fullName">Name (Last, First Middle)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  {importMatchBy === 'fullName'
                  ? 'Match the original roster by name, then update the selected fields. Names must identify one existing student.'
                    : 'Use this to correct a name or other details while keeping each student ID as the match key.'}
                </p>
              </div>

              <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-[11px] font-bold text-slate-500 uppercase">Fields to update from file</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['studentId', 'Student ID'],
                    ['fullName', 'Name'],
                    ['department', 'College'],
                    ['program', 'Program'],
                    ['yearLevel', 'Year'],
                    ['section', 'Section']
                  ] as const).map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={importUpdateFields.includes(field)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked && field === 'studentId') {
                            setImportUpdateFields(current => [...new Set([...current, field])]);
                            setImportMatchBy('fullName');
                          } else {
                            setImportUpdateFields(current =>
                              checked
                                ? [...current, field]
                                : current.filter(selectedField => selectedField !== field)
                            );
                          }
                        }}
                        className="accent-indigo-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {importUpdateFields.includes('studentId') && (
                  <p className="text-[10px] font-medium text-amber-700">
                    Student IDs will be matched by name. The original roster name is used to find the student, then the selected Name field can replace it with the full name from this file. QR badges and attendance reports stay linked.
                  </p>
                )}
              </fieldset>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Or Paste comma-separated text</label>
                <textarea
                  rows={4}
                  placeholder="2026-0003,Pedro Penduko,COA,BSA,2,D"
                  value={importCsvInput}
                  onChange={(e) => {
                    setImportCsvInput(e.target.value);
                    setImportFileName('');
                    setImportWorksheets([]);
                    setSelectedImportWorksheet('');
                    setImportPreviewSearch('');
                  }}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExistingStudents}
                  onChange={(e) => setUpdateExistingStudents(e.target.checked)}
                  className="mt-0.5 accent-indigo-600"
                />
                <span>
                  <strong className="block text-slate-800">Update matched students</strong>
                  When unchecked, existing students are left unchanged. New student IDs are always added.
                </span>
              </label>

              {updateExistingStudents && importMatchBy === 'fullName' && importUpdateFields.includes('studentId') && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] text-slate-600">
                  Students the importer can’t confidently match will open a review popup. Choose the correct existing roster record, or explicitly choose Add as a new student for a genuinely new person. Check both Student ID and Name above to update both values while preserving QR badges and attendance.
                </p>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-55"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={processImport}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Submit Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingImportReview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-amber-200 bg-amber-50 p-5">
              <h3 className="font-bold text-slate-900">Confirm student matches</h3>
              <p className="mt-1 text-xs text-slate-600">
              {pendingImportReview.rows.length} imported row(s) need your review. Choose the existing roster record for each imported name, or explicitly choose Add as a new student for a genuinely new record.
              </p>
              {errorMessage && (
                <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{errorMessage}</p>
              )}
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2">Imported ID</th>
                    <th className="p-2">Imported name</th>
                    <th className="p-2">Choose existing record or add new</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingImportReview.rows.map((row, index) => (
                    <tr key={`${row.importedStudent.studentId}-${row.importedStudent.fullName}-${index}`}>
                      <td className="p-2 font-mono font-semibold text-blue-900">{row.importedStudent.studentId}</td>
                      <td className="p-2 font-medium text-slate-800">{row.importedStudent.fullName}</td>
                      <td className="p-2">
                        <div className="relative">
                          <input
                            type="search"
                            value={row.searchQuery}
                            onFocus={() => setPendingImportReview(current => current ? {
                              ...current,
                              rows: current.rows.map((item, itemIndex) => itemIndex === index ? { ...item, isPickerOpen: true } : item)
                            } : current)}
                            onBlur={() => window.setTimeout(() => setPendingImportReview(current => current ? {
                              ...current,
                              rows: current.rows.map((item, itemIndex) => itemIndex === index ? { ...item, isPickerOpen: false } : item)
                            } : current), 100)}
                            onChange={event => {
                              setErrorMessage(null);
                              setPendingImportReview(current => current ? {
                                ...current,
                                rows: current.rows.map((item, itemIndex) => itemIndex === index
                                  ? { ...item, searchQuery: event.target.value, selectedStudentId: '', isPickerOpen: true }
                                  : item)
                              } : current);
                            }}
                            placeholder="Type a student ID or name..."
                            className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                            aria-label={`Search current records for ${row.importedStudent.fullName}`}
                            aria-expanded={row.isPickerOpen}
                            aria-autocomplete="list"
                          />
                          {row.isPickerOpen && (() => {
                            const query = row.searchQuery.trim().toLocaleLowerCase();
                            const alreadySelectedIds = pendingImportReview.rows
                              .filter((item, itemIndex) => itemIndex !== index && item.selectedStudentId !== ADD_AS_NEW_IMPORT_ROW)
                              .map(item => item.selectedStudentId);
                            const matchingStudents = students.filter(student => {
                              if (pendingImportReview.reservedStudentIds.includes(student.studentId)
                                || alreadySelectedIds.includes(student.studentId)) return false;
                              const searchFields = `${student.studentId} ${student.fullName} ${student.program} ${student.yearLevel} ${student.section}`.toLocaleLowerCase();
                              return !query || searchFields.includes(query);
                            }).slice(0, 30);
                            return (
                              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl" role="listbox">
                                {matchingStudents.length > 0 ? matchingStudents.map(student => (
                                  <button
                                    key={student.studentId}
                                    type="button"
                                    role="option"
                                    aria-selected={row.selectedStudentId === student.studentId}
                                    onMouseDown={event => event.preventDefault()}
                                    onClick={() => {
                                      setErrorMessage(null);
                                      setPendingImportReview(current => current ? {
                                        ...current,
                                        rows: current.rows.map((item, itemIndex) => itemIndex === index
                                          ? {
                                              ...item,
                                              selectedStudentId: student.studentId,
                                              searchQuery: `${student.studentId} — ${student.fullName}`,
                                              isPickerOpen: false
                                            }
                                          : item)
                                      } : current);
                                    }}
                                    className="block w-full px-3 py-2 text-left hover:bg-indigo-50"
                                  >
                                    <span className="font-mono font-semibold text-blue-900">{student.studentId}</span>
                                    <span className="ml-2 text-slate-800">{student.fullName}</span>
                                    <span className="ml-2 text-slate-500">{student.program}, Year {student.yearLevel}{student.section ? `, Section ${student.section}` : ''}</span>
                                  </button>
                                )) : (
                                  <p className="px-3 py-2 text-slate-500">No matching current students.</p>
                                )}
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={row.selectedStudentId === ADD_AS_NEW_IMPORT_ROW}
                                  onMouseDown={event => event.preventDefault()}
                                  onClick={() => {
                                    setErrorMessage(null);
                                    setPendingImportReview(current => current ? {
                                      ...current,
                                      rows: current.rows.map((item, itemIndex) => itemIndex === index
                                        ? { ...item, selectedStudentId: ADD_AS_NEW_IMPORT_ROW, searchQuery: 'Add as a new student', isPickerOpen: false }
                                        : item)
                                    } : current);
                                  }}
                                  className="mt-1 block w-full border-t border-slate-100 px-3 py-2 text-left font-semibold text-indigo-700 hover:bg-indigo-50"
                                >Add as a new student</button>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {new Set(pendingReviewIds).size !== pendingReviewIds.length && (
                <p className="mt-3 text-xs text-rose-600">Each imported row must map to a different existing student.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => { setPendingImportReview(null); setErrorMessage(null); }}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >Back to import</button>
              <button
                type="button"
                disabled={!pendingReviewReady}
                onClick={() => {
                  const review = pendingImportReview;
                  if (!review) return;
                  const matchOverrides = review.rows
                    .filter(row => row.selectedStudentId !== ADD_AS_NEW_IMPORT_ROW)
                    .map(row => ({
                      studentId: row.selectedStudentId,
                      importedName: row.importedStudent.fullName,
                      importedStudentId: row.importedStudent.studentId
                    }));
                  void submitStudentImport(review, matchOverrides);
                }}
                className="rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >Confirm and import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
