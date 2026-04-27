import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, ShieldAlert, UserPlus, Trash2, Mail, Clock, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TeamManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchUsers = async () => {
    try {
      if (!currentUser?.email) return;
      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(currentUser.email)}`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch team:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (email, role, status) => {
    setUpdatingId(email);
    try {
      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          role, 
          status, 
          admin_email: currentUser?.email 
        })
      });
      if (response.ok) {
        await fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || "Update failed");
      }
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInvite = async (inviteData) => {
    try {
      const response = await fetch('/api/admin/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...inviteData,
          admin_email: currentUser?.email 
        })
      });
      if (response.ok) {
        alert("Member invited successfully!");
        setShowInviteModal(false);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || "Invitation failed");
      }
    } catch (error) {
      console.error("Invite failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Team Registry...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Team & Rights Governance
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Administrative Core • Access Control List</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
        >
          <UserPlus size={16} /> Add Member
        </button>
      </div>

      {/* Featured Governance Team */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {users.filter(u => ['shreshta0611@gmail.com', 'ansh72126@gmail.com', 'nischayagarg008@gmail.com'].includes(u.email.toLowerCase())).map(member => (
          <div key={member.email} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl -mr-8 -mt-8 transition-colors duration-500 ${
              member.role === 'Admin' ? 'bg-blue-500/20' : (member.role === 'Risk Analyst' ? 'bg-emerald-500/20' : 'bg-purple-500/20')
            }`} />
            <div className="flex flex-col items-center text-center gap-4 relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black border transition-all ${
                member.role === 'Admin' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 
                (member.role === 'Risk Analyst' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                'bg-slate-800 border-slate-700 text-slate-400')
              }`}>
                {member.name?.[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tighter">{member.name}</h3>
                <p className="text-[9px] text-slate-500 font-mono lower">{member.email}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-lg ${
                member.role === 'Admin' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/10' : 
                (member.role === 'Risk Analyst' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' : 
                'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-purple-500/10')
              }`}>
                {member.role}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] overflow-hidden backdrop-blur-xl">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Identity / Email</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Current Role</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Onboarding Source</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Joined On</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Last Access</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((user) => (
                <tr key={user.email} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-black">
                        {user.name?.[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{user.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Mail size={10} /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="relative group/role">
                      <select 
                        value={user.role}
                        disabled={updatingId === user.email}
                        onChange={(e) => handleUpdate(user.email, e.target.value, user.status)}
                        className={`bg-slate-950 border border-slate-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none cursor-pointer transition-all hover:border-blue-500/50 appearance-none pr-8 w-full ${
                          user.role === 'Admin' ? 'text-blue-400 border-blue-500/30' : 
                          (user.role === 'Risk Analyst' ? 'text-emerald-400 border-emerald-500/30' : 
                          'text-slate-400 border-slate-700')
                        }`}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Risk Analyst">Risk Analyst</option>
                        <option value="Auditor">Auditor</option>
                      </select>
                      <Shield size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">{user.added_by || 'System Registry'}</span>
                      <span className={`w-fit px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                        user.status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-[10px] font-bold text-slate-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Initial Setup'}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-600" />
                      {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2 text-white">
                       {user.email !== 'shreshta0611@gmail.com' && (
                         <>
                            <button 
                              onClick={() => handleUpdate(user.email, user.role, user.status === 'Active' ? 'Revoked' : 'Active')}
                              disabled={updatingId === user.email}
                              className={`p-2 rounded-lg border transition-all ${
                                user.status === 'Active' 
                                  ? 'border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' 
                                  : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                              }`}
                              title={user.status === 'Active' ? 'Revoke Rights' : 'Grant Rights'}
                            >
                              {user.status === 'Active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                            </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInviteModal && (
        <InviteModal 
          onClose={() => setShowInviteModal(false)} 
          onSubmit={handleInvite} 
        />
      )}

      {/* Security Notice */}
      <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[32px] flex items-center gap-6">
         <div className="p-4 bg-blue-600/20 rounded-2xl border border-blue-500/30">
            <ShieldCheck className="text-blue-400" size={24} />
         </div>
         <div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Administrative Override Policy • Audited</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Every action taken here is logged with your identity. 
              Status: <span className="text-white font-bold">Immutable Super Admin</span> (shreshta0611@gmail.com) is protected from revocation.
            </p>
         </div>
      </div>
    </div>
  );
};

const InviteModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Auditor'
  });

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 bg-gradient-to-br from-blue-500/10 to-transparent">
          <h3 className="text-xl font-black italic tracking-tighter text-white uppercase">Invite Team Member</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Assign platform access rights</p>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }} className="p-8 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Display Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email Address</label>
            <input 
              type="email" 
              required
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Assigned Role</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all appearance-none"
            >
              <option value="Admin">Admin</option>
              <option value="Risk Analyst">Risk Analyst</option>
              <option value="Auditor">Auditor</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black transition-all border border-slate-700 uppercase text-xs tracking-widest"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20 uppercase text-xs tracking-widest"
            >
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamManagement;
