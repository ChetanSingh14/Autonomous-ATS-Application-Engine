import React, { useState } from 'react';
import { FrontendJobService } from '../../services/job.service';

interface QuickIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickIngestModal: React.FC<QuickIngestModalProps> = React.memo(({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: 'Remote',
    url: '',
    atsPlatform: 'LINKEDIN',
    description: '',
  });
  const [ingesting, setIngesting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.url) return;

    setIngesting(true);
    try {
      const success = await FrontendJobService.ingestCustomJob(form);
      if (success) {
        setForm({
          title: '',
          company: '',
          location: 'Remote',
          url: '',
          atsPlatform: 'LINKEDIN',
          description: '',
        });
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Custom job ingestion error:', err);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white">Ingest Custom Job Posting</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Job Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Full Stack Engineer"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company</label>
              <input
                type="text"
                placeholder="e.g. Stripe / Meta"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
              <select
                value={form.atsPlatform}
                onChange={(e) => setForm({ ...form, atsPlatform: e.target.value })}
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
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Job Description</label>
            <textarea
              rows={4}
              placeholder="Paste job description bullet points & requirements here..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={ingesting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {ingesting ? 'Ingesting...' : 'Ingest & Tailor Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

QuickIngestModal.displayName = 'QuickIngestModal';
