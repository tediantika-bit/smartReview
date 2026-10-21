import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Star, FileText, Check, LayoutGrid } from 'lucide-react';
import { QRCodeItem } from '../types';

interface PrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrs: QRCodeItem[];
  title?: string;
}

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({
  isOpen,
  onClose,
  qrs,
  title = 'Lembar Cetak Stiker QR (A4)',
}) => {
  const [qrDataMap, setQrDataMap] = useState<Record<string, string>>({});
  const [columns, setColumns] = useState<2 | 3>(2);
  const origin = window.location.origin;

  useEffect(() => {
    if (!isOpen || qrs.length === 0) return;

    let isMounted = true;
    const generateAll = async () => {
      const map: Record<string, string> = {};
      for (const qr of qrs) {
        try {
          const url = await QRCode.toDataURL(`${origin}/r/${qr.public_id}`, {
            width: 300,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          map[qr.public_id] = url;
        } catch (e) {
          console.error('Failed to generate QR for print:', e);
        }
      }
      if (isMounted) setQrDataMap(map);
    };

    generateAll();
    return () => {
      isMounted = false;
    };
  }, [isOpen, qrs, origin]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Screen Header Controls (Hidden on Print) */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Total {qrs.length} stiker siap diprint ke kertas A4 atau disimpan ke PDF.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setColumns(2)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  columns === 2 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2 Kolom (Besar)
              </button>
              <button
                type="button"
                onClick={() => setColumns(3)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  columns === 3 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3 Kolom (Kompak)
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          {/* Simulated A4 Sheet */}
          <div className="max-w-[794px] mx-auto bg-white p-6 shadow-sm border border-slate-200 rounded-2xl print:border-none print:shadow-none print:p-2 print:max-w-none">
            <div
              className={`grid gap-4 ${
                columns === 2 ? 'grid-cols-2' : 'grid-cols-3'
              } print:grid print:gap-4`}
              style={{
                gridTemplateColumns: columns === 2 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
              }}
            >
              {qrs.map((qr) => {
                const qrImg = qrDataMap[qr.public_id];
                return (
                  <div
                    key={qr.id}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-white flex flex-col items-center text-center relative print:break-inside-avoid print:border-dashed print:border-slate-400"
                  >
                    {/* Cut scissor icon badge */}
                    <div className="absolute -top-2.5 right-3 bg-white px-1.5 text-[10px] text-slate-400 print:text-black flex items-center gap-1 font-mono">
                      ✂ garis potong
                    </div>

                    {/* Top Stars */}
                    <div className="flex items-center gap-1 text-amber-400 print:text-black mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight mb-0.5">
                      Beri Ulasan Kami
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] mb-2">
                      {qr.name || 'Pindai dengan Kamera HP'}
                    </p>

                    {/* QR Code Canvas Frame */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl my-1 flex items-center justify-center">
                      {qrImg ? (
                        <img
                          src={qrImg}
                          alt={`QR ${qr.public_id}`}
                          className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                        />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-400">
                          Memuat...
                        </div>
                      )}
                    </div>

                    {/* Public ID Box */}
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase text-slate-400">ID:</span>
                      <span className="bg-slate-100 print:bg-transparent text-slate-900 font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-200 print:border-black">
                        {qr.public_id}
                      </span>
                    </div>

                    <div className="mt-1 text-[9px] font-mono text-blue-600 print:text-black">
                      smartreview.id/r/{qr.public_id}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
