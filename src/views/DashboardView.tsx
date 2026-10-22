import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  QrCode,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Eye,
  Smartphone,
  Laptop,
  Flame,
  RefreshCw,
  Award,
  Calendar,
  Activity,
} from 'lucide-react';
import { DashboardStats, ScanAnalyticsSummary } from '../types';
import { api } from '../lib/api';
import { NavTab } from '../components/Navbar';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<ScanAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        api.dashboard.getStats(),
        api.analytics.getSummary().catch(() => null),
      ]);
      setStats(statsRes);
      if (analyticsRes) {
        setAnalytics(analyticsRes);
      } else if (statsRes?.scan_analytics) {
        setAnalytics(statsRes.scan_analytics);
      }
    } catch (err: any) {
      if (!err?.message?.includes('Sesi')) console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalScans = analytics?.total_scans ?? stats?.scan_analytics?.total_scans ?? 0;
  const scansToday = analytics?.scans_today ?? stats?.scan_analytics?.scans_today ?? 0;
  const scans7Days = analytics?.scans_7_days ?? stats?.scan_analytics?.scans_7_days ?? 0;
  const topQRs = analytics?.top_qrs ?? stats?.scan_analytics?.top_qrs ?? [];
  const dailyTrends = analytics?.daily_trends ?? stats?.scan_analytics?.daily_trends ?? [];
  const hourly = analytics?.hourly_distribution ?? stats?.scan_analytics?.hourly_distribution ?? [];
  const devices = analytics?.device_breakdown ?? stats?.scan_analytics?.device_breakdown ?? {
    android: 0,
    ios: 0,
    desktop: 0,
    other: 0,
  };
  const recentScans = analytics?.recent_scans ?? stats?.scan_analytics?.recent_scans ?? [];

  // Max count for daily trends chart scaling
  const maxDailyCount = Math.max(1, ...dailyTrends.map((d) => d.count));

  // Find peak hour
  const peakHour = hourly.length > 0 ? [...hourly].sort((a, b) => b.count - a.count)[0] : null;

  // Calculate device percentages
  const deviceTotal = (devices.android + devices.ios + devices.desktop + devices.other) || 1;
  const androidPct = Math.round((devices.android / deviceTotal) * 100);
  const iosPct = Math.round((devices.ios / deviceTotal) * 100);
  const desktopPct = Math.round((devices.desktop / deviceTotal) * 100);
  const otherPct = Math.max(0, 100 - androidPct - iosPct - desktopPct);

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
            Pantau performa pemindaian Google Review pelanggan & status operasional stiker fisik secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition border border-slate-200 shadow-2xs"
            title="Muat ulang data statistik"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan'}</span>
          </button>
          <button
            onClick={() => onNavigate('qr')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
          >
            <QrCode className="w-4 h-4" />
            <span>Aktivasi QR</span>
          </button>
          <button
            onClick={() => onNavigate('nfc')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition border border-slate-200"
          >
            <Radio className="w-4 h-4" />
            <span>NFC Writer</span>
          </button>
        </div>
      </div>

      {/* PWA Promotion Card if not installed */}
      <PWAInstallButton variant="card" />

      {/* Top Scan & Engagement Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-3xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">Total Scan</span>
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black tracking-tight">
              {loading ? '...' : totalScans.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-blue-100 font-medium mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Semua pemindaian ulasan pelanggan</span>
            </p>
          </div>
        </div>

        {/* Scans Today */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Scan Hari Ini</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : scansToday.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>Aktivitas ulasan hari ini</span>
            </p>
          </div>
        </div>

        {/* 7 Days Scans */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">7 Hari Terakhir</span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : scans7Days.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">
              {scans7Days > 0 ? `${(scans7Days / 7).toFixed(1)} scan / hari rata-rata` : 'Mulai sebar stiker ke meja'}
            </p>
          </div>
        </div>

        {/* Active QRs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">QR Aktif</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : stats?.qr_summary.active ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">
              Dari {stats?.qr_summary.total ?? 0} total stiker fisik
            </p>
          </div>
        </div>
      </div>

      {/* Main Analytics Visuals: 7-Day Trend + Peak Hours & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Tren Pemindaian 7 Hari Terakhir</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Frekuensi pelanggan membuka form ulasan Google per hari.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {scans7Days} Total Minggu Ini
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="pt-2">
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2">
              {dailyTrends.map((day) => {
                const heightPct = Math.max(8, Math.round((day.count / maxDailyCount) * 100));
                const isToday = day.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center h-full justify-end group">
                    {/* Tooltip Count */}
                    <div className="mb-1 text-[11px] font-bold text-slate-700 group-hover:text-blue-600 transition">
                      {day.count}
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isToday
                            ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-xs'
                            : day.count > 0
                            ? 'bg-gradient-to-t from-blue-500 to-blue-400 group-hover:from-blue-600 group-hover:to-blue-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    </div>

                    {/* Date Label */}
                    <div className="mt-2 text-center">
                      <p className={`text-[11px] font-semibold truncate ${isToday ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                        {day.label.split(',')[0]}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {day.date.slice(8, 10)}/{day.date.slice(5, 7)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Peak Hours & Device Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Peak Hours Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Jam Paling Ramai</span>
              </h3>
              {peakHour && peakHour.count > 0 && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Puncak: {peakHour.label} ({peakHour.count} scan)
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              Distribusi 24 jam untuk mengetahui waktu kunjungan restoran / toko paling produktif.
            </p>

            {/* Hourly Mini Spark Bars (00 - 23) */}
            <div className="grid grid-cols-12 gap-1 pt-2 items-end h-16">
              {hourly.filter((_, idx) => idx % 2 === 0).map((h) => {
                const maxHour = Math.max(1, ...hourly.map((x) => x.count));
                const pct = Math.max(10, Math.round((h.count / maxHour) * 100));
                return (
                  <div key={h.hour} className="flex flex-col items-center h-full justify-end group" title={`${h.label}: ${h.count} scan`}>
                    <div
                      style={{ height: `${pct}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        h.count > 0
                          ? 'bg-amber-400 group-hover:bg-amber-500'
                          : 'bg-slate-100'
                      }`}
                    />
                    <span className="text-[8px] text-slate-400 mt-1">{h.hour}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 pt-1">
              <span>00:00 (Malam)</span>
              <span>12:00 (Makan Siang)</span>
              <span>22:00 (Tutup)</span>
            </div>
          </div>

          {/* Visitor Device Breakdown */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Perangkat Pengunjung</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500">{totalScans} Scan</span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                style={{ width: `${androidPct}%` }}
                className="bg-emerald-500 hover:bg-emerald-600 transition"
                title={`Android: ${androidPct}% (${devices.android} scan)`}
              />
              <div
                style={{ width: `${iosPct}%` }}
                className="bg-slate-800 hover:bg-slate-900 transition"
                title={`iOS: ${iosPct}% (${devices.ios} scan)`}
              />
              <div
                style={{ width: `${desktopPct}%` }}
                className="bg-blue-500 hover:bg-blue-600 transition"
                title={`Desktop: ${desktopPct}% (${devices.desktop} scan)`}
              />
              <div
                style={{ width: `${otherPct}%` }}
                className="bg-slate-300 hover:bg-slate-400 transition"
                title={`Lainnya: ${otherPct}% (${devices.other} scan)`}
              />
            </div>

            {/* Device Legend Badges */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </div>
                <div className="text-base font-black text-emerald-900 mt-0.5">
                  {androidPct}%
                </div>
                <div className="text-[10px] text-emerald-600">{devices.android} scan</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-[11px]">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iOS (Apple)</span>
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {iosPct}%
                </div>
                <div className="text-[10px] text-slate-600">{devices.ios} scan</div>
              </div>

              <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-[11px]">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Desktop/PC</span>
                </div>
                <div className="text-base font-black text-blue-900 mt-0.5">
                  {desktopPct}%
                </div>
                <div className="text-[10px] text-blue-600">{devices.desktop} scan</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard: Stiker / Meja Paling Populer */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Peringkat Efektivitas Stiker / Meja (Top Leaderboard)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cari tahu meja atau sudut outlet mana yang paling banyak menghasilkan ulasan Google dari pelanggan.
            </p>
          </div>
          <button
            onClick={() => onNavigate('qr')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Kelola Semua QR</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topQRs.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Belum ada data pemindaian yang terekam. Letakkan stiker QR di meja pelanggan dan mulai scan!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Peringkat</th>
                  <th className="py-2.5 px-3">Nama / Lokasi Meja</th>
                  <th className="py-2.5 px-3">Public ID</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Jumlah Scan</th>
                  <th className="py-2.5 px-3 text-right">Terakhir Dipindai</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topQRs.map((item, index) => {
                  const rankIcons = ['🥇', '🥈', '🥉'];
                  return (
                    <tr key={item.public_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                        {index < 3 ? (
                          <span className="text-base mr-1">{rankIcons[index]}</span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 inline-flex items-center justify-center text-[10px] mr-1">
                            #{index + 1}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {item.name || `QR #${item.public_id}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-600 font-semibold">
                        /r/{item.public_id}
                      </td>
                      <td className="py-3 px-3">
                        {item.status === 'active' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        )}
                        {item.status === 'inactive' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Belum Aktif
                          </span>
                        )}
                        {item.status === 'disabled' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 font-mono">
                          {item.scan_count.toLocaleString('id-ID')} scan
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 whitespace-nowrap text-[11px]">
                        {item.last_scanned_at ? (
                          new Date(item.last_scanned_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-slate-300">Belum ada</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onNavigate('qr')}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition"
                        >
                          Kelola
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Section: Quick Launch & Recent Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Launch & Workflow (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
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

        {/* Recent Audit Activities & Recent Scans (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
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

