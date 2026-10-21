import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { QrCode, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-4 animate-in zoom-in">
            <QrCode className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">SmartReview</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Portal Admin Aktivasi QR Code Dinamis & NFC Writer Google Review
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100 sm:px-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{error}</span>
                {error.includes('Vercel') || error.includes('404') || error.includes('Backend') ? (
                  <span className="text-[11px] text-rose-600/90 block">
                    Tip: Jika baru saja deploy ke Vercel, pastikan file <code>vercel.json</code> dan folder <code>api/</code> sudah ikut ter-upload di repository GitHub Anda.
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {/* Quick Default Credentials Card */}
          <div className="mb-5 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Akun Administrator Default:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@smartreview.id');
                  setPassword('admin123456');
                  setError(null);
                }}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition active:scale-95 shadow-xs"
              >
                Gunakan Akun Ini
              </button>
            </div>
            <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
              <div>Email: <strong className="text-slate-900">admin@smartreview.id</strong></div>
              <div>Password: <strong className="text-slate-900">admin123456</strong></div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Admin
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartreview.id"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Sesi aman terenkripsi & verifikasi server-side</span>
          </div>
        </div>

        {/* Vercel Deployment Troubleshooting Note */}
        <div className="mt-4 p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Catatan Deploy di Vercel:</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Aplikasi ini menggabungkan antarmuka Vite SPA dan backend Node.js/Express. Kami telah menambahkan konfigurasi <code>vercel.json</code> dan <code>api/index.ts</code> agar rute autentikasi <code>/api/*</code> dan pengalihan <code>/r/*</code> diproses sebagai Serverless Functions di Vercel.
          </p>
        </div>

        {/* PWA Install Promo if available */}
        <div className="mt-6">
          <PWAInstallButton variant="card" />
        </div>
      </div>
    </div>
  );
};
