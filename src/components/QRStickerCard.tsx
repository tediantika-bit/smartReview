import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, ExternalLink, Copy, Check, Star } from 'lucide-react';
import { QRCodeItem } from '../types';

interface QRStickerCardProps {
  qr: QRCodeItem;
  size?: number;
  showActions?: boolean;
}

export const QRStickerCard: React.FC<QRStickerCardProps> = ({ qr, size = 180, showActions = true }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Full redirect link
  const redirectUrl = `${window.location.origin}/r/${qr.public_id}`;

  useEffect(() => {
    QRCode.toDataURL(redirectUrl, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR:', err));
  }, [redirectUrl, size]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(redirectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = redirectUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadSticker = async () => {
    try {
      const highResDataUrl = await QRCode.toDataURL(redirectUrl, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      const a = document.createElement('a');
      a.href = highResDataUrl;
      a.download = `QR_${qr.public_id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      if (qrDataUrl) {
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `QR_${qr.public_id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Printable Physical Sticker Frame */}
      <div
        ref={cardRef}
        className="w-full max-w-[280px] bg-white rounded-3xl p-5 shadow-lg border border-slate-200 text-center relative overflow-hidden transition-all hover:shadow-xl"
      >
        {/* Top Decorative Header */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-current" />
            ))}
          </div>
        </div>

        <h3 className="font-bold text-slate-900 text-sm tracking-tight mb-0.5">
          {qr.name || 'Beri Ulasan Kami'}
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">Pindai QR dengan kamera HP Anda</p>

        {/* QR Code Canvas Frame */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto shadow-inner">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code ${qr.public_id}`}
              className="rounded-xl shadow-xs"
              style={{ width: `${size}px`, height: `${size}px` }}
            />
          ) : (
            <div
              className="flex items-center justify-center text-xs text-slate-400 animate-pulse bg-slate-200 rounded-xl"
              style={{ width: `${size}px`, height: `${size}px` }}
            >
              Memuat QR...
            </div>
          )}
        </div>

        {/* Public ID Pill */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID</span>
          <span className="bg-slate-100 text-slate-800 font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border border-slate-200">
            {qr.public_id}
          </span>
        </div>

        <div className="mt-2 text-[10px] text-blue-600 font-medium truncate px-2 font-mono">
          {typeof window !== 'undefined' ? `${window.location.host}/r/${qr.public_id}` : `r/${qr.public_id}`}
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition active:scale-95"
            title="Salin tautan redirect"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin URL'}</span>
          </button>

          <button
            onClick={downloadSticker}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-xl transition active:scale-95"
            title="Unduh file PNG QR Code"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh QR</span>
          </button>

          <a
            href={redirectUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition active:scale-95"
            title="Buka redirect langsung di tab baru"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Tes</span>
          </a>
        </div>
      )}
    </div>
  );
};
