import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Search,
  Download,
  FileSpreadsheet,
  RotateCcw,
  LogOut,
  ArrowLeft,
  AlertTriangle,
  Building2,
  GraduationCap,
  Calendar,
  X,
  Phone,
  Hash,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  ChevronDown,
  Users,
  Trash2,
} from 'lucide-react';
import { getApiUrl } from '../config/apiConfig';

interface DropdownOption {
  value: string;
  label: string;
}

interface AdminDropdownProps {
  id?: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  minWidth?: string;
  align?: 'left' | 'right';
  ariaLabel?: string;
}

function AdminDropdown({
  id,
  icon,
  value,
  onChange,
  options,
  minWidth = '130px',
  align = 'left',
  ariaLabel,
}: AdminDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle keyboard events (Escape to close, Arrows to navigate)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const currentIndex = options.findIndex((o) => o.value === value);
      if (e.key === 'ArrowDown') {
        const next = (currentIndex + 1) % options.length;
        onChange(options[next].value);
      } else {
        const prev = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prev].value);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={containerRef} className="relative inline-block text-left" id={id}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0d1629] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:bg-[#121e36] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          style={{ minWidth }}
          className={`absolute top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-cyan-400/30 bg-[#0c1527] p-1 shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  isSelected
                    ? 'bg-cyan-500/20 font-bold text-cyan-300'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={12} className="ml-2 shrink-0 text-cyan-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TeamMember {
  name: string;
  regNo: string;
  department: string;
  academicYear: string;
  email: string;
  phone: string;
  role?: string;
}

interface TeamRecord {
  id?: string;
  teamId?: string;
  registrationId: string;
  timestamp: string;
  teamName: string;
  teamSize: number;
  lead: TeamMember;
  members: TeamMember[];
  status: string;
  emailSent: boolean;
  emailError?: string;
}

interface StatsData {
  totalTeams: number;
  totalStudents: number;
  teamSizes: { '2': number; '3': number; '4': number };
  departments: Record<string, number>;
  years: Record<string, number>;
  registrationsByDate: Array<{ date: string; teams: number; students: number }>;
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('admin_token') || sessionStorage.getItem('organizer_token');
    } catch {
      return null;
    }
  });

  const [adminEmail, setAdminEmail] = useState<string>(() => {
    try {
      return sessionStorage.getItem('admin_email') || 'ajayguptha710@gmail.com';
    } catch {
      return 'ajayguptha710@gmail.com';
    }
  });

  // Login form state
  const [inputEmail, setInputEmail] = useState('ajayguptha710@gmail.com');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard data state
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sizeFilter, setSizeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'teamName' | 'teamSize'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected team for inspection modal
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);

  // Deletion modal and processing state
  const [teamToDelete, setTeamToDelete] = useState<TeamRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotification, setDeleteNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Export loading state
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Load dashboard data when authenticated
  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch Teams
      const resTeams = await fetch(getApiUrl('/api/admin/teams?limit=-1'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resTeams.status === 401 || resTeams.status === 403) {
        handleLogout();
        setAuthError('Administrator session expired. Please sign in again.');
        return;
      }

      if (!resTeams.ok) {
        throw new Error('Failed to load team records.');
      }

      const teamsData = await resTeams.json();
      setTeams(teamsData.teams || []);

      // 2. Fetch Stats
      const resStats = await fetch(getApiUrl('/api/admin/stats'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resStats.ok) {
        const statsPayload = await resStats.json();
        setStats(statsPayload.stats || null);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch admin data:', err);
      setFetchError('Unable to load registration records. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!inputEmail.trim()) {
      setAuthError('Please enter the administrator email address.');
      return;
    }

    if (!inputPassword) {
      setAuthError('Please enter your administrator password.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inputEmail.trim().toLowerCase(),
          password: inputPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || 'Invalid administrator email or password.');
        return;
      }

      // Store token safely in session storage
      try {
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.setItem('admin_email', data.admin?.email || inputEmail.trim().toLowerCase());
        // Backwards compatibility
        sessionStorage.setItem('organizer_token', data.token);
      } catch {
        /* ignore */
      }

      setToken(data.token);
      setAdminEmail(data.admin?.email || inputEmail.trim().toLowerCase());
      setInputPassword('');
    } catch {
      setAuthError('Network error connecting to backend. Please check server status.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_email');
      sessionStorage.removeItem('organizer_token');
    } catch {
      /* ignore */
    }
    setToken(null);
    setTeams([]);
    setStats(null);
    setSelectedTeam(null);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    if (!token) return;
    setExportingExcel(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/export-excel'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to generate Excel export.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ideathon2_registrations_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to download Excel file.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Export to CSV (.csv)
  const handleExportCsv = async () => {
    if (!token) return;
    setExportingCsv(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/export-csv'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to generate CSV export.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ideathon2_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to download CSV file.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Secure team deletion handler (authenticated, confirmed, transactional)
  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete || !token || isDeleting) return;

    setIsDeleting(true);
    setDeleteNotification(null);

    const targetId = teamToDelete.registrationId || teamToDelete.teamId || '';
    const targetName = teamToDelete.teamName;

    try {
      const res = await fetch(getApiUrl(`/api/admin/teams/${encodeURIComponent(targetId)}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        setAuthError('Administrator session expired. Please sign in again.');
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete team record.');
      }

      // Close deletion dialog
      setTeamToDelete(null);

      // Close detail inspection modal if this team was open
      if (
        selectedTeam &&
        (selectedTeam.registrationId === targetId || selectedTeam.teamId === targetId)
      ) {
        setSelectedTeam(null);
      }

      // Display clear success message
      setDeleteNotification({
        type: 'success',
        text: `Team "${targetName}" (${targetId}) was successfully deleted.`,
      });

      // Refresh dashboard data, statistics, and filters
      await loadDashboardData();
    } catch (err: unknown) {
      setDeleteNotification({
        type: 'error',
        text: (err as Error).message || 'Failed to delete team. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDeptFilter('ALL');
    setYearFilter('ALL');
    setSizeFilter('ALL');
    setDateFilter('ALL');
    setSortBy('date');
    setSortOrder('desc');
  };

  // Filtered & Sorted teams
  const filteredAndSortedTeams = useMemo(() => {
    if (!Array.isArray(teams)) return [];
    let result = teams.filter((t) => {
      if (!t) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (t.teamName || '').toLowerCase().includes(q) ||
        (t.registrationId || '').toLowerCase().includes(q) ||
        (t.teamId && t.teamId.toLowerCase().includes(q)) ||
        (t.lead?.name || '').toLowerCase().includes(q) ||
        (t.lead?.regNo || '').toLowerCase().includes(q) ||
        (t.members || []).some(
          (m) =>
            (m?.name || '').toLowerCase().includes(q) ||
            (m?.regNo || '').toLowerCase().includes(q)
        );

      const allDepts = [t.lead?.department, ...(t.members || []).map((m) => m?.department)]
        .filter(Boolean)
        .map((d) => String(d).toUpperCase());
      const matchDept = deptFilter === 'ALL' || allDepts.includes(deptFilter);

      const allYears = [t.lead?.academicYear, ...(t.members || []).map((m) => m?.academicYear)].filter(
        Boolean
      );
      const matchYear = yearFilter === 'ALL' || allYears.includes(yearFilter);

      const teamSizeVal = t.teamSize || (t.members?.length || 0) + 1;
      const matchSize = sizeFilter === 'ALL' || String(teamSizeVal) === sizeFilter;

      let teamDate = '';
      try {
        teamDate = t.timestamp ? new Date(t.timestamp).toISOString().slice(0, 10) : '';
      } catch {
        teamDate = '';
      }
      const matchDate = dateFilter === 'ALL' || teamDate === dateFilter;

      return matchSearch && matchDept && matchYear && matchSize && matchDate;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'teamName') {
        cmp = (a.teamName || '').localeCompare(b.teamName || '');
      } else if (sortBy === 'teamSize') {
        cmp =
          (a.teamSize || (a.members?.length || 0) + 1) -
          (b.teamSize || (b.members?.length || 0) + 1);
      } else {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        cmp = timeA - timeB;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [teams, searchQuery, deptFilter, yearFilter, sizeFilter, dateFilter, sortBy, sortOrder]);

  // Paginated records
  const totalRecords = filteredAndSortedTeams.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedTeams.slice(start, start + pageSize);
  }, [filteredAndSortedTeams, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, yearFilter, sizeFilter, dateFilter, pageSize]);

  // Unique registration dates for dropdown filter
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    (teams || []).forEach((t) => {
      if (t?.timestamp) {
        try {
          dates.add(new Date(t.timestamp).toISOString().slice(0, 10));
        } catch {
          /* ignore */
        }
      }
    });
    return Array.from(dates).sort().reverse();
  }, [teams]);

  return (
    <div className="min-h-screen bg-navy text-slate-200 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-cyan-400/20 bg-navy/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={14} /> Back to Website
            </a>
            <div className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-cyan-400" size={20} />
              <div className="text-base font-bold text-white sm:text-lg">
                Ideathon 2.0 <span className="font-normal text-cyan-300">| Private Admin Panel</span>
              </div>
            </div>
          </div>

          {token && (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-400 md:inline">
                Admin: <b className="text-cyan-300">{adminEmail}</b>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-900/40"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {!token ? (
          /* ================= ADMIN LOGIN CARD ================= */
          <div className="mx-auto mt-12 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-cyan-400/30 p-8 shadow-[0_0_50px_rgba(34,211,238,0.15)]"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-300 shadow-[0_0_30px_#22d3ee]">
                <Lock size={28} />
              </div>
              <h2 className="text-center text-2xl font-bold text-white">Administrator Login</h2>
              <p className="mt-1 text-center text-xs text-slate-400">
                Single authorized account access. Password authentication protected.
              </p>

              {authError && (
                <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
                  <AlertTriangle className="mt-0.5 shrink-0 text-red-400" size={15} />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500"
                      size={16}
                    />
                    <input
                      type="email"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="ajayguptha710@gmail.com"
                      className="w-full rounded-lg border border-white/20 bg-navy/90 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500"
                      size={16}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-white/20 bg-navy/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Secured by server-side BCrypt hash and HMAC-SHA256 tokens.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-p w-full !py-2.5 text-sm font-bold shadow-[0_0_20px_#7c3aed]"
                >
                  {authLoading ? 'Verifying Credentials...' : 'Sign In as Administrator'}
                </button>
              </form>
            </motion.div>
          </div>
        ) : (
          /* ================= ADMIN DASHBOARD VIEW ================= */
          <div className="space-y-6">
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl tracking-tight">
                  Ideathon 2.0 — Admin Dashboard
                </h1>
                <p className="mt-1 text-xs text-slate-400">
                  Live Ideathon 2.0 database records across CSE, ACSE, and IT (2nd & 3rd Years | 2–4 Members).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  onClick={loadDashboardData}
                  disabled={loading}
                  className="btn-s flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-semibold"
                >
                  <RotateCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>

                {/* EXPORT TO EXCEL BUTTON */}
                <button
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/60 px-4 py-2 text-xs font-bold text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition hover:bg-emerald-900/80 hover:text-white disabled:opacity-50"
                >
                  <FileSpreadsheet size={15} className="text-emerald-400" />
                  {exportingExcel ? 'Exporting...' : 'Export to Excel (.xlsx)'}
                </button>

                {/* EXPORT TO CSV BUTTON */}
                <button
                  onClick={handleExportCsv}
                  disabled={exportingCsv}
                  className="btn-p flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold shadow-[0_0_20px_#7c3aed]"
                >
                  <Download size={14} />
                  {exportingCsv ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>


            {/* Error state */}
            {fetchError && (
              <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="shrink-0 text-red-400" size={16} />
                  <span>{fetchError}</span>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="rounded bg-red-900/60 px-3 py-1 text-xs font-semibold text-white hover:bg-red-800"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Deletion feedback alert */}
            {deleteNotification && (
              <div
                className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold ${
                  deleteNotification.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {deleteNotification.type === 'success' ? (
                    <Check size={16} className="shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0 text-rose-400" />
                  )}
                  <span>{deleteNotification.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteNotification(null)}
                  className="rounded p-1 hover:bg-white/10"
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ================= STATISTICS METRIC CARDS ================= */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Teams */}
              <div className="glass border border-cyan-400/30 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Total Teams
                </span>
                <p className="mt-1 text-3xl font-extrabold text-white">
                  {stats ? (stats.totalTeams ?? 0) : (teams?.length ?? 0)}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <Users size={13} className="text-cyan-400" />
                  <span>Registered Ideathon 2.0 Teams</span>
                </div>
              </div>

              {/* Total Students */}
              <div className="glass border border-violet-400/30 p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                  Total Students
                </span>
                <p className="mt-1 text-3xl font-extrabold text-white">
                  {stats
                    ? (stats.totalStudents ?? 0)
                    : (teams?.reduce((acc, t) => acc + (t.teamSize || (t.members?.length || 0) + 1), 0) ?? 0)}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <UserCheck size={13} className="text-violet-400" />
                  <span>Active Participants</span>
                </div>
              </div>

              {/* Team Size Breakdown */}
              <div className="glass p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Team Sizes
                </span>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-cyan-200">
                    2 Members: <b>{stats?.teamSizes?.['2'] ?? 0}</b>
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-violet-200">
                    3 Members: <b>{stats?.teamSizes?.['3'] ?? 0}</b>
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-purple-200">
                    4 Members: <b>{stats?.teamSizes?.['4'] ?? 0}</b>
                  </span>
                </div>
                <span className="mt-2 block text-[11px] text-slate-400">Allowed range: 2–4 members</span>
              </div>

              {/* Departments & Years Breakdown */}
              <div className="glass p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Demographics
                </span>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-cyan-950/60 px-1.5 py-0.5 font-mono text-cyan-300 border border-cyan-400/30">
                      CSE: <b>{stats?.departments?.CSE ?? 0}</b>
                    </span>
                    <span className="rounded bg-violet-950/60 px-1.5 py-0.5 font-mono text-violet-300 border border-violet-400/30">
                      ACSE: <b>{stats?.departments?.ACSE ?? 0}</b>
                    </span>
                    <span className="rounded bg-purple-950/60 px-1.5 py-0.5 font-mono text-purple-300 border border-purple-400/30">
                      IT: <b>{stats?.departments?.IT ?? 0}</b>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                    <span>2nd Year: <b className="text-white">{stats?.years?.['2nd'] ?? 0}</b></span>
                    <span>·</span>
                    <span>3rd Year: <b className="text-white">{stats?.years?.['3rd'] ?? 0}</b></span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= SEARCH & ADVANCED FILTERS ================= */}
            <div className="glass flex flex-wrap items-center justify-between gap-3 p-4">
              {/* Search input */}
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search by team ID, team name, or member registration number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-navy/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Department */}
                <AdminDropdown
                  icon={<Building2 size={13} className="text-cyan-400" />}
                  value={deptFilter}
                  onChange={setDeptFilter}
                  minWidth="120px"
                  ariaLabel="Filter by Department"
                  options={[
                    { value: 'ALL', label: 'All Depts' },
                    { value: 'CSE', label: 'CSE' },
                    { value: 'ACSE', label: 'ACSE' },
                    { value: 'IT', label: 'IT' },
                  ]}
                />

                {/* Academic Year */}
                <AdminDropdown
                  icon={<GraduationCap size={13} className="text-violet-400" />}
                  value={yearFilter}
                  onChange={setYearFilter}
                  minWidth="120px"
                  ariaLabel="Filter by Academic Year"
                  options={[
                    { value: 'ALL', label: 'All Years' },
                    { value: '2nd', label: '2nd Year' },
                    { value: '3rd', label: '3rd Year' },
                  ]}
                />

                {/* Team Size */}
                <AdminDropdown
                  icon={<Users size={13} className="text-emerald-400" />}
                  value={sizeFilter}
                  onChange={setSizeFilter}
                  minWidth="125px"
                  ariaLabel="Filter by Team Size"
                  options={[
                    { value: 'ALL', label: 'All Sizes' },
                    { value: '2', label: '2 Members' },
                    { value: '3', label: '3 Members' },
                    { value: '4', label: '4 Members' },
                  ]}
                />

                {/* Registration Date */}
                {uniqueDates.length > 0 && (
                  <AdminDropdown
                    icon={<Calendar size={13} className="text-purple-400" />}
                    value={dateFilter}
                    onChange={setDateFilter}
                    minWidth="130px"
                    ariaLabel="Filter by Registration Date"
                    options={[
                      { value: 'ALL', label: 'All Dates' },
                      ...uniqueDates.map((d) => ({ value: d, label: d })),
                    ]}
                  />
                )}

                {/* Sort Option */}
                <AdminDropdown
                  icon={<Filter size={13} className="text-slate-400" />}
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(val) => {
                    const [field, ord] = val.split('_');
                    setSortBy(field as 'date' | 'teamName' | 'teamSize');
                    setSortOrder(ord as 'desc' | 'asc');
                  }}
                  minWidth="175px"
                  ariaLabel="Sort registrations"
                  options={[
                    { value: 'date_desc', label: 'Newest First' },
                    { value: 'date_asc', label: 'Oldest First' },
                    { value: 'teamName_asc', label: 'Team Name (A-Z)' },
                    { value: 'teamName_desc', label: 'Team Name (Z-A)' },
                    { value: 'teamSize_desc', label: 'Size (Large to Small)' },
                    { value: 'teamSize_asc', label: 'Size (Small to Large)' },
                  ]}
                />

                {/* Reset Filters Option */}
                <button
                  onClick={handleResetFilters}
                  title="Reset all search filters and sort"
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              </div>
            </div>

            {/* ================= REGISTRATIONS TABLE ================= */}
            <div className="glass overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Team ID</th>
                      <th className="px-4 py-3">Team Name</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Team Leader</th>
                      <th className="px-4 py-3">Registered At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                          <p className="mt-2 text-xs">Loading records from persistent database...</p>
                        </td>
                      </tr>
                    ) : paginatedTeams.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                            <Users size={22} />
                          </div>
                          <p className="mt-3 text-base font-bold text-white">
                            {teams.length === 0 ? 'No teams registered yet.' : 'No matching registrations found'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {teams.length === 0
                              ? 'All statistics display zero until registrations are submitted.'
                              : 'Try adjusting your search terms or filter criteria.'}
                          </p>
                          {(searchQuery ||
                            deptFilter !== 'ALL' ||
                            yearFilter !== 'ALL' ||
                            sizeFilter !== 'ALL' ||
                            dateFilter !== 'ALL') && (
                            <button
                              onClick={handleResetFilters}
                              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-900/60"
                            >
                              <RotateCcw size={12} /> Reset Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedTeams.map((team) => (
                        <tr key={team.registrationId || team.teamId} className="transition hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                            {team.teamId || team.registrationId}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">
                            {team.teamName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                              {team.teamSize || (team.members?.length || 0) + 1} Members
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-200">{team.lead?.name || 'N/A'}</div>
                            <div className="text-[11px] text-slate-400">
                              {team.lead?.regNo || 'N/A'} · {team.lead?.department || 'N/A'} ({team.lead?.academicYear || 'N/A'})
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {team.timestamp
                              ? new Date(team.timestamp).toLocaleString('en-IN', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedTeam(team)}
                                className="rounded bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-cyan-500/20 hover:text-cyan-300"
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => setTeamToDelete(team)}
                                className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/20"
                                title={`Delete team ${team.teamName}`}
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalRecords > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing <b>{(currentPage - 1) * pageSize + 1}</b> to{' '}
                      <b>{Math.min(currentPage * pageSize, totalRecords)}</b> of <b>{totalRecords}</b> teams
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <span>Per page:</span>
                      <AdminDropdown
                        value={String(pageSize)}
                        onChange={(val) => setPageSize(Number(val))}
                        minWidth="95px"
                        align="right"
                        ariaLabel="Rows per page"
                        options={[
                          { value: '10', label: '10 / page' },
                          { value: '20', label: '20 / page' },
                          { value: '50', label: '50 / page' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10 disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      Page <b>{currentPage}</b> of <b>{totalPages}</b>
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="rounded border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10 disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= TEAM DETAILS INSPECTION MODAL ================= */}
      <AnimatePresence>
        {selectedTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-cyan-400/40 p-6 shadow-[0_0_50px_rgba(34,211,238,0.2)]"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {selectedTeam.teamId || selectedTeam.registrationId}
                  </span>
                  <h3 className="text-2xl font-extrabold text-white">{selectedTeam.teamName}</h3>
                  <p className="text-xs text-slate-400">
                    Registered on: {new Date(selectedTeam.timestamp).toLocaleString()} · {selectedTeam.teamSize} Members
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Members Grid */}
              <div className="mt-6 space-y-4">
                {/* Team Lead */}
                <div className="rounded-xl border border-cyan-400/40 bg-cyan-950/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                      <UserCheck size={14} /> {selectedTeam.lead?.role || 'Team Leader'}
                    </span>
                    <span className="text-xs text-slate-300">
                      {selectedTeam.lead?.department || 'N/A'} · {selectedTeam.lead?.academicYear || 'N/A'} Year
                    </span>
                  </div>
                  <h4 className="mt-1 text-lg font-bold text-white">{selectedTeam.lead?.name || 'N/A'}</h4>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Hash size={13} className="text-cyan-400" />
                      <span className="font-mono">{selectedTeam.lead?.regNo || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Mail size={13} className="text-cyan-400" />
                      <span>{selectedTeam.lead?.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Phone size={13} className="text-cyan-400" />
                      <span>{selectedTeam.lead?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Members */}
                {(selectedTeam.members || []).map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-violet-300">
                        <Users size={13} /> {m?.role || `Member ${idx + 2}`}
                      </span>
                      <span className="text-slate-400">
                        {m?.department || 'N/A'} · {m?.academicYear || 'N/A'} Year
                      </span>
                    </div>
                    <h5 className="mt-1 text-base font-bold text-slate-200">{m?.name || 'N/A'}</h5>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Hash size={13} className="text-violet-400" />
                        <span className="font-mono">{m?.regNo || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail size={13} className="text-violet-400" />
                        <span>{m?.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Phone size={13} className="text-violet-400" />
                        <span>{m?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setTeamToDelete(selectedTeam)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/20"
                >
                  <Trash2 size={13} />
                  <span>Delete Team</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= TEAM DELETION CONFIRMATION DIALOG ================= */}
      <AnimatePresence>
        {teamToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass w-full max-w-lg border border-rose-500/50 p-6 shadow-[0_0_50px_rgba(244,63,94,0.25)]"
            >
              {/* Modal Header */}
              <div className="flex items-start gap-3 border-b border-white/10 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                  <AlertTriangle size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">Confirm Team Deletion</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    This action will permanently delete this team and its associated records from the database and exported files.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setTeamToDelete(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                  title="Cancel deletion"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Team Record Identity Details */}
              <div className="my-5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  Team to be Deleted
                </div>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Registration ID:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {teamToDelete.teamId || teamToDelete.registrationId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Team Name:</span>
                    <span className="font-bold text-white">{teamToDelete.teamName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Team Size:</span>
                    <span className="text-slate-200">
                      {teamToDelete.teamSize || (teamToDelete.members?.length || 0) + 1} Members
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Team Leader:</span>
                    <span className="text-slate-200">
                      {teamToDelete.lead?.name || 'N/A'} ({teamToDelete.lead?.regNo || 'N/A'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white/5 p-3 text-[11px] text-slate-300">
                <p>
                  <b className="text-rose-400">Warning:</b> Please confirm that this is a demo or invalid team before proceeding. Authentic team records should not be deleted.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setTeamToDelete(null)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteTeam}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Deleting Team...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Permanently Delete Team</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
