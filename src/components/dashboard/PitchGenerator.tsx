import { Startup, Pitch } from '../../types';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { generatePitch } from '../../lib/gemini';
import { Sparkles, Loader2, Download, ExternalLink, Presentation } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function PitchGenerator({ startup }: { startup: Startup }) {
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localPitch, setLocalPitch] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'startups', startup.id, 'pitches'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Pitch;
        setPitch(data);
        if (!editingIndex) setLocalPitch(data.content);
      } else {
        setPitch(null);
        setLocalPitch(null);
      }
    });
    return unsubscribe;
  }, [startup.id, editingIndex]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const content = await generatePitch(startup.idea, startup);
      await addDoc(collection(db, 'startups', startup.id, 'pitches'), {
        content,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Pitch generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePitchUpdate = async (key: string, value: string) => {
    if (!pitch) return;
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'startups', startup.id, 'pitches', pitch.id), {
      [`content.${key}`]: value
    });
    setEditingIndex(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-line">
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-semibold tracking-tight">
            Taqdimot & Pitch
          </h2>
          <p className="max-w-md text-sm text-muted leading-relaxed">
            Investorlar va bo'lajak sheriklar uchun sun'iy idrok tomonidan yaratilgan narrativ. Matn ustiga bosib bemalol o'zgartirishingiz mumkin.
          </p>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-ink text-bg font-medium text-sm rounded-md hover:bg-ink/80 transition-all disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{loading ? 'Yaratilmoqda...' : (pitch ? 'Qayta Yaratish' : 'Taqdimotni Boshlash')}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-ink animate-spin" />
            <span className="text-sm font-medium">Narrativ tayyorlanmoqda...</span>
          </motion.div>
        ) : pitch && localPitch ? (
          <motion.div 
            key="content" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {[
              { key: 'problem', label: 'Muammo', content: localPitch.problem },
              { key: 'solution', label: 'Yechim', content: localPitch.solution },
              { key: 'market', label: 'Bozor', content: localPitch.market },
              { key: 'businessModel', label: 'Biznes model', content: localPitch.businessModel },
              { key: 'competition', label: 'Raqobat', content: localPitch.competition }
            ].map((section, i) => (
              <div key={i} className={`p-8 bg-card/30 border border-line rounded-lg flex flex-col group ${i === 4 ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center space-x-2">
                     <div className="w-6 h-6 rounded-full bg-line/50 flex items-center justify-center text-xs font-semibold text-ink/50">
                       {i+1}
                     </div>
                     <span className="text-sm font-semibold tracking-tight">{section.label}</span>
                   </div>
                   <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">Tahrirlash uchun bosing</span>
                </div>
                
                {editingIndex === i ? (
                  <textarea 
                    autoFocus
                    value={section.content}
                    onChange={(e) => setLocalPitch({...localPitch, [section.key]: e.target.value})}
                    onBlur={() => savePitchUpdate(section.key, localPitch[section.key])}
                    className="w-full h-32 bg-bg border border-line rounded-md p-3 text-sm leading-relaxed text-ink/80 focus:ring-0 focus:border-ink/50 outline-none resize-none"
                  />
                ) : (
                  <div 
                    onClick={() => setEditingIndex(i)} 
                    className="prose prose-sm max-w-none text-ink/80 leading-relaxed cursor-text hover:bg-line/10 p-2 -mx-2 rounded transition-colors"
                  >
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="empty" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="py-24 flex flex-col items-center justify-center space-y-6 border border-dashed border-line rounded-xl bg-card/5"
          >
            <div className="w-16 h-16 rounded-full bg-line/20 flex items-center justify-center">
              <Presentation className="w-8 h-8 text-muted" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold tracking-tight">Narrativ Topilmadi</h3>
              <p className="text-sm text-muted">Loyiha tahlilini boshlash uchun taqdimotni vizualizatsiya qiling.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
