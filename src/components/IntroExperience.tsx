import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { eventConfig as c } from '../config/eventConfig';
import ThreeDScene from './ThreeDScene';
import ErrorBoundary from './ErrorBoundary';

export default function IntroExperience({ onDone }: { onDone: () => void }) {
  const [surge, setSurge] = useState(false);

  const start = () => {
    setSurge(true);
    setTimeout(onDone, 1200);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_70%_50%,#1e1b4b,#050816_70%)]"
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* 3D Background with Error Boundary */}
      <div className="absolute inset-0">
        <ErrorBoundary fallback={<div className="h-full w-full" />}>
          <ThreeDScene variant="intro" surge={surge} />
        </ErrorBoundary>
      </div>

      {/* Main Intro Content */}
      <motion.div
        animate={{ opacity: surge ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex h-full max-w-3xl flex-col justify-center gap-5 px-6 sm:px-12 md:px-16"
      >
        <p className="eyebrow">{c.club} presents</p>
        <h1 className="text-4xl font-extrabold leading-tight text-white drop-shadow-[0_0_30px_#7c3aed] sm:text-6xl md:text-7xl">
          IDEATHON <span className="grad">2.0</span>
        </h1>
        <p className="text-base font-semibold tracking-[0.25em] text-cyan-200 sm:text-lg">
          INNOVATE. BUILD. PRESENT.
        </p>

        <div className="pt-2">
          <button
            onClick={start}
            className="btn-p group flex items-center gap-3 text-base sm:text-lg"
          >
            GET STARTED{' '}
            <ArrowRight size={20} className="transition group-hover:translate-x-1" />
          </button>
        </div>
      </motion.div>

      {/* Quick skip button */}
      <button
        onClick={onDone}
        className="absolute bottom-5 right-5 z-20 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
      >
        Skip intro
      </button>
    </motion.div>
  );
}
