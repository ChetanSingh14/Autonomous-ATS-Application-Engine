'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  atsPlatform: string;
  matchScore: number | null;
  status: string;
  url: string;
  missingSkills: string[];
  createdAt: string;
}

interface StatsData {
  discoveredCount: number;
  queuedCount: number;
  submittedCount: number;
  rejectedCount: number;
  jobs: JobPosting[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData>({
    discoveredCount: 0,
    queuedCount: 0,
    submittedCount: 0,
    rejectedCount: 0,
    jobs: [],
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchStats = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/jobs/dashboard-stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectJob = async (jobId: string) => {
    setRejectingId(jobId);
    try {
      const res = await fetch(`http://localhost:4000/api/jobs/${jobId}/reject`, { method: 'POST' });
      if (res.ok) {
        // Remove or update job status in local state immediately
        setStats((prev) => ({
          ...prev,
          queuedCount: Math.max(0, prev.queuedCount - 1),
          rejectedCount: prev.rejectedCount + 1,
          jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, status: 'REJECTED_LOW_SCORE' } : j)),
        }));
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to reject job:', err);
    } finally {
      setRejectingId(null);
    }
  };

  const fetchJobsByStatus = async (status: string) => {
    setTableLoading(true);
    try {
      const url =
        status === 'ALL'
          ? 'http://localhost:4000/api/jobs'
          : `http://localhost:4000/api/jobs?status=${status}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats((prev) => ({ ...prev, jobs: data.jobs || [] }));
      }
    } catch (err) {
      console.error('Failed to fetch jobs by status:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (status: string) => {
    if (filterStatus === status && !tableLoading) return;
    setFilterStatus(status);
    fetchJobsByStatus(status);
  };

  const triggerIngestion = async () => {
    setIngesting(true);
    try {
      await fetch('http://localhost:4000/api/ingest', { method: 'POST' });
      await fetchStats();
    } catch (err) {
      console.error('Ingestion error:', err);
    } finally {
      setIngesting(false);
    }
  };

  const getTabBadgeCount = (status: string) => {
    switch (status) {
      case 'ALL':
        return stats.discoveredCount + stats.queuedCount + stats.submittedCount + stats.rejectedCount;
      case 'QUEUED_FOR_APPLY':
        return stats.queuedCount;
      case 'SUBMITTED':
        return stats.submittedCount;
      case 'REJECTED_LOW_SCORE':
        return stats.rejectedCount;
      case 'DISCOVERED':
        return stats.discoveredCount;
      default:
        return 0;
    }
  };

  const [showIngestModal, setShowIngestModal] = useState(false);
  const [customForm, setCustomForm] = useState({
    title: '',
    company: '',
    location: 'Remote',
    url: '',
    atsPlatform: 'LINKEDIN',
    description: '',
  });
  const [customIngesting, setCustomIngesting] = useState(false);

  const handleCustomIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.title || !customForm.url) return;

    setCustomIngesting(true);
    try {
      const res = await fetch('http://localhost:4000/api/jobs/ingest-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customForm),
      });
      if (res.ok) {
        setShowIngestModal(false);
        setCustomForm({
          title: '',
          company: '',
          location: 'Remote',
          url: '',
          atsPlatform: 'LINKEDIN',
          description: '',
        });
        await fetchStats();
      }
    } catch (err) {
      console.error('Custom job ingestion error:', err);
    } finally {
      setCustomIngesting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Application Pipeline Overview
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous multi-portal job ingestion (LinkedIn, Naukri, Wellfound, Greenhouse, Lever, Ashby), fit scoring & tailoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIngestModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs tracking-wide transition shadow-lg shadow-emerald-900/30"
          >
            + Ingest Custom Job (LinkedIn/Naukri/Wellfound)
          </button>
          <button
            onClick={triggerIngestion}
            disabled={ingesting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs tracking-wide transition shadow-lg shadow-sky-900/30 disabled:opacity-50"
          >
            {ingesting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ingesting Board Feeds...
              </>
            ) : (
              '🚀 Ingest 50+ Tech Boards'
            )}
          </button>
        </div>
      </div>

      {/* Modal for Quick Ingest Custom Job */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Ingest Custom Job Posting</h3>
              <button onClick={() => setShowIngestModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCustomIngestSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Full Stack Engineer"
                  value={customForm.title}
                  onChange={(e) => setCustomForm({ ...customForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Stripe / Meta"
                    value={customForm.company}
                    onChange={(e) => setCustomForm({ ...customForm, company: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
                  <select
                    value={customForm.atsPlatform}
                    onChange={(e) => setCustomForm({ ...customForm, atsPlatform: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="NAUKRI">Naukri</option>
                    <option value="WELLFOUND">Wellfound</option>
                    <option value="INTERNSHALA">Internshala</option>
                    <option value="WORKDAY">Workday</option>
                    <option value="GREENHOUSE">Greenhouse</option>
                    <option value="LEVER">Lever</option>
                    <option value="ASHBY">Ashby</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Job Application URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  value={customForm.url}
                  onChange={(e) => setCustomForm({ ...customForm, url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Job Description</label>
                <textarea
                  rows={4}
                  placeholder="Paste job description bullet points & requirements here..."
                  value={customForm.description}
                  onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customIngesting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  {customIngesting ? 'Ingesting...' : 'Ingest & Tailor Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Discovered Jobs</div>
          <div className="text-3xl font-extrabold mt-2 text-white">{loading ? '--' : stats.discoveredCount}</div>
          <div className="text-xs text-slate-500 mt-1">Ingested from Greenhouse, Lever & Ashby</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Queued for Apply</div>
          <div className="text-3xl font-extrabold mt-2 text-amber-400">{loading ? '--' : stats.queuedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Score ≥65% & PDF compiled</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Submitted Applications</div>
          <div className="text-3xl font-extrabold mt-2 text-emerald-400">{loading ? '--' : stats.submittedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Completed via MV3 Extension</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="text-rose-400 text-xs font-semibold uppercase tracking-wider">Rejected (&lt;65% Score)</div>
          <div className="text-3xl font-extrabold mt-2 text-rose-400">{loading ? '--' : stats.rejectedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Halted to save resources</div>
        </div>
      </div>

      {/* Filter Tabs & Queue Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white text-base">Active Job Postings Pipeline</h2>
            {tableLoading && (
              <span className="flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-medium animate-pulse">
                <svg className="animate-spin h-3 w-3 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Filtering...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'QUEUED_FOR_APPLY', 'SUBMITTED', 'REJECTED_LOW_SCORE', 'DISCOVERED'].map((status) => {
              const count = getTabBadgeCount(status);
              const isActive = filterStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => handleTabChange(status)}
                  disabled={tableLoading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  } ${tableLoading ? 'opacity-60 cursor-wait' : ''}`}
                >
                  <span>{status.replace(/_/g, ' ')}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Role & Company</th>
                <th className="py-3.5 px-6">Fit Score</th>
                <th className="py-3.5 px-6">Platform</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tableLoading || loading ? (
                // Skeleton loading rows
                [1, 2, 3, 4].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-800 rounded w-48 mb-2"></div>
                      <div className="h-3 bg-slate-800/60 rounded w-32"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-800 rounded w-12"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-slate-800 rounded w-20"></div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-slate-800 rounded w-28"></div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-7 bg-slate-800 rounded w-24 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : stats.jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center justify-center space-y-2">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                      </svg>
                      <p className="text-slate-400 font-medium text-sm">
                        No postings found matching status filter <span className="text-sky-400 font-mono">"{filterStatus}"</span>.
                      </p>
                      <p className="text-xs text-slate-500">
                        Click "Ingest Target Job Boards Now" above or choose another filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                stats.jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{job.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {job.company} &bull; {job.location}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      {job.matchScore !== null ? (
                        <span
                          className={`font-bold ${
                            job.matchScore >= 80
                              ? 'text-emerald-400'
                              : job.matchScore >= 65
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {job.matchScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Evaluating...</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300 font-mono">
                        {job.atsPlatform}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          job.status === 'SUBMITTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : job.status === 'QUEUED_FOR_APPLY'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : job.status === 'REJECTED_LOW_SCORE'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        }`}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status !== 'REJECTED_LOW_SCORE' && job.status !== 'SUBMITTED' && (
                          <button
                            onClick={() => handleRejectJob(job.id)}
                            disabled={rejectingId === job.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                            title="Manually reject this job and remove from apply queue"
                          >
                            {rejectingId === job.id ? (
                              'Rejecting...'
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject
                              </>
                            )}
                          </button>
                        )}
                        <Link
                          href={`/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition border border-slate-700"
                        >
                          Inspect Diffs
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
