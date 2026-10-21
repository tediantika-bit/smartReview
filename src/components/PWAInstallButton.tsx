import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'nav' | 'card' }> = ({ variant = 'nav' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, show confirmation badge if card variant
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Aplikasi SmartReview sudah terpasang sebagai PWA di perangkat Anda.</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'card') {
      return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Pasang SmartReview ke HP</h4>
              <p className="text-xs text-slate-600">Akses cepat dari layar utama HP tanpa buka browser manual.</p>
            </div>
          </div>
          <button
            onClick={install}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Install PWA
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
        title="Pasang aplikasi ke layar utama"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'card' ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 text-white rounded-xl shadow-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Pasang di iPhone / iPad</h4>
                <p className="text-xs text-slate-600">Gunakan fitur Add to Home Screen di Safari.</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
            >
              <Download className="w-4 h-4" />
              Petunjuk iOS
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <Download className="w-3 h-3" />
            <span>Install iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-slate-900">Cara Pasang di iOS (Safari)</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="mt-2 space-y-2.5 text-xs text-slate-600 leading-relaxed list-decimal list-inside">
                <li>Buka aplikasi ini menggunakan browser <strong>Safari</strong>.</li>
                <li>Ketuk ikon <strong>Bagikan / Share</strong> (kotak dengan panah ke atas di bagian bawah).</li>
                <li>Gulir ke bawah dan ketuk <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
