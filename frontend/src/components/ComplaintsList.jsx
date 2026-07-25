import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getComplaints } from '../services/api';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const UserIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const RefreshIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const AlertTriangleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InboxIcon = ({ className = 'w-10 h-10' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

// ─── Navbar ───────────────────────────────────────────────────────────────────

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="w-full bg-white border-b border-gray-200 flex items-center justify-between px-6 h-14 flex-shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5046e6]" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="#ede9fe" />
            <path d="M13 6L7 13h5l-1 5 6-7h-5l1-5z" fill="#5046e6" />
          </svg>
        </div>
        <div className="flex items-end gap-0.5">
          <span className="font-bold text-gray-900 text-base leading-none">AIVOA</span>
          <span className="text-[10px] text-gray-400 ml-1 leading-none mb-0.5">QMS</span>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/')}
          className={`text-sm font-medium pb-0.5 transition-colors ${
            location.pathname === '/'
              ? 'text-[#5046e6] border-b-2 border-[#5046e6]'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Log Complaint
        </button>
        <button
          onClick={() => navigate('/complaints')}
          className={`text-sm font-medium pb-0.5 transition-colors ${
            location.pathname === '/complaints'
              ? 'text-[#5046e6] border-b-2 border-[#5046e6]'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          View Complaints
        </button>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
          <UserIcon className="w-4 h-4" />
        </div>
      </div>
    </nav>
  );
};

// ─── Severity Badge ───────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  Critical: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  },
  Major: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  },
  Moderate: {
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  },
  Minor: {
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  },
};

const SeverityBadge = ({ severity }) => {
  const styles = SEVERITY_STYLES[severity] || {
    dot: 'bg-gray-400',
    badge: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {severity || '—'}
    </span>
  );
};

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  High:   'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  Medium: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Low:    'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
};

const PriorityBadge = ({ priority }) => {
  const cls = PRIORITY_STYLES[priority] || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {priority || '—'}
    </span>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  'Pending Triage':  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'Under Review':    'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  'Resolved':        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'Closed':          'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

const StatusBadge = ({ status }) => {
  const cls = STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status || '—'}
    </span>
  );
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

const SkeletonRow = ({ cols }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
      </td>
    ))}
  </tr>
);

// ─── Main ComplaintsList ──────────────────────────────────────────────────────

const COLS = [
  { key: 'id',             label: '#',          width: 'w-12'  },
  { key: 'customer_name',  label: 'Customer',   width: 'w-40'  },
  { key: 'product_name',   label: 'Product',    width: 'w-44'  },
  { key: 'severity',       label: 'Severity',   width: 'w-32'  },
  { key: 'priority',       label: 'Priority',   width: 'w-28'  },
  { key: 'status',         label: 'Status',     width: 'w-36'  },
  { key: 'complaint_date', label: 'Date',       width: 'w-32'  },
];

const formatDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return val;
  }
};

const ComplaintsList = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [spinning, setSpinning]     = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getComplaints();
      setComplaints(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setSpinning(true);
    await fetchData();
    setTimeout(() => setSpinning(false), 600);
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const stats = {
    total:    complaints.length,
    critical: complaints.filter((c) => c.severity === 'Critical').length,
    pending:  complaints.filter((c) => c.status === 'Pending Triage').length,
    resolved: complaints.filter((c) => c.status === 'Resolved').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Complaints Ledger</h1>
            <p className="text-sm text-gray-500 mt-0.5">All logged complaints from the QMS database</p>
          </div>
          <button
            id="refresh-complaints-btn"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            <span className={spinning ? 'animate-spin' : ''}>
              <RefreshIcon className="w-4 h-4" />
            </span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full px-8 pt-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total',    value: stats.total,    color: 'text-gray-900',   bg: 'bg-white' },
            { label: 'Critical', value: stats.critical, color: 'text-red-600',    bg: 'bg-white' },
            { label: 'Pending',  value: stats.pending,  color: 'text-amber-600',  bg: 'bg-white' },
            { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600',bg: 'bg-white' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-gray-200 rounded-xl p-4 flex flex-col gap-1`}>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</span>
              <span className={`text-2xl font-bold ${s.color}`}>
                {loading ? (
                  <span className="block w-8 h-6 bg-gray-100 rounded animate-pulse" />
                ) : s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full px-8 py-6 flex-1">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border-b border-red-100 text-red-700 text-sm">
              <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={handleRefresh}
                className="ml-auto text-xs underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.width} px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Loading skeletons */}
                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={COLS.length} />
                ))}

                {/* Empty state */}
                {!loading && !error && complaints.length === 0 && (
                  <tr>
                    <td colSpan={COLS.length} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <InboxIcon className="w-10 h-10" />
                        <p className="text-sm font-medium">No complaints logged yet</p>
                        <p className="text-xs">Submit a complaint from the Log Complaint page to see it here.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!loading && complaints.map((complaint, idx) => (
                  <tr
                    key={complaint.id}
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50/70 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    {/* ID */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 font-medium">
                      #{String(complaint.id).padStart(3, '0')}
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-[#5046e6]">
                            {(complaint.customer_name || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-800 font-medium truncate max-w-[120px]" title={complaint.customer_name}>
                          {complaint.customer_name || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="text-gray-800 truncate max-w-[160px]" title={complaint.product_name}>
                        {complaint.product_name || '—'}
                      </div>
                      {complaint.batch_number && (
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Batch {complaint.batch_number}
                        </div>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">
                      <SeverityBadge severity={complaint.severity} />
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      <PriorityBadge priority={complaint.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={complaint.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(complaint.complaint_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer row */}
          {!loading && complaints.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400 flex items-center justify-between">
              <span>
                Showing <span className="font-medium text-gray-600">{complaints.length}</span> complaint{complaints.length !== 1 ? 's' : ''}
              </span>
              <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintsList;
