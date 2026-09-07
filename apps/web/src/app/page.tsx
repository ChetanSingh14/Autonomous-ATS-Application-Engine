'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FrontendJobService, DashboardStats, JobPosting } from '../services/job.service';
import { MetricCards } from '../components/dashboard/MetricCards';
import { QuickIngestModal } from '../components/dashboard/QuickIngestModal';
import { JobTable } from '../components/dashboard/JobTable';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
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
  const [showIngestModal, setShowIngestModal] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await FrontendJobService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.warn('[Dashboard Warning] Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRejectJob = useCallback(async (jobId: string) => {
    setRejectingId(jobId);
    try {
      const success = await FrontendJobService.rejectJob(jobId);
      if (success) {
        setStats((prev) => ({
          ...prev,
          queuedCount: Math.max(0, prev.queuedCount - 1),
          rejectedCount: prev.rejectedCount + 1,
          jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, status: 'REJECTED_LOW_SCORE' } : j)),
        }));
      }
    } catch (err) {
      console.warn('[Dashboard Warning] Reject job failed:', err);
    } finally {
      setRejectingId(null);
    }
  }, []);

  const fetchJobsByStatus = useCallback(async (status: string) => {
    setTableLoading(true);
    try {
      const jobs = await FrontendJobService.getJobsByStatus(status);
      setStats((prev) => ({ ...prev, jobs }));
    } catch (err) {
      console.warn('[Dashboard Warning] Failed to load jobs by status:', err);
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleTabChange = useCallback(
    (status: string) => {
      if (filterStatus === status && !tableLoading) return;
      setFilterStatus(status);
      fetchJobsByStatus(status);
    },
    [filterStatus, tableLoading, fetchJobsByStatus]
  );

  const triggerIngestion = useCallback(async () => {
    setIngesting(true);
    try {
      await FrontendJobService.triggerBoardIngestion();
      await fetchStats();
    } catch (err) {
      console.warn('[Dashboard Warning] Ingestion trigger failed:', err);
    } finally {
      setIngesting(false);
    }
  }, [fetchStats]);

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

  return (
    <div className="space-y-8">
      {/* Header Banner */}
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

      {/* Quick Ingest Custom Job Modal */}
      <QuickIngestModal
        isOpen={showIngestModal}
        onClose={() => setShowIngestModal(false)}
        onSuccess={fetchStats}
      />

      {/* Dashboard Metrics Grid */}
      <MetricCards stats={stats} loading={loading} />

      {/* Filter Tabs & Job Table */}
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
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{status.replace(/_/g, ' ')}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-sky-700 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <JobTable
          jobs={stats.jobs}
          loading={tableLoading && loading}
          filterStatus={filterStatus}
          onRejectJob={handleRejectJob}
          rejectingId={rejectingId}
        />
      </div>
    </div>
  );
}
