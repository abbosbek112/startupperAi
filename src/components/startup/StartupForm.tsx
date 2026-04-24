import { useState } from 'react';
import { User } from 'firebase/auth';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { analyzeStartupHealth, generateRoadmap } from '../../lib/gemini';
import { StartupStage } from '../../types';
import { Loader2, ArrowRight } from 'lucide-react';

interface StartupFormProps {
  onCancel: () => void;
  onComplete: (id: string) => void;
  user: User;
}

export default function StartupForm({ onCancel, onComplete, user }: StartupFormProps) {
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [projectType, setProjectType] = useState('webapp');
  const [stage, setStage] = useState<StartupStage>('idea');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      setStatus('Analyzing idea strength...');
      const healthData = await analyzeStartupHealth(idea, stage);
      
      setStatus('Generating roadmap steps...');
      const roadmapData = await generateRoadmap(idea, stage);

      setStatus('Finalizing your garage...');
      const startupRef = await addDoc(collection(db, 'startups'), {
        name,
        idea,
        projectType,
        stage,
        ownerId: user.uid,
        healthScore: healthData.healthScore || 50,
        metrics: healthData.metrics || { ideaStrength: 50, execution: 50, marketFit: 50 },
        status: healthData.status || 'healthy',
        reasoning: healthData.reasoning || '',
        builderPhase: 'vazifa_belgilash',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add roadmap steps
      if (roadmapData.steps) {
        for (const step of roadmapData.steps) {
          await addDoc(collection(db, 'startups', startupRef.id, 'roadmaps'), {
            ...step,
            status: 'pending',
            createdAt: serverTimestamp()
          });
        }
      }

      onComplete(startupRef.id);
    } catch (error) {
      console.error('Error creating startup:', error);
      alert('Failed to build startup. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 bg-card/30 p-8 border border-line rounded-lg">
      <div className="space-y-2">
        <h2 className="text-3xl font-display font-semibold tracking-tight">
          Yangi Loyiha
        </h2>
        <p className="text-sm text-muted">Sun'iy idrok yordamida loyiha poydevorini quring.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink">Loyiha Nomi</label>
          <input 
            type="text" 
            required 
            value={name} 
            onChange={e => setName(e.target.value)}
            placeholder="Masalan: AI Marketing SaaS"
            className="w-full bg-bg border border-line rounded-md p-3 focus:outline-none focus:border-ink transition-all text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-ink">Loyiha Turi</label>
          <select 
            value={projectType} 
            onChange={e => setProjectType(e.target.value)}
            className="w-full bg-bg border border-line rounded-md p-3 focus:outline-none focus:border-ink transition-all text-sm appearance-none"
          >
            <option value="webapp">Web Ilova (SaaS / Dashboard)</option>
            <option value="mobile">Mobil Ilova</option>
            <option value="landing">Landing Page / Korporativ Sayt</option>
            <option value="ecommerce">Internet Do'kon (E-commerce)</option>
            <option value="bot">Telegram Bot (Mini App / AI Bot)</option>
            <option value="other">Boshqa (Maxsus loyiha)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-ink">G'oya ta'rifi</label>
          <textarea 
            required 
            value={idea} 
            onChange={e => setIdea(e.target.value)}
            placeholder="Qanday muammoni hal qilmoqchisiz?"
            className="w-full bg-bg border border-line rounded-md p-3 focus:outline-none focus:border-ink transition-all text-sm resize-none min-h-[120px]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-ink" id="stage-label">Hozirgi Bosqich</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="group" aria-labelledby="stage-label">
            {(['idea', 'mvp', 'growth', 'scaling'] as StartupStage[]).map(s => (
              <button
                key={s}
                type="button"
                aria-pressed={stage === s}
                onClick={() => setStage(s)}
                className={`py-2 px-3 rounded-md transition-all text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  stage === s ? 'bg-ink text-bg' : 'bg-bg text-ink/70 hover:text-ink hover:bg-line/50 border border-line'
                }`}
              >
                {s === 'idea' ? 'G\'oya' : s === 'mvp' ? 'MVP' : s === 'growth' ? 'O\'sish' : 'Kengaytirish'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col space-y-3 pt-6 border-t border-line">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-ink text-bg rounded-md font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                <span>Analiz qilinmoqda...</span>
              </>
            ) : (
              <>
                <span>Boshlash</span>
                <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </>
            )}
          </button>
          <button 
            type="button" 
            onClick={onCancel} 
            className="w-full py-3 text-ink/70 hover:text-ink transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-md"
          >
            Bekor qilish
          </button>
        </div>
      </form>
    </div>
  );
}
