import React from 'react';
import { DashboardStats } from '../../services/job.service';

interface MetricCardsProps {
  stats: DashboardStats;
  loading: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = React.memo(({ stats, loading }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Discovered Jobs</div>
        <div className="text-3xl font-extrabold mt-2 text-white">{loading ? '--' : stats.discoveredCount}</div>
        <div className="text-xs text-slate-500 mt-1">Multi-portal Ingestion Active</div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
        <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Queued for Apply</div>
        <div className="text-3xl font-extrabold mt-2 text-amber-400">{loading ? '--' : stats.queuedCount}</div>
        <div className="text-xs text-slate-500 mt-1">Score ≥65% & PDF Compiled</div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
        <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Submitted Applications</div>
        <div className="text-3xl font-extrabold mt-2 text-emerald-400">{loading ? '--' : stats.submittedCount}</div>
        <div className="text-xs text-slate-500 mt-1">Completed via MV3 Extension</div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
        <div className="text-rose-400 text-xs font-semibold uppercase tracking-wider">Rejected (&lt;65% Score)</div>
        <div className="text-3xl font-extrabold mt-2 text-rose-400">{loading ? '--' : stats.rejectedCount}</div>
        <div className="text-xs text-slate-500 mt-1">Filtered to Save Resources</div>
      </div>
    </div>
  );
});

MetricCards.displayName = 'MetricCards';
