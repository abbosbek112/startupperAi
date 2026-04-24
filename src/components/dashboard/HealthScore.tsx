import { Startup } from '../../types';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';

export default function HealthScore({ startup }: { startup: Startup }) {
  const metrics = [
    { label: 'G\'oya Kuchi', value: startup.metrics?.ideaStrength || 0 },
    { label: 'Ijro (Execution)', value: startup.metrics?.execution || 0 },
    { label: 'Bozorga Moslik', value: startup.metrics?.marketFit || 0 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-ink bg-ink/10';
      case 'risky': return 'text-amber-600 bg-amber-100';
      case 'critical': return 'text-rose-600 bg-rose-100';
      default: return 'text-ink bg-line/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return 'SO\'GLOM';
      case 'risky': return 'XATARLI';
      case 'critical': return 'XAVFLI';
      default: return status.toUpperCase();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-line">
        <div className="space-y-4">
          <h2 className="text-3xl font-display font-semibold tracking-tight">
            Loyiha Salomatligi
          </h2>
          <p className="max-w-md text-sm text-muted leading-relaxed">
            Sizning g'oyangiz va ijro darajangizga asoslangan o'zak vektorlar tahlili.
          </p>
        </div>
        
        <div className="flex flex-col md:items-end">
          <span className="text-xs text-muted mb-2 font-medium">Salomatlik Reytingi</span>
          <div className="text-6xl font-display font-semibold leading-none tracking-tight">
            {startup.healthScore}%
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mt-4 ${getStatusColor(startup.status || '')}`}>
            {getStatusLabel(startup.status || '')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {metrics.map((m, i) => (
          <div key={i} className="space-y-3 p-6 border border-line rounded-lg bg-card/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted">{m.label}</span>
              <span className="text-xl font-display font-semibold">{m.value}%</span>
            </div>
            <div className="h-1 bg-line rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${m.value}%` }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                className="h-full bg-ink rounded-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-card/40 border border-line rounded-lg space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Activity className="w-32 h-32" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Hamkor (AI) Xulosasi</h3>
        <p className="text-xl font-medium leading-relaxed max-w-2xl text-ink/80 relative z-10">
          {startup.reasoning || `Hozirgi bosqichda yuklama ancha yuqori. ${startup.metrics?.marketFit && startup.metrics.marketFit < 60 ? 'Bozorga moslik' : 'Ijro tezligi'} darajasini oshirish lozim. Kelgusi qadamlarni belgilang.`}
        </p>
      </div>
    </div>
  );
}
