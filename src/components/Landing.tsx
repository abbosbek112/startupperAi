import { signInWithGoogle } from '../lib/firebase';
import { Rocket, Target, Shield, MessageSquare, Zap, Play } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-bg relative overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-card to-bg pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl w-full space-y-24 relative z-10"
      >
        <div className="space-y-8">
          <div className="inline-flex items-center space-x-2 bg-card border border-line text-ink/70 px-4 py-2 rounded-full text-xs font-medium shadow-sm">
            <Zap className="w-3.5 h-3.5 text-ink" />
            <span>AI Ko-Faunder Tizimi 4.2</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-semibold tracking-tight text-ink leading-tight">
            Startup <br /> Garage.
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto font-medium leading-relaxed">
            Asoschilar uchun g'oyani pishitish, loyihalash va MVP darajasiga olib chiqishda intellektual yordamchi.
          </p>
        </div>

        <button 
          onClick={() => signInWithGoogle()}
          className="group relative inline-flex items-center px-10 py-5 bg-ink text-bg rounded-lg font-medium text-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 shadow-lg"
        >
          <span>Loyiha Boshlash</span>
          <Play className="ml-3 w-5 h-5 fill-current" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          {[
            { icon: Target, title: 'Yo\'l xaritasi', desc: 'Garajdan MVPga olib boradigan aniq qadamlar.' },
            { icon: Shield, title: 'Salomatlik', desc: 'Loyihangizning kuchli va zaif tomonlari tahlili.' },
            { icon: MessageSquare, title: 'Ko-Faunder', desc: 'Loyiha kontekstini to\'liq tushunuvchi AI sherik.' }
          ].map((feature, i) => (
            <div key={i} className="p-10 bg-card/40 border border-line rounded-2xl text-left hover:bg-card/80 transition-colors">
              <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center mb-6">
                 <feature.icon className="w-5 h-5 text-bg" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight text-ink">{feature.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
