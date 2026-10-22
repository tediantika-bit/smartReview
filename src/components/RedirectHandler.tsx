import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { firestoreClient } from '../lib/firestoreClient';
import { AlertCircle, QrCode, ExternalLink, RefreshCw, XCircle } from 'lucide-react';

export const RedirectHandler: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'inactive' | 'disabled' | 'not_found'>('loading');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [publicId, setPublicId] = useState<string>('');

  useEffect(() => {
    const path = window.location.pathname;
    const cleanId = path.replace(/^\/r\//, '').split('/')[0].split('?')[0].trim();
    setPublicId(cleanId);

    if (!cleanId) {
      setStatus('not_found');
      return;
    }

    const resolveRedirect = async () => {
      try {
        // Direct query to Google Cloud Firestore
        const snap = await getDoc(doc(db, 'redirect_links', cleanId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'active' && data.destination_url) {
            setStatus('redirecting');
            setTargetUrl(data.destination_url);

            // Record scan analytics event in background
            const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
            const lowerUA = ua.toLowerCase();
            let device: 'android' | 'ios' | 'desktop' | 'other' = 'other';
            if (lowerUA.includes('android')) device = 'android';
            else if (lowerUA.includes('iphone') || lowerUA.includes('ipad') || lowerUA.includes('ipod')) device = 'ios';
            else if ((lowerUA.includes('windows') || lowerUA.includes('macintosh') || lowerUA.includes('linux')) && !lowerUA.includes('mobile')) device = 'desktop';

            firestoreClient.recordScanClient(cleanId, device, ua).catch(() => {});

            // Instant redirect
            window.location.replace(data.destination_url);
            return;
          } else if (data.status === 'disabled') {
            setStatus('disabled');
            return;
          } else {
            setStatus('inactive');
            return;
          }
        } else {
          setStatus('not_found');
        }
      } catch (err) {
        console.warn('Direct Firestore redirect check failed, retrying via server:', err);
        // Fallback: reload to allow server 302 redirect if available
        setStatus('not_found');
      }
    };

    resolveRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-100 text-center animate-in fade-in zoom-in-95">
        {status === 'loading' && (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
              <QrCode className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Menghubungkan ke Google Review...</h2>
            <p className="text-xs text-slate-500">Memeriksa tautan pengalihan cerdas SmartReview</p>
          </div>
        )}

        {status === 'redirecting' && (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
              <ExternalLink className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Mengalihkan ke Google Review...</h2>
            <p className="text-xs text-slate-500">Jika halaman tidak terbuka otomatis dalam beberapa detik:</p>
            {targetUrl && (
              <a
                href={targetUrl}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-blue-700 transition"
              >
                <span>Klik di Sini untuk Membuka</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {status === 'inactive' && (
          <div className="py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-600">
              ID: {publicId}
            </span>
            <h2 className="text-lg font-bold text-slate-900">QR Belum Diaktivasi</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              QR Code atau tag NFC ini telah terdaftar tetapi belum diaktifkan oleh pemilik usaha. Silakan hubungi pengelola untuk mengaktifkan stiker ini.
            </p>
            <div className="pt-3">
              <a
                href="/"
                className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Buka Portal Admin SmartReview
              </a>
            </div>
          </div>
        )}

        {status === 'disabled' && (
          <div className="py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-7 h-7" />
            </div>
            <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-600">
              ID: {publicId}
            </span>
            <h2 className="text-lg font-bold text-slate-900">Tautan Dinonaktifkan</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tautan Google Review untuk stiker ini sedang dinonaktifkan sementara oleh pemilik usaha.
            </p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <QrCode className="w-7 h-7" />
            </div>
            <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-600">
              ID: {publicId || '-'}
            </span>
            <h2 className="text-lg font-bold text-slate-900">Tautan Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              QR Code atau tag NFC ini belum terdaftar di sistem SmartReview. Pastikan kode yang dipindai benar.
            </p>
            <div className="pt-3">
              <a
                href="/"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          SmartReview — Dynamic Review Redirection
        </div>
      </div>
    </div>
  );
};
