import { Startup } from '../../types';
import HealthScore from '../dashboard/HealthScore';
import Roadmap from '../dashboard/Roadmap';
import Chat from '../dashboard/Chat';
import PitchGenerator from '../dashboard/PitchGenerator';
import BuilderWorkspace from '../dashboard/BuilderWorkspace';
import WebsiteBuilder from '../dashboard/WebsiteBuilder';
import { useState } from 'react';
import { Activity, Map, MessageCircle, FileText, Settings, Rocket, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StartupDashboardProps {
  startup: Startup;
}

export default function StartupDashboard({ startup }: StartupDashboardProps) {
  const [activeTab, setActiveTab] = useState<'builder' | 'health' | 'roadmap' | 'pitch' | 'website'>('builder');

  const currentTabs = [
    { id: 'builder', icon: Rocket, label: 'Quruvchi' },
    { id: 'website', icon: Globe, label: 'Kodlar bazasi' },
    { id: 'health', icon: Activity, label: 'Samaradorlik' },
    { id: 'roadmap', icon: Map, label: 'Strategiya' },
    { id: 'pitch', icon: FileText, label: 'Taqdimot' },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-bg">
      <nav 
        role="tablist" 
        aria-label="Loyihani boshqarish oynalari"
        className="flex border-b border-line bg-card/10 shrink-0 px-2 pt-2 gap-2 overflow-x-auto hide-scrollbar"
      >
        {currentTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 flex items-center space-x-2 transition-all relative rounded-t-lg whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
              activeTab === tab.id ? 'text-ink bg-bg font-medium border-t border-x border-line' : 'text-muted hover:text-ink/80 hover:bg-line/20 border-t border-x border-transparent'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-ink' : 'text-muted'}`} aria-hidden="true" />
            <span className="text-sm">{tab.label}</span>
            {activeTab === tab.id && (
              <div aria-hidden="true" className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-bg" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden bg-bg relative">
        <AnimatePresence mode="wait">
          {activeTab === 'builder' && (
            <motion.div role="tabpanel" id="tabpanel-builder" aria-labelledby="tab-builder" key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full absolute inset-0 focus:outline-none" tabIndex={0}>
              <BuilderWorkspace startup={startup} />
            </motion.div>
          )}
          {activeTab === 'health' && (
            <motion.div role="tabpanel" id="tabpanel-health" aria-labelledby="tab-health" key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 md:p-12 overflow-y-auto h-full absolute inset-0 focus:outline-none" tabIndex={0}>
              <HealthScore startup={startup} />
            </motion.div>
          )}
          {activeTab === 'roadmap' && (
            <motion.div role="tabpanel" id="tabpanel-roadmap" aria-labelledby="tab-roadmap" key="roadmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 md:p-12 overflow-y-auto h-full absolute inset-0 focus:outline-none" tabIndex={0}>
              <Roadmap startup={startup} />
            </motion.div>
          )}
          {activeTab === 'pitch' && (
            <motion.div role="tabpanel" id="tabpanel-pitch" aria-labelledby="tab-pitch" key="pitch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 md:p-12 overflow-y-auto h-full absolute inset-0 focus:outline-none" tabIndex={0}>
              <PitchGenerator startup={startup} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keep WebsiteBuilder always mounted so generation/chat state isn't reset when navigating away */}
        <motion.div 
          role="tabpanel"
          id="tabpanel-website"
          aria-labelledby="tab-website"
          initial={{ opacity: 0 }} 
          animate={{ opacity: activeTab === 'website' ? 1 : 0 }} 
          style={{ 
            pointerEvents: activeTab === 'website' ? 'auto' : 'none',
            zIndex: activeTab === 'website' ? 10 : -1,
            visibility: activeTab === 'website' ? 'visible' : 'hidden'
          }} 
          className="h-full absolute inset-0 focus:outline-none"
          tabIndex={0}
        >
          <WebsiteBuilder startup={startup} />
        </motion.div>
      </div>
    </div>
  );
}
