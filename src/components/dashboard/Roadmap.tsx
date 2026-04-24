import { Startup, RoadmapStep } from '../../types';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { CheckCircle2, ChevronDown, Loader2, Sparkles, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateRoadmap } from '../../lib/gemini';

export default function Roadmap({ startup }: { startup: Startup }) {
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<{stepId: string, taskId: string} | null>(null);
  const [localTaskTitle, setLocalTaskTitle] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'startups', startup.id, 'roadmaps'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSteps(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RoadmapStep)));
    });
    return unsubscribe;
  }, [startup.id]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const newSteps = await generateRoadmap(startup.idea, startup.stage || 'Idea');
      
      const batch = writeBatch(db);
      
      // Delete old steps
      steps.forEach(step => {
        batch.delete(doc(db, 'startups', startup.id, 'roadmaps', step.id));
      });
      
      // Add new steps
      const { serverTimestamp } = await import('firebase/firestore');
      newSteps.forEach((step: any, index: number) => {
        const stepRef = doc(collection(db, 'startups', startup.id, 'roadmaps'));
        
        let sanitizedTasks = [];
        if (Array.isArray(step.tasks)) {
           sanitizedTasks = step.tasks.map((t: any) => ({
             id: t.id ? String(t.id) : Math.random().toString(36).substring(7),
             title: t.title ? String(t.title).slice(0, 200) : "Vazifa",
             status: ['todo', 'in-progress', 'done'].includes(t.status) ? t.status : 'todo',
             priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium'
           })).slice(0, 50); // limit 50 tasks
        }

        batch.set(stepRef, {
          title: step.title ? String(step.title).slice(0, 250) : `Bosqich ${index + 1}`,
          description: step.description ? String(step.description).slice(0, 4800) : "AI tomonidan rejalashtirilmagan maqsad.",
          status: 'pending',
          tasks: sanitizedTasks,
          createdAt: new Date(Date.now() + index * 1000)
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Roadmap generation error", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (stepId: string, taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    const updatedTasks = step.tasks.map(t => 
      t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } as const : t
    );

    await updateDoc(doc(db, 'startups', startup.id, 'roadmaps', stepId), {
      tasks: updatedTasks
    });
  };

  const startEditTask = (stepId: string, taskId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask({ stepId, taskId });
    setLocalTaskTitle(currentTitle);
  };

  const saveTaskUpdate = async () => {
    if (!editingTask) return;
    const { stepId, taskId } = editingTask;
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    const updatedTasks = step.tasks.map(t => 
      t.id === taskId ? { ...t, title: localTaskTitle } : t
    );

    setEditingTask(null);
    await updateDoc(doc(db, 'startups', startup.id, 'roadmaps', stepId), {
      tasks: updatedTasks
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-line">
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-semibold tracking-tight">
            Yo'l Xaritasi
          </h2>
          <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">Garajdan global miqyosgacha rejalashtirilgan ishlar ketma-ketligi.</p>
        </div>
        
         <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-ink text-bg font-medium text-sm rounded-md hover:bg-ink/80 transition-all disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{loading ? 'Yaratilmoqda...' : (steps.length > 0 ? 'Qayta Yaratish' : 'Xaritani Yaratish')}</span>
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-ink animate-spin" />
            <span className="text-sm font-medium">Rejalar tuzilmoqda...</span>
          </motion.div>
        ) : steps.length > 0 ? steps.map((step, i) => (
          <div key={step.id} className={`bg-card/30 border border-line rounded-lg overflow-hidden transition-all ${expandedId === step.id ? 'shadow-sm' : 'hover:border-ink/20'}`}>
            <button 
              onClick={() => setExpandedId(expandedId === step.id ? null : step.id)}
              className="w-full p-6 flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-6">
                <div className="font-display font-medium text-2xl text-ink/20">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 className={`text-lg font-medium tracking-tight ${expandedId === step.id ? 'text-ink' : 'text-ink/80'}`}>
                    {step.title}
                  </h3>
                  <div className="flex items-center text-xs text-muted mt-1 space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${step.status === 'completed' ? 'bg-ink/10 text-ink' : 'bg-line text-ink/60'}`}>{step.status === 'completed' ? 'Yakunlandi' : step.status}</span>
                    <span className="opacity-40">&bull;</span>
                    <span>{step.tasks?.filter(t => t.status === 'done').length || 0} / {step.tasks?.length || 0} vazifa</span>
                  </div>
                </div>
              </div>
              <div className={`transition-transform duration-200 ${expandedId === step.id ? 'rotate-180 text-ink' : 'text-muted'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </button>

            <AnimatePresence>
              {expandedId === step.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-bg"
                >
                  <div className="px-6 pb-6 space-y-8 pt-2">
                    <p className="text-sm leading-relaxed text-ink/70 max-w-2xl ml-14">
                      {step.description}
                    </p>
                    
                    <div className="space-y-3 ml-14">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center justify-between">
                         Vazifalar
                      </h4>
                      <div className="space-y-2">
                        {step.tasks?.map(task => (
                          <div 
                            key={task.id}
                            className={`w-full flex items-start p-4 rounded-md border border-line hover:border-ink/30 transition-all group ${
                                task.status === 'done' ? 'bg-line/20' : 'bg-card'
                            }`}
                          >
                            <button 
                              onClick={(e) => toggleTask(step.id, task.id, e)}
                              className={`w-5 h-5 shrink-0 rounded-full border mt-0.5 mr-4 flex items-center justify-center transition-all ${
                                task.status === 'done' ? 'bg-ink border-ink text-bg' : 'border-line group-hover:border-ink/50 bg-bg'
                              }`}
                            >
                              {task.status === 'done' && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                            <div className="flex flex-col text-left flex-1" onClick={(e) => startEditTask(step.id, task.id, task.title, e)}>
                              {editingTask?.taskId === task.id ? (
                                <input
                                  autoFocus
                                  value={localTaskTitle}
                                  onChange={(e) => setLocalTaskTitle(e.target.value)}
                                  onBlur={saveTaskUpdate}
                                  onKeyDown={(e) => e.key === 'Enter' && saveTaskUpdate()}
                                  className="text-sm font-medium bg-transparent border-b border-line focus:border-ink outline-none px-0 py-0 text-ink w-full"
                                />
                              ) : (
                                <span className={`text-sm font-medium cursor-text ${task.status === 'done' ? 'line-through text-muted' : 'text-ink'}`}>
                                  {task.title}
                                </span>
                              )}
                              <div className="flex items-center space-x-3 mt-1">
                                <span className="text-[10px] font-semibold tracking-wider uppercase text-muted px-1.5 py-0.5 rounded bg-line/50">{task.priority === 'high' ? 'Yuqori' : task.priority === 'medium' ? 'O\'rta' : 'Past'}</span>
                                <span className={`text-[10px] uppercase tracking-wider ${task.status === 'done' ? 'text-ink font-semibold' : 'text-muted'}`}>
                                  {task.status === 'done' ? 'Bajarildi' : 'Kutilmoqda'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )) : (
          <div className="py-24 flex flex-col items-center justify-center space-y-6 border border-dashed border-line rounded-xl bg-card/5">
             <div className="w-16 h-16 rounded-full bg-line/20 flex items-center justify-center">
               <Sparkles className="w-8 h-8 text-muted" />
             </div>
             <div className="text-center space-y-1">
               <h3 className="text-lg font-semibold tracking-tight">Yo'l Xaritasi Yo'q</h3>
               <p className="text-sm text-muted">Sun'iy idrokka vazifalarni tartiblashiga ruxsat bering.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
