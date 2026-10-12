import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

const navPoints = [
  { id: 'home', label: 'Home' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'templates', label: 'Templates' },
  { id: 'prizes', label: 'Prizes' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'register', label: 'Register' },
  { id: 'organizers', label: 'Organizers' },
];

export default function SideNav() {
  const [active, setActive] = useState('home');
  const { scrollYProgress } = useScroll();
  const w = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );

    navPoints.forEach((point) => {
      const el = document.getElementById(point.id);
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* Top progress bar */}
      <motion.div
        style={{ scaleX: w }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-cyan-400 via-violet-500 to-cyan-300 shadow-[0_0_8px_#22d3ee]"
      />

      {/* Floating side navigation dots */}
      <nav
        aria-label="Sections navigation"
        className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3.5 lg:flex"
      >
        {navPoints.map((point) => (
          <a
            key={point.id}
            href={`#${point.id}`}
            aria-label={point.label}
            title={point.label}
            className={`group relative flex items-center justify-end ${
              active === point.id ? 'scale-110' : ''
            }`}
          >
            {/* Tooltip on hover */}
            <span className="pointer-events-none absolute right-6 rounded bg-navy/90 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100 border border-white/10">
              {point.label}
            </span>

            <span
              className={`h-3 w-3 rounded-full border border-cyan-400/60 transition-all ${
                active === point.id
                  ? 'scale-125 bg-cyan-300 shadow-[0_0_14px_#22d3ee]'
                  : 'bg-transparent hover:bg-cyan-300/40'
              }`}
            />
          </a>
        ))}
      </nav>
    </>
  );
}
