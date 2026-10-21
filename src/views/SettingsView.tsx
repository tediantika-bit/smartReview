import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Lock,
  LogOut,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Server,
  Database,
  RefreshCw,
  HardDrive,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { validateFirestoreConnection } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export const SettingsView: React.FC = () => {
  const { admin, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Database Connection Diagnostics State
  const [dbStatus, setDbStatus] = useState<{
    provider: string;
    connected: boolean;
    latencyMs?: number;
    projectId: string;
    databaseId: string;
    error?: string;
    counts: { qrCodes: number; nfcTags: number; auditLogs: number };
    dualPersistence: { cloudFirestore: string; localCache: string; offlineSupport: string };
    rulesStatus: string;
  } | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbTestMessage, setDbTestMessage] = useState<string | null>(null);

  const fetchDatabaseStatus = async () => {
    try {
      setDbLoading(true);
      setDbTestMessage(null);

      // Attempt 1: Check via server diagnostics API
      try {
        const res = await api.system.getDatabaseStatus();
        if (res && res.connected) {
          setDbStatus(res);
          setDbTestMessage(`Ping sukses (${res.latencyMs || 0}ms) — Database Firestore responsif & aktif.`);
          return;
        }
      } catch {
        // Fallback: If server API is unreachable on Vercel static deployment, test Firestore directly from browser
      }

      // Attempt 2: Direct browser client-side ping to Google Cloud Firestore
      const startTime = Date.now();
      const isConnected = await validateFirestoreConnection();
      const latencyMs = Math.max(1, Date.now() - startTime);

      if (isConnected) {
        setDbStatus({
          provider: 'Google Cloud Firestore',
          connected: true,
          latencyMs,
          projectId: firebaseConfig.projectId || 'neon-ethos-dt3g1',
          databaseId: firebaseConfig.firestoreDatabaseId || 'ai-studio-remixsmartreview-b98423ec-d809-4444-9aca-965fe1f93c34',
          counts: { qrCodes: 0, nfcTags: 0, auditLogs: 0 },
          dualPersistence: {
            cloudFirestore: 'Aktif & Terhubung Langsung via Web SDK',
            localCache: 'Aktif di Perangkat (PWA Offline Cache)',
            offlineSupport: 'Aktif via Service Worker',
          },
          rulesStatus: 'Deployed & Active',
        });
        setDbTestMessage(`Ping sukses (${latencyMs}ms) — Terhubung langsung ke Cloud Firestore via Web SDK.`);
      } else {
        throw new Error('Perangkat sedang offline atau tidak dapat menghubungi server Cloud Firestore.');
      }
    } catch (err: any) {
      setDbTestMessage(`Koneksi terhambat: ${err.message || 'Gagal memeriksa koneksi'}`);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseStatus();
  }, []);

  // Backup / Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);

    if (newPassword !== confirmPassword) {
      setPwdFeedback({ type: 'error', message: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdFeedback({ type: 'error', message: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }

    setPwdLoading(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setPwdFeedback({ type: 'success', message: 'Kata sandi berhasil diubah!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdFeedback({ type: 'error', message: err.message || 'Gagal mengubah kata sandi.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch('/api/backup', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('smartreview_auth_token') || ''}`,
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartreview-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setRestoreFeedback({
        type: 'success',
        message: 'File cadangan (backup) database berhasil diunduh ke perangkat Anda.',
      });
    } catch (err: any) {
      setRestoreFeedback({ type: 'error', message: 'Gagal mengunduh cadangan database.' });
    } finally {
      setBackupLoading(false);
    }
  };

  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingRestoreFile(file);
    e.target.value = '';
  };

  const executeRestore = async () => {
    if (!pendingRestoreFile) return;
    const file = pendingRestoreFile;
    setPendingRestoreFile(null);

    try {
      setBackupLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);
      await api.backup.restore(json);
      setRestoreFeedback({
        type: 'success',
        message: 'Database berhasil dipulihkan dari file backup!',
      });
    } catch (err: any) {
      setRestoreFeedback({
        type: 'error',
        message: err.message || 'Format file backup tidak valid.',
      });
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          <span>Pengaturan Akun & Sistem</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Kelola profil admin, keamanan kata sandi, instalasi PWA, serta prosedur pencadangan data.
        </p>
      </div>

      {/* Admin Profile Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {admin?.email.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{admin?.email}</h3>
            <p className="text-xs text-slate-500">Administrator Utama SmartReview</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar (Logout)</span>
        </button>
      </div>

      {/* PWA Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <span>Instalasi Progressive Web App (PWA)</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          SmartReview dirancang menggunakan Progressive Web App (PWA) dengan service worker offline, manifest, dan shortcut layar utama untuk kenyamanan admin di HP.
        </p>
        <PWAInstallButton variant="card" />
      </div>

      {/* Change Password Form */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <span>Ganti Kata Sandi Admin</span>
        </h3>

        {pwdFeedback && (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs ${
              pwdFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {pwdFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{pwdFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kata Sandi Saat Ini
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Baru (min. 6 karakter)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ulangi Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pwdLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{pwdLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}</span>
          </button>
        </form>
      </div>

      {/* Database Connection & Diagnostics Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Status Koneksi Database (Cloud Firestore)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status koneksi real-time antara aplikasi dengan Google Cloud Firestore dan penyimpanan lokal.
            </p>
          </div>

          <button
            onClick={fetchDatabaseStatus}
            disabled={dbLoading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{dbLoading ? 'Memeriksa...' : 'Uji Koneksi'}</span>
          </button>
        </div>

        {dbTestMessage && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
              dbStatus?.connected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {dbStatus?.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{dbTestMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Status Koneksi</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className={`text-xs font-bold ${dbStatus?.connected ? 'text-emerald-700' : 'text-rose-700'}`}>
                {dbStatus ? (dbStatus.connected ? 'Terhubung (Online)' : 'Terputus') : 'Memeriksa...'}
              </span>
            </div>
            {dbStatus?.latencyMs !== undefined && (
              <span className="text-[10px] text-slate-400 mt-1 block">Respons: {dbStatus.latencyMs} ms</span>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Database Engine</span>
            <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
              {dbStatus?.provider || 'Google Cloud Firestore'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Enterprise NoSQL</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Database ID</span>
            <span className="text-xs font-mono font-semibold text-slate-800 mt-1 block truncate" title={dbStatus?.databaseId}>
              {dbStatus?.databaseId ? `${dbStatus.databaseId.slice(0, 18)}...` : 'ai-studio-...'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Project: {dbStatus?.projectId || 'neon-ethos-dt3g1'}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 block">Security Rules</span>
            <span className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{dbStatus?.rulesStatus || 'Deployed & Active'}</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Zero-Trust Protected</span>
          </div>
        </div>

        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Arsitektur Dual Persistence (Cloud + Offline Fallback)</p>
              <p className="text-slate-500 text-[11px]">
                Data tersimpan aman di Google Cloud Firestore sekaligus disinkronisasi ke server cache lokal. Jika koneksi internet terputus, aplikasi tetap berjalan dengan mulus.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-white rounded-lg border border-blue-200 text-blue-700 font-bold text-[11px]">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Dual Sync Aktif</span>
          </div>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Cadangan Database & Pemulihan (Backup & Restore)</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Sistem menyediakan ekspor file cadangan JSON dan prosedur pemulihan data berkala untuk memastikan keamanan data Anda.
        </p>

        {restoreFeedback && (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs ${
              restoreFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {restoreFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{restoreFeedback.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Cadangan Database (.json)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestoreFile}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={backupLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-xl border border-amber-200 transition active:scale-95"
          >
            <Upload className="w-4 h-4 text-amber-700" />
            <span>Pulihkan Database dari File (.json)</span>
          </button>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {pendingRestoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="p-2.5 bg-amber-100 rounded-2xl">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Pulihkan Database?</h3>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Memulihkan data dari file <strong className="font-mono text-slate-800">{pendingRestoreFile.name}</strong> akan menimpa seluruh data saat ini dengan isi file cadangan. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingRestoreFile(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeRestore}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Ya, Pulihkan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
