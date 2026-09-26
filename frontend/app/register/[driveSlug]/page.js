'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { Heart, Building2, Calendar, MapPin, ExternalLink, CheckCircle2, ShieldCheck, AlertCircle, MessageSquare, ArrowRight } from 'lucide-react';

export default function PublicRegistrationPage() {
  const params = useParams();
  const driveSlug = params?.driveSlug;

  const [drive, setDrive] = useState(null);
  const [loadingDrive, setLoadingDrive] = useState(true);
  const [driveError, setDriveError] = useState(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [email, setEmail] = useState('');
  const [thisDriveConsent, setThisDriveConsent] = useState(false);

  // Inline Validation Error states
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRegistrant, setSubmittedRegistrant] = useState(null);

  useEffect(() => {
    if (!driveSlug) return;
    async function fetchDrive() {
      try {
        let res = await fetch(`${API_BASE_URL}/drives/public/${driveSlug}/`);
        if (!res.ok) {
          res = await fetch(`${API_BASE_URL}/drives/public_by_slug/?slug=${driveSlug}`);
        }
        if (!res.ok) throw new Error('Drive not found or inactive');
        const data = await res.json();
        setDrive(data);
      } catch (err) {
        setDriveError(err.message || 'Unable to load drive details');
      } finally {
        setLoadingDrive(false);
      }
    }
    fetchDrive();
  }, [driveSlug]);

  const validateForm = () => {
    const errs = {};
    if (!fullName || !fullName.trim()) {
      errs.fullName = "Please enter your full name.";
    }
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    if (!phoneNumber || cleanPhone.length < 10 || !/^\+?[0-9]{10,15}$/.test(phoneNumber.trim())) {
      errs.phoneNumber = "Please enter a valid WhatsApp number.";
    }
    if (!bloodGroup) {
      errs.bloodGroup = "Please select your blood group.";
    }
    if (!preferredLanguage) {
      errs.preferredLanguage = "Please select your preferred language.";
    }
    if (!thisDriveConsent) {
      errs.thisDriveConsent = "Please accept WhatsApp communication consent.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        drive: drive.id,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        blood_group: bloodGroup,
        preferred_language: preferredLanguage,
        email: email ? email.trim() : null,
        this_drive_consent: thisDriveConsent,
        future_drives_consent: true
      };

      const res = await fetch(`${API_BASE_URL}/registrations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.phone_number) {
          const msg = Array.isArray(data.phone_number) ? data.phone_number[0] : data.phone_number;
          setErrors({ phoneNumber: msg });
        } else {
          setErrors({ form: data.detail || (typeof data === 'object' ? JSON.stringify(data) : 'Registration failed') });
        }
        return;
      }

      setSubmittedRegistrant(data);
    } catch (err) {
      setErrors({ form: err.message || "Failed to submit registration. Please check your connection." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDrive) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-600 font-medium">Loading Registration Portal...</p>
        </div>
      </div>
    );
  }

  if (driveError || !drive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center border border-slate-200">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Drive Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">{driveError || "The requested blood donation drive does not exist or has ended."}</p>
        </div>
      </div>
    );
  }

  // Registration Success Page (PART 4)
  if (submittedRegistrant) {
    const waLink = submittedRegistrant.wa_confirmation_link;

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-red-100 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">❤️ Registration Successful!</h2>
            <p className="text-sm text-slate-600 font-medium">
              Thank you, <strong className="text-slate-900">{submittedRegistrant.full_name}</strong>!
            </p>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 text-xs shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 uppercase font-bold">Registration ID</span>
              <span className="font-mono font-extrabold text-red-400 text-sm px-2 py-0.5 bg-slate-800 rounded">
                {submittedRegistrant.registration_id || 'RST-SP-001'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Blood Donation Drive</span>
              <span className="font-bold text-white text-sm">{drive.name}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div>📍 <strong>Venue:</strong> {drive.venue || 'Campus Auditorium, Nagpur'}</div>
              <div>📅 <strong>Date:</strong> {drive.date}</div>
              <div>⏰ <strong>Reporting Time:</strong> 9:00 AM - 4:00 PM</div>
              <div>🩸 <strong>Blood Group:</strong> <span className="text-red-400 font-bold">{submittedRegistrant.blood_group}</span></div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              Preferred Language: <strong className="text-emerald-400">{submittedRegistrant.preferred_language}</strong>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
            <p className="text-xs font-bold text-emerald-900">
              A personalized confirmation message has been generated for your WhatsApp number:
            </p>
            <p className="text-xs font-mono font-bold text-slate-800">{submittedRegistrant.whatsapp_number || submittedRegistrant.phone_number}</p>
            
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Open WhatsApp Confirmation Message</span>
              </a>
            )}
          </div>

          <button
            onClick={() => {
              setSubmittedRegistrant(null);
              setFullName('');
              setPhoneNumber('+91');
            }}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Done / Register Another Participant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-red-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      {/* Brand Header */}
      <div className="max-w-xl w-full text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 text-white shadow-lg mb-3">
          <Heart className="w-8 h-8 fill-current" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Register for Blood Donation Drive</h1>
        <p className="text-xs sm:text-sm font-semibold text-red-600 mt-1">RaktSetu — {drive.institution || drive.name}</p>
      </div>

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Drive Info Card */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
          <h2 className="text-base font-bold text-red-400">{drive.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {drive.date}</div>
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {drive.venue || 'Campus Auditorium, Nagpur'}</div>
          </div>
          {drive.screening_info_url && (
            <div className="pt-2 border-t border-slate-800 text-xs">
              <a
                href={drive.screening_info_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-red-300 hover:text-white underline font-medium"
              >
                <span>External Donor Screening Guidelines</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {errors.form && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              FULL NAME *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors({ ...errors, fullName: null });
              }}
              placeholder="Enter your full name"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-red-500 focus:bg-white'
              }`}
            />
            {errors.fullName && <p className="text-xs text-red-600 font-bold mt-1">{errors.fullName}</p>}
          </div>

          {/* Phone Number & Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                PHONE NUMBER *
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: null });
                }}
                placeholder="+91 XXXXXXXXXX"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 ${
                  errors.phoneNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-red-500 focus:bg-white'
                }`}
              />
              {errors.phoneNumber && <p className="text-xs text-red-600 font-bold mt-1">{errors.phoneNumber}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                BLOOD GROUP *
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-bold"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              PREFERRED LANGUAGE *
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-semibold"
            >
              {['English', 'Hindi', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Other'].map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {/* Consent Checkbox */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-800 font-medium">
              <input
                type="checkbox"
                checked={thisDriveConsent}
                onChange={(e) => {
                  setThisDriveConsent(e.target.checked);
                  if (errors.thisDriveConsent) setErrors({ ...errors, thisDriveConsent: null });
                }}
                className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <span>
                I agree to receive registration confirmations and blood donation drive reminders on WhatsApp.
              </span>
            </label>
            {errors.thisDriveConsent && <p className="text-xs text-red-600 font-bold">{errors.thisDriveConsent}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {submitting ? 'Registering...' : (
              <>
                <span>REGISTER FOR BLOOD DRIVE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
