import { useEffect, useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';
import { eventConfig as c } from '../config/eventConfig';

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Schedule', href: '#schedule' },
  { label: 'Guidelines', href: '#guidelines' },
  { label: 'Evaluation', href: '#evaluation' },
  { label: 'Templates', href: '#templates' },
  { label: 'Prizes', href: '#prizes' },
  { label: 'Announcements', href: '#announcements' },
  { label: 'Organizers', href: '#organizers' },
];

export default function Navbar() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setSolid(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid || open
          ? 'bg-navy/95 shadow-[0_4px_30px_rgba(0,0,0,0.6)] backdrop-blur-md border-b border-cyan-400/20'
          : 'bg-navy/40 backdrop-blur-sm'
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#home" className="group flex items-center gap-2 text-sm font-bold leading-tight text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-300 transition group-hover:bg-cyan-400/30">
            <Sparkles size={16} />
          </span>
          <span>{c.club}</span>
        </a>

        {/* Desktop Links & Right Branding */}
        <div className="hidden items-center gap-4 xl:gap-6 lg:flex">
          <ul className="flex items-center gap-3.5 xl:gap-5">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  className="text-sm font-medium text-slate-300 transition hover:text-cyan-300"
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#register" className="btn-p !py-2 text-sm whitespace-nowrap">
                Register Team
              </a>
            </li>
          </ul>

          {/* Official Vignan Logo (Extreme Right Desktop) */}
          <div className="flex items-center pl-1">
            <img
              src="/vignan-logo.jpg"
              alt="Vignan's Foundation for Science, Technology & Research"
              className="h-9 w-auto max-w-[140px] rounded bg-white p-0.5 shadow-sm object-contain"
            />
          </div>
        </div>

        {/* Mobile Right Container (Logo + Menu Toggle) */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <img
            src="/vignan-logo.jpg"
            alt="Vignan's"
            className="h-7 sm:h-8 w-auto max-w-[110px] rounded bg-white p-0.5 shadow-sm object-contain"
          />
          <button
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <ul className="space-y-1 border-t border-white/10 px-4 pb-6 pt-3 lg:hidden">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-cyan-300"
                href={item.href}
              >
                {item.label}
              </a>
            </li>
          ))}
          <li className="pt-2">
            <a
              onClick={() => setOpen(false)}
              href="#register"
              className="btn-p block text-center !py-2.5 text-sm"
            >
              Register Team
            </a>
          </li>
        </ul>
      )}
    </header>
  );
}
