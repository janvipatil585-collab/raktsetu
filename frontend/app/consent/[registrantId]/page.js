'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

export default function ConsentPage() {
  const params = useParams();
  const registrantId = params?.registrantId;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!registrantId) return;
    async function fetchConsent() {
      try {
        const res = await fetch(`${API_BASE_URL}/registrants/${registrantId}/consent/`);
        if (!res.ok) throw new Error('Registrant consent records not found');
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchConsent();
  }, [registrantId]);

  const toggleConsent = async (consentType, currentStatus) => {
    setUpdating(true);
    setMessage(null);
    try {
      const payload = {
        [consentType]: !currentStatus
      };
      const res = await fetch(`${API_BASE_URL}/registrants/${registrantId}/consent/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update consent');

      setRecords(data.consent_records);
      const actionStr = !currentStatus ? 'GRANTED' : 'REVOKED';
      setMessage({
        type: !currentStatus ? 'success' : 'warning',
        text: `Consent for '${consentType.replace('_', ' ')}' has been ${actionStr}.`
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading Consent Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !records) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center border border-slate-200">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Record Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">{error || "Consent record does not exist."}</p>
        </div>
      </div>
    );
  }

  const thisDriveRecord = records.find(r => r.consent_type === 'this_drive');
  const futureDrivesRecord = records.find(r => r.consent_type === 'future_drives');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-red-50 py-12 px-4 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Donor Consent Preferences</h1>
          <p className="text-xs text-slate-500 mt-1">Manage your messaging permissions for RaktSetu Blood Donation Drives.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-amber-600" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* This Drive Preference */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-900">This Drive Reminders</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Notifications, venue updates, and reminders for your upcoming registered drive.
              </div>
              <div className="mt-2 text-[11px]">
                Status:{' '}
                {thisDriveRecord?.is_granted ? (
                  <span className="font-bold text-emerald-600">Active (Granted)</span>
                ) : (
                  <span className="font-bold text-red-600">Withdrawn / Blocked</span>
                )}
              </div>
            </div>

            <button
              onClick={() => toggleConsent('this_drive', thisDriveRecord?.is_granted)}
              disabled={updating}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                thisDriveRecord?.is_granted
                  ? 'bg-red-100 hover:bg-red-200 text-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {updating ? 'Updating...' : thisDriveRecord?.is_granted ? 'Revoke Consent' : 'Grant Consent'}
            </button>
          </div>

          {/* Future Drives Preference */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-900">Future Drives Communications</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Invitations and mobilization calls for future blood donation drives.
              </div>
              <div className="mt-2 text-[11px]">
                Status:{' '}
                {futureDrivesRecord?.is_granted ? (
                  <span className="font-bold text-emerald-600">Active (Granted)</span>
                ) : (
                  <span className="font-bold text-red-600">Withdrawn / Blocked</span>
                )}
              </div>
            </div>

            <button
              onClick={() => toggleConsent('future_drives', futureDrivesRecord?.is_granted)}
              disabled={updating}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                futureDrivesRecord?.is_granted
                  ? 'bg-red-100 hover:bg-red-200 text-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {updating ? 'Updating...' : futureDrivesRecord?.is_granted ? 'Revoke Consent' : 'Grant Consent'}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-500">
          Your consent choices take effect immediately. Revoking consent for "This Drive" automatically blocks automated and manual reminders for that drive.
        </div>
      </div>
    </div>
  );
}
