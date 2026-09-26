'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heart, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCard, setLoadingCard] = useState(null);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('demo1234');
    setError('');
    setLoadingCard(demoEmail);
    try {
      await login(demoEmail, 'demo1234');
    } catch (err) {
      setError(err.message || `Failed to sign in as ${demoEmail}`);
    } finally {
      setLoadingCard(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-red-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200 mb-4 transform hover:scale-105 transition-transform">
          <Heart className="w-9 h-9 fill-current" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">RaktSetu</h1>
        <p className="text-sm font-medium text-red-600 mt-1">Blood Donation Mobilization & Turnout Platform</p>
        <p className="text-xs text-slate-500 mt-1">St. Vincent Pallotti College of Engineering & Technology — Nagpur</p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Login Form */}
        <div className="md:col-span-7 bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sign in to your account</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your institutional email and password or use one-click demo access.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@raktsetu.org"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!loadingCard}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl shadow-md shadow-red-200 transition duration-150 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Accounts Panel */}
        <div className="md:col-span-5 bg-slate-900 text-slate-100 rounded-2xl shadow-xl p-6 border border-slate-800">
          <div className="flex items-center gap-2 text-red-400 font-bold mb-3 text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>ONE-CLICK DEMO ACCOUNTS</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Click any account card below for instant direct authentication. Password: <code className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">demo1234</code>
          </p>

          <div className="space-y-2.5 text-xs">
            {/* Admin */}
            <button
              type="button"
              disabled={!!loadingCard}
              onClick={() => handleDemoClick('admin@raktsetu.org')}
              className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-red-900/60 text-red-300 rounded text-[10px] font-bold">ADMIN</span>
                  <span>Rajesh Sharma</span>
                </div>
                <div className="text-slate-400 text-[11px]">admin@raktsetu.org</div>
              </div>
              {loadingCard === 'admin@raktsetu.org' ? (
                <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition" />
              )}
            </button>

            {/* Organizer 1 */}
            <button
              type="button"
              disabled={!!loadingCard}
              onClick={() => handleDemoClick('organizer.pallotti@raktsetu.org')}
              className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-purple-900/60 text-purple-300 rounded text-[10px] font-bold">ORGANIZER</span>
                  <span>St. Vincent Pallotti</span>
                </div>
                <div className="text-slate-400 text-[11px]">organizer.pallotti@raktsetu.org</div>
              </div>
              {loadingCard === 'organizer.pallotti@raktsetu.org' ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
              )}
            </button>

            {/* Organizer 2 */}
            <button
              type="button"
              disabled={!!loadingCard}
              onClick={() => handleDemoClick('organizer.vnit@raktsetu.org')}
              className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-purple-900/60 text-purple-300 rounded text-[10px] font-bold">ORGANIZER</span>
                  <span>VNIT Nagpur</span>
                </div>
                <div className="text-slate-400 text-[11px]">organizer.vnit@raktsetu.org</div>
              </div>
              {loadingCard === 'organizer.vnit@raktsetu.org' ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
              )}
            </button>

            {/* Volunteer 1 */}
            <button
              type="button"
              disabled={!!loadingCard}
              onClick={() => handleDemoClick('janvi.patil@raktsetu.org')}
              className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded text-[10px] font-bold">VOLUNTEER</span>
                  <span>Janvi Patil</span>
                </div>
                <div className="text-slate-400 text-[11px]">janvi.patil@raktsetu.org (+918668233176)</div>
              </div>
              {loadingCard === 'janvi.patil@raktsetu.org' ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
              )}
            </button>

            {/* Volunteer 2 */}
            <button
              type="button"
              disabled={!!loadingCard}
              onClick={() => handleDemoClick('priya.kakuste@raktsetu.org')}
              className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded text-[10px] font-bold">VOLUNTEER</span>
                  <span>Priya Kakuste</span>
                </div>
                <div className="text-slate-400 text-[11px]">priya.kakuste@raktsetu.org (+919673614569)</div>
              </div>
              {loadingCard === 'priya.kakuste@raktsetu.org' ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
