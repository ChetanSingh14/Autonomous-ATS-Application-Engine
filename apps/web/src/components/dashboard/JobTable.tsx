import React from 'react';
import Link from 'next/link';
import { JobPosting } from '../../services/job.service';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';

interface JobTableProps {
  jobs: JobPosting[];
  loading: boolean;
  filterStatus: string;
  onRejectJob: (jobId: string) => void;
  rejectingId: string | null;
}

export const JobTable: React.FC<JobTableProps> = React.memo(
  ({ jobs, loading, filterStatus, onRejectJob, rejectingId }) => {
    if (loading) {
      return (
        <div className="p-12 text-center text-slate-500 text-sm animate-pulse flex flex-col items-center justify-center gap-2">
          <svg className="animate-spin h-6 w-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading pipeline postings...
        </div>
      );
    }

    if (jobs.length === 0) {
      return (
        <div className="p-12 text-center text-slate-500 text-sm">
          No job postings found matching status filter <span className="font-semibold text-slate-400">"{filterStatus}"</span>.
        </div>
      );
    }

    return (
      <div>
        {/* Mobile View: Stacked Card List (visible on screens < 768px) */}
        <div className="block md:hidden divide-y divide-slate-800/80">
          {jobs.map((job) => {
            const score = job.matchScore ? Math.round(job.matchScore) : null;
            let scoreColor = 'text-slate-500 bg-slate-800/60 border-slate-700';
            if (score !== null) {
              if (score >= 80) scoreColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80';
              else if (score >= 65) scoreColor = 'text-amber-400 bg-amber-950/60 border-amber-800/80';
              else scoreColor = 'text-rose-400 bg-rose-950/60 border-rose-800/80';
            }

            return (
              <div key={job.id} className="p-4 space-y-3 hover:bg-slate-800/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-slate-100 hover:text-sky-400 transition text-sm block"
                    >
                      {job.title}
                    </a>
                    <div className="text-xs text-slate-400 capitalize">
                      {job.company} &bull; {job.location}
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-black border text-center whitespace-nowrap ${scoreColor}`}>
                    {score !== null ? `${score}%` : '--'}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PlatformBadge platform={job.atsPlatform} />
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'QUEUED_FOR_APPLY' && (
                      <button
                        onClick={() => onRejectJob(job.id)}
                        disabled={rejectingId === job.id}
                        className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded text-[11px] font-semibold transition disabled:opacity-50"
                      >
                        {rejectingId === job.id ? '...' : 'Reject'}
                      </button>
                    )}
                    <Link
                      href={`/jobs/${job.id}`}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition inline-block"
                    >
                      Inspect
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table Layout (visible on screens ≥ 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/80">
                <th className="py-3.5 px-6">Role & Company</th>
                <th className="py-3.5 px-6 text-center">Fit Score</th>
                <th className="py-3.5 px-6 text-center">Platform</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {jobs.map((job) => {
                const score = job.matchScore ? Math.round(job.matchScore) : null;
                let scoreColor = 'text-slate-500';
                if (score !== null) {
                  if (score >= 80) scoreColor = 'text-emerald-400 font-extrabold';
                  else if (score >= 65) scoreColor = 'text-amber-400 font-bold';
                  else scoreColor = 'text-rose-400 font-medium';
                }

                return (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-6">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-slate-100 hover:text-sky-400 transition"
                      >
                        {job.title}
                      </a>
                      <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
                        {job.company} &bull; {job.location}
                      </div>
                    </td>
                    <td className={`py-4 px-6 text-center text-sm ${scoreColor}`}>
                      {score !== null ? `${score}%` : '--'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <PlatformBadge platform={job.atsPlatform} />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {job.status === 'QUEUED_FOR_APPLY' && (
                        <button
                          onClick={() => onRejectJob(job.id)}
                          disabled={rejectingId === job.id}
                          className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded text-[11px] font-semibold transition disabled:opacity-50"
                        >
                          {rejectingId === job.id ? 'Rejecting...' : 'Reject'}
                        </button>
                      )}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition inline-block"
                      >
                        Inspect Diffs
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

JobTable.displayName = 'JobTable';
