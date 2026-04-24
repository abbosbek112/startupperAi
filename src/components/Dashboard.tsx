import { User } from 'firebase/auth';
import { useStartups } from '../hooks/useStartups';
import { logOut, db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Plus, LayoutDashboard, LogOut, ChevronRight, Menu, Settings2, Trash2 } from 'lucide-react';
import StartupForm from './startup/StartupForm';
import StartupDashboard from './startup/StartupDashboard';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  user: User;
  activeStartupId: string | null;
  setActiveStartupId: (id: string | null) => void;
}

export default function Dashboard({ user, activeStartupId, setActiveStartupId }: DashboardProps) {
  const { startups, loading } = useStartups(user.uid);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeStartup = startups.find(s => s.id === activeStartupId);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Rostdan ham bu startapni o'chirmoqchimisiz? Ayni vaqtda tiklash imkonsiz.")) {
      try {
        await deleteDoc(doc(db, 'startups', id));
        if (activeStartupId === id) setActiveStartupId(null);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-bg text-ink">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-[72px] md:w-64 bg-card flex flex-col border-r border-line shrink-0"
          >
            <div className="h-16 border-b border-line flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-ink rounded-sm flex items-center justify-center">
                   <span className="text-bg text-xs font-bold font-display tracking-tighter">SG</span>
                </div>
                <span className="hidden md:block text-sm font-semibold tracking-tight">StartupGarage</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">
              <div>
                <div className="hidden md:flex items-center justify-between mb-4 text-xs font-medium text-muted uppercase tracking-wider px-3">
                  <span>Loyihalar</span>
                  <button onClick={() => setShowForm(true)} className="hover:text-ink transition-colors p-1 bg-line/30 rounded-md">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  {startups.map(s => (
                    <div key={s.id} className="relative group">
                      <button
                        onClick={() => {
                          setActiveStartupId(s.id);
                          setShowForm(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-md transition-all text-sm flex items-center justify-between ${
                          activeStartupId === s.id 
                          ? 'bg-ink/5 text-ink font-medium' 
                          : 'hover:bg-line/30 text-ink/70'
                        }`}
                      >
                        <span className="truncate block pr-6">{s.name}</span>
                      </button>
                      <button 
                         onClick={(e) => handleDelete(s.id, e)}
                         className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 hover:text-rose-600 rounded-md bg-card shadow-sm z-10"
                         title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {startups.length === 0 && !loading && (
                    <p className="px-3 py-4 text-xs text-muted text-center border border-dashed border-line rounded-md">Hali loyihalar yo'q</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-line shrink-0">
              <button 
                onClick={() => logOut()}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-md hover:bg-line/50 transition-all text-sm text-ink/70 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:block">Chiqish</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-bg">
        <header className="h-16 border-b border-line flex items-center justify-between px-6 bg-bg z-10 shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-line/50 transition-colors text-muted hover:text-ink">
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm font-medium opacity-60">Makon</span>
              <ChevronRight className="w-3 h-3 text-muted" />
              <span className="text-sm font-medium">
                {activeStartup ? activeStartup.name : showSettings ? 'Sozlamalar' : 'Yangi Loyiha'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
                onClick={() => { setShowForm(false); setShowSettings(!showSettings); }}
                className="p-2 rounded-md hover:bg-line/50 transition-colors text-muted hover:text-ink"
            >
               <Settings2 className="w-4 h-4" />
            </button>
            <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-line">
               <span className="text-sm font-medium">{user.displayName?.split(' ')[0]}</span>
               <div className="w-7 h-7 rounded-sm bg-line overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-ink text-bg flex items-center justify-center font-bold text-xs">{user.displayName?.charAt(0)}</div>}
               </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            {showSettings ? (
               <motion.div 
                 key="settings"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0 }}
                 className="p-8 md:p-12 max-w-2xl mx-auto w-full"
               >
                 <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-display font-semibold mb-1">Sozlamalar</h2>
                        <p className="text-sm text-muted">Akkaunt va tizim parametrlari.</p>
                    </div>
                    <div className="p-6 border border-line rounded-lg space-y-4 bg-card/50">
                         <h3 className="text-sm font-semibold">Akkaunt Ma'lumotlari</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-ink/80">
                            <div><span className="text-xs text-muted block mb-1">ISMI</span> {user.displayName}</div>
                            <div><span className="text-xs text-muted block mb-1">EMAIL</span> {user.email}</div>
                         </div>
                    </div>
                 </div>
               </motion.div>
            ) : showForm ? (
              <motion.div 
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-8 md:p-12 max-w-2xl mx-auto w-full"
              >
                <StartupForm onCancel={() => setShowForm(false)} onComplete={(id) => {
                  setShowForm(false);
                  setActiveStartupId(id);
                }} user={user} />
              </motion.div>
            ) : activeStartup ? (
              <motion.div 
                key={activeStartupId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full border-l border-line shadow-[-20px_0_30px_rgba(0,0,0,0.02)]"
              >
                <StartupDashboard startup={activeStartup} />
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="space-y-6 max-w-md">
                  <div className="w-16 h-16 bg-line/30 rounded-full flex items-center justify-center mx-auto mb-6">
                     <LayoutDashboard className="w-8 h-8 text-muted" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-display font-semibold tracking-tight">
                      Loyiha Tanlang
                    </h2>
                    <p className="text-sm text-muted leading-relaxed">
                      Loyiha qurasizmi yoki eskilarini davom ettirasizmi?
                    </p>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => setShowForm(true)}
                      className="px-6 py-3 bg-ink text-bg text-sm font-medium rounded-md hover:bg-ink/80 transition-all shadow-sm"
                    >
                      Yangi Loyiha Boshlash
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
