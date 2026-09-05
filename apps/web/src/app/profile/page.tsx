'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [resumeTextInput, setResumeTextInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
      })
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('http://localhost:4000/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        setMessage('✅ Master Profile successfully updated!');
      } else {
        setMessage('❌ Failed to update profile');
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setMessage('⏳ Reading and extracting data from your resume PDF via AI...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];

        const res = await fetch('http://localhost:4000/api/profile/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumePdfBase64: base64String }),
        });

        const data = await res.json();
        if (res.ok && data.profile) {
          setProfile(data.profile);
          setMessage('🎉 Success! Your PDF resume has been parsed and set as your Master Profile!');
          setShowUploadModal(false);
        } else {
          setMessage(`❌ Parsing failed: ${data.error || 'Unknown error'}`);
        }
        setParsing(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setMessage(`❌ Error uploading file: ${err.message}`);
      setParsing(false);
    }
  };

  const handleParseText = async () => {
    if (!resumeTextInput.trim()) return;
    setParsing(true);
    setMessage('');

    try {
      const res = await fetch('http://localhost:4000/api/profile/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: resumeTextInput }),
      });

      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        setMessage('✨ Resume text parsed and updated in Master Profile!');
        setShowUploadModal(false);
        setResumeTextInput('');
      } else {
        setMessage(`❌ Resume parsing failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error parsing resume: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Master Profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Master Candidate Profile</h1>
          <p className="text-slate-400 text-sm mt-1">
            This profile serves as the absolute ground truth. The AI engine will reorder and rephrase this data without hallucination.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-900/30"
        >
          📄 Upload Genuine Resume (PDF / Text)
        </button>
      </div>

      {message && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium text-slate-200">
          {message}
        </div>
      )}

      {/* Parse Resume Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Import Your Genuine Resume</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Option A: Direct PDF Upload */}
            <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl p-6 text-center space-y-3">
              <div className="text-3xl">📁</div>
              <div>
                <div className="text-sm font-semibold text-white">Upload Your Resume PDF File</div>
                <div className="text-xs text-slate-400 mt-1">Select a .pdf file from your computer</div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {parsing ? '⏳ AI Extracting PDF...' : 'Choose PDF File'}
              </button>
            </div>

            <div className="relative text-center text-xs text-slate-500 uppercase tracking-widest my-2">
              <span className="bg-slate-900 px-2">OR PASTE TEXT</span>
            </div>

            {/* Option B: Plain Text Paste */}
            <textarea
              rows={6}
              placeholder="Paste raw resume text here..."
              value={resumeTextInput}
              onChange={(e) => setResumeTextInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleParseText}
                disabled={parsing || !resumeTextInput.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {parsing ? '⏳ AI Extracting...' : 'Parse Text with AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Form */}
      {profile && (
        <form onSubmit={handleSave} className="space-y-6 bg-slate-900/60 border border-slate-800 p-6 rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">First Name</label>
              <input
                type="text"
                value={profile.firstName || ''}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Last Name</label>
              <input
                type="text"
                value={profile.lastName || ''}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Location</label>
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Years Experience</label>
              <input
                type="number"
                value={profile.yearsExperience || 0}
                onChange={(e) => setProfile({ ...profile, yearsExperience: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={profile.linkedinUrl || ''}
                onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">GitHub URL</label>
              <input
                type="text"
                value={profile.githubUrl || ''}
                onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Professional Summary</label>
            <textarea
              rows={3}
              value={profile.summary || ''}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Verified Master Skills (Comma Separated)
            </label>
            <input
              type="text"
              value={Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-sm tracking-wide transition shadow-lg shadow-sky-900/30 disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : '💾 Save Master Profile'}
          </button>
        </form>
      )}
    </div>
  );
}
