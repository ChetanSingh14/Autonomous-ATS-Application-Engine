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
  const [ingesting, setIngesting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/jobs/dashboard-stats');
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

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Auto-refresh stats every 10s
    return () => clearInterval(interval);
  }, []);

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

  const filteredJobs = stats.jobs.filter((j) => {
    if (filterStatus === 'ALL') return true;
    return j.status === filterStatus;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Application Pipeline Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous job ingestion, fit scoring, truth-constrained tailoring, and browser injection.
          </p>
        </div>
        <button
          onClick={triggerIngestion}
          disabled={ingesting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs tracking-wide transition shadow-lg shadow-sky-900/30 disabled:opacity-50"
        >
          {ingesting ? '⏳ Ingesting Board Feeds...' : '🚀 Ingest Target Job Boards Now'}
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Discovered Jobs</div>
          <div className="text-3xl font-extrabold mt-2 text-white">{loading ? '--' : stats.discoveredCount}</div>
          <div className="text-xs text-slate-500 mt-1">Ingested from Greenhouse & Lever</div>
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
          <h2 className="font-bold text-white text-base">Active Job Postings Pipeline</h2>
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'QUEUED_FOR_APPLY', 'SUBMITTED', 'REJECTED_LOW_SCORE', 'DISCOVERED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === status
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
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
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No postings found matching status filter. Click "Ingest Target Job Boards Now" above.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
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
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition border border-slate-700"
                      >
                        Inspect Diffs
                      </Link>
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
