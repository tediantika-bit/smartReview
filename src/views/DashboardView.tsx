import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  QrCode,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { DashboardStats } from '../types';
import { api } from '../lib/api';
import { NavTab } from '../components/Navbar';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard
      .getStats()
      .then(setStats)
      .catch((err) => {
        if (!err?.message?.includes('Sesi')) console.warn(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Ringkasan Dashboard SmartReview</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau status operasional QR Code dinamis dan tag NFC ulasan Google Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('qr')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>Aktivasi QR</span>
          </button>
          <button
            onClick={() => onNavigate('nfc')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition border border-slate-200"
          >
            <Radio className="w-4 h-4" />
            <span>NFC Writer</span>
          </button>
        </div>
      </div>

      {/* PWA Promotion Card if not installed */}
      <PWAInstallButton variant="card" />

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active QRs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">QR Aktif</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.qr_summary.active ?? 0}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Siap memindai Google Review
            </p>
          </div>
        </div>

        {/* Inactive QRs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Belum Aktif</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.qr_summary.inactive ?? 0}
            </div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">
              Menunggu aktivasi URL
            </p>
          </div>
        </div>

        {/* Total NFC Tags */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tag NFC</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.nfc_summary.total ?? 0}
            </div>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              {stats?.nfc_summary.written ?? 0} chip berhasil ditulis
            </p>
          </div>
        </div>

        {/* Total QR Codes */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total QR Fisik</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.qr_summary.total ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">
              {stats?.qr_summary.disabled ?? 0} dinonaktifkan
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Section: Quick Launch & Recent Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Launch & Workflow (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Alur Kerja Cepat Admin</h3>

            <div
              onClick={() => onNavigate('qr')}
              className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/60 hover:border-blue-400 cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Aktivasi QR Code Fisik</h4>
                  <p className="text-[11px] text-slate-600">Scan stiker fisik atau cari ID untuk aktivasi tujuan.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </div>

            <div
              onClick={() => onNavigate('nfc')}
              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200/60 hover:border-emerald-400 cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Tulis Tag NFC</h4>
                  <p className="text-[11px] text-slate-600">Dekatkan tag NFC ke HP untuk menulis link Google Review.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </div>

            <div
              onClick={() => onNavigate('audit')}
              className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/60 border border-slate-200 hover:border-slate-300 cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Periksa Log Audit</h4>
                  <p className="text-[11px] text-slate-600">Catatan riwayat perubahan tujuan dan aktivasi sistem.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </div>
          </div>
        </div>

        {/* Recent Audit Activities (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Aktivitas & Log Audit Terakhir</span>
              </h3>
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Lihat Semua
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Memuat riwayat aktivitas...
              </div>
            ) : !stats?.recent_logs || stats.recent_logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada aktivitas audit yang tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-[11px] bg-slate-200/80 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                        <span className="text-[11px] text-slate-500">ID: {log.entity_id}</span>
                      </div>
                      <p className="text-slate-600 mt-1 text-[11px]">
                        {log.details?.destination_url ? (
                          <>URL: <code className="text-blue-600 truncate max-w-xs">{log.details.destination_url}</code></>
                        ) : log.details?.message ? (
                          log.details.message
                        ) : (
                          `Oleh ${log.admin_email}`
                        )}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
