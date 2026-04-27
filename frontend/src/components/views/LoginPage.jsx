import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const { login, loginWithOAuth } = useAuth();
  const [step, setStep] = useState('identity'); // 'identity' or 'verification'
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showGooglePicker, setShowGooglePicker] = useState(false);

  const roles = [
    { id: 'Admin', desc: 'Full system access & governance' },
    { id: 'Risk Analyst', desc: 'Transaction review & feedback' },
    { id: 'Auditor', desc: 'Independent audit & system logs' }
  ];

  const handleCredentialsLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Email and Password are required.");
      return;
    }
    
    // Robust Email Validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      alert("Only @gmail.com accounts are permitted for external gateway access.");
      return;
    }
    if (password.length < 6) {
      alert("Identity password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      login(selectedRole, email);
      setLoading(false);
    }, 1200);
  };

  const handleOAuthLogin = () => {
    setOauthLoading(true);
    setTimeout(() => {
      setOauthLoading(false);
      setShowGooglePicker(true);
    }, 1000);
  };

  const selectGoogleAccount = async (account) => {
    setOauthLoading(true);
    setShowGooglePicker(false);
    try {
      const response = await fetch(`/api/auth/profile/${account.email}`);
      if (!response.ok) {
        if (response.status === 403) {
           const errData = await response.json();
           alert(errData.detail || "ACCESS DENIED: Your account is not in the authorized team list.");
           setOauthLoading(false);
           return;
        }
        throw new Error("Profile verify failed");
      }
      const profile = await response.json();
      
      if (profile.status === 'Revoked') {
        alert("ACCESS DENIED: Your rights have been revoked by the system administrator.");
        setOauthLoading(false);
        return;
      }

      // Strict Role Intent Check (Requested by User)
      const intent = selectedRole?.toLowerCase();
      const actual = profile.role?.toLowerCase();

      if (intent === 'admin' && actual !== 'admin') {
        alert(`AUTHORIZATION ERROR: Only the system administrator can fulfill the Admin login request. You authenticated as a ${profile.role}.`);
        setOauthLoading(false);
        return;
      }
      if (intent === 'risk analyst' && actual !== 'risk analyst') {
        alert(`AUTHORIZATION ERROR: Only assigned Risk Analysts can access this portal. You authenticated as a ${profile.role}.`);
        setOauthLoading(false);
        return;
      }
      if (intent === 'auditor' && actual !== 'auditor') {
        alert(`AUTHORIZATION ERROR: Only assigned Auditors can access this portal. You authenticated as a ${profile.role}.`);
        setOauthLoading(false);
        return;
      }
      
      setTimeout(() => {
        // Use the role from the backend database (ignoring simulation defaults)
        loginWithOAuth(profile.role, { ...account, role: profile.role });
        setOauthLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Auth sync failed:", error);
      alert("Authentication Service Unreachable.");
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Orbs */}
      <div className={`absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000 ${step === 'identity' ? 'bg-blue-600/10' : 'bg-emerald-600/10'}`}></div>
      <div className={`absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000 ${step === 'identity' ? 'bg-purple-600/10' : 'bg-blue-600/10'}`}></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800 p-8 md:p-12 rounded-[40px] shadow-2xl overflow-y-auto max-h-[95vh] flex flex-col">
          
          {/* Header Section */}
          <div className="mb-10 text-center">
            <div className="inline-flex p-4 bg-blue-600/20 rounded-3xl border border-blue-500/30 mb-6 group transition-all hover:scale-110">
              <ShieldCheck className="text-blue-400 group-hover:animate-pulse" size={40} />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-white to-emerald-400 bg-clip-text text-transparent italic tracking-tighter uppercase">
              {step === 'identity' ? 'Select Identity' : 'Verify Identity'}
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Gateway v3.2.0 • Secure Access</p>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div className={`transition-all duration-500 transform h-full ${step === 'identity' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
              <div className="space-y-4">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4 block">Choose Your System Perimeter</label>
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full p-5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                      selectedRole === role.id 
                        ? 'bg-blue-600/10 border-blue-500/50 text-white' 
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className={`text-md font-black ${selectedRole === role.id ? 'text-blue-400' : 'text-slate-200'}`}>{role.id}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1">{role.desc}</div>
                    </div>
                    <div className={`w-3 h-3 rounded-full border-2 transition-all ${selectedRole === role.id ? 'bg-blue-400 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]' : 'bg-transparent border-slate-700'}`}></div>
                  </button>
                ))}

                <button
                  onClick={() => setStep('verification')}
                  className="w-full mt-8 bg-white text-[#0f172a] py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5"
                >
                  Continue to Login <ArrowRight size={18} />
                </button>
              </div>
            </div>

            <div className={`absolute inset-0 transition-all duration-500 transform ${step === 'verification' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
              <form onSubmit={handleCredentialsLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input 
                      type="email"
                      placeholder="Gmail / Work Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input 
                      type="password"
                      placeholder="Identity Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <button
                    type="submit"
                    disabled={loading || oauthLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Authorize Access'}
                  </button>

                  <div className="relative flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-slate-800"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Or Multi-Factor OAuth</span>
                    <div className="flex-1 h-px bg-slate-800"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOAuthLogin}
                    disabled={loading || oauthLoading}
                    className="w-full bg-slate-950/80 border border-slate-800 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 transition-all hover:bg-slate-800 hover:border-slate-600"
                  >
                    {oauthLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="Google" />
                        Sign in with Google Account
                      </>
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setStep('identity')}
                    className="w-full text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    ← Change Identity Role
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-slate-800/50 flex items-center justify-between text-slate-500 font-bold text-[10px] uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              Node: US-EAST-1
            </div>
            <div className="flex items-center gap-2">
              <Lock size={12} />
              mTLS Encrypted
            </div>
          </div>
        </div>
        
        <p className="text-center text-slate-600 font-black text-[9px] mt-8 uppercase tracking-[0.3em]">
          Restricted System. Access patterns are monitored by Anti-Gravity AI.
        </p>
      </div>

      {/* Google Account Picker Simulation */}
      {showGooglePicker && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center border-b border-slate-100">
              <img src="https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" className="h-6 mx-auto mb-6" alt="Google" />
              <h2 className="text-xl font-medium text-slate-800">Choose an account</h2>
              <p className="text-sm text-slate-500 mt-1">to continue to <span className="text-blue-600 font-medium">Antigravity Identity</span></p>
            </div>
            
            <div className="p-2 space-y-1">
               {[
                 { name: 'shreshta0611', email: 'shreshta0611@gmail.com', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shreshta' },
                 { name: 'nischayagarg008', email: 'nischayagarg008@gmail.com', role: 'Auditor', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nischaya' },
                 { name: 'ansh72126', email: 'ansh72126@gmail.com', role: 'Risk Analyst', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ansh' }
               ].map(acc => (
                 <button 
                  key={acc.email}
                  onClick={() => selectGoogleAccount(acc)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group"
                 >
                    <img src={acc.avatar} className="w-10 h-10 rounded-full bg-slate-100" />
                    <div>
                       <div className="text-sm font-medium text-slate-700">{acc.name}</div>
                       <div className="text-xs text-slate-500">{acc.email}</div>
                    </div>
                 </button>
               ))}
               
               <button className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left border-t border-slate-50">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                     <User size={20} />
                  </div>
                  <div className="text-sm font-medium text-slate-700">Use another account</div>
               </button>
            </div>
            
            <div className="p-8 text-[11px] text-slate-500 leading-relaxed">
               To continue, Google will share your name, email address, language preference, and profile picture with Antigravity Identity.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
