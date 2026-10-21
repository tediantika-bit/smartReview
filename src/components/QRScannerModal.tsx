import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, SwitchCamera, Upload, AlertCircle, ArrowRight } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (publicId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to extract public ID from url or raw string
  const extractPublicId = (raw: string): string => {
    let clean = raw.trim();
    if (clean.includes('/r/')) {
      const parts = clean.split('/r/');
      clean = parts[parts.length - 1].split('?')[0].split('#')[0].trim();
    }
    return clean;
  };

  const handleDetected = (decodedText: string) => {
    const id = extractPublicId(decodedText);
    stopScanner();
    onScanSuccess(id);
  };

  const startScanner = async () => {
    setScannerError(null);
    try {
      // Check available cameras
      const devices = await Html5Qrcode.getCameras().catch(() => []);
      if (devices && devices.length > 1) {
        setHasMultipleCameras(true);
      }

      const qrScanner = new Html5Qrcode('qr-reader-viewport');
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // ignore frame decode misses
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera scan failed to start:', err);
      setIsScanning(false);
      setScannerError(
        'Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan input ID manual atau unggah foto QR.'
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // small delay to let modal DOM mount
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, facingMode]);

  const toggleCameraFacing = async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const qrScanner = new Html5Qrcode('qr-reader-viewport-file');
      const result = await qrScanner.scanFile(file, true);
      qrScanner.clear();
      handleDetected(result);
    } catch (err) {
      setScannerError('Tidak dapat mendeteksi QR Code dari gambar yang dipilih.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleDetected(manualInput);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Pindai QR Code Fisik</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Live Scanner Container */}
          <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
            <div id="qr-reader-viewport" className="w-full h-full object-cover"></div>
            <div id="qr-reader-viewport-file" className="hidden"></div>

            {/* Target Overlay Framing */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-blue-500 rounded-2xl relative animate-pulse shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br"></div>
                  {/* Laser Scan line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_#3b82f6] top-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            )}

            {/* Controls Bar */}
            {isScanning && hasMultipleCameras && (
              <button
                onClick={toggleCameraFacing}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-xl backdrop-blur-md hover:bg-black/80 transition"
                title="Ganti Kamera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Scanner Error Fallback */}
          {scannerError && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>{scannerError}</div>
            </div>
          )}

          {/* Alternative: Image File Upload */}
          <div className="mt-3 flex items-center justify-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1 px-3 rounded-lg hover:bg-blue-50 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah Foto QR dari Galeri
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">Atau Masukkan ID Manual</span>
            </div>
          </div>

          {/* Manual ID Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Contoh: a8K2mP"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <span>Cari</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
