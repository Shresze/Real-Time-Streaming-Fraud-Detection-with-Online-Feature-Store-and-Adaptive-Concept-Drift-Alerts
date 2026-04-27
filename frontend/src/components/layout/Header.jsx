import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, User, Search } from 'lucide-react';

const Header = ({ monitoringState }) => {
  const { role, user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState({ transactions: [], models: [] });
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  
  const healthScore = monitoringState?.health_score || 100;

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults({ transactions: [], models: [] });
      setShowSearchResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${searchQuery}`);
        const data = await response.json();
        setSearchResults(data);
        setShowSearchResults(true);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="flex justify-between items-center mb-10 h-16 relative">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search transactions, card IDs, or model versions..." 
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.length >= 2) setShowSearchResults(true); }}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
          />
          
          {(showSearchResults && (searchResults.transactions.length > 0 || searchResults.models.length > 0 || isSearching)) && (
            <div className="absolute top-14 left-0 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              {isSearching ? (
                <div className="p-4 text-center text-slate-500 text-xs">Searching...</div>
              ) : (
                <div className="max-h-96 overflow-y-auto p-2">
                  {searchResults.transactions.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Transactions</div>
                      {searchResults.transactions.map(tx => (
                        <div key={tx.transaction_id} className="p-3 hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-700">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono text-slate-300">{tx.transaction_id}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md ${tx.state === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : tx.state === 'Blocked' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{tx.state}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">Card: {tx.card_id} • Score: {tx.probability?.toFixed(3)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.models.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Models</div>
                      {searchResults.models.map(m => (
                        <div key={m.version_name} className="p-3 hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-700">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-blue-400">{m.version_name}</span>
                            {m.is_active && <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md">Active</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">AUC: {m.baseline_auc?.toFixed(4)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${
          healthScore > 80 ? 'bg-emerald-500/5 border-emerald-500/20' : 
          healthScore > 60 ? 'bg-amber-500/5 border-amber-500/20' : 
          'bg-red-500/5 border-red-500/20'
        }`}>
          <div className="text-right">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Platform Health</div>
            <div className={`text-sm font-black ${
              healthScore > 80 ? 'text-emerald-400' : 
              healthScore > 60 ? 'text-amber-400' : 
              'text-red-400'
            }`}>{healthScore}%</div>
          </div>
          <div className={`w-2 h-2 rounded-full animate-ping ${
            healthScore > 80 ? 'bg-emerald-400' : 
            healthScore > 60 ? 'bg-amber-400' : 
            'bg-red-400'
          }`}></div>
        </div>

        <div className="flex items-center gap-4 border-l border-slate-800 pl-6">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950 animate-bounce"></span>
            )}
          </button>

          {/* Persistent Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-20 right-48 w-80 bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-widest">System Alerts</h3>
                <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg">{unreadCount} New</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-slate-600 font-bold text-xs uppercase italic">No active alerts</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-5 border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${!n.is_read ? 'bg-blue-500/[0.02]' : ''}`}>
                      <div className="flex gap-4">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === 'Critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
                          n.type === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="text-xs font-medium leading-relaxed">{n.message}</p>
                          <p className="text-[8px] text-slate-600 font-black uppercase mt-2 tracking-widest">{new Date(n.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors bg-slate-950/50">
                Mark All as Read
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-700 hover:border-slate-500 transition-all cursor-pointer group relative">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 p-0.5 transition-transform group-hover:scale-110 overflow-hidden">
              <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} alt="Avatar" className="w-full h-full rounded-full" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">{user?.email || role}</div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{role} • Secure</div>
            </div>
            
            {/* Quick Actions Hover/Click */}
            <div className="absolute top-14 right-1.5 hidden group-hover:block w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 mb-2 border-b border-slate-800">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Provider</div>
                <div className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-tighter">{user?.provider || 'Auth Service'}</div>
              </div>
              <button 
                onClick={logout}
                className="w-full text-left px-3 py-2 text-[10px] font-black text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 uppercase tracking-widest transition-colors"
              >
                Terminate Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
