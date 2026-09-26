'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Heart, UserCheck, MessageSquare, Phone, LogOut, CheckCircle2, Search,
  Building2, Calendar, MapPin, RefreshCw, AlertTriangle, ShieldCheck,
  XCircle, Filter, Send, X, Globe, User, Clock
} from 'lucide-react';

export default function VolunteerPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [registrants, setRegistrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBloodGroup, setFilterBloodGroup] = useState('ALL');
  const [filterLanguage, setFilterLanguage] = useState('ALL');
  const [filterAttendance, setFilterAttendance] = useState('ALL');
  const [filterReminder, setFilterReminder] = useState('ALL');
  const [filterConsent, setFilterConsent] = useState('ALL');

  // Preview Modal State
  const [previewRegistrant, setPreviewRegistrant] = useState(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchRegistrantsAndMetrics = useCallback(async (driveId) => {
    try {
      const regs = await apiFetch(`/drives/${driveId}/registrants/?role_view=volunteer`);
      setRegistrants(regs);

      const dash = await apiFetch(`/drives/${driveId}/dashboard/`);
      setDashboardMetrics(dash?.kpis || {});
    } catch (err) {
      console.error('Failed to load volunteer registrants', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const driveList = await apiFetch('/drives/');
      setDrives(driveList);
      if (driveList.length > 0) {
        const activeOrFirst = driveList.find(d => d.status === 'active') || driveList[0];
        setSelectedDrive(activeOrFirst);
        await fetchRegistrantsAndMetrics(activeOrFirst.id);
      }
    } catch (err) {
      console.error('Failed to load volunteer data', err);
    } finally {
      setLoading(false);
    }
  }, [fetchRegistrantsAndMetrics]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'admin' || user.role === 'organizer') {
        router.push('/dashboard');
      } else {
        loadData();
      }
    }
  }, [user, isLoading, router, loadData]);

  const handleCheckin = async (registrantId, name) => {
    try {
      await apiFetch(`/registrants/${registrantId}/checkin/`, { method: 'POST' });
      setActionMessage({ type: 'success', text: `Marked ${name} as Attended!` });
      await fetchRegistrantsAndMetrics(selectedDrive.id);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to check in registrant' });
    }
  };

  const handleOpenPreviewModal = (registrant) => {
    if (!registrant.communication_consent) return;

    // Generate default template preview
    const venueName = selectedDrive?.venue || "St. Vincent Pallotti College of Engineering, Nagpur";
    const dateStr = selectedDrive?.date || "Today";
    const timeStr = "9:00 AM - 4:00 PM";
    const name = registrant.full_name;
    const lang = registrant.preferred_language || 'English';

    let defaultMsg = "";
    if (lang === 'Hindi') {
      defaultMsg = `नमस्ते ${name} 👋\n\nयह आपके रक्तदान शिविर के पंजीकरण के लिए एक याद दिलाने वाला संदेश है।\n\n📍 स्थान: St. Vincent Pallotti College of Engineering, Nagpur\n📅 तारीख: ${dateStr}\n⏰ रिपोर्टिंग समय: ${timeStr}\n\nरक्तदान अभियान में पंजीकरण करने और सहयोग देने के लिए धन्यवाद। ❤️\n\nकृपया समय पर कार्यक्रम स्थल पर पहुंचें।\n\nयदि आप उपस्थित नहीं हो सकते हैं, तो कृपया आयोजकों को सूचित करें।\n\n– Blood Donation Drive Team`;
    } else if (lang === 'Marathi') {
      defaultMsg = `नमस्कार ${name} 👋\n\nSt. Vincent Pallotti College of Engineering, Nagpur येथे आयोजित रक्तदान शिबिरासाठी तुमच्या नोंदणीची ही एक आठवण आहे।\n\n📍 ठिकाण: St. Vincent Pallotti College of Engineering, Nagpur\n📅 तारीख: ${dateStr}\n⏰ रिपोर्टिंग वेळ: ${timeStr}\n\nरक्तदान मोहिमेत नोंदणी करून सहकार्य केल्याबद्दल धन्यवाद। ❤️\n\nकृपया कार्यक्रमाच्या ठिकाणी वेळेवर पोहोचा।\n\nतुम्ही उपस्थित राहू शकत नसल्यास कृपया आयोजकांना कळवा।\n\n– Blood Donation Drive Team`;
    } else if (lang === 'Bengali') {
      defaultMsg = `হ্যালো ${name} 👋\n\nSt. Vincent Pallotti College of Engineering, Nagpur-এ রক্তদান শিবিরের নিবন্ধনের জন্য এটি একটি স্মারক বার্তা।\n\n📍 স্থান: St. Vincent Pallotti College of Engineering, Nagpur\n📅 তারিখ: ${dateStr}\n⏰ রিপোর্টিং সময়: ${timeStr}\n\nরক্তদান উদ্যোগে নিবন্ধন এবং সমর্থনের জন্য ধন্যবাদ। ❤️\n\nঅনুগ্রহ করে সময়মতো অনুষ্ঠানস্থলে পৌঁছান।\n\nআপনি উপস্থিত হতে না পারলে আয়োজকদের জানান।\n\n– Blood Donation Drive Team`;
    } else if (lang === 'Tamil') {
      defaultMsg = `வணக்கம் ${name} 👋\n\nSt. Vincent Pallotti College of Engineering, Nagpur ரத்த தான முகாம் பதிவிற்கான நினைவூட்டல் செய்தி.\n\n📍 இடம்: St. Vincent Pallotti College of Engineering, Nagpur\n📅 தேதி: ${dateStr}\n⏰ நேரம்: ${timeStr}\n\nரத்த தான முகாமில் பதிவு செய்தமைக்கு நன்றி. ❤️\n\nதயவுசெய்து குறித்த நேரத்தில் வருகை தரவும்.\n\nவர இயலாவிட்டால் அமைப்பாளர்களுக்கு தெரிவிக்கவும்.\n\n– Blood Donation Drive Team`;
    } else if (lang === 'Telugu') {
      defaultMsg = `నమస్కారం ${name} 👋\n\nSt. Vincent Pallotti College of Engineering, Nagpur లో రక్తదాన శిబిరం రిజిస్ట్రేషన్ గురించి రిమైండర్.\n\n📍 వేదిక: St. Vincent Pallotti College of Engineering, Nagpur\n📅 తేదీ: ${dateStr}\n⏰ సమయం: ${timeStr}\n\nరక్తదాన కార్యక్రమంలో రిజిస్టర్ చేసుకున్నందుకు ధన్యవాదాలు. ❤️\n\nదయచేసి సమయానికి వేదికకు చేరుకోండి.\n\nహాజరుకాలేకపోతే నిర్వాహకులకు తెలియజేయండి.\n\n– Blood Donation Drive Team`;
    } else if (lang === 'Gujarati') {
      defaultMsg = `નમસ્તે ${name} 👋\n\nSt. Vincent Pallotti College of Engineering, Nagpur ખાતે રક્તદાન કેમ્પ રજિસ્ટ્રેશન માટે યાદ અપાવતો સંદેશ.\n\n📍 સ્થળ: St. Vincent Pallotti College of Engineering, Nagpur\n📅 તારીખ: ${dateStr}\n⏰ સમય: ${timeStr}\n\nરક્તદાન ઝુંબેશમાં નોંધણી કરાવવા બદલ આભાર. ❤️\n\nમહેરબાની કરીને સમયસર સ્થળ પર પહોંચો.\n\nઅસમર્થ હોવ તો આયોજકોને જાણ કરો.\n\n– Blood Donation Drive Team`;
    } else if (lang === 'Kannada') {
      defaultMsg = `ನಮಸ್ಕಾರ ${name} 👋\n\nSt. Vincent Pallotti College of Engineering, Nagpur ಯಲ್ಲಿ ರಕ್ತದಾನ ಶಿಬಿರದ ನೋಂದಣಿಯ ನೆನಪೋಲೆ.\n\n📍 ಸ್ಥಳ: St. Vincent Pallotti College of Engineering, Nagpur\n📅 ದಿನಾಂಕ: ${dateStr}\n⏰ ಸಮಯ: ${timeStr}\n\nರಕ್ತದಾನ ಶಿಬಿರದಲ್ಲಿ ನೋಂದಾಯಿಸಿಕೊಂಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ❤️\n\nದಯವಿಟ್ಟು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಆಗಮಿಸಿ.\n\nಬರಲು ಸಾಧ್ಯವಾಗದಿದ್ದರೆ ಆಯೋಜಕರಿಗೆ ತಿಳಿಸಿ.\n\n– Blood Donation Drive Team`;
    } else {
      defaultMsg = `Hello ${name} 👋\n\nThis is a friendly reminder about your registration for the Blood Donation Drive at St. Vincent Pallotti College of Engineering, Nagpur.\n\n📍 Venue: St. Vincent Pallotti College of Engineering, Nagpur\n📅 Date: ${dateStr}\n⏰ Reporting Time: ${timeStr}\n\nThank you for registering and supporting the blood donation initiative. ❤️\n\nPlease reach the venue on time.\n\nIf you are unable to attend, please let the organizers know.\n\n– Blood Donation Drive Team`;
    }

    setPreviewRegistrant(registrant);
    setPreviewMessage(defaultMsg);
  };

  const handleConfirmSendReminder = async () => {
    if (!previewRegistrant) return;
    setSendingReminder(true);
    try {
      const res = await apiFetch(`/registrants/${previewRegistrant.id}/send-reminder/`, {
        method: 'POST',
        body: JSON.stringify({
          channel: 'manual',
          custom_message: previewMessage
        })
      });

      if (res.wa_me_link) {
        window.open(res.wa_me_link, '_blank');
        setActionMessage({
          type: 'success',
          text: `Reminder marked as SENT and opened WhatsApp link for ${previewRegistrant.full_name}!`
        });
      }

      setPreviewRegistrant(null);
      await fetchRegistrantsAndMetrics(selectedDrive.id);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to send reminder' });
    } finally {
      setSendingReminder(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading Volunteer Portal...</p>
        </div>
      </div>
    );
  }

  // Calculated Counters
  const totalRegistered = dashboardMetrics?.total_registered ?? registrants.length;
  const attendedCount = dashboardMetrics?.attended ?? registrants.filter(r => r.attendance_status === 'attended').length;
  const expectedCount = dashboardMetrics?.expected ?? Math.max(0, totalRegistered - attendedCount);
  const remindersSent = dashboardMetrics?.reminders_sent ?? registrants.filter(r => r.reminder_status === 'Sent').length;
  const remindersPending = dashboardMetrics?.reminders_pending ?? registrants.filter(r => r.reminder_status !== 'Sent').length;

  // Filter Logic
  const filteredRegistrants = registrants.filter((r) => {
    const targetPhone = r.whatsapp_number || r.phone_number || '';
    const matchesSearch =
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.blood_group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      targetPhone.includes(searchQuery);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">RaktSetu</span>
              <span className="ml-2 text-xs bg-emerald-900/80 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-700">
                VOLUNTEER PORTAL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user?.first_name} {user?.last_name}</div>
              <div className="text-[11px] text-slate-400">{user?.phone}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition flex items-center gap-1.5 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* Banner & Dynamic Dashboard Counters */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-800 rounded-2xl p-6 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-extrabold">Welcome, {user?.first_name || 'Volunteer'}!</h1>
            <p className="text-red-100 text-sm mt-1">
              Assigned Drive: <span className="font-bold text-white underline">{selectedDrive?.name || 'St. Vincent Pallotti Drive'}</span>
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-slate-900/60 backdrop-blur px-3 py-1.5 rounded-xl border border-red-400/30 text-xs text-white">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Messages dispatched from your WhatsApp identity: <strong>{user?.phone || '+91-Volunteer-Phone'}</strong></span>
            </div>
          </div>

          {/* 5 Dynamic Dashboard KPI Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 text-center">
              <div className="text-xl sm:text-2xl font-black">{totalRegistered}</div>
              <div className="text-[10px] text-red-100 uppercase tracking-wider font-semibold">Registered</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-300">{attendedCount}</div>
              <div className="text-[10px] text-red-100 uppercase tracking-wider font-semibold">Attended</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-300">{expectedCount}</div>
              <div className="text-[10px] text-red-100 uppercase tracking-wider font-semibold">Expected</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 text-center">
              <div className="text-xl sm:text-2xl font-black text-blue-300">{remindersSent}</div>
              <div className="text-[10px] text-red-100 uppercase tracking-wider font-semibold">Sent</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 text-center col-span-2 sm:col-span-1">
              <div className="text-xl sm:text-2xl font-black text-rose-200">{remindersPending}</div>
              <div className="text-[10px] text-red-100 uppercase tracking-wider font-semibold">Pending</div>
            </div>
          </div>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm ${
            actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
              <span>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs underline">Dismiss</button>
          </div>
        )}

        {/* Drive Info Card */}
        {selectedDrive && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedDrive.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-semibold"><Building2 className="w-3.5 h-3.5 text-slate-400" /> St. Vincent Pallotti College of Engineering, Nagpur</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {selectedDrive.date}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchRegistrantsAndMetrics(selectedDrive.id)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh List
            </button>
          </div>
        )}

        {/* Search & Filters Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5"><Filter className="w-4 h-4 text-red-600" /> SEARCH & ADVANCED FILTERS</span>
            <span className="text-slate-400 font-normal">Showing {filteredRegistrants.length} of {registrants.length} Donors</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, blood group, WhatsApp..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>

            {/* Blood Group Filter */}
            <div>
              <select
                value={filterBloodGroup}
                onChange={(e) => setFilterBloodGroup(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">All Blood Groups</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Preferred Language Filter */}
            <div>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">All Languages</option>
                {['English', 'Hindi', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Other'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Attendance Filter */}
            <div>
              <select
                value={filterAttendance}
                onChange={(e) => setFilterAttendance(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">All Attendance</option>
                <option value="Expected">Expected</option>
                <option value="Attended">Attended</option>
              </select>
            </div>

            {/* Reminder Status Filter */}
            <div>
              <select
                value={filterReminder}
                onChange={(e) => setFilterReminder(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">All Reminders</option>
                <option value="Not Sent">Not Sent 🟡</option>
                <option value="Sent">Sent 🟢</option>
              </select>
            </div>
          </div>
        </div>

        {/* Registrants Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Authorized Donor Directory</h3>
              <p className="text-xs text-slate-500">Unmasked WhatsApp contact numbers for assigned drive volunteers.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-4 sm:px-6">Full Name</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">WhatsApp Number</th>
                  <th className="py-3.5 px-4">Preferred Language</th>
                  <th className="py-3.5 px-4">Attendance Status</th>
                  <th className="py-3.5 px-4">Reminder Status</th>
                  <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredRegistrants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      No registrants match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrants.map((r) => {
                    const isAttended = r.attendance_status === 'attended';
                    const hasConsent = r.communication_consent;
                    const waNumber = r.whatsapp_number || r.phone_number;
                    const isReminderSent = r.reminder_status === 'Sent';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        {/* Name */}
                        <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">{r.full_name}</td>
                        
                        {/* Blood Group */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 font-black rounded-md text-xs">
                            {r.blood_group}
                          </span>
                        </td>

                        {/* WhatsApp Number (Unmasked for authorized volunteer) */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {waNumber}
                        </td>

                        {/* Preferred Language */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            {r.preferred_language || 'English'}
                          </span>
                        </td>

                        {/* Attendance Status */}
                        <td className="py-3.5 px-4">
                          {isAttended ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Attended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[11px]">
                              Expected
                            </span>
                          )}
                        </td>

                        {/* Reminder Status */}
                        <td className="py-3.5 px-4">
                          {isReminderSent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                              🟢 Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[11px]">
                              🟡 Not Sent
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right pr-6 space-x-2">
                          {!isAttended && (
                            <button
                              onClick={() => handleCheckin(r.id, r.full_name)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition text-xs shadow-sm"
                            >
                              Mark Attended
                            </button>
                          )}

                          {hasConsent ? (
                            <button
                              onClick={() => handleOpenPreviewModal(r)}
                              className={`px-3 py-1.5 rounded-lg font-bold transition text-xs shadow-sm inline-flex items-center gap-1 ${
                                isReminderSent
                                  ? 'bg-slate-700 hover:bg-slate-800 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-current" />
                              <span>{isReminderSent ? 'Reminder Sent' : 'WhatsApp'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-red-600 font-bold italic bg-red-50 px-2 py-1 rounded-md border border-red-100">
                              WhatsApp reminders not permitted
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Message Preview & Edit Modal */}
      {previewRegistrant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" /> Send WhatsApp Reminder
              </h3>
              <button
                onClick={() => setPreviewRegistrant(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Registrant Meta summary */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Registrant</span>
                <span className="font-bold text-slate-900">{previewRegistrant.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp</span>
                <span className="font-mono font-bold text-slate-800">{previewRegistrant.whatsapp_number || previewRegistrant.phone_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Language</span>
                <span className="font-bold text-emerald-700">{previewRegistrant.preferred_language || 'English'}</span>
              </div>
            </div>

            {/* Editable Message Text Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Personalized Message (Editable before sending):
              </label>
              <textarea
                rows={9}
                value={previewMessage}
                onChange={(e) => setPreviewMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewRegistrant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendReminder}
                disabled={sendingReminder}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>{sendingReminder ? 'Processing...' : 'Open WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
