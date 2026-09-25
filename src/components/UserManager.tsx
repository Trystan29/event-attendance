/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  ShieldAlert, 
  UserPlus, 
  Check, 
  X, 
  ShieldCheck, 
  KeyRound,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { User } from '../types';

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal / Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Password visibility
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'staff' as 'admin' | 'staff'
  });

  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'staff' as 'admin' | 'staff'
  });

  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const getPasswordStrength = (pw: string) => {
    if (!pw) return { label: 'Empty', color: 'bg-slate-200', text: 'text-slate-500', width: 'w-0' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) {
      return { label: 'Weak (Should be longer)', color: 'bg-rose-500', text: 'text-rose-600 font-bold', width: 'w-1/4' };
    } else if (score === 2) {
      return { label: 'Fair Security', color: 'bg-amber-500', text: 'text-amber-600 font-bold', width: 'w-1/2' };
    } else if (score === 3) {
      return { label: 'Good Quality', color: 'bg-blue-500', text: 'text-blue-600 font-bold', width: 'w-3/4' };
    } else {
      return { label: 'Strong Security', color: 'bg-emerald-500', text: 'text-emerald-600 font-bold', width: 'w-full' };
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        showToast('Failed to load user accounts.', true);
      }
    } catch (err) {
      console.error('[USER_MANAGER] Error fetching users:', err);
      showToast('Network error loading user accounts.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.fullName) {
      showToast('Please fill out all fields.', true);
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account.');
      }

      showToast(`User account "${data.username}" created successfully.`);
      setShowAddModal(false);
      setFormData({ username: '', password: '', fullName: '', role: 'staff' });
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error occurred.', true);
    }
  };

  const handleEditClick = (u: User) => {
    setSelectedUser(u);
    setEditFormData({
      username: u.username,
      password: u.password || '',
      fullName: u.fullName,
      role: u.role
    });
    setShowEditModal(true);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!editFormData.username || !editFormData.password || !editFormData.fullName) {
      showToast('Please fill out all fields.', true);
      return;
    }

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user.');
      }

      showToast(`User account "${data.username}" updated.`);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error occurred.', true);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (username.toLowerCase() === 'admin') {
      showToast('The absolute system default admin account is protected and cannot be deleted.', true);
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to delete user account "${username}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user.');
      }

      showToast(`User account "${username}" deleted.`);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error occurred.', true);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Toast Message */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 max-w-sm transition-all duration-300 animate-slide-in ${
            toast.isError 
              ? 'bg-rose-50 text-rose-800 border-rose-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toast.isError ? <ShieldAlert className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
          {toast.message}
        </div>
      )}

      {/* Overview stats & action section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-slate-850 text-base">User & Operator Accounts</h3>
          </div>
          <p className="text-xs text-slate-500">
            Create, manage and authorize administrator or scanning staff accounts. Only administrators can configure these accounts.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-650 bg-orange-650 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add User Account
        </button>
      </div>

      {/* Main Table List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered Operator Catalog</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono font-bold rounded">
            Total count: {users.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium">Loading user catalog...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium">No registered system users found.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Full Name</th>
                  <th className="py-3 px-6">Username</th>
                  <th className="py-3 px-6">Access Role Status</th>
                  <th className="py-3 px-6">Raw Password</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/40 transition">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{u.fullName}</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-600">{u.username}</td>
                    <td className="py-3.5 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        u.role === 'admin' 
                          ? 'bg-orange-50 text-orange-700 border border-orange-100' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {u.role === 'admin' ? 'Administrator' : 'Scanner Staff'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tracking-wider text-slate-700">
                          {showPasswords[u.id] ? (u.password || '••••••') : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-650 transition cursor-pointer"
                        >
                          {showPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-1">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="inline-flex items-center gap-1 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-orange-600 rounded-lg transition"
                        title="Edit User Info"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={u.username.toLowerCase() === 'admin'}
                        className={`inline-flex items-center gap-1 p-1.5 rounded-lg transition ${
                          u.username.toLowerCase() === 'admin'
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer'
                        }`}
                        title={u.username.toLowerCase() === 'admin' ? 'System Administrator is Locked' : 'Delete Account'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* System Standard Config Warning */}
      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold">Credential Guidance Note</p>
          <p className="text-amber-800">
            By default, the primary administrator account username is <strong className="text-slate-800 font-mono">admin</strong> and password is <strong className="text-slate-800 font-mono">admin123</strong>. Keep at least one active Admin credential set up to avoid locking out institutional resources.
          </p>
        </div>
      </div>

      {/* ADD ACCOUNT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-600" />
                <h4 className="font-bold text-slate-800 text-sm">Add New Operator Account</h4>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instructor Dela Cruz"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jdelacruz"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-slate-700 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sign-in Password</label>
                <input
                  type="text"
                  required
                  placeholder="Set account password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-slate-700"
                />
                {formData.password && (
                  <div className="space-y-1 pt-1" id="pwd-strength-add">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Security rating:</span>
                      <span className={getPasswordStrength(formData.password).text}>
                        {getPasswordStrength(formData.password).label}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${getPasswordStrength(formData.password).color} ${getPasswordStrength(formData.password).width} transition-all duration-300`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Clearance Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'staff' }))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white"
                >
                  <option value="staff">Staff Operator (Scanner Feed Only)</option>
                  <option value="admin">Administrator (Full System Control)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-600" />
                <h4 className="font-bold text-slate-800 text-sm">Edit Operator Accounts</h4>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  disabled={selectedUser.username.toLowerCase() === 'admin'}
                  value={editFormData.username}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  className={`w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-slate-700 font-mono ${
                    selectedUser.username.toLowerCase() === 'admin' ? 'bg-slate-100/50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sign-in Password</label>
                <input
                  type="text"
                  required
                  value={editFormData.password}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-slate-700"
                />
                {editFormData.password && (
                  <div className="space-y-1 pt-1" id="pwd-strength-edit">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Security rating:</span>
                      <span className={getPasswordStrength(editFormData.password).text}>
                        {getPasswordStrength(editFormData.password).label}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${getPasswordStrength(editFormData.password).color} ${getPasswordStrength(getPasswordStrength(editFormData.password).width === 'w-0' ? '10px' : editFormData.password).width} transition-all duration-300`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Clearance Role</label>
                <select
                  disabled={selectedUser.username.toLowerCase() === 'admin'}
                  value={editFormData.role}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'staff' }))}
                  className={`w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white ${
                    selectedUser.username.toLowerCase() === 'admin' ? 'bg-slate-100/50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="staff">Staff Operator (Scanner Feed Only)</option>
                  <option value="admin">Administrator (Full System Control)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
