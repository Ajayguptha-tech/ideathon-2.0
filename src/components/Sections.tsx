import { Fragment, lazy, Suspense, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  Layers,
  FileText,
  Zap,
  Trophy,
  Award,
  MapPin,
  ChevronDown,
  Cpu,
  Presentation,
  Building2,
  Calendar,
  ExternalLink,
  Phone,
  UserCheck,
  Sparkles,
  Download,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { eventConfig as c, submissionState, todayIST, type SubmissionState } from '../config/eventConfig';
import Scene from './ThreeDScene';
import SectionScene from './SectionScene';
import ErrorBoundary from './ErrorBoundary';

type Kind = 'nodes' | 'path' | 'stages' | 'podium' | 'poster';

const Sec = ({
  id,
  eyebrow,
  title,
  children,
  v,
  dir = 1,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  v?: Kind;
  dir?: 1 | -1;
}) => (
  <section id={id} className="relative overflow-hidden">
    {v && (
      <div className="pointer-events-none absolute inset-0 hidden opacity-60 md:block">
        <ErrorBoundary fallback={null}>
          <SectionScene kind={v} />
        </ErrorBoundary>
      </div>
    )}
    <div className="relative z-10 mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, x: dir * 60, scale: 0.98 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, margin: '-70px' }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2 mb-10 mt-3">{title}</h2>
        {children}
      </motion.div>
    </div>
  </section>
);

// 1. ANIMATED LANDING PAGE HERO
export function Hero() {
  const cards = [
    ['2', 'Evaluation Rounds'],
    ['2–4', 'Members per Team'],
    ['2nd & 3rd', 'Eligible Years'],
  ];

  return (
    <section id="home" className="mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-4 pb-12 pt-28 sm:px-6 lg:grid-cols-2">
      <div className="space-y-6">
        <p className="eyebrow">{c.club}</p>
        <h1 className="text-4xl font-extrabold text-white drop-shadow-[0_0_30px_#7c3aed] sm:text-6xl md:text-7xl">
          IDEATHON <span className="grad">2.0</span>
        </h1>
        <p className="text-2xl font-semibold text-cyan-100">Turn your ideas into impact.</p>
        <p className="max-w-xl text-slate-300">
          Bring your creativity, identify real-world problems, develop innovative solutions and present your ideas to judges.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          <a href="#register" className="btn-p">
            REGISTER YOUR TEAM
          </a>
          <a href="#schedule" className="btn-s">
            EVENT SCHEDULE
          </a>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4">
          {cards.map(([a, b]) => (
            <div key={b} className="glass p-3 text-center sm:text-left">
              <div className="text-xl font-extrabold text-white md:text-2xl">{a}</div>
              <div className="text-xs text-slate-400">{b}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[360px] mix-blend-screen [mask-image:radial-gradient(closest-side,#000_65%,transparent)] md:h-[540px]">
        <ErrorBoundary fallback={null}>
          <Scene variant="hero" />
        </ErrorBoundary>
      </div>
    </section>
  );
}

// 2. EVENT SCHEDULE (TIMELINE)
export function Timeline() {
  return (
    <Sec v="path" id="schedule" dir={-1} eyebrow="Schedule" title="Event Schedule">
      <ol className="relative ml-4 space-y-8 border-l-2 border-cyan-400/40 pl-8">
        {c.timeline.map((t, i) => (
          <motion.li
            key={t.date}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="relative"
          >
            <span className="absolute -left-[41px] top-2 h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_16px_#22d3ee]" />
            <div className="glass p-5">
              <p className="flex items-center gap-2 font-bold text-cyan-300">
                <Calendar size={16} />
                {t.date} 2026
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">{t.title}</h3>
              <p className="mt-1 text-slate-300">{t.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Sec>
  );
}

// 3. GUIDELINES AND ELIGIBILITY
export function Guidelines() {
  const rules = [
    {
      icon: Building2,
      title: 'Eligible Departments',
      desc: 'Participation is strictly limited to CSE, ACSE and IT only.',
      highlight: true,
    },
    {
      icon: GraduationCap,
      title: 'Eligible Academic Years',
      desc: 'Students of the 2nd and 3rd academic years only are eligible. (4th years are ineligible).',
      highlight: true,
    },
    {
      icon: Users,
      title: 'Team Size',
      desc: 'Every team must consist of exactly 2, 3, or 4 members. Individual participation is not allowed.',
      highlight: true,
    },
    {
      icon: Layers,
      title: 'Mixed-Department Teams',
      desc: 'Mixed-department teams are permitted among the eligible departments (CSE, ACSE, IT).',
      highlight: false,
    },
    {
      icon: Cpu,
      title: 'Implementation Requirement',
      desc: 'A basic working prototype implementation is mandatory for all qualified teams in the final round.',
      highlight: true,
    },
    {
      icon: Presentation,
      title: 'Presentation Requirement',
      desc: 'Qualified teams will present using the official presentation template (released after Round 1 results).',
      highlight: true,
    },
  ];

  return (
    <Sec v="nodes" id="guidelines" dir={1} eyebrow="Eligibility" title="Guidelines & Eligibility">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule, idx) => {
          const Icon = rule.icon;
          return (
            <div
              key={idx}
              className={`glass flex flex-col justify-between p-5 ${
                rule.highlight ? 'border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : ''
              }`}
            >
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">{rule.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{rule.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Sec>
  );
}

// 4. TWO-ROUND EVALUATION PROCESS
export function Evaluation() {
  const rounds = [
    {
      n: 'ROUND 1',
      t: 'Abstract Submission',
      d: '13–19 October 2026',
      l: [
        'Submission through the official Google Form',
        'Identify problem statement & target audience',
        'Proposed innovative technical solution',
        'Uniqueness and practical feasibility',
        'Outline of planned basic implementation',
      ],
    },
    {
      n: 'ROUND 2',
      t: 'Final Presentation',
      d: '24 October 2026',
      l: [
        'Qualified teams present their ideas to judges',
        'Final presentation using official template (mandatory)',
        'Demonstration of basic implementation (mandatory)',
        'Participate in rapid-fire questions on problem statement',
        'Final evaluation & immediate prize declaration',
      ],
    },
  ];

  return (
    <Sec v="stages" id="evaluation" dir={-1} eyebrow="Evaluation Process" title="Two-Round Evaluation">
      <div className="grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr]">
        {rounds.map((r, i) => (
          <Fragment key={r.n}>
            <div className="glass p-6 sm:p-8">
              <span className="eyebrow">{r.n}</span>
              <h3 className="mt-2 text-2xl font-bold text-white">{r.t}</h3>
              <p className="mb-4 text-sm font-semibold text-violet-300">{r.d}</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {r.l.map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
            {i === 0 && (
              <div aria-hidden className="flex items-center justify-center">
                <div className="h-12 w-1 rounded bg-gradient-to-b from-cyan-400 to-violet-500 shadow-[0_0_14px_#8b5cf6] md:h-1 md:w-16" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </Sec>
  );
}

// 5. OFFICIAL TEMPLATES & FINAL ROUND REQUIREMENTS
export function AbstractAndPresentationTemplates() {
  const proposalSections = [
    '1. Abstract (Summary)',
    '2. Team Details',
    '3. Problem Statement',
    '4. Proposed Solution',
    '5. Objectives',
    '6. Methodology & Architecture',
    '7. Technologies & Tools',
    '8. Feasibility & Novelty',
    '9. Practical Impact',
    '10. Conclusion',
  ];

  return (
    <Sec v="poster" id="templates" dir={1} eyebrow="Official Documentation" title="Abstract Submission Template">
      <span id="requirements" className="sr-only" aria-hidden="true" />
      
      <div className="mb-8 max-w-3xl text-slate-300">
        Review the official templates below for your Round 1 proposal submission and the upcoming Round 2 final evaluation.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ================= ABSTRACT SUBMISSION TEMPLATE CARD ================= */}
        <div className="glass flex flex-col justify-between border-cyan-400/40 p-6 sm:p-8 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300 shadow-[0_0_20px_#22d3ee]">
                <FileText size={26} />
              </div>
              <span className="rounded-full border border-cyan-400/40 bg-cyan-950/60 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                Deadline: 19 October 2026
              </span>
            </div>

            <h3 className="mt-4 text-2xl font-bold text-white">Abstract Submission Template</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Download the official Ideathon 2.0 Idea Abstract &amp; Proposal Template, complete all required sections, and use it to prepare your abstract submission.
            </p>

            <div className="mt-5 rounded-lg border border-white/10 bg-navy/80 p-4">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <CheckCircle2 size={14} className="text-cyan-400" />
                <span>Required Proposal Sections</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {proposalSections.map((sec) => (
                  <span
                    key={sec}
                    className="rounded bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 border border-white/10"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href="/Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx"
              download="Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx"
              className="btn-p flex flex-1 items-center justify-center gap-2 !py-2.5 text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(34,211,238,0.35)] transition"
            >
              <Download size={15} /> Download Abstract Template
            </a>
            <div
              className="flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-400 select-none cursor-not-allowed"
              title="The official submission link will be activated during the submission window."
            >
              <Clock size={14} className="text-amber-400" />
              <span>Abstract Submission Form — Coming Soon</span>
            </div>
          </div>
        </div>

        {/* ================= PRESENTATION TEMPLATE NOTICE CARD ================= */}
        <div className="glass flex flex-col justify-between border-violet-400/40 p-6 sm:p-8 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 shadow-[0_0_20px_#8b5cf6]">
                <Presentation size={26} />
              </div>
              <span className="rounded-full border border-violet-400/40 bg-violet-950/60 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-violet-300">
                Available after Round 1 results
              </span>
            </div>

            <h3 className="mt-4 text-2xl font-bold text-white">Presentation Template</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              The official presentation template will be released after the Round 1 results. Qualified teams should use the provided template for their presentation.
            </p>

            <div className="mt-5 space-y-3 rounded-lg border border-violet-400/20 bg-violet-950/20 p-4 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <Calendar size={15} className="mt-0.5 shrink-0 text-violet-300" />
                <span>
                  <b className="text-white">Round 1 Results:</b> Announced on <span className="text-cyan-300">22 October 2026</span>. Qualifying teams will be published on this portal.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-violet-300" />
                <span>
                  <b className="text-white">Slide Deck Download:</b> The official PowerPoint presentation file (.pptx) will be made downloadable directly in this section once results are out.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-950/40 py-2.5 px-4 text-xs font-semibold text-violet-200">
              <Clock size={14} className="text-violet-400" />
              <span>Presentation Template — Available after Round 1 results</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FINAL ROUND EVALUATION PILLARS ================= */}
      <div className="mt-8">
        <h4 className="mb-4 text-base font-bold uppercase tracking-wider text-slate-300">
          Final Round Evaluation Criteria (24 October 2026)
        </h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass border-cyan-400/30 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-300">
              <Cpu size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-mono">Mandatory Pillar</span>
            <h5 className="mt-1 text-base font-bold text-white">Working Basic Implementation</h5>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              Demonstrate execution capability and functional feasibility of your proposed technical solution to the evaluation panel.
            </p>
          </div>

          <div className="glass border-violet-400/30 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-300">
              <Presentation size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 font-mono">Mandatory Pillar</span>
            <h5 className="mt-1 text-base font-bold text-white">Official Presentation Template</h5>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              Qualified teams must present using the standard deck structure provided by the club after Round 1 results.
            </p>
          </div>

          <div className="glass border-amber-400/30 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
              <Zap size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 font-mono">Mandatory Pillar</span>
            <h5 className="mt-1 text-base font-bold text-white">Rapid-Fire Questions</h5>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              Defend your problem statement, system architecture, scalability, domain constraints, and technical decisions under judges' questioning.
            </p>
          </div>
        </div>
      </div>
    </Sec>
  );
}

// Backwards-compatible alias for existing imports
export const PosterRequirements = AbstractAndPresentationTemplates;

// 6. PRIZES AND CERTIFICATES
export function Prizes() {
  const [p1, p2, p3, pc] = c.prizes;

  const Box = ({
    p,
    h,
    cls,
    rank,
  }: {
    p: typeof p1;
    h: string;
    cls: string;
    rank: string;
  }) => (
    <div
      className={`flex flex-col items-center justify-start rounded-t-xl border p-4 text-center transition hover:-translate-y-1 ${h} ${cls}`}
    >
      <Trophy className="text-amber-300" size={26} />
      <span className="mt-1 text-xs font-bold uppercase tracking-wider text-cyan-200">{rank}</span>
      <p className="mt-1 text-sm font-semibold text-white">{p.label}</p>
      <p className="text-2xl font-extrabold text-white">{p.amount}</p>
    </div>
  );

  return (
    <Sec v="podium" id="prizes" dir={-1} eyebrow="Rewards" title="Prizes & Recognition">
      {/* Podium Display */}
      <div className="mx-auto flex max-w-2xl items-end justify-center gap-3">
        <div className="flex-1">
          <Box p={p2} h="h-44" cls="border-slate-300/50 bg-slate-400/10" rank="2nd Place" />
        </div>
        <div className="flex-1">
          <Box
            p={p1}
            h="h-60"
            cls="border-amber-300/70 bg-amber-300/15 shadow-[0_0_35px_#fbbf2455]"
            rank="1st Place"
          />
        </div>
        <div className="flex-1">
          <Box p={p3} h="h-36" cls="border-orange-400/50 bg-orange-400/10" rank="3rd Place" />
        </div>
      </div>

      {/* Consolation Prizes */}
      <div className="glass mx-auto mt-6 max-w-2xl p-5 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Consolation</span>
        <h4 className="mt-1 text-lg font-bold text-white">{pc.label}</h4>
        <p className="text-2xl font-extrabold text-cyan-300">{pc.amount}</p>
      </div>

      {/* Certificates Notice */}
      <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-950/20 p-4 text-center text-slate-200">
        <Award size={24} className="shrink-0 text-cyan-300" />
        <p className="text-sm">
          <b className="text-white">Winners</b> receive physical certificates. All remaining eligible participants will
          receive official <b className="text-white">e-certificates</b>.
        </p>
      </div>
    </Sec>
  );
}

// 7. ANNOUNCEMENTS, RESULTS AND VENUE
export function Announcements() {
  const [override, setOverride] = useState('');
  const state: SubmissionState = submissionState(override || todayIST());

  return (
    <Sec id="announcements" dir={1} eyebrow="Updates & Venue" title="Announcements, Results & Venue">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {c.announcements.map((a) => (
          <div key={a.title} className="glass p-5">
            <p className="font-bold text-white">{a.title}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <MapPin size={15} className="shrink-0 text-cyan-300" />
              {a.title.includes('Venue') ? c.venue : a.status}
            </p>
          </div>
        ))}
      </div>

      {/* Qualifying Teams */}
      <div className="glass mt-6 p-6">
        <h4 className="font-bold text-white">Qualifying Teams (Round 2)</h4>
        <p className="text-xs text-slate-400">Scheduled announcement on 22 October 2026.</p>
        <div className="mt-3">
          {c.qualifyingTeams.length > 0 ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
              {c.qualifyingTeams.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-400">To be announced</p>
          )}
        </div>
      </div>

      {/* Final Results */}
      <div className="glass mt-4 p-6">
        <h4 className="font-bold text-white">Final Results & Prize Winners</h4>
        <p className="text-xs text-slate-400">Declaration on 24 October 2026.</p>
        <div className="mt-3">
          {c.finalResults.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-200">
              {c.finalResults.map((r) => (
                <li key={r.rank}>
                  <b className="text-cyan-300">{r.rank}:</b> {r.team}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">To be announced</p>
          )}
        </div>
      </div>

      {/* Official Form Submission Box (Round 1) */}
      <div className="glass mt-6 p-6">
        <h4 className="font-bold text-white">Round 1 Abstract Submission (Google Form)</h4>
        <p className="mt-1 text-sm text-slate-300">
          Official Google Form for Round 1 abstract submissions opens 13 October 2026 and closes 19 October 2026.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {state === 'before' && (
            <span className="rounded-lg border border-cyan-400/30 bg-cyan-950/40 px-4 py-2 text-sm text-cyan-200">
              Abstract submissions open on 13 October 2026.
            </span>
          )}
          {state === 'closed' && (
            <span className="rounded-lg border border-red-400/30 bg-red-950/40 px-4 py-2 text-sm text-red-200">
              Abstract submission period has closed.
            </span>
          )}
          {state === 'open' && (
            c.formUrl ? (
              <a
                href={c.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-p flex items-center gap-2 text-sm"
              >
                SUBMIT ABSTRACT VIA GOOGLE FORM <ExternalLink size={16} />
              </a>
            ) : (
              <span className="text-sm text-slate-400">
                Official Google Form submission link: <b>To be announced</b>
              </span>
            )
          )}

          {import.meta.env.DEV && (
            <label className="text-xs text-slate-500">
              Dev preview date:{' '}
              <select
                className="rounded border border-white/10 bg-navy px-2 py-1 text-xs text-white"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              >
                <option value="">Live Date</option>
                <option value="2026-10-01">1 Oct (Before)</option>
                <option value="2026-10-15">15 Oct (Open)</option>
                <option value="2026-10-21">21 Oct (Closed)</option>
              </select>
            </label>
          )}
        </div>
      </div>
    </Sec>
  );
}

// 8. CORE ORGANIZERS SECTION
export function CoreOrganizers() {
  return (
    <Sec id="organizers" dir={-1} eyebrow="Event Leadership" title="Core Organizers">
      <p className="mb-8 max-w-2xl text-slate-300">
        Connect directly with the core event coordination team for any queries regarding guidelines, submissions, or the ideathon flow.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {c.coreOrganizers.map((org) => (
          <div
            key={org.name}
            className="glass flex flex-col justify-between border border-cyan-400/30 p-6 transition hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
          >
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <UserCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">{org.name}</h3>

              <div className="mt-4 border-t border-white/10 pt-4">
                <span className="text-xs text-slate-400">Contact:</span>
                <a
                  href={`tel:${org.tel}`}
                  className="mt-1 flex items-center gap-2 font-mono text-base font-bold text-white transition hover:text-cyan-300"
                >
                  <Phone size={16} className="text-cyan-400" />
                  {org.contact}
                </a>
              </div>

              <p className="mt-3 text-sm font-medium tracking-wide text-cyan-300">
                {org.department}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Sec>
  );
}

// FAQ SECTION
const faqs: [string, string][] = [
  ['Who can participate?', 'Students of the CSE, ACSE and IT departments from the 2nd and 3rd academic years only.'],
  ['What is the permitted team size?', 'Every team must have exactly 2, 3, or 4 members. Individual participation is not allowed.'],
  ['Can students from different eligible departments form a team?', 'Yes. CSE, ACSE and IT students may form mixed-department teams.'],
  ['Can 4th year students participate?', 'No. Participation is strictly limited to 2nd and 3rd academic year students.'],
  ['How many rounds are there?', 'Two: Abstract Submission (13–19 October) and the Final Presentation (24 October).'],
  ['What is required for the final round?', 'A working basic implementation, final presentation using the official presentation template, and participation in rapid-fire questions.'],
  ['Is a basic implementation mandatory?', 'Yes, for all final-round teams.'],
  ['When will the presentation template be released?', 'The official presentation template will be released after Round 1 results on 22 October 2026 for all qualified teams.'],
  ['When will Round 2 results be announced?', 'On 22 October 2026.'],
  ['Will participants receive certificates?', 'Winners receive certificates; the remaining participants receive e-certificates.'],
  ['Where will the venue be announced?', 'The final-round venue will be announced in the Announcements section of this website.'],
];

export function FAQ() {
  const [o, setO] = useState<number | null>(null);

  return (
    <Sec id="faq" eyebrow="Frequently Asked Questions" title="FAQ">
      <div className="space-y-3">
        {faqs.map(([q, a], i) => (
          <div key={q} className="glass">
            <button
              className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold text-white"
              aria-expanded={o === i}
              aria-controls={`faq-${i}`}
              onClick={() => setO(o === i ? null : i)}
            >
              <span>{q}</span>
              <ChevronDown className={`shrink-0 transition ${o === i ? 'rotate-180 text-cyan-300' : 'text-slate-400'}`} />
            </button>
            {o === i && (
              <p id={`faq-${i}`} className="px-4 pb-4 text-sm text-slate-300">
                {a}
              </p>
            )}
          </div>
        ))}
      </div>
    </Sec>
  );
}

// 9. FOOTER
export function Footer() {
  return (
    <footer className="border-t border-cyan-400/20 px-4 py-8">
      <div className="mx-auto max-w-6xl text-center text-xs text-slate-400">
        <p>© 2026 Young Innovators Club. Ideathon 2.0. All rights reserved.</p>
      </div>
    </footer>
  );
}
