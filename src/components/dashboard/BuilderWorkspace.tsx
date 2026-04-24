import { Startup, BuilderPhase } from '../../types';
import { motion } from 'motion/react';
import { ChevronRight, CheckCircle2, Circle, Rocket, Target, BarChart3, Palette, Layout, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import Chat from './Chat';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { buildPhaseWithAI } from '../../lib/gemini';

const PHASES: { id: BuilderPhase; label: string; icon: any; description: string }[] = [
  { 
    id: 'vazifa_belgilash', 
    label: 'G\'oya va Muammo', 
    icon: Target,
    description: 'Muammoning dolzarbligini va yechimning asosiy logikasini aniqlaymiz.' 
  },
  { 
    id: 'biznes_reja', 
    label: 'Biznes Reja (Lean Canvas)', 
    icon: Layout,
    description: '9 blokdan iborat bitta varaqli biznes model.' 
  },
  { 
    id: 'raqobat', 
    label: 'Raqobat Tahlili', 
    icon: BarChart3,
    description: 'Bozordagi asosiy xavfli raqobatchilar va ustunligingiz.' 
  },
  { 
    id: 'bozor_tahlili', 
    label: 'Auditoriya', 
    icon: Target,
    description: 'Kimlarga sotamiz va ularning aniq vizual portreti nima?' 
  },
  { 
    id: 'strategiya', 
    label: 'Daromad Modeli', 
    icon: Layout,
    description: 'Qanday qilib pul topish mexanizmi.' 
  },
  { 
    id: 'narxlash', 
    label: 'Narxlash (Pricing)', 
    icon: BarChart3,
    description: 'Tariflar va foydaga chiqish uchun qancha foydalanuvchi kerakligi.' 
  },
  { 
    id: 'identiteti', 
    label: 'Brending', 
    icon: Palette,
    description: 'Nom, slogan, ranglar va vizual tanib olish strategiyasi.' 
  },
  { 
    id: 'mvp_qurish', 
    label: 'MVP Funksiyalari', 
    icon: Rocket,
    description: 'Ishga tushuvchi platformaning ilk texnik qismi.' 
  },
  { 
    id: 'go_to_market', 
    label: 'Go-to-Market', 
    icon: Rocket,
    description: 'Ilk 100 ta mijozni qayerdan va qanday olib kelish ssenariysi.' 
  }
];

export default function BuilderWorkspace({ startup }: { startup: Startup }) {
  const [advancing, setAdvancing] = useState(false);
  const [generatingPhase, setGeneratingPhase] = useState<string | null>(null);
  const currentPhaseIndex = PHASES.findIndex(p => p.id === startup.builderPhase);
  const nextPhase = PHASES[currentPhaseIndex + 1];

  const handleAdvance = async () => {
    if (!nextPhase) return;
    setAdvancing(true);
    try {
      const startupRef = doc(db, 'startups', startup.id);
      await updateDoc(startupRef, {
        builderPhase: nextPhase.id,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Phase update error:', error);
    } finally {
      setAdvancing(false);
    }
  };

  const handleManualUpdate = async (field: string, val: any) => {
    try {
      const startupRef = doc(db, 'startups', startup.id);
      await updateDoc(startupRef, {
        [field]: val,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Manual update error:', error);
    }
  };

  const handleAIAssist = async (phaseId: string) => {
    setGeneratingPhase(phaseId);
    try {
      const result = await buildPhaseWithAI(startup, phaseId);
      const startupRef = doc(db, 'startups', startup.id);
      
      let updates: any = { updatedAt: serverTimestamp() };
      
      if (phaseId === 'vazifa_belgilash' && result.idea) {
        updates.idea = result.idea;
      } else if (phaseId === 'biznes_reja' && result.leanCanvas) {
        updates['businessPlan.leanCanvas'] = result.leanCanvas;
      } else if (phaseId === 'raqobat' && result.competitors) {
        updates['businessPlan.competitors'] = result.competitors;
      } else if (phaseId === 'bozor_tahlili' && result.targetAudience) {
        updates['strategy.targetAudience'] = result.targetAudience;
      } else if (phaseId === 'strategiya') {
        if (result.revenueModel) updates['strategy.revenueModel'] = result.revenueModel;
        if (result.channels) updates['strategy.channels'] = result.channels;
      } else if (phaseId === 'narxlash' && result.pricing) {
        updates['businessPlan.pricing'] = result.pricing;
      } else if (phaseId === 'identiteti') {
        if (result.slogan) updates['branding.slogan'] = result.slogan;
        if (result.colors) updates['branding.colors'] = result.colors;
        if (result.font) updates['branding.font'] = result.font;
      } else if (phaseId === 'mvp_qurish') {
        let mvpText = '';
        if (result.mvpFeatures) mvpText += `🎯 Asosiy Funksiyalar:\n${result.mvpFeatures}\n\n`;
        if (result.techStack) mvpText += `🛠 Texnologiyalar:\n${result.techStack}\n\n`;
        if (result.nextSteps) mvpText += `🚀 Qadamlar:\n${result.nextSteps}`;
        if (!mvpText && result.mvpPlan) mvpText = result.mvpPlan; // fallback
        updates['websiteBrief.sections'] = [{ title: 'MVP Rejasi', content: mvpText.trim() }];
      } else if (phaseId === 'go_to_market' && result.go_to_market) {
        updates['businessPlan.go_to_market'] = result.go_to_market;
      }
      
      await updateDoc(startupRef, updates);
    } catch (error) {
      console.error('AI build error:', error);
    } finally {
      setGeneratingPhase(null);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-bg">
      {/* Sidebar Progress */}
      <div className="w-full md:w-80 border-r border-line p-8 space-y-10 overflow-y-auto shrink-0 bg-card/10">
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-semibold tracking-tight">
            Bosqichlar
          </h2>
          <p className="text-sm text-muted">0% dan 100% gacha startup qurish yo'li.</p>
        </div>

        <div className="space-y-6">
          {PHASES.map((phase, idx) => {
            const isCompleted = idx < currentPhaseIndex;
            const isActive = idx === currentPhaseIndex;
            const Icon = phase.icon;

            return (
              <div 
                key={phase.id} 
                className={`relative pl-8 space-y-2 group ${idx === PHASES.length - 1 ? '' : 'pb-6'}`}
              >
                {/* Vertical Line */}
                {idx !== PHASES.length - 1 && (
                  <div className={`absolute left-[11px] top-6 bottom-0 w-[1.5px] ${
                    isCompleted ? 'bg-ink' : 'bg-line'
                  }`} />
                )}

                {/* Status Dot/Icon */}
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-bg ${
                  isCompleted ? 'bg-ink text-bg border-none' : 
                  isActive ? 'border-2 border-ink text-ink' : 'border border-line text-ink/20'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3 h-3" />}
                </div>

                <div className="space-y-1">
                  <h4 className={`text-sm font-medium transition-colors ${
                    isActive || isCompleted ? 'text-ink' : 'text-ink/40'
                  }`}>
                    {idx + 1}. {phase.label}
                  </h4>
                  {isActive && (
                    <p className="text-xs text-ink/60 leading-relaxed">
                      {phase.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {nextPhase && (
          <button 
            onClick={handleAdvance}
            disabled={advancing}
            className="w-full flex items-center justify-between p-4 rounded-md bg-line/20 hover:bg-line/40 transition-all group"
          >
            <div className="text-left flex flex-col">
              <span className="text-xs text-muted mb-0.5">Keyingi bosqich</span>
              <span className="text-sm font-medium text-ink group-hover:translate-x-1 transition-transform">{nextPhase.label}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-ink" />
          </button>
        )}
      </div>

      {/* Main Collaborative Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-bg">
          {/* Working Canvas (Drafts) */}
          <div className="flex-1 p-8 space-y-8 overflow-y-auto border-r border-line">
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="text-sm font-semibold tracking-tight">Hujjatlar logi</span>
                <span className="text-xs text-muted opacity-80">Avtomatik saqlanadi</span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* 1. Idea Section */}
                <ProjectSection 
                  title="G'oya va Muammo" 
                  content={startup.idea} 
                  isLocked={currentPhaseIndex > 0} 
                  onAIAction={currentPhaseIndex === 0 ? () => handleAIAssist('vazifa_belgilash') : undefined}
                  generating={generatingPhase === 'vazifa_belgilash'}
                  onUpdate={(val) => handleManualUpdate('idea', val)}
                />

                {/* 2. Lean Canvas */}
                {currentPhaseIndex >= 1 && (
                  <ProjectSection 
                    title="Biznes Reja (Lean Canvas)" 
                    content={startup.businessPlan?.leanCanvas || "Startapning bir varaqli biznes modelini (Lean Canvas) yaratamiz..."} 
                    isLocked={currentPhaseIndex > 1}
                    onAIAction={currentPhaseIndex === 1 ? () => handleAIAssist('biznes_reja') : undefined}
                    generating={generatingPhase === 'biznes_reja'}
                    onUpdate={(val) => handleManualUpdate('businessPlan.leanCanvas', val)}
                  />
                )}

                {/* 3. Competitor Matrix */}
                {currentPhaseIndex >= 2 && (
                  <ProjectSection 
                    title="Raqobat Tahlili" 
                    content={startup.businessPlan?.competitors || "Bozordagi raqobatchilar va yashirin ustunligimiz haqida tahlil..."} 
                    isLocked={currentPhaseIndex > 2}
                    onAIAction={currentPhaseIndex === 2 ? () => handleAIAssist('raqobat') : undefined}
                    generating={generatingPhase === 'raqobat'}
                    onUpdate={(val) => handleManualUpdate('businessPlan.competitors', val)}
                  />
                )}

                {/* 4. Market Section */}
                {currentPhaseIndex >= 3 && (
                  <ProjectSection 
                    title="Bozor va Auditoriya" 
                    content={startup.strategy?.targetAudience || 'Auditoriya hali aniqlanmagan...'} 
                    isLocked={currentPhaseIndex > 3}
                    onAIAction={currentPhaseIndex === 3 ? () => handleAIAssist('bozor_tahlili') : undefined}
                    generating={generatingPhase === 'bozor_tahlili'}
                    onUpdate={(val) => handleManualUpdate('strategy.targetAudience', val)}
                  />
                )}

                {/* 5. Strategy Section */}
                {currentPhaseIndex >= 4 && (
                  <ProjectSection 
                    title="Strategiya va Model" 
                    content={startup.strategy?.revenueModel || 'Daromad modeli va kanallar logikasi...'}
                    isLocked={currentPhaseIndex > 4}
                    onAIAction={currentPhaseIndex === 4 ? () => handleAIAssist('strategiya') : undefined}
                    generating={generatingPhase === 'strategiya'}
                    onUpdate={(val) => handleManualUpdate('strategy.revenueModel', val)}
                  >
                    {currentPhaseIndex === 4 ? (
                      <div className="mt-4 pt-4 border-t border-line border-dashed">
                        <label className="text-xs font-semibold text-muted block mb-2">Kanallar (Vergul bilan ajrating)</label>
                        <input
                          type="text"
                          value={startup.strategy?.channels?.join(', ') || ''}
                          onChange={(e) => handleManualUpdate('strategy.channels', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="SEO, SMM, Cold Outreach..."
                          className="w-full bg-transparent border-b border-line focus:border-ink/50 focus:ring-0 px-0 py-1 text-sm outline-none transition-colors"
                        />
                      </div>
                    ) : startup.strategy?.channels && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {startup.strategy.channels.map((chan, i) => (
                           <span key={i} className="px-3 py-1 bg-line/20 text-xs rounded-full">{chan}</span>
                        ))}
                      </div>
                    )}
                  </ProjectSection>
                )}

                {/* 6. Pricing */}
                {currentPhaseIndex >= 5 && (
                  <ProjectSection 
                    title="Narxlash (Pricing)" 
                    content={startup.businessPlan?.pricing || "Qanday narxlash va nechta foydalanuvchi foydaga chiqish uchun kerakligini hisoblaymiz..."} 
                    isLocked={currentPhaseIndex > 5}
                    onAIAction={currentPhaseIndex === 5 ? () => handleAIAssist('narxlash') : undefined}
                    generating={generatingPhase === 'narxlash'}
                    onUpdate={(val) => handleManualUpdate('businessPlan.pricing', val)}
                  />
                )}

                {/* 7. Branding Section */}
                {currentPhaseIndex >= 6 && (
                  <ProjectSection 
                    title="Brending va Identitet" 
                    content={startup.branding?.slogan || 'Nom, slogan va vizual strukturalar ustida ishlamoqdamiz...'}
                    isLocked={currentPhaseIndex > 6}
                    onAIAction={currentPhaseIndex === 6 ? () => handleAIAssist('identiteti') : undefined}
                    generating={generatingPhase === 'identiteti'}
                    onUpdate={(val) => handleManualUpdate('branding.slogan', val)}
                  >
                    {currentPhaseIndex === 6 ? (
                      <div className="mt-4 pt-4 border-t border-line border-dashed grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-muted block mb-2">Ranglar (3 ta HEX)</label>
                          <input
                            type="text"
                            value={startup.branding?.colors?.join(', ') || ''}
                            onChange={(e) => handleManualUpdate('branding.colors', e.target.value.split(',').map(s => s.trim()))}
                            placeholder="#171717, #FFFFFF, #333333"
                            className="w-full bg-transparent border-b border-line focus:border-ink/50 focus:ring-0 px-0 py-1 text-sm outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted block mb-2">Shrift (Google Font)</label>
                          <input
                            type="text"
                            value={startup.branding?.font || ''}
                            onChange={(e) => handleManualUpdate('branding.font', e.target.value)}
                            placeholder="Masalan: Inter"
                            className="w-full bg-transparent border-b border-line focus:border-ink/50 focus:ring-0 px-0 py-1 text-sm outline-none transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col space-y-4">
                          {startup.branding?.colors && (
                            <div className="flex space-x-2">
                                {startup.branding.colors.map((c, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border border-line" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                          )}
                          <span className="text-xs text-muted">Shrift: {startup.branding?.font || 'Tanlanmagan'}</span>
                      </div>
                    )}
                  </ProjectSection>
                )}
                
                {/* 8. MVP Plan */}
                {currentPhaseIndex >= 7 && (
                  <ProjectSection 
                    title="MVP Funksiyalari" 
                    content={startup.websiteBrief?.sections?.[0]?.content || 'MVP rejasini shakllantiring...'} 
                    isLocked={currentPhaseIndex > 7}
                    onAIAction={currentPhaseIndex === 7 ? () => handleAIAssist('mvp_qurish') : undefined}
                    generating={generatingPhase === 'mvp_qurish'}
                    onUpdate={(val) => handleManualUpdate('websiteBrief.sections', [{ title: 'MVP Rejasi', content: val }])}
                  />
                )}

                {/* 9. Go to market */}
                {currentPhaseIndex >= 8 && (
                  <ProjectSection 
                    title="Go-to-Market" 
                    content={startup.businessPlan?.go_to_market || "Ilk 100 ta foydalanuvchini olib kelish mexanika va kanallarini tahlil qilamiz..."} 
                    isLocked={false}
                    onAIAction={currentPhaseIndex === 8 ? () => handleAIAssist('go_to_market') : undefined}
                    generating={generatingPhase === 'go_to_market'}
                    onUpdate={(val) => handleManualUpdate('businessPlan.go_to_market', val)}
                  />
                )}

                {/* Fallback for unused space */}
                {currentPhaseIndex < 8 && (
                  <div className="py-20 border border-line border-dashed rounded-lg flex flex-col items-center justify-center opacity-40">
                    <Layout className="w-8 h-8 mb-4 text-muted" />
                    <span className="text-sm">Kelgusi bosqichlar qulflangan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Integrated Chat */}
          <div className="w-full md:w-[450px] flex flex-col bg-bg shrink-0 border-l border-line">
            <Chat startup={startup} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectSection({ 
  title, 
  content, 
  children, 
  isLocked, 
  onAIAction, 
  generating,
  onUpdate 
}: { 
  title: string; 
  content: string; 
  children?: React.ReactNode; 
  isLocked?: boolean; 
  onAIAction?: () => void; 
  generating?: boolean;
  onUpdate?: (newContent: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(content);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(content);
    }
  }, [content, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== content && onUpdate) {
      onUpdate(localValue);
    }
  };

  // Adjust height based on content
  const getTextareaHeight = () => {
    const minHeight = 80;
    const lines = localValue.split('\n').length;
    const estimatedHeight = lines * 24 + 40; // Approx 24px per line + padding
    return `${Math.max(minHeight, estimatedHeight)}px`;
  };

  return (
    <div className={`p-6 border border-line rounded-lg transition-all ${isLocked ? 'opacity-50 bg-bg' : 'bg-card/10 border-line hover:border-ink/20'} flex flex-col group`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="flex items-center space-x-3">
           {onAIAction && !isLocked && (
             <button 
               onClick={onAIAction} 
               disabled={generating} 
               className="flex items-center space-x-2 px-3 py-1.5 bg-ink text-bg text-xs font-medium rounded-md hover:bg-ink/80 transition-all disabled:opacity-50"
             >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span className="hidden sm:inline">{generating ? 'Yaratilmoqda...' : 'AI bilan hal qilish'}</span>
             </button>
           )}
           {isLocked && <CheckCircle2 className="w-4 h-4 text-muted" />}
        </div>
      </div>
      {isLocked ? (
        <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-wrap">
          {content}
        </p>
      ) : (
        <textarea
           value={localValue}
           onChange={(e) => setLocalValue(e.target.value)}
           onFocus={() => setIsEditing(true)}
           onBlur={handleBlur}
           placeholder={`${title} uchun ma'lumot kiriting...`}
           style={{ height: getTextareaHeight() }}
           className="w-full bg-transparent border-none p-0 m-0 focus:ring-0 focus:outline-none text-sm leading-relaxed text-ink/80 resize-none transition-all placeholder:text-muted/50"
        />
      )}
      {children}
    </div>
  );
}
