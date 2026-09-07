'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { FrontendJobService, JobPosting } from '../../../services/job.service';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    FrontendJobService.getJobById(jobId)
      .then((data) => {
        if (data) setJob(data);
      })
      .catch((err) => console.warn('[JobDetail Warning] Failed to load job:', err))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleReject = async () => {
    setRejecting(true);
    try {
      const success = await FrontendJobService.rejectJob(jobId);
      if (success) {
        setJob((prev: any) => (prev ? { ...prev, status: 'REJECTED_LOW_SCORE' } : null));
      }
    } catch (err) {
      console.warn('[JobDetail Warning] Failed to reject job:', err);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Job Details...</div>;
  }

  if (!job) {
    return <div className="p-8 text-center text-slate-400">Job posting not found.</div>;
  }

  const downloadPdf = () => {
    if (!job.tailoredPdf) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${job.tailoredPdf}`;
    link.download = `${job.company}_${job.title}_Tailored_Resume.pdf`;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/" className="hover:text-slate-200">
          &larr; Back to Pipeline Dashboard
        </Link>
      </div>

      {/* Header Info */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 sm:p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">{job.title}</h1>
            <span className="text-xs font-mono bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-slate-300">
              {job.atsPlatform}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {job.company} &bull; {job.location}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-between md:justify-end">
          <div className="text-left md:text-right">
            <div className="text-xs uppercase text-slate-400 font-semibold">Match Fit Score</div>
            <div
              className={`text-xl sm:text-2xl font-black ${
                (job.matchScore || 0) >= 80
                  ? 'text-emerald-400'
                  : (job.matchScore || 0) >= 65
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {job.matchScore ? `${Math.round(job.matchScore)}%` : 'Evaluating'}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {job.status !== 'REJECTED_LOW_SCORE' && job.status !== 'SUBMITTED' && (
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="px-3 sm:px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : '🚫 Manual Reject Job'}
              </button>
            )}

            {job.tailoredPdf && (
              <button
                onClick={downloadPdf}
                className="px-3 sm:px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-sky-900/20"
              >
                📄 Download Tailored PDF
              </button>
            )}

            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              🔗 Open ATS Page
            </a>
          </div>
        </div>
      </div>

      {/* Matched vs Missing Skills Diffs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
            Matched Capabilities & Keywords ({job.matchedSkills?.length || 0})
          </h3>
          <div className="flex flex-wrap gap-2">
            {(job.matchedSkills || []).map((skill: string, i: number) => (
              <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-md font-medium">
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
            Missing / Unmatched Requirements ({job.missingSkills?.length || 0})
          </h3>
          <div className="flex flex-wrap gap-2">
            {(job.missingSkills || []).length === 0 ? (
              <span className="text-xs text-slate-500 italic">No critical missing skills detected. Perfect match!</span>
            ) : (
              (job.missingSkills || []).map((skill: string, i: number) => (
                <span key={i} className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-md font-medium">
                  ✗ {skill}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tailored Summary */}
      {job.tailoredSummary && (
        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">AI Tailored Executive Summary</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{job.tailoredSummary}</p>
        </div>
      )}

      {/* Original Job Description */}
      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Original Job Description</h3>
        <div
          className="text-xs text-slate-400 space-y-2 max-h-96 overflow-y-auto pr-2 border-t border-slate-800/80 pt-3"
          dangerouslySetInnerHTML={{ __html: job.description || '' }}
        />
      </div>
    </div>
  );
}
