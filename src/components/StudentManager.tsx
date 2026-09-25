/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
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

interface StudentManagerProps {
  currentUserRole: 'admin' | 'staff';
}

export default function StudentManager({ currentUserRole }: StudentManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const filteredSections = sections.filter(s => s.name.toUpperCase() !== 'E');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSec, setFilterSec] = useState('');

  // Modals / Creators
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintBadgeOpen, setIsPrintBadgeOpen] = useState(false);

  // Single Student focus
  const [viewedStudent, setViewedStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrCache, setQrCache] = useState<{ [id: string]: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load rosters and categories
  const fetchData = async () => {
    try {
      const [studRes, deptRes, progRes, secRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/departments'),
        fetch('/api/programs'),
        fetch('/api/sections')
      ]);

      if (studRes.ok) setStudents(await studRes.json());
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

  // Pre-generate QR codes images bases for list and modals
  useEffect(() => {
    const generateQRs = async () => {
      const cache: { [id: string]: string } = {};
      for (const s of students) {
        if (!qrCache[s.studentId]) {
          try {
            // Use high configuration formatting for printable badge standards
            const qrData = await QRCode.toDataURL(s.studentId, {
              width: 250,
              margin: 2,
              color: {
                dark: '#0f172a', // deep navy
                light: '#ffffff'
              }
            });
            cache[s.studentId] = qrData;
          } catch (err) {
            console.error('Failed generating QR base64 code for student ID', s.studentId, err);
          }
        }
      }
      if (Object.keys(cache).length > 0) {
        setQrCache(prev => ({ ...prev, ...cache }));
      }
    };

    if (students.length > 0) {
      generateQRs();
    }
  }, [students]);

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
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (!res.ok) throw new Error('Failed updating student metadata');
      const updated = await res.json();
      setStudents(prev => prev.map(s => s.studentId === id ? updated : s));
      setEditingStudentId(null);
    } catch (err) {
      console.error(err);
    }
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportCsvInput(text);
    };
    reader.readAsText(file);
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
    const parsedStudents: Student[] = [];
    const seenIdsInCsv = new Set<string>();
    let duplicateCsvCount = 0;
    let malformedOrEmptyCount = 0;
    let headerRowSkipped = false;

    const parseCsvLine = (lineStr: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < lineStr.length; i++) {
        const char = lineStr[i];
        if (char === '"') {
          if (inQuotes && lineStr[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

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

      if (seenIdsInCsv.has(studentId)) {
        duplicateCsvCount++;
      } else {
        seenIdsInCsv.add(studentId);
      }

      parsedStudents.push({
        studentId,
        fullName,
        department,
        program,
        yearLevel,
        section
      });
    }

    if (parsedStudents.length === 0) {
      setErrorMessage('Zero valid student records could be parsed. Check your data formats.');
      return;
    }

    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedStudents })
      });

      if (!res.ok) throw new Error('Roster import processing failure on backend.');

      const stats = await res.json();
      
      let message = `Roster successfully imported! Added: ${stats.added} new records, Updated: ${stats.updated} existing records.`;
      const skipNotes: string[] = [];
      if (headerRowSkipped) skipNotes.push('skipped 1 header row');
      if (duplicateCsvCount > 0) skipNotes.push(`resolved ${duplicateCsvCount} duplicate IDs inside the file`);
      if (malformedOrEmptyCount > 0) skipNotes.push(`skipped ${malformedOrEmptyCount} malformed/empty rows`);
      
      if (skipNotes.length > 0) {
        message += ` (${skipNotes.join(', ')}).`;
      }
      
      setSuccessMessage(message);
      setImportCsvInput('');
      setIsImportModalOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed transmitting batch data.');
    }
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
  const filteredStudents = students.filter(s => {
    const matchesSearch = searchQuery.trim() === '' ||
                          (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDept = filterDept === '' || s.department === filterDept;
    const matchesCourse = filterCourse === '' || s.program === filterCourse;
    const matchesYear = filterYear === '' || s.yearLevel === filterYear;
    const matchesSec = filterSec === '' ? true : (filterSec === 'FREE' ? ((s.section || '') === '' || (s.section || '').toUpperCase() === 'FREE') : s.section === filterSec);

    return matchesSearch && matchesDept && matchesCourse && matchesYear && matchesSec;
  });

  // Printer logic for 8 QR cards per A4 page in portrait PDF layout
  const handlePrintBadge = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Allow browser pop-ups to open printing layout sheets.');
      return;
    }

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
        const qrData = qrCache[s.studentId] || '';
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
              overflow: hidden;
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
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              max-width: 170px;
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
  const handleDownloadBulkBadges = () => {
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
        const qrData = qrCache[s.studentId] || '';
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
              overflow: hidden;
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
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              max-width: 170px;
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
    const qrDataUrl = qrCache[student.studentId];
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

    // Draw Student Full Name
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    const nameUpper = student.fullName.toUpperCase();
    ctx.fillText(nameUpper, 180, 295);

    // Draw Student ID
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(`ID: ${student.studentId}`, 180, 330);

    // Draw Program & Section details in a badge pill shape
    const pillText = `${student.program} • ${student.yearLevel}${student.section ? ` ${student.section}` : ' (No Section)'}`.toUpperCase();
    ctx.font = 'bold 11px sans-serif';
    
    const textWidth = ctx.measureText(pillText).width;
    const pillWidth = textWidth + 24;
    const pillHeight = 28;
    const pillX = 180 - pillWidth / 2;
    const pillY = 365;

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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
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
                  filteredStudents.map(student => {
                    const isEditing = editingStudentId === student.studentId;
                    return (
                      <tr 
                        key={student.studentId} 
                        className={`hover:bg-blue-50/20 transition-colors cursor-pointer ${
                          viewedStudent?.studentId === student.studentId ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => !isEditing && setViewedStudent(student)}
                      >
                        <td className="p-4 font-semibold text-blue-900">{highlightMatch(student.studentId, searchQuery)}</td>
                        <td className="p-4 font-semibold">
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={student.fullName}
                              onBlur={(e) => handleUpdateStudent(student.studentId, { fullName: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateStudent(student.studentId, { fullName: (e.target as HTMLInputElement).value });
                                }
                              }}
                              className="border px-2 py-1 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                          ) : (
                            highlightMatch(student.fullName, searchQuery)
                          )}
                        </td>
                        <td className="p-4 text-slate-500">{student.department}</td>
                        <td className="p-4 text-slate-600 font-medium">
                          {student.program} — {student.yearLevel}
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 border text-slate-600 px-2 py-0.5 rounded-md font-bold">
                            {student.section || '—'}
                          </span>
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
                              <button
                                onClick={() => setEditingStudentId(student.studentId)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                                title="Edit Name"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
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
            <span>Showing <strong className="font-bold text-slate-600">{filteredStudents.length}</strong> of {students.length} registers</span>
            <span>Batch operations require Admin clearance</span>
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
                    {qrCache[viewedStudent.studentId] ? (
                      <img 
                        src={qrCache[viewedStudent.studentId]} 
                        alt="Student QR Code" 
                        className="w-[180px] h-[180px] block mx-auto"
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] bg-slate-50 border border-dashed text-slate-300 flex items-center justify-center text-xs animate-pulse">
                        Generating...
                      </div>
                    )}
                  </div>
                  <h5 className="text-base font-bold text-slate-900 uppercase mt-1 w-full truncate px-1">
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
                  {qrCache[viewedStudent.studentId] && (
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
                                  <img src="${qrCache[viewedStudent.studentId]}" alt="QR Code" />
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
          <div className="bg-white w-full max-w-lg rounded-2xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <h5 className="font-bold text-slate-800">CSV Sheet Setup Instructions</h5>
                <p>The institutional parser matches tabular CSV rows mapping columns exactly as shown:</p>
                <code className="block bg-white p-2 border rounded font-mono text-[10px] text-slate-600 select-all">
                  StudentId,FullName,Department,Program,YearLevel,Section<br />
                  2026-0001,Juan dela Cruz,CCS,BSIT,3,A<br />
                  2026-0002,Maria Santos,COE,BSGE,4,B
                </code>
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
                <p className="text-[10px] text-slate-450 mt-1">Accepts raw CSV exported tables directly (.csv or .txt)</p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Or Paste comma-separated text</label>
                <textarea
                  rows={4}
                  placeholder="2026-0003,Pedro Penduko,COA,BSA,2,D"
                  value={importCsvInput}
                  onChange={(e) => setImportCsvInput(e.target.value)}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

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
                  Trigger Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
