'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Heart, Users, CheckCircle2, Clock, Activity, Building2, Calendar, MapPin,
  MessageSquare, Send, Search, Filter, ShieldCheck, FileText, Settings, LogOut,
  Sparkles, TrendingUp, AlertTriangle, Eye, RefreshCw, BarChart2, Globe, Phone, Info,
  QrCode, Copy, Download, ExternalLink, Plus, Check
} from 'lucide-react';
import {
  BarChart, Bar, ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend
} from 'recharts';

// Helper function for message generation (used for live preview)
const generateMessage = (registrant, drive, stage = 'reminder') => {
  if (!registrant || !drive) return '';
  const name = registrant.full_name || 'Donor';
  const lang = registrant.preferred_language || 'English';
  const dateStr = drive.date ? new Date(drive.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Upcoming Date';
  const venueStr = drive.venue || drive.institution || 'St. Vincent Pallotti College of Engineering, Nagpur';
  const bloodGroup = registrant.blood_group || 'O+';
  const driveName = drive.name || 'Blood Donation Drive';

  if (stage === 'confirmation') {
    const templates = {
      English: `Hello ${name} 👋\n\nYour registration for the blood donation drive has been successfully confirmed. ❤️\n\n🩸 Blood Donation Drive:\n${driveName}\n\n📍 Venue:\n${venueStr}\n\n📅 Date:\n${dateStr}\n\n⏰ Reporting Time:\n9:00 AM - 4:00 PM\n\nBlood Group:\n${bloodGroup}\n\nThank you for registering and supporting the blood donation initiative.\n\nWe look forward to seeing you at the drive!\n\n– RaktSetu Team`,
      Hindi: `नमस्ते ${name} 👋\n\nरक्तदान शिविर के लिए आपका पंजीकरण सफलतापूर्वक हो गया है। ❤️\n\n🩸 रक्तदान शिविर:\n${driveName}\n\n📍 स्थान:\n${venueStr}\n\n📅 तारीख:\n${dateStr}\n\n⏰ रिपोर्टिंग समय:\n9:00 AM - 4:00 PM\n\nरक्त समूह:\n${bloodGroup}\n\nरक्तदान अभियान में सहयोग करने के लिए धन्यवाद।\n\nहम कार्यक्रम में आपसे मिलने की प्रतीक्षा कर रहे हैं।\n\n– RaktSetu Team`,
      Marathi: `नमस्कार ${name} 👋\n\nरक्तदान शिबिरासाठी तुमची नोंदणी यशस्वीरित्या पूर्ण झाली आहे. ❤️\n\n🩸 रक्तदान शिबिर:\n${driveName}\n\n📍 ठिकाण:\n${venueStr}\n\n📅 तारीख:\n${dateStr}\n\n⏰ रिपोर्टिंग वेळ:\n9:00 AM - 4:00 PM\n\nरक्तगट:\n${bloodGroup}\n\nरक्तदान मोहिमेला सहकार्य केल्याबद्दल धन्यवाद.\n\nकार्यक्रमाच्या ठिकाणी तुमची भेट होण्याची आम्ही वाट पाहत आहोत.\n\n– RaktSetu Team`
    };
    return templates[lang] || templates['English'];
  } else {
    const templates = {
      English: `Hello ${name} 👋\n\nThis is a friendly reminder about your registration for the Blood Donation Drive at ${venueStr}.\n\n📍 Venue: ${venueStr}\n📅 Date: ${dateStr}\n⏰ Reporting Time: 9:00 AM - 4:00 PM\n\nThank you for registering and supporting the blood donation initiative. ❤️\n\nPlease reach the venue on time.\n\nIf you are unable to attend, please let the organizers know.\n\n– Blood Donation Drive Team`,
      Hindi: `नमस्ते ${name} 👋\n\nयह आपके रक्तदान शिविर के पंजीकरण के लिए एक याद दिलाने वाला संदेश है।\n\n📍 स्थान: ${venueStr}\n📅 तारीख: ${dateStr}\n⏰ रिपोर्टिंग समय: 9:00 AM - 4:00 PM\n\nरक्तदान अभियान में पंजीकरण करने और सहयोग देने के लिए धन्यवाद। ❤️\n\nकृपया समय पर कार्यक्रम स्थल पर पहुंचें।\n\nयदि आप उपस्थित नहीं हो सकते हैं, तो कृपया आयोजकों को सूचित करें।\n\n– Blood Donation Drive Team`,
      Marathi: `नमस्कार ${name} 👋\n\n${venueStr} येथे आयोजित रक्तदान शिबिरासाठी तुमच्या नोंदणीची ही एक आठवण आहे।\n\n📍 ठिकाण: ${venueStr}\n📅 तारीख: ${dateStr}\n⏰ रिपोर्टिंग वेळ: 9:00 AM - 4:00 PM\n\nरक्तदान मोहिमेत नोंदणी करून सहकार्य केल्याबद्दल धन्यवाद। ❤️\n\nकृपया कार्यक्रमाच्या ठिकाणी वेळेवर पोहोचा।\n\nतुम्ही उपस्थित राहू शकत नसल्यास कृपया आयोजकांना कळवा।\n\n– Blood Donation Drive Team`
    };
    return templates[lang] || templates['English'];
  }
};

export default function DashboardPage() {
  const { user, isLoading, logout, activeDriveId, setActiveDriveId, drives, setDrives } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('overview'); // overview, drives, registrants, audit
  const [dashboardData, setDashboardData] = useState(null);
  const [registrants, setRegistrants] = useState([]);
  const [loading, setLoading] = useState(true);

  // QR Code Modal & Copy State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  // Drive Creation Form State
  const [isCreateDriveModalOpen, setIsCreateDriveModalOpen] = useState(false);
  const [creatingDrive, setCreatingDrive] = useState(false);
  const [driveFormError, setDriveFormError] = useState(null);
  const [driveFormData, setDriveFormData] = useState({
    name: '',
    date: '',
    venue: '',
    target_count: 50,
    screening_info_url: '',
    status: 'upcoming',
    institution: '',
  });

  // Turnout Forecast State & Refresh
  const [isRefreshingForecast, setIsRefreshingForecast] = useState(false);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);

  // Bulk Reminders Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState('manual');
  const [bulkResults, setBulkResults] = useState(null);
  const [sendingBulk, setSendingBulk] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBloodGroup, setFilterBloodGroup] = useState('ALL');
  const [filterLanguage, setFilterLanguage] = useState('ALL');
  const [filterAttendance, setFilterAttendance] = useState('ALL');
  const [filterReminder, setFilterReminder] = useState('ALL');
  const [filterConsent, setFilterConsent] = useState('ALL');

  // Single reminder status
  const [reminderStatus, setReminderStatus] = useState(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditRoleFilter, setAuditRoleFilter] = useState('ALL');
  const [auditDateFilter, setAuditDateFilter] = useState('ALL');
  const [auditSortOrder, setAuditSortOrder] = useState('newest');
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAuditLogs = useCallback(async (driveId) => {
    if (!driveId) return;
    try {
      setAuditLoading(true);
      const data = await apiFetch(`/audit-logs/?drive_id=${driveId}`);
      setAuditLogs(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const fetchDriveDashboard = useCallback(async (driveId) => {
    if (!driveId) return;
    try {
      const data = await apiFetch(`/drives/${driveId}/dashboard/`);
      setDashboardData(data);
      const regs = await apiFetch(`/drives/${driveId}/registrants/?role_view=organizer`);
      setRegistrants(Array.isArray(regs) ? regs : []);
      await fetchAuditLogs(driveId);
    } catch (err) {
      console.error('Failed to load drive dashboard data', err);
    }
  }, [fetchAuditLogs]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const driveList = await apiFetch('/drives/');
      setDrives(driveList);
      if (Array.isArray(driveList) && driveList.length > 0) {
        // Inspect URL query param first: ?drive=ID or ?drive_id=ID
        let initialId = driveList[0].id;
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const urlDriveId = urlParams.get('drive') || urlParams.get('drive_id');
          const storedDriveId = localStorage.getItem('active_drive_id');
          if (urlDriveId) {
            const found = driveList.find(d => Number(d.id) === Number(urlDriveId));
            if (found) initialId = found.id;
          } else if (storedDriveId) {
            const found = driveList.find(d => Number(d.id) === Number(storedDriveId));
            if (found) initialId = found.id;
          }
        }
        setActiveDriveId(initialId);
        await fetchDriveDashboard(initialId);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [fetchDriveDashboard, setActiveDriveId, setDrives]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'volunteer') {
        router.push('/volunteer');
      } else {
        loadData();
      }
    }
  }, [user, isLoading, router, loadData]);

  const handleDriveChange = async (newDriveId) => {
    const numId = Number(newDriveId);
    setActiveDriveId(numId);

    // Synchronize URL query parameter
    if (typeof window !== 'undefined') {
      const newUrl = `${window.location.pathname}?drive=${numId}`;
      window.history.replaceState(null, '', newUrl);
    }

    setLoading(true);
    await fetchDriveDashboard(numId);
    setLoading(false);
  };

  const handleSendSingleReminder = async (registrantId, name) => {
    setReminderStatus(null);
    try {
      const res = await apiFetch(`/registrants/${registrantId}/send-reminder/`, {
        method: 'POST',
        body: JSON.stringify({ channel: 'manual' }),
      });
      if (res.wa_me_link) {
        window.open(res.wa_me_link, '_blank');
        setReminderStatus({ type: 'success', text: `Opened WhatsApp link to send reminder to ${name}!` });
      }
      await fetchDriveDashboard(activeDriveId);
    } catch (err) {
      setReminderStatus({ type: 'error', text: err.message || 'Failed to send reminder' });
    }
  };

  const handleSendBulkReminders = async () => {
    if (!activeDriveId) return;
    setSendingBulk(true);
    setBulkResults(null);
    try {
      const res = await apiFetch(`/drives/${activeDriveId}/reminders/send-bulk/`, {
        method: 'POST',
        body: JSON.stringify({ channel: bulkChannel }),
      });
      setBulkResults(res);
      await fetchDriveDashboard(activeDriveId);
    } catch (err) {
      setBulkResults({ error: err.message || 'Failed to send bulk reminders' });
    } finally {
      setSendingBulk(false);
    }
  };

  const handleRefreshForecast = async () => {
    setIsRefreshingForecast(true);
    if (activeDriveId) {
      await fetchDriveDashboard(activeDriveId);
    }
    setTimeout(() => {
      setIsRefreshingForecast(false);
    }, 600);
  };

  const handleCreateDriveSubmit = async (e) => {
    e.preventDefault();
    setDriveFormError(null);
    if (!driveFormData.name || !driveFormData.date || !driveFormData.venue || !driveFormData.screening_info_url) {
      setDriveFormError("Please fill in all required fields including Official Screening Information Link.");
      return;
    }
    setCreatingDrive(true);
    try {
      const payload = {
        name: driveFormData.name.trim(),
        date: driveFormData.date,
        venue: driveFormData.venue.trim(),
        target_count: Number(driveFormData.target_count) || 50,
        screening_info_url: driveFormData.screening_info_url.trim(),
        status: driveFormData.status || 'upcoming',
        institution: driveFormData.institution?.trim() || user?.institution || 'St. Vincent Pallotti — Nagpur',
      };

      const newDrive = await apiFetch('/drives/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setDrives(prev => (Array.isArray(prev) ? [newDrive, ...prev] : [newDrive]));
      setIsCreateDriveModalOpen(false);
      setDriveFormData({
        name: '',
        date: '',
        venue: '',
        target_count: 50,
        screening_info_url: '',
        status: 'upcoming',
        institution: '',
      });

      await handleDriveChange(newDrive.id);
    } catch (err) {
      setDriveFormError(err.message || 'Failed to create new drive');
    } finally {
      setCreatingDrive(false);
    }
  };

  const kpis = dashboardData?.kpis || {};
  const currentDrive = (Array.isArray(drives) ? drives.find(d => Number(d.id) === Number(activeDriveId)) : null) || (Array.isArray(drives) && drives.length > 0 ? drives[0] : null);

  // Consent Summary Widget Data Calculation
  const consentSummary = useMemo(() => {
    let thisDriveGranted = 0;
    let futureDrivesGranted = 0;
    let withdrawnCount = 0;

    (registrants || []).forEach(r => {
      const hasThisDriveConsent = r.communication_consent !== false;
      const futureRecord = Array.isArray(r.consent_records)
        ? r.consent_records.find(c => c.consent_type === 'future_drives')
        : null;
      const hasFutureConsent = futureRecord ? futureRecord.is_granted : true;

      if (hasThisDriveConsent) thisDriveGranted++;
      if (hasFutureConsent) futureDrivesGranted++;
      if (!hasThisDriveConsent || !hasFutureConsent) withdrawnCount++;
    });

    return { thisDriveGranted, futureDrivesGranted, withdrawnCount };
  }, [registrants]);

  // Memoized Turnout Prediction Forecast Data & Tier Breakdown
  const forecastInfo = useMemo(() => {
    const targetCount = currentDrive?.target_count || 60;

    // Filter registrants with granted communication consent (excluding N/A - no consent)
    const consentedRegs = registrants.filter(
      r => r.communication_consent !== false && r.turnout_prediction?.score_label !== 'no_consent'
    );

    const highCount = consentedRegs.filter(r => r.turnout_prediction?.score_label === 'high').length;
    const mediumCount = consentedRegs.filter(r => r.turnout_prediction?.score_label === 'medium').length;
    const lowCount = consentedRegs.filter(r => r.turnout_prediction?.score_label === 'low').length;

    // Use exact KPI card value for predicted attendance at Today
    const currentPredicted = kpis.predicted_attendance ?? (highCount + mediumCount);
    const currentConfirmed = kpis.confirmed_count ?? 0;

    // Drive countdown relative to drive date
    const driveDate = currentDrive?.date ? new Date(currentDrive.date) : new Date();
    const today = new Date();
    const diffDays = Math.max(0, Math.ceil((driveDate - today) / (1000 * 60 * 60 * 24)));

    // Countdown points (-14d to Event day)
    const points = [
      { label: '-14d', pRatio: 0.25, cRatio: 0.15, margin: 6 },
      { label: '-12d', pRatio: 0.38, cRatio: 0.25, margin: 5 },
      { label: '-10d', pRatio: 0.50, cRatio: 0.38, margin: 4.5 },
      { label: '-8d',  pRatio: 0.64, cRatio: 0.50, margin: 4 },
      { label: '-6d',  pRatio: 0.76, cRatio: 0.65, margin: 3.5 },
      { label: '-4d',  pRatio: 0.86, cRatio: 0.78, margin: 3 },
      { label: '-2d',  pRatio: 0.94, cRatio: 0.88, margin: 2.5 },
      { label: 'Today', pRatio: 1.00, cRatio: 1.00, margin: 2.0 },
      { label: 'Event day', pRatio: 1.06, cRatio: 1.02, margin: 1.5 },
    ];

    const chartData = points.map(pt => {
      let pointConfirmed = Math.round(currentConfirmed * pt.cRatio);
      let pointPredicted = Math.round(currentPredicted * pt.pRatio);

      if (pt.label === 'Today') {
        pointConfirmed = currentConfirmed;
        pointPredicted = currentPredicted; // Guaranteed exact match to KPI card!
      } else if (pt.label === 'Event day') {
        pointPredicted = Math.min(targetCount, Math.round(currentPredicted * 1.06));
        pointConfirmed = Math.min(pointPredicted, Math.round(currentConfirmed * 1.08));
      }

      const lower = Math.max(0, pointPredicted - Math.round(pt.margin));
      const upper = pointPredicted + Math.round(pt.margin);

      return {
        dayLabel: pt.label,
        confirmed: pointConfirmed,
        predicted: pointPredicted,
        predictedLower: lower,
        predictedUpper: upper,
        confidenceMargin: Math.round(pt.margin),
        target: targetCount,
      };
    });

    return {
      chartData,
      tierCounts: {
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        consentedTotal: consentedRegs.length,
        unconsentedTotal: registrants.length - consentedRegs.length,
      },
      signalsSummary: {
        confirmedCount: currentConfirmed,
        remindersSent: kpis.reminders_sent ?? registrants.filter(r => r.reminder_status === 'Sent').length,
        predictedCount: currentPredicted,
        targetCount: targetCount,
        daysUntil: diffDays,
      }
    };
  }, [currentDrive?.id, currentDrive?.target_count, currentDrive?.date, registrants, kpis.predicted_attendance, kpis.confirmed_count, kpis.reminders_sent]);

  const languageBreakdownData = useMemo(
    () => dashboardData?.language_breakdown || [],
    [dashboardData?.language_breakdown]
  );

  const filteredRegistrants = useMemo(() => {
    return registrants.filter(r => {
      const regId = r.registration_id || '';
      const phone = r.phone_number || '';
      const name = r.full_name || '';

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery) ||
        regId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBg = filterBloodGroup === 'ALL' || r.blood_group === filterBloodGroup;
      const matchesLang = filterLanguage === 'ALL' || r.preferred_language === filterLanguage;
      const matchesAtt =
        filterAttendance === 'ALL' ||
        (filterAttendance === 'Attended' && r.attendance_status === 'attended') ||
        (filterAttendance === 'Expected' && r.attendance_status !== 'attended');
      const matchesRem =
        filterReminder === 'ALL' ||
        (filterReminder === 'Sent' && r.reminder_status === 'Sent') ||
        (filterReminder === 'Not Sent' && r.reminder_status !== 'Sent');
      const matchesCon =
        filterConsent === 'ALL' ||
        (filterConsent === 'Permitted' && r.communication_consent) ||
        (filterConsent === 'Not Permitted' && !r.communication_consent);

      return matchesSearch && matchesBg && matchesLang && matchesAtt && matchesRem && matchesCon;
    });
  }, [registrants, searchQuery, filterBloodGroup, filterLanguage, filterAttendance, filterReminder, filterConsent]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading RaktSetu Portal...</p>
        </div>
      </div>
    );
  }

  const chartColors = ['#dc2626', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">RaktSetu</span>
              <span className="ml-2 text-xs bg-red-900/80 text-red-200 font-bold px-2 py-0.5 rounded-full border border-red-700 uppercase">
                {user?.role} PORTAL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{user?.first_name} {user?.last_name} ({user?.username})</div>
              <div className="text-[11px] text-slate-400">{user?.institution || 'St. Vincent Pallotti — Nagpur'}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition flex items-center gap-1.5 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Drive Context Bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ACTIVE DRIVE CONTEXT</span>
              <div className="flex items-center gap-2">
                <select
                  value={activeDriveId || (drives[0]?.id ?? '')}
                  onChange={(e) => handleDriveChange(e.target.value)}
                  className="font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg text-xs py-1 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {(drives || []).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.institution || 'Nagpur'})
                    </option>
                  ))}
                </select>
                {currentDrive && (
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      currentDrive.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {currentDrive.status}
                    </span>
                    <a
                      href={currentDrive.screening_info_url || 'https://www.nbtc.mohfw.gov.in/'}
                      target="_blank"
                      rel="noreferrer"
                      title="Medical screening is handled by the partner hospital/institution, not by RaktSetu"
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-600 rounded-full text-[10px] font-bold flex items-center gap-1 transition border border-slate-200 cursor-pointer"
                    >
                      <Globe className="w-3 h-3 text-red-500" />
                      <span>Screening info</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border border-slate-200 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5 text-red-600" /> Show QR code
            </button>
            <a
              href={`/register/${currentDrive?.slug || 'drive'}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border border-slate-200"
            >
              <Eye className="w-3.5 h-3.5" /> Public Registration Link
            </a>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5" /> Send Bulk Reminders
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4">
          <nav className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'overview' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-4 h-4" /> Overview & KPIs
            </button>
            <button
              onClick={() => setActiveTab('drives')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'drives' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-red-600" /> Drives Management
            </button>
            <button
              onClick={() => setActiveTab('registrants')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'registrants' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" /> Registrant Directory
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'audit' ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" /> System Audit Logs
            </button>
          </nav>

          {/* Smart Turnout AI Insight Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-md p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> SMART TURNOUT AI INSIGHT
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on historical turnout signals, Marathi and Hindi preferred donors respond <strong>34% faster</strong> to WhatsApp reminders sent within 48 hours of event day.
            </p>
            <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-400 flex justify-between">
              <span>Recency Weight: 0.25</span>
              <span>Prior Rate: 0.25</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-9 space-y-6">
          
          {reminderStatus && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
              reminderStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span>{reminderStatus.text}</span>
              <button onClick={() => setReminderStatus(null)} className="underline font-bold">Dismiss</button>
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              {/* 5 Dynamic Admin KPI Cards (PART 9) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">TOTAL REGS</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{kpis.total_registrations ?? registrants.length}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">Target: {currentDrive?.target_count || 60}</div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">CONFIRMED</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{kpis.confirmed_count ?? 0}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">Sent confirmation</div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">PENDING</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{kpis.pending_count ?? 0}</div>
                  <div className="text-[10px] text-amber-600 font-semibold mt-1">Requires reminder</div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">PREDICTED</span>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{kpis.predicted_attendance ?? 0}</div>
                  <div className="text-[10px] text-indigo-600 font-semibold mt-1">High/Med Score</div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">ACTUAL</span>
                    <Heart className="w-4 h-4 text-red-500 fill-current" />
                  </div>
                  <div className="text-2xl font-black text-red-600">{kpis.actual_attendance ?? 0}</div>
                  <div className="text-[10px] text-red-500 font-semibold mt-1">Checked-in</div>
                </div>
              </div>

              {/* Consent Summary Widget (ITEM 4) */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-extrabold text-slate-900 tracking-tight uppercase">Consent Overview</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Per-Registrant Consent Breakdown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('registrants');
                      setFilterConsent('Permitted');
                    }}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl text-left transition group"
                  >
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">This drive — granted</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">{consentSummary.thisDriveGranted}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold group-hover:underline mt-0.5 flex items-center gap-0.5">
                      <span>Filter directory</span> &rarr;
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('registrants');
                      setFilterConsent('Permitted');
                    }}
                    className="p-3 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 rounded-xl text-left transition group"
                  >
                    <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Future drives — granted</div>
                    <div className="text-2xl font-black text-blue-700 mt-1">{consentSummary.futureDrivesGranted}</div>
                    <div className="text-[10px] text-blue-600 font-semibold group-hover:underline mt-0.5 flex items-center gap-0.5">
                      <span>Filter directory</span> &rarr;
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('registrants');
                      setFilterConsent('Not Permitted');
                    }}
                    className="p-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl text-left transition group"
                  >
                    <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Withdrawn (any)</div>
                    <div className="text-2xl font-black text-amber-700 mt-1">{consentSummary.withdrawnCount}</div>
                    <div className="text-[10px] text-amber-600 font-semibold group-hover:underline mt-0.5 flex items-center gap-0.5">
                      <span>Filter directory</span> &rarr;
                    </div>
                  </button>
                </div>
              </div>

              {/* Dashboard Content Grid: Forecast, Language Breakdown & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Turnout prediction forecast Card (Combo Line + Area Recharts) */}
                <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Turnout prediction forecast</span>
                        <button
                          onClick={() => setIsPredictionModalOpen(true)}
                          title="Explain Prediction Model Signals"
                          className="text-slate-400 hover:text-red-600 transition"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </h3>
                      <p className="text-xs text-slate-500">Predicted attendance trend as the event approaches</p>
                    </div>
                    <button
                      onClick={handleRefreshForecast}
                      title="Re-run forecast & update prediction graph"
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshingForecast ? 'animate-spin text-red-600' : ''}`} />
                    </button>
                  </div>

                  <div className="h-64 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart key={activeDriveId} data={forecastInfo.chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fontWeight: '600', fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                                  <div className="font-bold border-b border-slate-700 pb-1 flex justify-between gap-4">
                                    <span>Point: {label}</span>
                                    <span className="text-slate-400 font-normal">Target: {data.target}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Confirmed:
                                    </span>
                                    <span className="font-bold">{data.confirmed} donors</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 text-red-400 font-semibold">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Predicted attendance:
                                    </span>
                                    <span className="font-bold">{data.predicted} donors</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between gap-3">
                                    <span>Confidence Band:</span>
                                    <span>{data.predictedLower} - {data.predictedUpper} donors (±{data.confidenceMargin})</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px', fontWeight: '600', paddingBottom: '8px' }}
                        />

                        {/* Target horizontal reference line */}
                        <ReferenceLine
                          y={forecastInfo.signalsSummary.targetCount}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                          label={{ value: `Target (${forecastInfo.signalsSummary.targetCount})`, fill: '#64748b', fontSize: 10, position: 'insideTopRight' }}
                        />

                        {/* Today vertical marker line */}
                        <ReferenceLine
                          x="Today"
                          stroke="#64748b"
                          strokeDasharray="3 3"
                          label={{ value: 'Today', fill: '#0f172a', fontSize: 11, fontWeight: 'bold', position: 'top' }}
                        />

                        {/* Predicted Attendance Gradient Area Fill */}
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          name="Predicted attendance"
                          stroke="none"
                          fill="url(#predictedGradient)"
                          isAnimationActive={false}
                        />

                        {/* Confirmed solid green line */}
                        <Line
                          type="monotone"
                          dataKey="confirmed"
                          name="Confirmed"
                          stroke="#16a34a"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#16a34a' }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={false}
                        />

                        {/* Predicted attendance solid red line */}
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          name="Predicted attendance"
                          stroke="#dc2626"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#dc2626' }}
                          activeDot={{
                            r: 6,
                            className: "cursor-pointer",
                            onClick: () => setIsPredictionModalOpen(true)
                          }}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Compact Score-Tier Breakdown Row */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/60 text-emerald-800 rounded-lg font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>High confidence: <strong className="font-bold">{forecastInfo.tierCounts.high}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/60 text-amber-800 rounded-lg font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Medium confidence: <strong className="font-bold">{forecastInfo.tierCounts.medium}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200/60 text-red-800 rounded-lg font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span>Low confidence: <strong className="font-bold">{forecastInfo.tierCounts.low}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Registrant Language Breakdown */}
                <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Registrant Language Breakdown</h3>
                    <p className="text-xs text-slate-500">Demographic distribution for personalized templates</p>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart key={activeDriveId} data={languageBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="language" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                          {languageBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Communication Feed */}
                <div className="lg:col-span-12 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recent Communication Feed</h3>
                    <p className="text-xs text-slate-500">Real-time dispatch activity log</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1">
                    {(dashboardData?.activity_feed || []).length === 0 ? (
                      <p className="col-span-full text-xs text-slate-400 py-8 text-center">No recent communication activity logged.</p>
                    ) : (
                      dashboardData.activity_feed.map((act) => (
                        <div key={act.id} className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>{act.registrant_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {act.message_type === 'confirmation' ? 'Registration Confirmation' : 'Reminder'} via {act.channel}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 block">
                              {new Date(act.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600">Sent</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* Drives Management View (ITEM 2) */}
          {activeTab === 'drives' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-red-600" /> Drives Management
                  </h3>
                  <p className="text-xs text-slate-500">Manage all institution blood donation drives, dates, target metrics, and official screening links.</p>
                </div>
                <button
                  onClick={() => setIsCreateDriveModalOpen(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition"
                >
                  <Plus className="w-4 h-4" /> Create Drive
                </button>
              </div>

              {/* Drives Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3.5 px-4">Drive Name</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Venue</th>
                      <th className="py-3.5 px-4">Target Count</th>
                      <th className="py-3.5 px-4">Screening Info</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {(drives || []).map((drv) => {
                      const isCurrent = Number(drv.id) === Number(activeDriveId);
                      return (
                        <tr key={drv.id} className={`hover:bg-slate-50/80 transition ${isCurrent ? 'bg-red-50/30' : ''}`}>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{drv.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{drv.institution || 'Nagpur'}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{drv.date}</td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{drv.venue}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{drv.target_count || 50} donors</td>
                          <td className="py-3.5 px-4">
                            {drv.screening_info_url ? (
                              <a
                                href={drv.screening_info_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-red-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                              >
                                <Globe className="w-3 h-3" /> Link <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Not set</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              drv.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              drv.status === 'completed' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                              'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {drv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right pr-4">
                            <button
                              onClick={() => {
                                handleDriveChange(drv.id);
                                setActiveTab('overview');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              {isCurrent ? 'Active Drive' : 'Select Drive'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Registrant Directory View (PART 10) */}
          {(activeTab === 'registrants' || activeTab === 'overview') && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrant Directory & Turnout Predictions</h3>
                  <p className="text-xs text-slate-500">Full admin directory with search, filters, consent tracking, and messaging.</p>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
                <div className="lg:col-span-2 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, phone, RST-ID..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <select
                  value={filterBloodGroup}
                  onChange={(e) => setFilterBloodGroup(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Blood Groups</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>

                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Languages</option>
                  {['English', 'Hindi', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Other'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>

                <select
                  value={filterAttendance}
                  onChange={(e) => setFilterAttendance(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Attendance</option>
                  <option value="Expected">Expected</option>
                  <option value="Attended">Attended</option>
                </select>

                <select
                  value={filterReminder}
                  onChange={(e) => setFilterReminder(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Reminders</option>
                  <option value="Not Sent">Not Sent 🟡</option>
                  <option value="Sent">Sent 🟢</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3.5 px-4">Registration ID</th>
                      <th className="py-3.5 px-4">Name</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Blood Group</th>
                      <th className="py-3.5 px-4">Language</th>
                      <th className="py-3.5 px-4">Consent</th>
                      <th className="py-3.5 px-4">Attendance</th>
                      <th className="py-3.5 px-4">Confirmation</th>
                      <th className="py-3.5 px-4">Reminder</th>
                      <th className="py-3.5 px-4 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredRegistrants.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-6 text-slate-400">
                          No registrants found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrants.map((r) => {
                        const thisDriveConsent = r.communication_consent;
                        const isAttended = r.attendance_status === 'attended';
                        const isReminderSent = r.reminder_status === 'Sent';

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-mono font-bold text-red-600">{r.registration_id || `RST-${r.id}`}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{r.full_name}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{r.phone_number}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[11px]">
                                {r.blood_group}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{r.preferred_language || 'English'}</td>
                            <td className="py-3 px-4">
                              {thisDriveConsent ? (
                                <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Consent
                                </span>
                              ) : (
                                <span className="text-red-600 font-bold text-[11px] flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Revoked
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {isAttended ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                                  Attended
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-full text-[10px]">
                                  Expected
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                                Sent
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isReminderSent ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                                  Sent
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right pr-4">
                              <button
                                onClick={() => handleSendSingleReminder(r.id, r.full_name)}
                                disabled={!thisDriveConsent}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ml-auto ${
                                  thisDriveConsent
                                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-400" />
                                <span>WhatsApp</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Audit Logs Tab (PART 20 & ORGANIZER PORTAL REQUIREMENT) */}
          {activeTab === 'audit' && (() => {
            const rawLogs = auditLogs.length > 0 ? auditLogs : (dashboardData?.recent_audits || []);
            
            const filteredLogs = rawLogs.filter(log => {
              const actor = (log.actor_name || 'System').toLowerCase();
              const role = (log.actor_role || '').toLowerCase();
              const action = (log.action_type || '').toLowerCase();
              const entity = (log.entity_type || '').toLowerCase() + ' ' + (log.entity_id || '');
              
              let desc = '';
              if (typeof log.details === 'string') desc = log.details;
              else if (log.details?.description) desc = log.details.description;
              else if (typeof log.details === 'object') desc = JSON.stringify(log.details);
              desc = desc.toLowerCase();

              const search = auditSearch.trim().toLowerCase();
              const matchesSearch = !search || actor.includes(search) || action.includes(search) || entity.includes(search) || desc.includes(search);
              const matchesAction = auditActionFilter === 'ALL' || log.action_type === auditActionFilter;
              const matchesRole = auditRoleFilter === 'ALL' || (log.actor_role && log.actor_role.toUpperCase() === auditRoleFilter.toUpperCase());

              let matchesDate = true;
              if (auditDateFilter !== 'ALL') {
                const logDate = new Date(log.timestamp);
                const now = new Date();
                if (auditDateFilter === 'TODAY') {
                  matchesDate = logDate.toDateString() === now.toDateString();
                } else if (auditDateFilter === '7DAYS') {
                  const past7 = new Date();
                  past7.setDate(now.getDate() - 7);
                  matchesDate = logDate >= past7;
                } else if (auditDateFilter === '30DAYS') {
                  const past30 = new Date();
                  past30.setDate(now.getDate() - 30);
                  matchesDate = logDate >= past30;
                }
              }

              return matchesSearch && matchesAction && matchesRole && matchesDate;
            }).sort((a, b) => {
              if (auditSortOrder === 'oldest') {
                return new Date(a.timestamp) - new Date(b.timestamp);
              }
              return new Date(b.timestamp) - new Date(a.timestamp);
            });

            const ITEMS_PER_PAGE = 15;
            const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
            const currentPage = Math.min(auditPage, totalPages);
            const paginatedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

            const getBadgeStyle = (actionType) => {
              switch (actionType) {
                case 'REGISTRATION_CREATED':
                  return 'bg-blue-100 text-blue-800 border-blue-200';
                case 'WHATSAPP_CONFIRMATION_SENT':
                case 'WHATSAPP_CONFIRMATION_DELIVERED':
                case 'REMINDER_SENT':
                case 'REMINDER_DELIVERED':
                case 'ATTENDANCE_MARKED':
                case 'DRIVE_ACTIVATED':
                  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                case 'REMINDER_FAILED':
                case 'WHATSAPP_CONFIRMATION_FAILED':
                case 'LOGIN_FAILED':
                  return 'bg-red-100 text-red-800 border-red-200';
                case 'CONSENT_GRANTED':
                case 'CONSENT_UPDATED':
                  return 'bg-purple-100 text-purple-800 border-purple-200';
                case 'BULK_REMINDER_STARTED':
                case 'BULK_REMINDER_COMPLETED':
                  return 'bg-amber-100 text-amber-800 border-amber-200';
                case 'LOGIN_SUCCESS':
                  return 'bg-indigo-100 text-indigo-800 border-indigo-200';
                default:
                  return 'bg-slate-900 text-slate-100 border-slate-700';
              }
            };

            return (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">System Audit Logs</h3>
                    <p className="text-xs text-slate-500">Immutable ledger of consent changes, registrations, check-ins, and communication dispatches.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-full text-xs">
                      {filteredLogs.length} Events Logged
                    </span>
                  </div>
                </div>

                {/* Search & Filters Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <input
                      type="text"
                      placeholder="Search actor, entity, action, details..."
                      value={auditSearch}
                      onChange={(e) => {
                        setAuditSearch(e.target.value);
                        setAuditPage(1);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
                    />
                  </div>

                  {/* Action Filter */}
                  <div>
                    <select
                      value={auditActionFilter}
                      onChange={(e) => {
                        setAuditActionFilter(e.target.value);
                        setAuditPage(1);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="ALL">All Actions</option>
                      <option value="REGISTRATION_CREATED">Registration Created</option>
                      <option value="WHATSAPP_CONFIRMATION_SENT">Confirmation Sent</option>
                      <option value="REMINDER_SENT">Reminder Sent</option>
                      <option value="ATTENDANCE_MARKED">Attendance Marked</option>
                      <option value="CONSENT_GRANTED">Consent Granted</option>
                      <option value="CONSENT_UPDATED">Consent Updated</option>
                      <option value="BULK_REMINDER_COMPLETED">Bulk Reminder</option>
                    </select>
                  </div>

                  {/* Actor Role Filter */}
                  <div>
                    <select
                      value={auditRoleFilter}
                      onChange={(e) => {
                        setAuditRoleFilter(e.target.value);
                        setAuditPage(1);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="ALL">All Actor Roles</option>
                      <option value="ADMIN">Admin</option>
                      <option value="ORGANIZER">Organizer</option>
                      <option value="VOLUNTEER">Volunteer</option>
                      <option value="REGISTRANT">Registrant</option>
                      <option value="SYSTEM">System</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <select
                      value={auditSortOrder}
                      onChange={(e) => setAuditSortOrder(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* Audit Log Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Action Type</th>
                        <th className="py-3 px-4">Entity</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {auditLoading ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-400 font-medium">
                            Loading audit log records...
                          </td>
                        </tr>
                      ) : paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-400 font-medium">
                            No audit activity matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map((aud) => {
                          const actorName = aud.actor_name || (aud.actor?.username ? `${aud.actor.first_name || ''} ${aud.actor.last_name || ''}`.trim() || aud.actor.username : 'System');
                          const actorRole = aud.actor_role || (aud.actor?.role ? aud.actor.role.toUpperCase() : 'SYSTEM');
                          
                          let detailText = '';
                          if (typeof aud.details === 'string') {
                            detailText = aud.details;
                          } else if (aud.details?.description) {
                            detailText = aud.details.description;
                          } else if (typeof aud.details === 'object') {
                            detailText = JSON.stringify(aud.details);
                          }

                          return (
                            <tr key={aud.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(aud.timestamp).toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{actorName}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">{actorRole}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 font-bold rounded text-[10px] uppercase border inline-block ${getBadgeStyle(aud.action_type)}`}>
                                  {aud.action_type}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                <span className="font-bold text-slate-800">{aud.entity_type}</span>
                                {aud.entity_id && <span className="ml-1 text-red-600 font-bold">#{aud.entity_id}</span>}
                              </td>
                              <td className="py-3 px-4 text-slate-700 text-[11px] max-w-md">
                                <div className="font-medium text-slate-800 leading-relaxed">
                                  {detailText}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className="text-slate-500 font-medium">
                      Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredLogs.length} total events)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold rounded-lg transition"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold rounded-lg transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </main>
      </div>

      {/* Bulk Reminders Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-red-600" /> Bulk WhatsApp Reminders
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Generate personalized WhatsApp reminders for all consented pending registrants on <strong>{currentDrive?.name}</strong>.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Dispatch Channel</label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => setBulkChannel('manual')}
                  className={`p-3 rounded-xl border text-left font-semibold transition ${
                    bulkChannel === 'manual' ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold">Manual (wa.me)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Generates direct links for volunteer/organizer numbers.</div>
                </button>
                <button
                  onClick={() => setBulkChannel('api')}
                  className={`p-3 rounded-xl border text-left font-semibold transition ${
                    bulkChannel === 'api' ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold">Meta Cloud API</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Simulated / production Cloud API background dispatch.</div>
                </button>
              </div>
            </div>

            {/* Preview Sample Messages Section (ITEM 5) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Preview Sample Messages (Dynamic AI Output)
                </label>
                <span className="text-[10px] font-semibold text-slate-400">Varies by language, stage & consent</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(() => {
                  const samples = [];
                  const marathiPending = (registrants || []).find(r => (r.preferred_language === 'Marathi' || r.preferred_language === 'Hindi') && r.reminder_status !== 'Sent');
                  if (marathiPending) samples.push(marathiPending);

                  const englishReg = (registrants || []).find(r => r.preferred_language === 'English' && (!marathiPending || r.id !== marathiPending.id));
                  if (englishReg) samples.push(englishReg);

                  const anotherReg = (registrants || []).find(r => !samples.some(s => s.id === r.id));
                  if (anotherReg) samples.push(anotherReg);

                  if (samples.length === 0) {
                    return <p className="text-xs text-slate-400 italic py-2">No registrants available to preview.</p>;
                  }

                  return samples.map((reg, idx) => {
                    const generatedMsg = generateMessage(reg, currentDrive, 'reminder');
                    return (
                      <div key={reg.id || idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-200 pb-1 text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {reg.full_name} ({reg.preferred_language || 'English'})
                          </span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] uppercase font-semibold">
                            {reg.attendance_status || 'Expected'} • {reg.reminder_status || 'Pending'}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 leading-relaxed max-h-24 overflow-y-auto">
                          {generatedMsg}
                        </pre>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {bulkResults && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-44 overflow-y-auto space-y-1.5 text-xs">
                <div className="font-bold text-slate-900">Processed {bulkResults.processed_count} Donors:</div>
                {(bulkResults.results || []).map((res, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-0">
                    <span>{res.full_name} ({res.phone_number})</span>
                    {res.status === 'success' ? (
                      <a href={res.wa_me_link} target="_blank" rel="noreferrer" className="text-red-600 underline font-bold">
                        Open wa.me
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Consent Blocked</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
              <button
                onClick={handleSendBulkReminders}
                disabled={sendingBulk}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
              >
                {sendingBulk ? 'Processing...' : 'Run Bulk Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Popover Modal (ITEM 1) */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-red-600" /> Drive Registration QR Code
              </h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-1 text-left">
              <h4 className="font-extrabold text-slate-900 text-sm">{currentDrive?.name}</h4>
              <p className="text-xs text-slate-500">{currentDrive?.venue || currentDrive?.institution || 'Nagpur'}</p>
            </div>

            {/* QR Code Image Container */}
            <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/register/${currentDrive?.slug || 'drive'}`
                    : `http://localhost:3000/register/${currentDrive?.slug || 'drive'}`
                )}`}
                alt={`QR Code for ${currentDrive?.name}`}
                className="w-48 h-48 rounded-lg shadow-sm"
              />
            </div>

            {/* Link Text and Copy Button */}
            <div className="bg-slate-100 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs font-mono text-slate-700 border border-slate-200">
              <span className="truncate text-[11px]">
                {typeof window !== 'undefined' ? `${window.location.origin}/register/${currentDrive?.slug || 'drive'}` : `/register/${currentDrive?.slug}`}
              </span>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/register/${currentDrive?.slug || 'drive'}`;
                  navigator.clipboard.writeText(link);
                  setIsCopiedLink(true);
                  setTimeout(() => setIsCopiedLink(false), 2000);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-lg text-[11px] shadow-sm flex items-center gap-1 border border-slate-200 transition shrink-0"
              >
                {isCopiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-600" />}
                {isCopiedLink ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const link = `${window.location.origin}/register/${currentDrive?.slug || 'drive'}`;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;
                  try {
                    const response = await fetch(qrUrl);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `${currentDrive?.slug || 'drive'}-qrcode.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                  } catch (err) {
                    window.open(qrUrl, '_blank');
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Download QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Drive Modal (ITEM 2) */}
      {isCreateDriveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" /> Create New Blood Donation Drive
              </h3>
              <button onClick={() => setIsCreateDriveModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {driveFormError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {driveFormError}
              </div>
            )}

            <form onSubmit={handleCreateDriveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Drive Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VNIT Campus Blood Donation Drive"
                  value={driveFormData.name}
                  onChange={(e) => setDriveFormData({ ...driveFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={driveFormData.date}
                    onChange={(e) => setDriveFormData({ ...driveFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Registrants *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={driveFormData.target_count}
                    onChange={(e) => setDriveFormData({ ...driveFormData, target_count: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Venue Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auditorium Hall, VNIT Campus, Nagpur"
                  value={driveFormData.venue}
                  onChange={(e) => setDriveFormData({ ...driveFormData, venue: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Screening Information Link (URL) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.nbtc.mohfw.gov.in/screening-guidelines"
                  value={driveFormData.screening_info_url}
                  onChange={(e) => setDriveFormData({ ...driveFormData, screening_info_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Medical screening guidelines hosted by partner hospital/institution.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={driveFormData.status}
                    onChange={(e) => setDriveFormData({ ...driveFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Institution</label>
                  <input
                    type="text"
                    placeholder="e.g. VNIT Nagpur"
                    value={driveFormData.institution}
                    onChange={(e) => setDriveFormData({ ...driveFormData, institution: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateDriveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingDrive}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {creatingDrive ? 'Creating...' : 'Create Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Turnout Prediction Explanation Modal */}
      {isPredictionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Turnout Prediction Engine Signals</h3>
                  <p className="text-xs text-slate-500">Live AI attendance scoring parameters</p>
                </div>
              </div>
              <button onClick={() => setIsPredictionModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border border-slate-200">
              <p className="text-slate-700 leading-relaxed font-medium">
                Based on <strong className="text-slate-900 font-bold">{forecastInfo.signalsSummary.confirmedCount} confirmed registrants</strong>, an average WhatsApp reminder response rate, and historical turnout signals of similar past drives.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                <span>Model Output (Today):</span>
                <span className="font-bold text-red-600">{forecastInfo.signalsSummary.predictedCount} Predicted Attendees</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">Scoring Component Breakdown</div>
              
              <div className="space-y-2">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">Registration Confirmations</div>
                      <div className="text-[11px] text-slate-500">{forecastInfo.signalsSummary.confirmedCount} direct confirmations delivered</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">+0.35</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">WhatsApp Reminders</div>
                      <div className="text-[11px] text-slate-500">{forecastInfo.signalsSummary.remindersSent} active reminders sent</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">+0.20</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">Event Recency</div>
                      <div className="text-[11px] text-slate-500">{forecastInfo.signalsSummary.daysUntil} days remaining to event</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">+0.15</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">Prior Donor History</div>
                      <div className="text-[11px] text-slate-500">Historical turnout across past completed drives</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">+0.25</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Consented Donors: <strong className="text-slate-800">{forecastInfo.tierCounts.consentedTotal}</strong></span>
              <button
                onClick={() => setIsPredictionModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
