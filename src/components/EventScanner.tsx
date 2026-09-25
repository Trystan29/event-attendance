/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Play, 
  Square, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  UserCheck, 
  Calendar,
  Layers,
  ArrowRight,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ScannerComponent from './ScannerComponent.tsx';
import { Event, Student, AttendanceRecord, ScanResult } from '../types';

interface EventScannerProps {
  currentUsername: string;
  currentUserRole?: 'admin' | 'staff';
}

export default function EventScanner({ currentUsername, currentUserRole }: EventScannerProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>([]);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(true);
  const [scanMode, setScanMode] = useState<'in' | 'out'>('in');

  // Scan states feedback
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const scanStatusRef = useRef<'idle' | 'success' | 'error' | 'warning'>('idle');
  const isFetchingRef = useRef<boolean>(false);
  const cooldownsRef = useRef<{ [id: string]: number }>({});

  const updateScanStatus = (status: 'idle' | 'success' | 'error' | 'warning') => {
    setScanStatus(status);
    scanStatusRef.current = status;
  };

  const [scanMessage, setScanMessage] = useState('');
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [scannedLog, setScannedLog] = useState<AttendanceRecord | null>(null);

  // Keep track of recently scanned IDs with timestamps to allow continuous scanning without duplicate duplicate spamming
  const [cooldowns, setCooldowns] = useState<{ [id: string]: number }>({});

  // Auto dismiss scan result messagebox popup modal after 2.5 seconds to resume continuous scanning
  useEffect(() => {
    if (scanStatus !== 'idle') {
      const timer = setTimeout(() => {
        updateScanStatus('idle');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scanStatus, lastScanTime]);

  // Toast notifications list for continuous scans feedback
  interface ScanToast {
    id: string;
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }
  const [toasts, setToasts] = useState<ScanToast[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, type, title, message }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const list: Event[] = await res.json();
        setEvents(list);

        // Auto-select active event if any
        const active = list.find(e => e.isActive);
        if (active) {
          setActiveEvent(active);
        }
      }
    } catch (e) {
      console.error('[SCANNER] Failed loading events context:', e);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const stats = await res.json();
        // Filter logs matching selected active event
        if (activeEvent) {
          const matched = (stats.recentScans as AttendanceRecord[]).filter(
            r => r.eventId === activeEvent.id
          );
          setRecentScans(matched);
        } else {
          setRecentScans(stats.recentScans || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchScanMode = async () => {
    try {
      const res = await fetch('/api/scan-mode');
      if (res.ok) {
        const data = await res.json();
        if (data.scanMode === 'in' || data.scanMode === 'out') {
          setScanMode(data.scanMode);
        }
      }
    } catch (e) {
      console.error('Error fetching scan mode:', e);
    }
  };

  const handleToggleScanMode = async (mode: 'in' | 'out') => {
    if (currentUserRole === 'staff') return;
    setScanMode(mode);
    try {
      await fetch('/api/scan-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scanMode: mode })
      });
    } catch (err) {
      console.error('Failed to update scan mode:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchScanMode();
    const modeInterval = setInterval(fetchScanMode, 2500);
    return () => clearInterval(modeInterval);
  }, []);

  useEffect(() => {
    if (!activeEvent) return;

    fetchRecentLogs();

    // Establish WebSocket connection for sub-second real-time multi-device synchronization
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let ws: WebSocket | null = null;
    let isMounted = true;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'attendance:updated') {
              const stats = message.stats;
              if (stats && (stats.activeScanMode === 'in' || stats.activeScanMode === 'out')) {
                setScanMode(stats.activeScanMode);
              }
              if (stats && Array.isArray(stats.recentScans)) {
                const matched = (stats.recentScans as AttendanceRecord[]).filter(
                  r => r.eventId === activeEvent.id
                );
                setRecentScans(matched);
              }
            }
          } catch (err) {
            console.error('[WS Scanner] Message decoding failed:', err);
          }
        };

        ws.onopen = () => {
          console.log('[WS Scanner] Connected to central broadcast stream');
        };

        ws.onclose = () => {
          console.log('[WS Scanner] Broadcast stream suspended. Retrying in background...');
          // Retry connection after 5 seconds if disconnected
          if (isMounted) {
            setTimeout(connectWebSocket, 5000);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (err) {
        console.warn('[WS Scanner] Connection setup error:', err);
      }
    };

    connectWebSocket();

    // Fallback periodic background check to guarantee synchronization even under unstable web sockets
    const interval = setInterval(() => {
      fetchRecentLogs();
    }, 4000);

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
      clearInterval(interval);
    };
  }, [activeEvent]);

  // Set selected event as active on server
  const handleSelectEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}/activate`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveEvent(updated);
        // Refresh catalog list to sync is_active properties
        fetchEvents();
        // Clear screen alerts
        updateScanStatus('idle');
        setScanMessage('');
        setScannedStudent(null);
      }
    } catch (err) {
      console.error(err);
      const clicked = events.find(e => e.id === id);
      if (clicked) {
        setActiveEvent(clicked);
      }
    }
  };

  // QR Scanning trigger callback
  const handleQRCodeScanned = useCallback(async (decodedId: string) => {
    if (!activeEvent) return;
    
    // Prevent subsequent QR code reads if we are currently loading or if a blocking modal is showing in non-continuous mode
    if (isFetchingRef.current || (!isContinuousMode && scanStatusRef.current !== 'idle')) {
      return;
    }
    
    const now = Date.now();
    const cleanId = decodedId.trim();

    // 3.5 seconds cooldown per student ID to block spamming on physical camera hover
    if (cooldownsRef.current[cleanId] && now - cooldownsRef.current[cleanId] < 3500) {
      return;
    }

    cooldownsRef.current[cleanId] = now;
    
    // Safety lock during processing to prevent rapid multi-firing
    isFetchingRef.current = true;

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: cleanId,
          eventId: activeEvent.id,
          scannerUsername: currentUsername,
          scanType: scanMode
        })
      });

      const response: ScanResult = await res.json();

      setLastScanTime(Date.now());

      if (res.ok && response.success) {
        updateScanStatus('success');
        setScanMessage(response.message);
        setScannedStudent(response.student || null);
        setScannedLog(response.record || null);
        
        const isTimeOut = response.record ? !!response.record.timeOut : false;
        const studentName = response.student ? response.student.fullName : 'Student';
        const actionText = isTimeOut ? 'Timed Out' : 'Timed In';
        addToast('success', isTimeOut ? 'TIME-OUT RECORDED' : 'TIME-IN RECORDED', `${studentName} ${actionText}`);
        
        // Instant reload streams
        fetchRecentLogs();
      } else {
        // Handle double-scan or invalid scanner ID warning feedback
        const isDoubleScan = response.message.includes('Double-scan');
        updateScanStatus(isDoubleScan ? 'warning' : 'error');
        setScanMessage(response.message);
        setScannedStudent(response.student || null);
        if (response.record) {
          setScannedLog(response.record);
        }
        
        if (isDoubleScan) {
          addToast('warning', 'DOUBLE-SCAN BLOCKED', response.message);
        } else {
          addToast('error', 'SCAN REGISTER FAILED', response.message);
        }
      }
    } catch (err) {
      setLastScanTime(Date.now());
      updateScanStatus('error');
      setScanMessage('Error contacting database server. Please retry.');
      addToast('error', 'SERVER CONNECTION ERROR', 'Database link offline. Please try again.');
    } finally {
      isFetchingRef.current = false;
    }
  }, [activeEvent, currentUsername, isContinuousMode, scanMode]);

  return (
    <div className="space-y-6">
      
      {/* Event Selection Context Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-blue-500" />
              1. Designated Event Selection
            </h3>
            <p className="text-xs text-slate-500">
              Select which college activity, seminar, or intramurals attendance registers should catalog into.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activeEvent?.id || ''}
              onChange={(e) => handleSelectEvent(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 min-w-[200px]"
            >
              <option value="" disabled>-- Choose Active Event --</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.date})
                </option>
              ))}
            </select>
            
            {activeEvent && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-150 px-3.5 py-2 rounded-lg truncate max-w-[250px]">
                Active: {activeEvent.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Core Scanning Interface split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column Left: Visual Viewport and controls */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-50">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">2. Camera Capture Gateway</h4>
                <p className="text-[11px] text-slate-400">Trigger webcam feed to initiate scanning</p>
              </div>

              <button
                disabled={!activeEvent}
                onClick={() => setIsScanning(!isScanning)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  !activeEvent 
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : isScanning 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow shadow-zinc-200'
                }`}
              >
                {isScanning ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Stop Scan
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Launch Scanner
                  </>
                )}
              </button>
            </div>

            {/* Scanning Mode (Time In vs Time Out) Selector */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Scanning Mode Target:</label>
                {currentUserRole === 'staff' && (
                  <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-slate-300">
                    <Lock className="w-3 h-3 text-slate-500" /> Admin Only
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={currentUserRole === 'staff'}
                  onClick={() => handleToggleScanMode('in')}
                  title={currentUserRole === 'staff' ? 'Only Administrators can change scanning mode' : ''}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    scanMode === 'in'
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  } ${currentUserRole === 'staff' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${scanMode === 'in' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                  TIME IN MODE
                </button>
                <button
                  type="button"
                  disabled={currentUserRole === 'staff'}
                  onClick={() => handleToggleScanMode('out')}
                  title={currentUserRole === 'staff' ? 'Only Administrators can change scanning mode' : ''}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    scanMode === 'out'
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  } ${currentUserRole === 'staff' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${scanMode === 'out' ? 'bg-white' : 'bg-blue-500'}`}></span>
                  TIME OUT MODE
                </button>
              </div>
            </div>

            {/* Continuous Mode Toggle Bar */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isContinuousMode ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                Continuous Auto-Scan Mode
              </span>
              <button
                type="button"
                onClick={() => setIsContinuousMode(!isContinuousMode)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isContinuousMode ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isContinuousMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Webcam scanning container component */}
            <div className={`border rounded-xl bg-slate-50 p-3 min-h-[340px] flex items-center justify-center transition-all duration-300 ${
              scanStatus === 'success'
                ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] bg-emerald-50/10'
                : scanStatus === 'warning'
                  ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] bg-amber-50/10'
                  : scanStatus === 'error'
                    ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.25)] bg-rose-50/10'
                    : 'border-slate-100'
            }`}>
              {activeEvent ? (
                <ScannerComponent
                  isActive={isScanning}
                  onScanSuccess={handleQRCodeScanned}
                />
              ) : (
                <div className="text-center max-w-xs space-y-2">
                  <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto animate-pulse" />
                  <p className="text-xs font-bold text-slate-700">Scanner Lock Active</p>
                  <p className="text-[11px] text-slate-400">
                    You must select or configure an institutional active event from the list banner first to unlock camera loops.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t pt-4 mt-6 flex justify-between text-[11px] text-slate-400">
            <span>Scanner: <strong className="font-bold text-blue-600">{currentUsername}</strong></span>
            <span>Timeout Cooldown Interval: 1h</span>
          </div>
        </div>

        {/* Column Right: Live Scanned Response & Logs lists */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* SCANNED RESPONSE FIELD */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-between min-h-[220px]">
            <div>
              <h4 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-3">
                3. Instant Scan Results
              </h4>

              {scanStatus === 'idle' && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <UserCheck className="w-10 h-10 text-slate-350 mx-auto" />
                  <p className="text-xs font-medium">Camera standby. Waiting for physical QR code check-in.</p>
                </div>
              )}

              {/* SUCCESS RESULTS RENDERING */}
              {scanStatus === 'success' && scannedStudent && scannedLog && (
                <div className="py-4 flex flex-col sm:flex-row items-center gap-5 animate-in fade-in slide-in-from-bottom-3 duration-150">
                  <div className="p-4 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600 shrink-0">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  
                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      scannedLog.timeOut 
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                    }`}>
                      {scannedLog.timeOut ? 'TIME-OUT SUCCESS' : 'TIME-IN SUCCESS'}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight uppercase">
                      {scannedStudent.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Student ID: <span className="font-bold text-blue-900">{scannedStudent.studentId}</span> • 
                      Class: <span className="text-slate-700 font-bold">{scannedStudent.program} {scannedStudent.yearLevel}{scannedStudent.section ? `-${scannedStudent.section}` : ''}</span>
                    </p>
                    <div className="flex flex-wrap gap-2.5 items-center justify-center sm:justify-start pt-1 text-xs">
                      <span className="text-slate-400">Recorded:</span> 
                      <strong className="text-slate-700 bg-slate-50 border px-2 py-0.5 rounded font-mono font-bold">
                        {scannedLog.timeOut ? scannedLog.timeOut : scannedLog.timeIn}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* WARNING RESULTS / DOUBLE SCAN */}
              {scanStatus === 'warning' && scannedStudent && (
                <div className="py-4 flex flex-col sm:flex-row items-center gap-5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 bg-amber-50 rounded-full border border-amber-100 text-amber-500 shrink-0">
                    <AlertTriangle className="w-12 h-12" />
                  </div>
                  
                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      DOBULE-SCAN GUARD BLOCK
                    </span>
                    <h3 className="text-lg font-bold text-slate-950 uppercase">{scannedStudent.fullName}</h3>
                    <p className="text-xs text-rose-600 font-semibold">{scanMessage}</p>
                    <p className="text-[11px] text-slate-400">
                      Co-incident double scans are rejected to support system state integrity.
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR SCAN RESULTS */}
              {scanStatus === 'error' && (
                <div className="py-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="p-4 bg-rose-50 rounded-full border border-rose-100 text-rose-500 shrink-0 mx-auto sm:mx-0">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <div>
                    <h5 className="font-bold text-rose-900">Scanning Process Halt</h5>
                    <p className="text-xs text-rose-600 mt-1">{scanMessage}</p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Ensure barcodes represent correct registered Student Pass keys in the student systems lists.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live activity stats mini header */}
            {activeEvent && (
              <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <span className="flex items-center gap-1">
                  <Layers className="w-4 h-4 text-slate-400" />
                  Event registry:
                </span>
                <span className="font-semibold text-slate-700">{recentScans.length} logs recorded today in this session</span>
              </div>
            )}
          </div>

          {/* STREAM ACTIVE EVENT FEED LOGS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between max-h-[290px] overflow-hidden">
            <div>
              <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-50">
                <h5 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
                  Session Log Stream
                </h5>
                <span className="text-[10px] text-slate-400">Scrolling log stream</span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[190px] pr-1.5 divide-y divide-slate-50">
                {recentScans.length > 0 ? (
                  recentScans.map((scan) => (
                    <div key={scan.id} className="flex items-center justify-between text-xs pt-2.5 first:pt-0 pb-0.5 font-medium transition-all hover:bg-slate-50/50">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-blue-900">{scan.studentId}</span>
                          <span className="text-slate-800 font-semibold">{scan.studentName}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {scan.program} · {scan.yearLevel}{scan.section ? ` ${scan.section}` : ''}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono justify-end">
                          <span className="text-emerald-600 font-semibold">{scan.timeIn}</span>
                          {scan.timeOut && (
                            <>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-rose-500 font-semibold">{scan.timeOut}</span>
                            </>
                          )}
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wide mt-1 inline-block ${
                          scan.timeOut ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {scan.timeOut ? 'TIME-OUT' : 'TIME-IN'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs italic">
                    No logs collected yet for the selected session.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* High-visibility Scan Results Overlay MessageBox Modal */}
      <AnimatePresence>
        {scanStatus !== 'idle' && !isContinuousMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => updateScanStatus('idle')}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden cursor-default"
            >
              <div className={`p-6 text-center space-y-4 ${
                scanStatus === 'success' 
                  ? 'bg-gradient-to-b from-emerald-50 to-white' 
                  : scanStatus === 'warning'
                    ? 'bg-gradient-to-b from-amber-50 to-white'
                    : 'bg-gradient-to-b from-rose-50 to-white'
              }`}>
                {/* Visual Header / State Badge */}
                <div className="flex justify-center">
                  <div className={`p-4 rounded-full border ${
                    scanStatus === 'success' 
                      ? 'bg-emerald-100/60 border-emerald-250 text-emerald-600' 
                      : scanStatus === 'warning'
                        ? 'bg-amber-100/60 border-amber-250 text-amber-600'
                        : 'bg-rose-100/60 border-rose-250 text-rose-600'
                  }`}>
                    {scanStatus === 'success' ? (
                      <CheckCircle className="w-16 h-16 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-16 h-16" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    scanStatus === 'success' 
                      ? 'bg-emerald-100 text-emerald-850 border border-emerald-200' 
                      : scanStatus === 'warning'
                        ? 'bg-amber-100 text-amber-850 border border-amber-200'
                        : 'bg-rose-100 text-rose-850 border border-rose-200'
                  }`}>
                    {scanStatus === 'success' 
                      ? (scannedLog?.timeOut ? 'TIME-OUT SUCCESSFUL' : 'TIME-IN SUCCESSFUL')
                      : scanStatus === 'warning'
                        ? 'DOUBLE-SCAN BLOCKED'
                        : 'VALIDATION ERROR / HALT'
                    }
                  </span>

                  {scannedStudent ? (
                    <div className="space-y-2 pt-2">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">
                        {scannedStudent.fullName}
                      </h2>
                      <p className="text-sm font-bold text-slate-500">
                        Student ID: <span className="font-mono text-blue-900 bg-slate-100 px-2.5 py-0.5 rounded-md border text-xs">{scannedStudent.studentId}</span>
                      </p>
                      <p className="text-sm text-slate-700 font-bold">
                        Department: <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 rounded text-indigo-700 text-xs font-bold">{scannedStudent.department}</span> • 
                        Class: <span className="text-slate-800 font-extrabold">{scannedStudent.program} {scannedStudent.yearLevel}{scannedStudent.section ? `-${scannedStudent.section}` : ''}</span>
                      </p>
                      
                      {scannedLog && (
                        <div className="flex items-center justify-center gap-2 pt-3">
                          <span className="text-xs font-medium text-slate-400">Recorded Attendance timestamp:</span>
                          <span className="text-sm font-black font-mono text-slate-800 bg-slate-150 border px-3 py-1 rounded-lg">
                            {scannedLog.timeOut ? scannedLog.timeOut : scannedLog.timeIn}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <h2 className="text-2xl font-black text-slate-900 uppercase">
                        Unregistered Student Key
                      </h2>
                      <p className="text-sm text-rose-600 font-bold max-w-sm mx-auto">
                        {scanMessage}
                      </p>
                    </div>
                  )}

                  {scanStatus === 'warning' && (
                    <p className="text-xs font-semibold text-amber-700 px-4 py-2 bg-amber-50 rounded-lg max-w-xs mx-auto border border-amber-100 mt-2">
                      {scanMessage}
                    </p>
                  )}
                </div>

                {/* Progress auto-close indicator */}
                <div className="pt-4 max-w-xs mx-auto">
                  <button
                    onClick={() => updateScanStatus('idle')}
                    className={`w-full py-3 rounded-xl text-sm font-black text-white hover:shadow transition-all font-display duration-200 cursor-pointer ${
                      scanStatus === 'success'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                        : scanStatus === 'warning'
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'
                          : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                    }`}
                  >
                    Confirm & Continue (Ready)
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2 italic font-medium">
                    This messagebox closes automatically to resume passive checkpoint scanning.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Continuous Scanning Floating Toasts Feed */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ x: 20, opacity: 0, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 pointer-events-auto bg-white ${
                toast.type === 'success' 
                  ? 'border-emerald-100 text-slate-800 shadow-lg shadow-emerald-100/25' 
                  : toast.type === 'warning'
                    ? 'border-amber-100 text-slate-800 shadow-lg shadow-amber-100/25'
                    : 'border-rose-100 text-slate-800 shadow-lg shadow-rose-100/25'
              }`}
            >
              {toast.type === 'success' ? (
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <CheckCircle className="w-5 h-5 animate-pulse" />
                </div>
              ) : (
                <div className={`p-2 rounded-lg shrink-0 ${toast.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-bold tracking-wider uppercase block ${
                  toast.type === 'success' ? 'text-emerald-600' : toast.type === 'warning' ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {toast.title}
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {toast.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
