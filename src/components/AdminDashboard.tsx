/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  TrendingUp, 
  FileText,
  UserCheck,
  Building
} from 'lucide-react';
import { DashboardStats, Event } from '../types';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorString, setErrorString] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setErrorString(null);
      
      const [statsRes, eventsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/events')
      ]);

      if (!statsRes.ok || !eventsRes.ok) {
        throw new Error('Failed to retrieve institution stats');
      }

      const statsData = await statsRes.json();
      const eventsData = await eventsRes.json();

      setStats(statsData);
      setEvents(eventsData);
    } catch (err: any) {
      console.error(err);
      setErrorString(err?.message || 'Failed connecting to database server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Polling fallback to keep statistics updated even if WebSocket is blocked or fails to connect
    const pollingInterval = setInterval(() => {
      fetch('/api/dashboard/stats')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(statsData => {
          setStats(statsData);
        })
        .catch(() => {
          // Fail silently in background
        });
    }, 3000);

    // Establish WebSocket connection for sub-second real-time dashboard updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'attendance:updated') {
            // Instantly patch the state with high-frequency real-time updates
            setStats(message.stats);
          }
        } catch (err) {
          console.error('[WS Client] Live processing failed:', err);
        }
      };

      ws.onopen = () => {
        console.log('[WS Client] Connected to real-time attendance thread');
      };

      ws.onclose = () => {
        console.log('[WS Client] Real-time thread suspended');
      };
    } catch (e) {
      console.warn('[WS Client] WebSocket initialization failed, relying on polling fallback:', e);
    }

    return () => {
      clearInterval(pollingInterval);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const activeEvent = events.find(e => e.isActive);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded"></div>
          <div className="h-10 w-24 bg-slate-200 rounded"></div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-100 rounded-xl border border-slate-200"></div>
          ))}
        </div>

        {/* Charts & Table loader */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-xl border border-slate-200"></div>
          <div className="h-96 bg-slate-100 rounded-xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  if (errorString) {
    return (
      <div className="p-8 text-center max-w-md mx-auto bg-rose-50 border border-rose-200 rounded-xl shadow-sm mt-8">
        <h3 className="font-bold text-rose-800 text-lg mb-2">Dashboard Error</h3>
        <p className="text-sm text-rose-600 mb-4">{errorString}</p>
        <button 
          onClick={fetchStats}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Calculate analytical variables
  const overallPresencePercent = stats && stats.totalStudents > 0 
    ? Math.round((stats.totalPresentToday / stats.totalStudents) * 100) 
    : 0;

  // Maximum value for SVG scaling
  const maxProgCount = stats?.attendanceByProgram?.reduce((max, p) => Math.max(max, p.count), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header and Sync controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Institutional Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time scanner feed analytics, department registers, and event statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeEvent && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Scanning Event: <strong className="font-bold">{activeEvent.name}</strong>
            </span>
          )}
          <button
            onClick={fetchStats}
            className="inline-flex items-center justify-center p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition shadow-sm cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Analytics Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Students</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats?.totalStudents || 0}</h3>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center text-xs text-slate-500 gap-1.5">
            <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => onNavigate('students')}>
              Manage Directory →
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Today's Attendance</p>
              <h3 className="text-3xl font-bold text-emerald-700 mt-1">{stats?.totalPresentToday || 0}</h3>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center text-xs text-slate-500 gap-1.5">
            <span className="font-semibold text-emerald-600">{overallPresencePercent}%</span> 
            <span>of institutional body scanned</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Active Event</p>
              <h3 className="text-lg font-bold text-slate-800 mt-1 truncate max-w-[160px]">
                {activeEvent ? activeEvent.name : 'No Active Event'}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center text-xs text-slate-500 justify-between">
            <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => onNavigate('categories')}>
              Switch Event →
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Recent Scans</p>
              <h3 className="text-3xl font-bold text-blue-800 mt-1">
                {stats?.recentScans.length || 0}
              </h3>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-blue-900">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5 flex items-center text-xs text-slate-500 justify-between">
            <span className="text-slate-400">Past few hours log</span>
            <span className="text-blue-600 font-semibold cursor-pointer animate-pulse" onClick={() => onNavigate('reports')}>
              View Logs →
            </span>
          </div>
        </div>
      </div>

      {/* Visual Data Analytics (Bento Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* CET Attendance Status (Time-In/Time-Out) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-500" />
                  CET Student Log Ratio
                </h4>
                <p className="text-[11px] text-slate-400">Time-In and Time-Out distribution of CET students for this event</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-6 pt-2">
              {/* Time-In progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Students Timed-In
                  </span>
                  <span className="font-bold text-slate-900">
                    {stats?.cetTimeIn || 0} / {stats?.totalCetStudents || stats?.totalStudents || 0} students ({stats && (stats.totalCetStudents || stats.totalStudents) > 0 ? Math.round((stats.cetTimeIn / (stats.totalCetStudents || stats.totalStudents)) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats && (stats.totalCetStudents || stats.totalStudents) > 0 ? Math.round((stats.cetTimeIn / (stats.totalCetStudents || stats.totalStudents)) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Time-Out progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-1 bg-rose-500 rounded-full inline-block" />
                    Students Timed-Out
                  </span>
                  <span className="font-bold text-slate-900">
                    {stats?.cetTimeOut || 0} / {stats?.totalCetStudents || stats?.totalStudents || 0} students ({stats && (stats.totalCetStudents || stats.totalStudents) > 0 ? Math.round((stats.cetTimeOut / (stats.totalCetStudents || stats.totalStudents)) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats && (stats.totalCetStudents || stats.totalStudents) > 0 ? Math.round((stats.cetTimeOut / (stats.totalCetStudents || stats.totalStudents)) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-4 mt-8 flex justify-between text-[11px] text-slate-400">
            <span>Filter items dynamically in Reports module</span>
            <span className="font-bold text-slate-500">Based on: {activeEvent?.name || 'All Events'}</span>
          </div>
        </div>

        {/* Program attendance mini feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Active Attendance by Program
              </h4>
              <p className="text-[11px] text-slate-400">Distribution by course program (BSIT, BSGE, BSABE)</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[240px] space-y-3.5 pr-1 pt-2">
            {stats?.attendanceByProgram && stats.attendanceByProgram.length > 0 ? (
              stats.attendanceByProgram.map(item => {
                const widthPercent = Math.max(10, Math.round((item.count / maxProgCount) * 100));
                return (
                  <div key={item.program} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                      {item.program}
                    </span>
                    <div className="flex items-center gap-2.5 flex-1 mx-3">
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-bold text-slate-800">{item.count} present</span>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-slate-400 text-xs italic">
                No program attendance tracked today.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Activity Statistics & Recent Scan Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Scans Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">Real-time Scandisk Feed</h4>
              <p className="text-[11px] text-slate-400">Chronological list of physical student ID check-ins</p>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-500 animate-pulse bg-blue-50 px-2 py-1 rounded">
              ● Live Connection OK
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5">Student ID</th>
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Year & Course</th>
                  <th className="py-2.5">Scan Event</th>
                  <th className="py-2.5 text-center">In</th>
                  <th className="py-2.5 text-center">Out</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentScans && stats.recentScans.length > 0 ? (
                  stats.recentScans.map(scan => (
                    <tr key={scan.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 text-slate-600 font-semibold">{scan.studentId}</td>
                      <td className="py-2 font-medium text-slate-800">{scan.studentName}</td>
                      <td className="py-2 text-slate-500">
                        {scan.program} {scan.yearLevel}{scan.section ? `-${scan.section}` : ''}
                      </td>
                      <td className="py-2 text-slate-500 truncate max-w-[120px]" title={scan.eventName}>
                        {scan.eventName}
                      </td>
                      <td className="py-2 text-center text-emerald-600 font-semibold">{scan.timeIn}</td>
                      <td className="py-2 text-center text-rose-500 font-semibold">
                        {scan.timeOut || (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                            Checked In
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          scan.timeOut 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {scan.timeOut ? 'TIME-OUT' : 'TIME-IN'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Zero scans recorded. Head over to scanning module!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Event Statistics Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">Event Statistics</h4>
              <p className="text-[11px] text-slate-400">Institutional event scan metrics</p>
            </div>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4">
            {stats?.eventStats && stats.eventStats.length > 0 ? (
              stats.eventStats.map(ev => {
                const totalStudents = stats.totalStudents || 1;
                const ratio = Math.min(100, Math.round((ev.totalPresent / totalStudents) * 100));
                
                return (
                  <div key={ev.eventId} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={ev.eventName}>
                        {ev.eventName}
                      </span>
                      <span className="text-slate-400 font-medium">
                        <strong className="text-blue-600 font-semibold">{ev.totalPresent}</strong> / {totalStudents} students ({ratio}%)
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          ratio > 60 ? 'bg-blue-600' : ratio > 30 ? 'bg-amber-500' : 'bg-slate-400'
                        }`} 
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No records listed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
