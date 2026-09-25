/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Camera, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  QrCode,
  CheckCircle,
  Menu,
  X,
  UserCog
} from 'lucide-react';

// Subcomponents
import AdminDashboard from './components/AdminDashboard.tsx';
import StudentManager from './components/StudentManager.tsx';
import EventScanner from './components/EventScanner.tsx';
import ReportsManager from './components/ReportsManager.tsx';
import CategoryManager from './components/CategoryManager.tsx';
import UserManager from './components/UserManager.tsx';
import CETLogo from './components/CETLogo.tsx';

// Typings
import { User } from './types';

// Global Auth Interceptor to keep headers synced and secure
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    value: async function (input: RequestInfo | URL, init?: RequestInit) {
      const cachedStr = localStorage.getItem('qr_attend_session');
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          if (parsed.token) {
            init = init || {};
            if (!init.headers) {
              init.headers = {};
            }
            
            if (init.headers instanceof Headers) {
              const currentAuth = init.headers.get('Authorization');
              if (!currentAuth || currentAuth.includes('null') || currentAuth.includes('undefined')) {
                init.headers.set('Authorization', `Bearer ${parsed.token}`);
              }
            } else if (Array.isArray(init.headers)) {
              const hasAuth = init.headers.some(([k, v]) => k.toLowerCase() === 'authorization' && v && !v.includes('null') && !v.includes('undefined'));
              if (!hasAuth) {
                init.headers = init.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
                init.headers.push(['Authorization', `Bearer ${parsed.token}`]);
              }
            } else {
              // Object
              const obj = init.headers as Record<string, string>;
              const authVal = obj['Authorization'] || obj['authorization'];
              if (!authVal || authVal.includes('null') || authVal.includes('undefined')) {
                obj['Authorization'] = `Bearer ${parsed.token}`;
                delete obj['authorization'];
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      const response = await originalFetch(input, init);
      if (response.status === 401) {
        const urlStr = typeof input === 'string' ? input : (input as any).url || '';
        if (!urlStr.includes('/api/auth/login')) {
          window.dispatchEvent(new CustomEvent('session-expired'));
        }
      }
      return response;
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn('[Firebase/Fetch] Failed to redefine window.fetch with Object.defineProperty, falling back to original fetch:', e);
}

// Register a global unhandled promise rejection handler as early as possible
try {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    // Prevent browser default console warning/red overlays from interrupting the UI
    event.preventDefault();
    console.warn('[Unhandled Rejection Caught Global]:', event.reason);
  });
} catch (e) {
  // Ignore
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Live timer state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Terminal locker and inactivity security states
  const [isLocked, setIsLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor user inactivity to trigger secure terminal lock screen (10 mins)
  useEffect(() => {
    if (!user || isLocked) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > 10 * 60 * 1000) {
        setIsLocked(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(interval);
    };
  }, [user, lastActivity, isLocked]);

  // Hook into session expired global events
  useEffect(() => {
    const handleSessionExpired = () => {
      handleLogout();
      setIsLocked(false);
      setAuthError('Your session has expired or is invalid. Please sign in again.');
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) return;
    setUnlockError(null);
    setUnlockLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user?.username, password: unlockPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect credentials confirmation.');
      }
      setIsLocked(false);
      setUnlockPassword('');
      setUnlockError(null);
    } catch (err: any) {
      setUnlockError(err.message || 'Incorrect operator credentials.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const currentTimeString = currentTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Restore authenticated local session if present
  useEffect(() => {
    const cached = localStorage.getItem('qr_attend_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setUser(parsed);
        
        // Restore last active tab if present, else default based on role
        const savedTab = localStorage.getItem('qr_attend_active_tab');
        if (savedTab) {
          setActiveTab(savedTab);
        } else if (parsed.role === 'staff') {
          setActiveTab('scanner');
        } else {
          setActiveTab('dashboard');
        }
      } catch (e) {
        localStorage.removeItem('qr_attend_session');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent, customCreds?: { u: string; p: string }) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const u = customCreds ? customCreds.u : usernameInput;
    const p = customCreds ? customCreds.p : passwordInput;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server connection error');
      }

      setUser(data);
      localStorage.setItem('qr_attend_session', JSON.stringify(data));
      
      // Auto navigation setup based on access clearance privileges and store tab
      const targetTab = data.role === 'staff' ? 'scanner' : 'dashboard';
      setActiveTab(targetTab);
      localStorage.setItem('qr_attend_active_tab', targetTab);
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect credentials specified.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('qr_attend_session');
    localStorage.removeItem('qr_attend_active_tab');
    setUsernameInput('');
    setPasswordInput('');
    setActiveTab('dashboard');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('qr_attend_active_tab', tab);
    setIsMobileMenuOpen(false);
  };

  // --- LOGIN PAGE RENDER ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        
        {/* Banner Title */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
          <div className="inline-flex p-1.5 bg-white rounded-3xl shadow-xl border-2 border-red-600 text-white shadow-red-650/10">
            <CETLogo size="lg" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display">CET Attendance System</h2>
            <p className="text-xs text-orange-600 font-bold uppercase tracking-widest">
              College of Engineering and Technology
            </p>
          </div>
        </div>

        {/* Credentials Form Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-slate-200 shadow-sm rounded-2xl sm:px-10 space-y-6">
            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
                  {authError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                <div className="relative rounded-lg shadow-sm">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative rounded-lg shadow-sm">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Enter secure password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full inline-flex items-center justify-center py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>



          </div>
        </div>
      </div>
    );
  }

  // --- CORE APPLICATION PAGE LAYOUT ---
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden text-slate-900 select-none">
      {/* Immersive Session Security Auto-Lock Screen */}
      {isLocked && user && (
        <div 
          className="fixed inset-0 backdrop-blur-xl bg-slate-950/90 z-[9999] flex flex-col items-center justify-center p-4 font-sans animate-fade-in"
          id="system-security-locker"
        >
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="inline-flex p-1.5 bg-slate-950 rounded-full shadow-2xl border-2 border-orange-500 text-white animate-pulse">
              <CETLogo size="lg" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-orange-500 font-extrabold uppercase tracking-widest text-[11px]">
                <ShieldCheck className="w-4 h-4 text-orange-500" /> Secure Terminal Locked
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Active Session Suspended</h2>
              <p className="text-slate-400 text-xs">
                This scanner station is locked. Please confirm your password to resume operations.
              </p>
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between text-left">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Active Operator</p>
                <p className="text-xs font-bold text-slate-200">{user.fullName}</p>
                <p className="text-[10px] font-mono text-orange-400 font-semibold uppercase">{user.role} profile active</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Node Name</p>
                <p className="text-xs font-mono text-slate-300">{user.username}</p>
              </div>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Confirm Password to Resume
                </label>
                <div className="relative">
                  <input
                    type={showUnlockPassword ? 'text' : 'password'}
                    required
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Enter operator password..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-orange-500 rounded-xl leading-5 text-sm font-medium text-white placeholder-slate-600 focus:outline-none transition font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition text-[10px] font-bold cursor-pointer"
                  >
                    {showUnlockPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {unlockError && (
                <div className="p-3 bg-red-950/30 border border-red-900/40 text-red-300 rounded-xl text-xs font-semibold leading-relaxed">
                  {unlockError}
                </div>
              )}

              <button
                type="submit"
                disabled={unlockLoading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase text-white bg-orange-600 hover:bg-orange-700 active:scale-95 shadow-lg shadow-orange-950/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {unlockLoading ? 'Verifying Credentials...' : 'Unlock Terminal'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wider text-rose-400 hover:text-rose-350 hover:bg-rose-950/20 text-center transition cursor-pointer"
              >
                Sign Out / Exit Session
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 flex flex-col shrink-0 hidden md:flex border-r border-slate-800">
        <div className="p-5 border-b border-slate-850 bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-0.5 bg-slate-900 rounded-full border border-slate-800 shrink-0 flex items-center justify-center">
              <CETLogo size="sm" />
            </div>
            <span className="font-bold text-md tracking-tight text-white font-display">CET Attendance</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {user.role === 'admin' && (
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-xs cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-orange-650/10 text-orange-400 border-l-4 border-orange-600 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-orange-500" />
              Dashboard Overview
            </button>
          )}

          <button
            onClick={() => handleTabChange('scanner')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-xs cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-orange-650/10 text-orange-400 border-l-4 border-orange-600 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Camera className="w-4 h-4 text-orange-500" />
            Live QR Scanner
          </button>

          <button
            onClick={() => handleTabChange('students')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-xs cursor-pointer ${
              activeTab === 'students'
                ? 'bg-orange-650/10 text-orange-400 border-l-4 border-orange-600 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4 text-orange-500" />
            Students Directory
          </button>

          <button
            onClick={() => handleTabChange('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-xs cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-orange-650/10 text-orange-400 border-l-4 border-orange-600 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4 text-orange-500" />
            Reports & Audit
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => handleTabChange('categories')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-xs cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-orange-650/10 text-orange-400 border-l-4 border-orange-600 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4 text-orange-500" />
              System Setup
            </button>
          )}

          {user.role === 'admin' && (
            <button
              onClick={() => handleTabChange('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-xs cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-orange-650/10 text-orange-400 border-l-4 border-orange-600 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <UserCog className="w-4 h-4 text-orange-500" />
              User Accounts
            </button>
          )}
        </nav>

        {/* Profile info block in sidebar */}
        <div className="p-5 bg-slate-950/50 border-t border-slate-900 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-orange-450 font-display">
              {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate capitalize">{user.fullName}</p>
              <p className="text-[10px] text-slate-500 capitalize truncate">{user.role} Member</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsLocked(true)}
              className="inline-flex items-center justify-center gap-1 border border-slate-800 hover:border-orange-900 hover:bg-orange-950/20 text-slate-400 hover:text-orange-400 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              title="Lock Terminal Screen"
            >
              <Lock className="w-3 h-3 text-orange-500" /> Lock
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1 border border-slate-800 hover:border-rose-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              title="Secure Exit Session"
            >
              <LogOut className="w-3 h-3 text-rose-500" /> Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Mobile View Top Header with Hamburger */}
        <header className="h-16 bg-slate-950 border-b border-slate-850 flex items-center justify-between px-4 md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-0.5 bg-slate-900 rounded-full border border-slate-800 shrink-0 flex items-center justify-center">
              <CETLogo size="sm" />
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight font-display">CET Attendance System</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu content drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-850 py-3 px-4 space-y-1.5 shrink-0 z-50">
            {user.role === 'admin' && (
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'dashboard' ? 'bg-orange-650 bg-orange-600 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                Dashboard
              </button>
            )}
            <button
              onClick={() => handleTabChange('scanner')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'scanner' ? 'bg-orange-650 bg-orange-600 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
            >
              Scanner Feed
            </button>
            <button
              onClick={() => handleTabChange('students')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'students' ? 'bg-orange-650 bg-orange-600 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
            >
              Students Directory
            </button>
            <button
              onClick={() => handleTabChange('reports')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'reports' ? 'bg-orange-650 bg-orange-600 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
            >
              Reports
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => handleTabChange('categories')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'categories' ? 'bg-orange-600 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                Setup Configuration
              </button>
            )}

            {user.role === 'admin' && (
              <button
                onClick={() => handleTabChange('users')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'users' ? 'bg-orange-650 bg-orange-600 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                User Accounts
              </button>
            )}

            <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest bg-orange-950/40 px-2 py-0.5 rounded border border-orange-900">
                  {user.role} Active
                </span>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsLocked(true);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded transition border border-slate-700/60 cursor-pointer"
                  title="Lock Terminal"
                >
                  <Lock className="w-3 h-3 text-orange-400" /> Lock
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400 py-2 bg-rose-950/20 hover:bg-rose-950/40 rounded transition border border-rose-900/40 mt-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" /> Secure Exit
              </button>
            </div>
          </div>
        )}

        {/* Global Desktop Workspace Top Header bar */}
        <header className="h-16 bg-white border-b border-slate-200 hidden md:flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-md sm:text-lg font-bold text-slate-850 font-display">
              {activeTab === 'dashboard' && 'Analytics Control Board'}
              {activeTab === 'scanner' && 'Verification Scanner Terminal'}
              {activeTab === 'students' && 'Students Directory Management'}
              {activeTab === 'reports' && 'Reports & Attendance Audit'}
              {activeTab === 'categories' && 'Institutional System Registers'}
              {activeTab === 'users' && 'System Operator Accounts'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
              Portal Connected
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Current Date/Time</p>
              <p className="text-xs font-bold text-slate-700 font-mono">{currentTimeString}</p>
            </div>
            {activeTab === 'dashboard' ? (
              <button 
                onClick={() => handleTabChange('reports')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-colors"
              >
                Generate Report
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-650 font-mono text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  Node: {user.username}
                </span>
                <button
                  onClick={() => setIsLocked(true)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-orange-600 rounded-lg border border-slate-200 transition cursor-pointer"
                  title="Lock Scanner Terminal Status"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Outer scrolling grid content view */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {activeTab === 'dashboard' && user.role === 'admin' && (
            <AdminDashboard onNavigate={handleTabChange} />
          )}
          {activeTab === 'scanner' && (
            <EventScanner currentUsername={user.username} currentUserRole={user.role} />
          )}
          {activeTab === 'students' && (
            <StudentManager currentUserRole={user.role} />
          )}
          {activeTab === 'reports' && (
            <ReportsManager currentUsername={user.username} />
          )}
          {activeTab === 'categories' && user.role === 'admin' && (
            <CategoryManager />
          )}
          {activeTab === 'users' && user.role === 'admin' && (
            <UserManager />
          )}
        </main>

        {/* Global system status bar */}
        <footer className="h-10 bg-white border-t border-slate-200 px-6 shrink-0 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> Database Connected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Camera Node 01 Online
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span> Printer Standby
            </span>
          </div>
          <div>CET Attendance System v1.0.0</div>
        </footer>

      </div>
    </div>
  );
}
