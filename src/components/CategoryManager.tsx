/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  FolderPlus, 
  Flag, 
  Award, 
  Building, 
  BookOpen, 
  Grid,
  X
} from 'lucide-react';
import { Department, Program, Section, Event } from '../types';
import CETLogo from './CETLogo.tsx';

export default function CategoryManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const filteredSections = sections.filter(sec => sec.name.toUpperCase() !== 'E');
  const [events, setEvents] = useState<Event[]>([]);

  // Form states
  const [newEvent, setNewEvent] = useState<{ name: string; description: string; date: string; sanctionTime?: string; sanctionHours?: number; sessions?: 'AM' | 'PM' | 'Both' }>({ name: '', description: '', date: '', sanctionTime: '', sanctionHours: undefined, sessions: 'AM' });
  const [sanctionUnit, setSanctionUnit] = useState<'hours' | 'mins'>('hours');
  const [newDept, setNewDept] = useState({ name: '', code: '' });
  const [newProg, setNewProg] = useState({ name: '', code: '', departmentCode: '' });
  const [newSec, setNewSec] = useState({ name: '' });

  // Notifications
  const [success, setSuccess] = useState<string | null>(null);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  const fetchAllCategories = async () => {
    try {
      const [deptRes, progRes, secRes, evRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/programs'),
        fetch('/api/sections'),
        fetch('/api/events')
      ]);

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (progRes.ok) setPrograms(await progRes.json());
      if (secRes.ok) setSections(await secRes.json());
      if (evRes.ok) setEvents(await evRes.json());
    } catch (e) {
      console.error('[CATEGORY] Failed fetching taxonomy catalog:', e);
    }
  };

  useEffect(() => {
    fetchAllCategories();
  }, []);

  const triggerToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorStr(msg);
      setTimeout(() => setErrorStr(null), 3000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Event handlers
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name || !newEvent.date) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      if (!res.ok) throw new Error('Failed creating event');
      await res.json();
      triggerToast('Event added and activated successfully');
      setNewEvent({ name: '', description: '', date: '', sanctionTime: '', sanctionHours: undefined, sessions: 'Both' });
      setSanctionUnit('hours');
      fetchAllCategories();
    } catch (err) {
      triggerToast('Error saving event records.', true);
    }
  };

  const handleActivateEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}/activate`, { method: 'POST' });
      if (!res.ok) throw new Error('Activation error');
      triggerToast('Scan target active event updated.');
      fetchAllCategories();
    } catch (err) {
      triggerToast('Error configuring active parameters.', true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Deleting this event will purge its entire checked-in scanning logs. Continue?')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        triggerToast('Event purged');
      }
    } catch (e) {
      triggerToast('Purge event failed', true);
    }
  };

  // Department CRUD
  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.name || !newDept.code) return;

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDept)
      });
      if (res.ok) {
        setNewDept({ name: '', code: '' });
        triggerToast('Department record added.');
        fetchAllCategories();
      }
    } catch (err) {
      triggerToast('Error saving department parameters.', true);
    }
  };

  const handleDeleteDept = async (id: string) => {
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Department eliminated.');
        fetchAllCategories();
      }
    } catch (err) {
      triggerToast('Delete failure.', true);
    }
  };

  // Programs CRUD
  const handleAddProg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProg.name || !newProg.code || !newProg.departmentCode) return;

    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProg)
      });
      if (res.ok) {
        setNewProg({ name: '', code: '', departmentCode: '' });
        triggerToast('College Course Program catalog added.');
        fetchAllCategories();
      }
    } catch (err) {
      triggerToast('Save course failed.', true);
    }
  };

  const handleDeleteProg = async (id: string) => {
    try {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Course purged.');
        fetchAllCategories();
      }
    } catch (err) {
      triggerToast('Delete failure.', true);
    }
  };

  // Sections CRUD
  const handleAddSec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSec.name) return;

    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSec)
      });
      if (res.ok) {
        setNewSec({ name: '' });
        triggerToast('Class Section added.');
        fetchAllCategories();
      }
    } catch (err) {
      triggerToast('Save section failing.', true);
    }
  };

  const handleDeleteSec = async (id: string) => {
    try {
      const res = await fetch(`/api/sections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Section deleted.');
        fetchAllCategories();
      }
    } catch (err) {
      triggerToast('Delete section failure.', true);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notifications */}
      {success && (
        <div className="fixed bottom-5 right-5 z-50 p-3.5 bg-slate-100/90 backdrop-blur border border-red-500 rounded-xl shadow-lg flex items-center gap-2 text-xs text-red-900 font-semibold animate-bounce duration-250">
          <Check className="w-4 h-4 text-red-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {errorStr && (
        <div className="fixed bottom-5 right-5 z-50 p-3.5 bg-zinc-950 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs border border-red-600">
          <X className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="font-semibold">{errorStr}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Institutional Event & Meta Registers</h2>
        <p className="text-xs text-slate-500 mt-1">Configure college events, departments list, courses mapping, and active sections rules.</p>
      </div>

      {/* Static Brandy Crest Intro Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <CETLogo size="xl" />
        <div className="space-y-2 flex-1 text-center sm:text-left">
          <h4 className="font-extrabold text-slate-800 text-base">TAU - College of Engineering and Technology (CET)</h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            This workspace attendance engine is bound strictly to the brand aesthetics of the College of Engineering and Technology at Tarlac Agricultural University. 
            The system employs the official crest symbolizing our three focus programs: **BS Information Technology (BSIT)**, 
            **BS Geodetic Engineering (BSGE)**, and **BS Agricultural and Biosystems Engineering (BSABE)**.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
            <span className="px-2 py-0.5 rounded border border-green-200 bg-green-50 text-[10px] font-bold text-green-700 uppercase tracking-widest">Forest Green</span>
            <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-950 text-[10px] font-bold text-white uppercase tracking-widest font-mono">Charcoal Black</span>
            <span className="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-700 uppercase tracking-widest">Yellow Gold</span>
            <span className="px-2 py-0.5 rounded border border-slate-100 bg-white text-[10px] font-bold text-slate-600 uppercase tracking-widest">Pure White</span>
          </div>
        </div>
      </div>


      {/* Grid: Events Board Panel (Full-Width Card) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex border-b pb-3 mb-1 items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
            <Flag className="w-5 h-5 text-blue-500 animate-pulse" />
            Institutional Campuses Event Control Center
          </div>
          <span className="text-[10px] text-slate-400">Total: {events.length} listings</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Custom adding event form */}
          <form onSubmit={handleAddEvent} className="space-y-3.5 bg-slate-50 p-4 border border-slate-200 rounded-xl">
            <h5 className="font-semibold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-1">
              <FolderPlus className="w-4 h-4" /> Create New Target Event
            </h5>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Event Name *</label>
              <input
                type="text"
                required
                placeholder="Intramurals 2026, CCS Week"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                className="w-full text-xs py-2 px-3 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Execution Date *</label>
              <input
                type="date"
                required
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full text-xs py-1.5 px-3 border border-slate-200 rounded-lg bg-white text-slate-650"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Session Time *</label>
              <select
                value={newEvent.sessions || 'AM'}
                onChange={(e) => setNewEvent({ ...newEvent, sessions: e.target.value as 'AM' | 'PM' | 'Both' })}
                className="w-full text-xs py-2 px-3 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg bg-white text-slate-650"
              >
                <option value="AM">Morning Session Only (AM)</option>
                <option value="Both">Both Morning & Afternoon (AM & PM)</option>
                <option value="PM">Afternoon Session Only (PM)</option>
              </select>
              <span className="text-[9px] text-slate-400 block mt-0.5">Choose whether this event has AM, PM, or both sessions.</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Sponsor Description</label>
              <textarea
                rows={2}
                placeholder="Brief outline of sports / seminars contents..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Absence Sanction Time (Community Service)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  placeholder="Value"
                  value={newEvent.sanctionHours ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const unitLabel = sanctionUnit === 'hours' ? 'hours' : 'mins';
                    setNewEvent({
                      ...newEvent,
                      sanctionHours: isNaN(val) ? undefined : val,
                      sanctionTime: isNaN(val) || val === 0 ? '' : `${val} ${unitLabel} Community Service`
                    });
                  }}
                  className="w-20 text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-650"
                />
                <select
                  value={sanctionUnit}
                  onChange={(e) => {
                    const unit = e.target.value as 'hours' | 'mins';
                    setSanctionUnit(unit);
                    const val = newEvent.sanctionHours;
                    const unitLabel = unit === 'hours' ? 'hours' : 'mins';
                    setNewEvent({
                      ...newEvent,
                      sanctionTime: !val || val === 0 ? '' : `${val} ${unitLabel} Community Service`
                    });
                  }}
                  className="w-20 text-xs py-1.5 px-1 bg-white border border-slate-200 rounded-lg text-slate-650 focus:outline-none"
                >
                  <option value="hours">hours</option>
                  <option value="mins">mins</option>
                </select>
                <input
                  type="text"
                  placeholder="or custom (e.g. 4 hrs)"
                  value={newEvent.sanctionTime ?? ''}
                  onChange={(e) => setNewEvent({ ...newEvent, sanctionTime: e.target.value })}
                  className="flex-1 text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-650 min-w-0"
                />
              </div>
              <span className="text-[9px] text-slate-400">Sanction assigned to students who do not attend this event.</span>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 hover:shadow bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Save Track Event
            </button>
          </form>

          {/* Events Table list view */}
          <div className="lg:col-span-2 overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
               <thead>
                <tr className="bg-slate-50 font-bold border-b border-slate-150 text-slate-450 uppercase text-[10px]">
                  <th className="p-3">Designation Title</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Sanction</th>
                  <th className="p-3">Session(s)</th>
                  <th className="p-3">Event Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-705">
                {events.length > 0 ? (
                  events.map(ev => (
                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        {ev.name}
                      </td>
                      <td className="p-3 text-slate-400 max-w-[150px] truncate" title={ev.description}>
                        {ev.description || 'No description provided'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-amber-700 font-medium">
                        {ev.sanctionTime || 'None'}
                      </td>
                      <td className="p-3">
                        {ev.sessions === 'AM' ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">Morning (AM)</span>
                        ) : ev.sessions === 'PM' ? (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] font-bold">Afternoon (PM)</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">Both (AM & PM)</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-500">{ev.date}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          ev.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' 
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {ev.isActive ? 'Active scanning target' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1.5">
                          {!ev.isActive && (
                            <button
                              onClick={() => handleActivateEvent(ev.id)}
                              className="px-2 py-1 text-[10px] font-bold bg-white text-blue-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded transition cursor-pointer"
                              title="Set as scanning targets"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            title="Delete this event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      Zero events listed. Please add events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Grid: 3 Smaller Bento Columns for Departments, Programs, and Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COL 1: DEPARTMENTS CODES */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-500" />
              Colleges Directory
            </h4>

            {/* list */}
            <div className="space-y-2 mt-4 max-h-[160px] overflow-y-auto pr-1">
              {departments.map(dept => (
                <div key={dept.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                      {dept.code}
                    </span>
                    <p className="font-semibold text-slate-700 mt-1">{dept.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 mt-4 bg-slate-50 text-slate-500 rounded p-3 text-[11px] font-medium text-center border-dashed border border-slate-250">
            🔒 Institutional directory is locked strictly to CET department.
          </div>
        </div>

        {/* COL 2: PROGRAMS / COURSES LISTS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-505" />
              Degree Courses Mapping
            </h4>

            {/* list */}
            <div className="space-y-2 mt-4 max-h-[160px] overflow-y-auto pr-1">
              {programs.map(prog => (
                <div key={prog.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                      {prog.code}
                    </span>
                    <p className="font-semibold text-slate-700 mt-1 leading-tight">{prog.name}</p>
                    <span className="text-[10px] text-slate-400 font-medium">Mapped Dept: {prog.departmentCode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 mt-4 bg-slate-50 text-slate-500 rounded p-3 text-[11px] font-medium text-center border-dashed border border-slate-250">
            🔒 Academic listings are locked strictly to BSIT, BSGE, and BSABE.
          </div>
        </div>

        {/* COL 3: SCHOOL SECTIONS CODES */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5 flex-1">
              <Grid className="w-4 h-4 text-indigo-505" />
              Classroom Sections
            </h4>

            {/* list */}
            <div className="space-y-2 mt-4 max-h-[160px] overflow-y-auto pr-1">
              {filteredSections.map(sec => (
                <div key={sec.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded-lg">
                  <span className="font-bold text-slate-700 bg-slate-100 border text-slate-650 px-2 py-0.5 rounded">
                    Section {sec.name}
                  </span>
                  <button 
                    onClick={() => handleDeleteSec(sec.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddSec} className="border-t pt-4 mt-4 grid grid-cols-4 gap-2">
            <input
              type="text"
              required
              placeholder="Section Name (A, B)"
              value={newSec.name}
              onChange={(e) => setNewSec({ name: e.target.value.toUpperCase() })}
              className="text-xs py-1.5 px-2.5 border rounded-lg focus:outline-none col-span-3 border-slate-205"
            />
            <button
              type="submit"
              className="col-span-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
