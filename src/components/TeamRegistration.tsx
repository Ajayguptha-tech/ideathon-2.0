import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Hash,
  GraduationCap,
  Building2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { eventConfig as c } from '../config/eventConfig';
import { getApiUrl } from '../config/apiConfig';

export interface MemberData {
  name: string;
  regNo: string;
  department: string;
  academicYear: string;
  email: string;
  phone: string;
}

export interface FormData {
  teamName: string;
  teamSize: 2 | 3 | 4;
  lead: MemberData;
  members: MemberData[];
  honeypot: string;
}

const initialMember = (): MemberData => ({
  name: '',
  regNo: '',
  department: 'CSE',
  academicYear: '2nd',
  email: '',
  phone: '',
});

const initialFormData: FormData = {
  teamName: '',
  teamSize: 2,
  lead: initialMember(),
  members: [initialMember()],
  honeypot: '',
};

export default function TeamRegistration() {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Success state from backend
  const [successData, setSuccessData] = useState<{
    teamId?: string;
    registrationId: string;
    teamName: string;
    teamSize: number;
    leadEmail: string;
    emailSent: boolean;
    emailMessage?: string;
  } | null>(null);

  // Update team size (2, 3, or 4 members)
  const handleTeamSizeChange = (size: 2 | 3 | 4) => {
    setFormData((prev) => {
      const neededMembers = size - 1;
      const nextMembers: MemberData[] = [];
      for (let i = 0; i < neededMembers; i++) {
        nextMembers.push(prev.members[i] || initialMember());
      }
      return {
        ...prev,
        teamSize: size,
        members: nextMembers,
      };
    });
    setErrors({});
  };

  // Field change helpers
  const handleLeadChange = (field: keyof MemberData, val: string) => {
    setFormData((prev) => ({
      ...prev,
      lead: { ...prev.lead, [field]: val },
    }));
    if (errors[`lead.${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`lead.${field}`];
        return next;
      });
    }
  };

  const handleMemberChange = (idx: number, field: keyof MemberData, val: string) => {
    setFormData((prev) => {
      const nextMembers = [...prev.members];
      nextMembers[idx] = { ...nextMembers[idx], [field]: val };
      return { ...prev, members: nextMembers };
    });
    if (errors[`members.${idx}.${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`members.${idx}.${field}`];
        return next;
      });
    }
  };

  // Validation functions
  const validateMember = (m: MemberData, prefix: string) => {
    const errs: Record<string, string> = {};
    if (!m.name.trim() || m.name.trim().length < 2) {
      errs[`${prefix}.name`] = 'Full name must be at least 2 characters.';
    }
    if (!m.regNo.trim() || !/^[A-Za-z0-9]{4,20}$/.test(m.regNo.trim())) {
      errs[`${prefix}.regNo`] = 'Enter valid registration number (4-20 alphanumeric characters).';
    }
    if (!c.departments.includes(m.department)) {
      errs[`${prefix}.department`] = `Department must be one of: ${c.departments.join(', ')}.`;
    }
    if (!c.years.includes(m.academicYear)) {
      errs[`${prefix}.academicYear`] = `Year must be 2nd or 3rd year only.`;
    }
    if (!m.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim())) {
      errs[`${prefix}.email`] = 'Enter a valid email address.';
    }
    const cleanPhone = m.phone.replace(/[\s\-+]/g, '');
    if (!cleanPhone || !/^[0-9]{10,12}$/.test(cleanPhone)) {
      errs[`${prefix}.phone`] = 'Enter a valid 10-digit mobile number.';
    }
    return errs;
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.teamName.trim() || formData.teamName.trim().length < 2) {
      errs.teamName = 'Team name is required (at least 2 characters).';
    }
    if (![2, 3, 4].includes(formData.teamSize)) {
      errs.teamSize = 'Team size must be 2, 3, or 4 members.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = validateMember(formData.lead, 'lead');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    let errs: Record<string, string> = {};
    formData.members.forEach((m, idx) => {
      const mErrs = validateMember(m, `members.${idx}`);
      errs = { ...errs, ...mErrs };
    });

    // Check duplicates inside team
    const all = [
      { role: 'Team Lead', ...formData.lead },
      ...formData.members.map((m, idx) => ({ role: `Member ${idx + 2}`, ...m })),
    ];

    const regMap = new Set<string>();
    const emailMap = new Set<string>();
    const phoneMap = new Set<string>();

    all.forEach((p) => {
      const r = p.regNo.trim().toUpperCase();
      const e = p.email.trim().toLowerCase();
      const ph = p.phone.trim().replace(/[\s\-+]/g, '');

      if (r) {
        if (regMap.has(r)) {
          errs.intraDuplicate = `Duplicate registration number '${r}' entered across team members.`;
        }
        regMap.add(r);
      }
      if (e) {
        if (emailMap.has(e)) {
          errs.intraDuplicate = `Duplicate email '${e}' entered across team members.`;
        }
        emailMap.add(e);
      }
      if (ph) {
        if (phoneMap.has(ph)) {
          errs.intraDuplicate = `Duplicate phone number '${ph}' entered across team members.`;
        }
        phoneMap.add(ph);
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    setApiError(null);
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
  };

  const handleBack = () => {
    setApiError(null);
    setErrors({});
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setApiError(null);
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      setApiError('Please resolve all validation errors before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teamName: formData.teamName.trim(),
        teamSize: formData.teamSize,
        lead: {
          name: formData.lead.name.trim(),
          regNo: formData.lead.regNo.trim().toUpperCase(),
          department: formData.lead.department,
          academicYear: formData.lead.academicYear,
          email: formData.lead.email.trim().toLowerCase(),
          phone: formData.lead.phone.trim().replace(/[\s\-+]/g, ''),
        },
        members: formData.members.map((m) => ({
          name: m.name.trim(),
          regNo: m.regNo.trim().toUpperCase(),
          department: m.department,
          academicYear: m.academicYear,
          email: m.email.trim().toLowerCase(),
          phone: m.phone.trim().replace(/[\s\-+]/g, ''),
        })),
        honeypot: formData.honeypot,
      };

      const res = await fetch(getApiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.warn('Failed to parse server response as JSON:', parseErr);
      }

      if (!res.ok) {
        if (data && data.errors) {
          const firstErr = Object.values(data.errors)[0] as string;
          setApiError(firstErr || data.message || 'Registration failed.');
          setErrors(data.errors);
        } else if (data && data.message) {
          setApiError(data.message);
        } else {
          setApiError(`Server error (${res.status}). Please check your connection and try again.`);
        }
        setSubmitting(false);
        return;
      }

      // Successful registration
      setSuccessData({
        teamId: data.teamId || data.registrationId,
        registrationId: data.registrationId || data.teamId,
        teamName: data.teamName,
        teamSize: data.teamSize,
        leadEmail: data.leadEmail,
        emailSent: !!data.emailSent,
        emailMessage: data.emailMessage,
      });
    } catch (err: unknown) {
      console.error('Submission network error:', err);
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      setApiError(
        isOffline
          ? 'You appear to be offline. Please check your internet connection.'
          : 'Unable to connect to registration server. Please check your network and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyRegId = () => {
    const idToCopy = successData?.teamId || successData?.registrationId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setStep(1);
    setSuccessData(null);
    setErrors({});
    setApiError(null);
  };

  return (
    <section id="register" className="relative overflow-hidden py-24">
      {/* Background radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(124,58,237,0.18),transparent_70%)]"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center">
          <p className="eyebrow justify-center">Registration Portal</p>
          <h2 className="h2 mb-4 mt-3">REGISTER YOUR TEAM</h2>
          <p className="mx-auto max-w-2xl text-slate-300">
            Participation is open to eligible students of <b className="text-cyan-300">CSE, ACSE and IT</b> departments
            from <b className="text-cyan-300">2nd and 3rd academic years only</b>. Teams must consist of{' '}
            <b className="text-white">2, 3, or 4 members</b>.
          </p>
        </div>

        {/* Honeypot for spam bots */}
        <input
          type="text"
          name="confirm_blank"
          value={formData.honeypot}
          onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />

        {/* SUCCESS STATE */}
        {successData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass mx-auto mt-12 overflow-hidden border border-cyan-400/50 p-8 text-center shadow-[0_0_50px_rgba(34,211,238,0.2)] md:p-12"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 shadow-[0_0_30px_#22d3ee]">
              <CheckCircle2 size={44} />
            </div>

            <p className="eyebrow justify-center">Registration Confirmed</p>
            <h3 className="mb-2 mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Team registered successfully!
            </h3>
            <p className="text-slate-300">
              Welcome to the Young Innovators Club <strong>Ideathon 2.0</strong>.
            </p>

            {/* Registration Details Card */}
            <div className="mx-auto my-8 max-w-lg rounded-xl border border-white/10 bg-navy/80 p-6 text-left backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-slate-400">Team ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold tracking-wider text-cyan-300">
                    {successData.teamId || successData.registrationId}
                  </span>
                  <button
                    onClick={copyRegId}
                    title="Copy Team ID"
                    className="rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 py-3">
                <span className="text-sm text-slate-400">Team Name:</span>
                <span className="font-semibold text-white">{successData.teamName}</span>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 py-3">
                <span className="text-sm text-slate-400">Team Size:</span>
                <span className="font-semibold text-white">{successData.teamSize} Members</span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-sm text-slate-400">Team Leader Email:</span>
                <span className="font-semibold text-cyan-200">{successData.leadEmail}</span>
              </div>
            </div>

            {/* Official WhatsApp Group Callout */}
            <div className="mx-auto mb-8 max-w-lg rounded-xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/50 to-navy p-6 shadow-[0_0_30px_rgba(16,185,129,0.25)] text-left">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <MessageCircle size={28} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white">Join Official WhatsApp Group</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    For more updates, join our official WhatsApp group. Important announcements, round-2 shortlist, and venue details will be shared here.
                  </p>
                  <a
                    href={c.whatsappGroupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.8)]"
                  >
                    Join WhatsApp Group <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={resetForm} className="btn-s flex items-center gap-2 text-sm">
                <RotateCcw size={16} /> Register Another Team
              </button>
              <a href="#schedule" className="btn-p text-sm">
                View Event Schedule
              </a>
            </div>
          </motion.div>
        ) : (
          /* MULTI-STEP FORM EXPERIENCE */
          <div className="glass mx-auto mt-10 p-6 md:p-10">
            {/* Step Indicators */}
            <div className="mb-10">
              <div className="flex items-center justify-between">
                {[
                  { n: 1, title: 'Team Info' },
                  { n: 2, title: 'Team Lead' },
                  { n: 3, title: 'Members' },
                  { n: 4, title: 'Review' },
                ].map((s, idx, arr) => (
                  <div key={s.n} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                          step === s.n
                            ? 'border-2 border-cyan-300 bg-cyan-400/30 text-white shadow-[0_0_16px_#22d3ee]'
                            : step > s.n
                            ? 'bg-violet-600 text-white'
                            : 'border border-white/20 bg-white/5 text-slate-400'
                        }`}
                      >
                        {step > s.n ? <Check size={18} /> : s.n}
                      </div>
                      <span
                        className={`mt-2 hidden text-xs font-semibold sm:block ${
                          step === s.n ? 'text-cyan-300' : 'text-slate-400'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 transition-all ${
                          step > s.n ? 'bg-violet-500' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {apiError && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
                <AlertTriangle className="mt-0.5 shrink-0 text-red-400" size={18} />
                <div>
                  <p className="font-semibold">Unable to proceed</p>
                  <p className="text-xs text-red-300">{apiError}</p>
                </div>
              </div>
            )}

            {errors.intraDuplicate && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-200">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
                <div>
                  <p className="font-semibold">Duplicate Student Details</p>
                  <p className="text-xs text-amber-300">{errors.intraDuplicate}</p>
                </div>
              </div>
            )}

            {/* FORM STEPS */}
            <AnimatePresence mode="wait">
              {/* STEP 1: TEAM INFORMATION */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 1: Team Information</h3>
                    <p className="text-sm text-slate-400">Choose your team name and select 2, 3, or 4 members.</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Team Name <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Neural Innovators"
                      value={formData.teamName}
                      onChange={(e) => {
                        setFormData({ ...formData, teamName: e.target.value });
                        if (errors.teamName) setErrors({ ...errors, teamName: '' });
                      }}
                      className={`w-full rounded-lg border bg-navy/90 px-4 py-3 text-white placeholder-slate-500 transition focus:outline-none ${
                        errors.teamName
                          ? 'border-red-500 focus:border-red-400'
                          : 'border-white/20 focus:border-cyan-400'
                      }`}
                    />
                    {errors.teamName && (
                      <p className="mt-1.5 text-xs text-red-400">{errors.teamName}</p>
                    )}
                  </div>

                  {/* Three-Option Team Size Selector (2, 3, or 4 members) */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Select Number of Members <span className="text-cyan-400">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { size: 2, label: '2 Members', desc: 'Lead + 1 Member' },
                        { size: 3, label: '3 Members', desc: 'Lead + 2 Members' },
                        { size: 4, label: '4 Members', desc: 'Lead + 3 Members' },
                      ].map((item) => {
                        const active = formData.teamSize === item.size;
                        return (
                          <button
                            type="button"
                            key={item.size}
                            onClick={() => handleTeamSizeChange(item.size as 2 | 3 | 4)}
                            className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                              active
                                ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_24px_rgba(34,211,238,0.25)]'
                                : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                            }`}
                          >
                            <Users
                              className={`mb-1.5 ${active ? 'text-cyan-300' : 'text-slate-400'}`}
                              size={24}
                            />
                            <span
                              className={`text-base font-bold ${
                                active ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="mt-0.5 text-[11px] text-slate-400">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: TEAM LEAD DETAILS */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-300">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Step 2: Team Leader Details</h3>
                      <p className="text-sm text-slate-400">
                        Official confirmations and notifications will be sent to the team leader.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-300">
                        Full Name <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Arjun Verma"
                        value={formData.lead.name}
                        onChange={(e) => handleLeadChange('name', e.target.value)}
                        className={`w-full rounded-lg border bg-navy/90 px-4 py-3 text-white placeholder-slate-500 transition focus:outline-none ${
                          errors['lead.name']
                            ? 'border-red-500 focus:border-red-400'
                            : 'border-white/20 focus:border-cyan-400'
                        }`}
                      />
                      {errors['lead.name'] && (
                        <p className="mt-1.5 text-xs text-red-400">{errors['lead.name']}</p>
                      )}
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                        <Hash size={14} className="text-cyan-400" /> Registration Number{' '}
                        <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 231FA04001"
                        value={formData.lead.regNo}
                        onChange={(e) => handleLeadChange('regNo', e.target.value.toUpperCase())}
                        className={`w-full rounded-lg border bg-navy/90 px-4 py-3 uppercase text-white placeholder-slate-500 transition focus:outline-none ${
                          errors['lead.regNo']
                            ? 'border-red-500 focus:border-red-400'
                            : 'border-white/20 focus:border-cyan-400'
                        }`}
                      />
                      {errors['lead.regNo'] && (
                        <p className="mt-1.5 text-xs text-red-400">{errors['lead.regNo']}</p>
                      )}
                    </div>

                    {/* Department */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                        <Building2 size={14} className="text-cyan-400" /> Department{' '}
                        <span className="text-cyan-400">*</span>
                      </label>
                      <select
                        value={formData.lead.department}
                        onChange={(e) => handleLeadChange('department', e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-navy/90 px-4 py-3 text-white transition focus:border-cyan-400 focus:outline-none"
                      >
                        {c.departments.map((dept) => (
                          <option key={dept} value={dept} className="bg-navy text-white">
                            {dept}
                          </option>
                        ))}
                      </select>
                      {errors['lead.department'] && (
                        <p className="mt-1.5 text-xs text-red-400">{errors['lead.department']}</p>
                      )}
                    </div>

                    {/* Academic Year (2nd and 3rd only!) */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                        <GraduationCap size={14} className="text-cyan-400" /> Academic Year{' '}
                        <span className="text-cyan-400">*</span>
                      </label>
                      <select
                        value={formData.lead.academicYear}
                        onChange={(e) => handleLeadChange('academicYear', e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-navy/90 px-4 py-3 text-white transition focus:border-cyan-400 focus:outline-none"
                      >
                        {c.years.map((yr) => (
                          <option key={yr} value={yr} className="bg-navy text-white">
                            {yr} Year
                          </option>
                        ))}
                      </select>
                      {errors['lead.academicYear'] && (
                        <p className="mt-1.5 text-xs text-red-400">{errors['lead.academicYear']}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                        <Phone size={14} className="text-cyan-400" /> Mobile Number{' '}
                        <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={formData.lead.phone}
                        onChange={(e) => handleLeadChange('phone', e.target.value)}
                        className={`w-full rounded-lg border bg-navy/90 px-4 py-3 text-white placeholder-slate-500 transition focus:outline-none ${
                          errors['lead.phone']
                            ? 'border-red-500 focus:border-red-400'
                            : 'border-white/20 focus:border-cyan-400'
                        }`}
                      />
                      {errors['lead.phone'] && (
                        <p className="mt-1.5 text-xs text-red-400">{errors['lead.phone']}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="sm:col-span-2">
                      <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                        <Mail size={14} className="text-cyan-400" /> Email Address (Official / Primary){' '}
                        <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. leader@student.vignan.ac.in"
                        value={formData.lead.email}
                        onChange={(e) => handleLeadChange('email', e.target.value)}
                        className={`w-full rounded-lg border bg-navy/90 px-4 py-3 text-white placeholder-slate-500 transition focus:outline-none ${
                          errors['lead.email']
                            ? 'border-red-500 focus:border-red-400'
                            : 'border-white/20 focus:border-cyan-400'
                        }`}
                      />
                      {errors['lead.email'] && (
                        <p className="mt-1.5 text-xs text-red-400">{errors['lead.email']}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        Important: The registration confirmation will be sent to this email address.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: ADDITIONAL TEAM MEMBERS */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 3: Team Member Details</h3>
                    <p className="text-sm text-slate-400">
                      Provide details for the remaining {formData.teamSize - 1} member(s). Mixed-department teams
                      (CSE, ACSE, IT) are permitted. All members must be from 2nd or 3rd year.
                    </p>
                  </div>

                  {formData.members.map((member, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
                    >
                      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/30 text-xs font-bold text-violet-300">
                            {idx + 2}
                          </span>
                          <h4 className="font-bold text-white">Member {idx + 2} Details</h4>
                        </div>
                        <span className="text-xs text-cyan-300">2nd or 3rd Year Only</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Member Name */}
                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-300">
                            Full Name <span className="text-cyan-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Full name"
                            value={member.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            className={`w-full rounded-lg border bg-navy/90 px-4 py-2.5 text-white placeholder-slate-500 transition focus:outline-none ${
                              errors[`members.${idx}.name`]
                                ? 'border-red-500 focus:border-red-400'
                                : 'border-white/20 focus:border-cyan-400'
                            }`}
                          />
                          {errors[`members.${idx}.name`] && (
                            <p className="mt-1.5 text-xs text-red-400">
                              {errors[`members.${idx}.name`]}
                            </p>
                          )}
                        </div>

                        {/* Registration Number */}
                        <div>
                          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                            <Hash size={14} className="text-cyan-400" /> Registration Number{' '}
                            <span className="text-cyan-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 231FA04002"
                            value={member.regNo}
                            onChange={(e) =>
                              handleMemberChange(idx, 'regNo', e.target.value.toUpperCase())
                            }
                            className={`w-full rounded-lg border bg-navy/90 px-4 py-2.5 uppercase text-white placeholder-slate-500 transition focus:outline-none ${
                              errors[`members.${idx}.regNo`]
                                ? 'border-red-500 focus:border-red-400'
                                : 'border-white/20 focus:border-cyan-400'
                            }`}
                          />
                          {errors[`members.${idx}.regNo`] && (
                            <p className="mt-1.5 text-xs text-red-400">
                              {errors[`members.${idx}.regNo`]}
                            </p>
                          )}
                        </div>

                        {/* Department */}
                        <div>
                          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                            <Building2 size={14} className="text-cyan-400" /> Department{' '}
                            <span className="text-cyan-400">*</span>
                          </label>
                          <select
                            value={member.department}
                            onChange={(e) => handleMemberChange(idx, 'department', e.target.value)}
                            className="w-full rounded-lg border border-white/20 bg-navy/90 px-4 py-2.5 text-white transition focus:border-cyan-400 focus:outline-none"
                          >
                            {c.departments.map((dept) => (
                              <option key={dept} value={dept} className="bg-navy text-white">
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Academic Year (2nd and 3rd only!) */}
                        <div>
                          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                            <GraduationCap size={14} className="text-cyan-400" /> Academic Year{' '}
                            <span className="text-cyan-400">*</span>
                          </label>
                          <select
                            value={member.academicYear}
                            onChange={(e) =>
                              handleMemberChange(idx, 'academicYear', e.target.value)
                            }
                            className="w-full rounded-lg border border-white/20 bg-navy/90 px-4 py-2.5 text-white transition focus:border-cyan-400 focus:outline-none"
                          >
                            {c.years.map((yr) => (
                              <option key={yr} value={yr} className="bg-navy text-white">
                                {yr} Year
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                            <Phone size={14} className="text-cyan-400" /> Mobile Number{' '}
                            <span className="text-cyan-400">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="10-digit mobile"
                            value={member.phone}
                            onChange={(e) => handleMemberChange(idx, 'phone', e.target.value)}
                            className={`w-full rounded-lg border bg-navy/90 px-4 py-2.5 text-white placeholder-slate-500 transition focus:outline-none ${
                              errors[`members.${idx}.phone`]
                                ? 'border-red-500 focus:border-red-400'
                                : 'border-white/20 focus:border-cyan-400'
                            }`}
                          />
                          {errors[`members.${idx}.phone`] && (
                            <p className="mt-1.5 text-xs text-red-400">
                              {errors[`members.${idx}.phone`]}
                            </p>
                          )}
                        </div>

                        {/* Email */}
                        <div className="sm:col-span-2">
                          <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                            <Mail size={14} className="text-cyan-400" /> Email Address{' '}
                            <span className="text-cyan-400">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="Student email address"
                            value={member.email}
                            onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                            className={`w-full rounded-lg border bg-navy/90 px-4 py-2.5 text-white placeholder-slate-500 transition focus:outline-none ${
                              errors[`members.${idx}.email`]
                                ? 'border-red-500 focus:border-red-400'
                                : 'border-white/20 focus:border-cyan-400'
                            }`}
                          />
                          {errors[`members.${idx}.email`] && (
                            <p className="mt-1.5 text-xs text-red-400">
                              {errors[`members.${idx}.email`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* STEP 4: REVIEW STEP BEFORE SUBMISSION */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 4: Review Registration Details</h3>
                    <p className="text-sm text-slate-400">
                      Verify all team and member information before submitting to the database.
                    </p>
                  </div>

                  {/* Team Overview Card */}
                  <div className="rounded-xl border border-cyan-400/30 bg-navy/80 p-5 backdrop-blur-md">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-cyan-300">Team</span>
                        <h4 className="text-xl font-extrabold text-white">{formData.teamName}</h4>
                      </div>
                      <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-200">
                        {formData.teamSize} Members
                      </span>
                    </div>

                    {/* Member Cards */}
                    <div className="mt-4 space-y-3">
                      {/* Team Lead */}
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300">
                            Team Leader: {formData.lead.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formData.lead.department} · {formData.lead.academicYear} Year
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>Reg: <b className="text-white">{formData.lead.regNo}</b></span>
                          <span>Email: <b className="text-white">{formData.lead.email}</b></span>
                          <span>Phone: <b className="text-white">{formData.lead.phone}</b></span>
                        </div>
                      </div>

                      {/* Additional Members */}
                      {formData.members.map((m, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">
                              Member {idx + 2}: {m.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {m.department} · {m.academicYear} Year
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>Reg: <b className="text-white">{m.regNo}</b></span>
                            <span>Email: <b className="text-white">{m.email}</b></span>
                            <span>Phone: <b className="text-white">{m.phone}</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Terms & Guidelines Checklist */}
                  <div className="rounded-lg border border-violet-400/30 bg-violet-950/20 p-4 text-xs text-slate-300">
                    <p className="font-semibold text-violet-200">Eligibility Agreement (Ideathon 2.0):</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-400">
                      <li>All team members are currently enrolled in CSE, ACSE, or IT (2nd or 3rd year only).</li>
                      <li>No student is registered in more than one team.</li>
                      <li>
                        We understand that the final round requires a presentation using the official template and a working basic
                        implementation.
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* NAVIGATION BUTTONS */}
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="btn-s flex items-center gap-2 !py-2.5 text-sm"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-p flex items-center gap-2 !py-2.5 text-sm"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-p flex items-center gap-2 !py-3 text-base shadow-[0_0_30px_#7c3aed]"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Registering Team...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Confirm & Submit Registration
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
