'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:4000/api/jobs/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.job) setJob(data.job);
      })
      .catch((err) => console.error('Failed to load job details:', err))
      .finally(() => setLoading(false));
  }, [jobId]);

  const [rejecting, setRejecting] = useState(false);

  const handleReject = async () => {
    setRejecting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/jobs/${jobId}/reject`, { method: 'POST' });
      if (res.ok) {
        setJob((prev: any) => ({ ...prev, status: 'REJECTED_LOW_SCORE' }));
      }
    } catch (err) {
      console.error('Failed to reject job:', err);
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
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white">{job.title}</h1>
            <span className="text-xs font-mono bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-slate-300">
              {job.atsPlatform}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {job.company} &bull; {job.location} {job.isRemote && '(Remote)'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase text-slate-400 font-semibold">Match Fit Score</div>
            <div
              className={`text-2xl font-black ${
                (job.matchScore || 0) >= 80
                  ? 'text-emerald-400'
                  : (job.matchScore || 0) >= 65
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {job.matchScore ? `${job.matchScore}%` : 'Evaluating'}
            </div>
          </div>

          {job.status !== 'REJECTED_LOW_SCORE' && job.status !== 'SUBMITTED' && (
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              {rejecting ? 'Rejecting...' : '🚫 Manual Reject Job'}
            </button>
          )}

          {job.tailoredPdf && (
            <button
              onClick={downloadPdf}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-sky-900/20"
            >
              📄 Download Tailored PDF
            </button>
          )}

          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition border border-slate-700"
          >
            🔗 Open ATS Page
          </a>
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
          dangerouslySetInnerHTML={{ __html: job.description }}
        />
      </div>
    </div>
  );
}
