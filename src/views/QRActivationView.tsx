import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Search,
  Camera,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Save,
  PowerOff,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Printer,
  FileSpreadsheet,
  Archive,
  Eye,
} from 'lucide-react';
import { QRCodeItem } from '../types';
import { api } from '../lib/api';
import { QRScannerModal } from '../components/QRScannerModal';
import { QRStickerCard } from '../components/QRStickerCard';
import { PrintSheetModal } from '../components/PrintSheetModal';
import { downloadQRsAsZip, exportQRsAsCSV } from '../lib/bulkExport';

export const QRActivationView: React.FC = () => {
  const [qrList, setQrList] = useState<QRCodeItem[]>([]);
  const [selectedQR, setSelectedQR] = useState<QRCodeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionCount, setProvisionCount] = useState(10);
  const [provisionPrefix, setProvisionPrefix] = useState('Stiker Meja');

  // Bulk Export & Print Sheet States
  const [latestProvisionedBatch, setLatestProvisionedBatch] = useState<QRCodeItem[] | null>(null);
  const [printSheetOpen, setPrintSheetOpen] = useState(false);
  const [printSheetQRs, setPrintSheetQRs] = useState<QRCodeItem[]>([]);
  const [zipDownloading, setZipDownloading] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkExportModalOpen, setBulkExportModalOpen] = useState(false);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchQRCodes = async () => {
    setLoading(true);
    try {
      const data = await api.qr.list(
        searchQuery || undefined,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setQrList(data);

      // If a QR was selected, update its reference
      if (selectedQR) {
        const found = data.find((q) => q.public_id === selectedQR.public_id);
        if (found) {
          setSelectedQR(found);
          setNameInput(found.name || '');
          setDestinationInput(found.destination_url || '');
        }
      } else if (data.length > 0 && !selectedQR) {
        // Default select first item
        setSelectedQR(data[0]);
        setNameInput(data[0].name || '');
        setDestinationInput(data[0].destination_url || '');
      }
    } catch (err: any) {
      if (err?.message?.includes('Sesi')) return;
      console.warn('Failed to fetch QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, [statusFilter]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchQRCodes();
      return;
    }

    try {
      setLoading(true);
      // Attempt direct public_id fetch first
      const cleanId = searchQuery.trim().replace(/^.*\/r\//, '');
      const qr = await api.qr.getByPublicId(cleanId).catch(() => null);
      if (qr) {
        setSelectedQR(qr);
        setNameInput(qr.name || '');
        setDestinationInput(qr.destination_url || '');
        setFeedback({ type: 'success', message: `QR Code "${qr.public_id}" berhasil ditemukan.` });
      } else {
        fetchQRCodes();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQR = (qr: QRCodeItem) => {
    setSelectedQR(qr);
    setNameInput(qr.name || '');
    setDestinationInput(qr.destination_url || '');
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScanSuccess = async (publicId: string) => {
    setScannerOpen(false);
    setSearchQuery(publicId);
    try {
      setLoading(true);
      const qr = await api.qr.getByPublicId(publicId);
      setSelectedQR(qr);
      setNameInput(qr.name || '');
      setDestinationInput(qr.destination_url || '');
      setFeedback({ type: 'success', message: `QR Code "${publicId}" berhasil dipindai!` });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `ID "${publicId}" belum terdaftar di database. Silakan cetak batch baru terlebih dahulu.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQR) return;
    setFeedback(null);

    // Validate URL HTTPS
    if (!destinationInput.trim().toLowerCase().startsWith('https://')) {
      setFeedback({
        type: 'error',
        message: 'URL Google Review wajib menggunakan HTTPS yang valid (diawali https://).',
      });
      return;
    }

    setFormSubmitting(true);
    try {
      let updated: QRCodeItem;
      if (selectedQR.status === 'inactive') {
        updated = await api.qr.activate(selectedQR.public_id, destinationInput.trim(), nameInput.trim());
        setFeedback({
          type: 'success',
          message: `QR Code "${selectedQR.public_id}" BERHASIL DIAKTIVASI! Pengunjung sekarang dapat memberikan review.`,
        });
      } else {
        updated = await api.qr.updateDestination(
          selectedQR.public_id,
          destinationInput.trim(),
          nameInput.trim()
        );
        setFeedback({
          type: 'success',
          message: `Tujuan URL QR "${selectedQR.public_id}" berhasil diperbarui tanpa mencetak ulang stiker!`,
        });
      }
      setSelectedQR(updated);
      fetchQRCodes();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan perubahan QR Code.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  const handleDisableQR = async () => {
    if (!selectedQR) return;
    setConfirmDisableOpen(false);

    try {
      const disabled = await api.qr.disable(selectedQR.public_id, 'Dinonaktifkan oleh admin dari dashboard');
      setSelectedQR({ ...selectedQR, status: 'disabled' });
      setFeedback({
        type: 'success',
        message: `QR Code "${selectedQR.public_id}" berhasil dinonaktifkan. Pengunjung akan melihat halaman pemberitahuan.`,
      });
      fetchQRCodes();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menonaktifkan QR Code.' });
    }
  };

  const handleReactivateQR = async () => {
    if (!selectedQR) return;
    try {
      await api.qr.reactivate(selectedQR.public_id);
      setSelectedQR({ ...selectedQR, status: 'active' });
      setFeedback({
        type: 'success',
        message: `QR Code "${selectedQR.public_id}" berhasil diaktifkan kembali!`,
      });
      fetchQRCodes();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengaktifkan kembali QR Code.' });
    }
  };

  const handleProvisionBatch = async () => {
    try {
      setFormSubmitting(true);
      const newBatch = await api.qr.provision(provisionCount, provisionPrefix);
      setProvisionOpen(false);
      setLatestProvisionedBatch(newBatch);
      setFeedback({
        type: 'success',
        message: `Berhasil membuat ${newBatch.length} QR Code unik baru! Anda dapat langsung mengunduh ZIP atau mencetaknya sekarang.`,
      });
      fetchQRCodes();
      if (newBatch.length > 0) {
        handleSelectQR(newBatch[0]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal membuat batch QR Code.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDownloadZip = async (items: QRCodeItem[]) => {
    if (items.length === 0) return;
    setZipDownloading(true);
    setZipProgress({ current: 0, total: items.length });
    try {
      await downloadQRsAsZip(
        items,
        `SmartReview-QR-Batch-${items.length}pcs.zip`,
        (curr, tot) => setZipProgress({ current: curr, total: tot })
      );
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengunduh file ZIP.' });
    } finally {
      setZipDownloading(false);
      setZipProgress(null);
    }
  };

  const handleOpenPrintSheet = (items: QRCodeItem[]) => {
    if (items.length === 0) return;
    setPrintSheetQRs(items);
    setPrintSheetOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600" />
            <span>Aktivasi QR Code Dinamis</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola stiker QR fisik yang sudah dicetak dan ubah tujuan Google Review kapan saja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR Fisik</span>
          </button>

          <button
            onClick={() => setProvisionOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Cetak Batch Baru</span>
          </button>

          <button
            onClick={() => setBulkExportModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95 border border-slate-200"
          >
            <Archive className="w-4 h-4 text-blue-600" />
            <span>Unduh / Cetak Massal</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-start justify-between gap-3 text-xs sm:text-sm font-medium transition animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Batch Success Action Banner */}
      {latestProvisionedBatch && latestProvisionedBatch.length > 0 && (
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-3xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in zoom-in-95">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                Batch {latestProvisionedBatch.length} QR Code Baru Berhasil Dibuat!
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Setiap stiker sudah memiliki Public ID acak unik. Pilih cara mengunduh atau mencetak:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => handleDownloadZip(latestProvisionedBatch)}
              disabled={zipDownloading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {zipDownloading && zipProgress
                  ? `Mengemas (${zipProgress.current}/${zipProgress.total})...`
                  : `Unduh ZIP (${latestProvisionedBatch.length} PNG)`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenPrintSheet(latestProvisionedBatch)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Cetak Lembar A4</span>
            </button>

            <button
              type="button"
              onClick={() => exportQRsAsCSV(latestProvisionedBatch, `SmartReview-Batch-${latestProvisionedBatch.length}pcs.csv`)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xs transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setLatestProvisionedBatch(null)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Tutup banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Detail / Form & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Selected QR Management Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedQR ? (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
              {/* QR Header Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-mono font-bold text-sm border border-slate-200">
                    {selectedQR.public_id}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      {selectedQR.name || `QR Code #${selectedQR.public_id}`}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Public ID: {selectedQR.public_id}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(selectedQR.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Pill */}
                <div>
                  {selectedQR.status === 'active' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Aktif (Siap Pakai)
                    </span>
                  )}
                  {selectedQR.status === 'inactive' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Belum Diaktivasi
                    </span>
                  )}
                  {selectedQR.status === 'disabled' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Dinonaktifkan
                    </span>
                  )}
                </div>
              </div>

              {/* Scan Analytics Mini Banner */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Total Scan Ulasan</span>
                    <p className="text-sm font-black text-slate-900 leading-tight">
                      {(selectedQR.scan_count || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">kali</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 border-l border-slate-200/80 pl-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Terakhir Dipindai</span>
                    <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                      {selectedQR.last_scanned_at
                        ? new Date(selectedQR.last_scanned_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Belum pernah'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activation / Update Form */}
              <form onSubmit={handleActivateOrUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama / Label Penempatan QR
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Contoh: Akrilik Meja 3, Kasir Utama, Stand Depan"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Nama penanda untuk memudahkan admin mengidentifikasi letak stiker fisik ini.
                  </p>
                </div>

                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      URL Tujuan Google Review (Wajib HTTPS)
                    </label>
                  </div>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      required
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      placeholder="https://maps.app.goo.gl/... atau https://g.page/r/..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    />
                  </div>

                  {/* Helper Callout for Google Review Link */}
                  <div className="mt-2.5 p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-start gap-2 text-xs text-blue-900 leading-relaxed">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Tips Mendapatkan Link Google Review:</strong>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Buka Google Maps bisnis Anda &gt; Bagikan link ulasan pelanggan (contoh: <code>https://maps.app.goo.gl/...</code> atau <code>https://g.page/r/...</code>).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-sm transition disabled:opacity-60"
                  >
                    {formSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>
                          {selectedQR.status === 'inactive'
                            ? 'Aktivasi QR Code Sekarang'
                            : 'Perbarui URL Tujuan Review'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Disable or Reactivate Controls */}
                  {selectedQR.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => setConfirmDisableOpen(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs px-4 py-3 rounded-xl border border-rose-200 transition active:scale-95"
                    >
                      <PowerOff className="w-4 h-4" />
                      <span>Nonaktifkan QR</span>
                    </button>
                  )}

                  {selectedQR.status === 'disabled' && (
                    <button
                      type="button"
                      onClick={handleReactivateQR}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs px-4 py-3 rounded-xl border border-emerald-200 transition active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Aktifkan Kembali</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Live Test Redirect Link Box */}
              {selectedQR.status === 'active' && selectedQR.destination_url && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-emerald-900 block">Tautan Pengalihan Aktif:</span>
                    <span className="text-[11px] font-mono text-emerald-700 break-all block">
                      {typeof window !== 'undefined' ? `${window.location.origin}/r/${selectedQR.public_id}` : `/r/${selectedQR.public_id}`}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-md">
                      Mengarahkan ke: {selectedQR.destination_url}
                    </span>
                  </div>
                  <a
                    href={`/r/${selectedQR.public_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95"
                  >
                    <span>Uji Buka Redirect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Dynamic Redirect Explainer */}
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Keuntungan QR Dinamis SmartReview:</span>
                </div>
                <p>
                  Stiker QR fisik yang sudah dicetak di meja atau kasir mengarah ke{' '}
                  <code className="text-blue-600 font-mono bg-blue-50 px-1 py-0.5 rounded">
                    /r/{selectedQR.public_id}
                  </code>
                  . Kapan pun link Google Review bisnis berubah, Anda cukup memperbarui URL di formulir atas{' '}
                  <strong>tanpa perlu mencetak ulang stiker fisik!</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center">
              <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Pilih atau Scan QR Code</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Pilih dari daftar di sebelah kanan atau pindai stiker fisik dengan kamera untuk memulai aktivasi.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Physical Sticker Preview & QR Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Physical Sticker Card Preview */}
          {selectedQR && (
            <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Preview Stiker Fisik</span>
                <span className="text-[10px] text-blue-600 font-semibold">Siap Cetak</span>
              </div>
              <QRStickerCard qr={selectedQR} size={160} />
            </div>
          )}

          {/* Directory & Search */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Daftar QR Terdaftar</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">{qrList.length} Total</span>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID (contoh: a8K2mP) atau nama..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </form>

            {/* Filter Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'active', label: 'Aktif' },
                { id: 'inactive', label: 'Belum Aktif' },
                { id: 'disabled', label: 'Nonaktif' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                    statusFilter === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* QR List Items */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Memuat data QR...
                </div>
              ) : qrList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ada QR Code yang cocok dengan pencarian.
                </div>
              ) : (
                qrList.map((qr) => {
                  const isSelected = selectedQR?.public_id === qr.public_id;
                  return (
                    <div
                      key={qr.id}
                      onClick={() => handleSelectQR(qr)}
                      className={`p-3 rounded-2xl cursor-pointer transition border flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400'
                          : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            qr.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : qr.status === 'inactive'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {qr.public_id.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate">
                            {qr.name || `QR #${qr.public_id}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              ID: {qr.public_id}
                            </span>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" />
                              {qr.scan_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {qr.status === 'active' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Aktif" />
                        )}
                        {qr.status === 'inactive' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" title="Belum Aktif" />
                        )}
                        {qr.status === 'disabled' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" title="Dinonaktifkan" />
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Batch Provisioning Modal */}
      {provisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Cetak Batch QR Fisik Baru</span>
              </h3>
              <button
                onClick={() => setProvisionOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Generate ID acak unik untuk dicetak ke stiker fisik. QR yang dibuat berstatus{' '}
              <strong className="text-amber-700">inactive</strong> sampai admin mengaktifkannya.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah QR yang Dibuat
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 25].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setProvisionCount(cnt)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        provisionCount === cnt
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cnt} Pcs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prefix Nama / Batch
                </label>
                <input
                  type="text"
                  value={provisionPrefix}
                  onChange={(e) => setProvisionPrefix(e.target.value)}
                  placeholder="Contoh: Stiker Meja Batch B"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleProvisionBatch}
                disabled={formSubmitting}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {formSubmitting ? 'Memproses...' : `Buat ${provisionCount} QR Baru`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Disable Confirmation Modal */}
      {confirmDisableOpen && selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-2xl">
                <PowerOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Nonaktifkan QR Code?</h3>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              QR Code dengan ID <strong className="font-mono text-slate-800">{selectedQR.public_id}</strong> akan dinonaktifkan. Pengunjung yang memindai tidak akan diarahkan ke Google Review sampai Anda mengaktifkannya kembali.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDisableOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDisableQR}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Ya, Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet A4 Modal */}
      <PrintSheetModal
        isOpen={printSheetOpen}
        onClose={() => setPrintSheetOpen(false)}
        qrs={printSheetQRs}
        title={`Lembar Cetak Stiker QR (${printSheetQRs.length} Stiker)`}
      />

      {/* Bulk Export & Download Selection Dialog */}
      {bulkExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Unduh & Cetak Massal QR</h3>
              </div>
              <button
                onClick={() => setBulkExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Pilih kelompok QR yang ingin diunduh dalam file ZIP (murni gambar PNG QR Code resolusi tinggi 1024px tanpa bingkai) atau cetak lembar stiker A4:
              </p>

              {/* Group Option Cards */}
              <div className="space-y-2.5">
                {/* 1. All Inactive (Ready to print) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      Stiker Belum Diaktivasi ({qrList.filter((q) => q.status === 'inactive').length} QR)
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Siap Cetak
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Stiker yang sudah memiliki ID unik tetapi belum ditempatkan atau dihubungkan ke URL review.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={qrList.filter((q) => q.status === 'inactive').length === 0 || zipDownloading}
                      onClick={() => {
                        setBulkExportModalOpen(false);
                        handleDownloadZip(qrList.filter((q) => q.status === 'inactive'));
                      }}
                      className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh ZIP</span>
                    </button>
                    <button
                      type="button"
                      disabled={qrList.filter((q) => q.status === 'inactive').length === 0}
                      onClick={() => {
                        setBulkExportModalOpen(false);
                        handleOpenPrintSheet(qrList.filter((q) => q.status === 'inactive'));
                      }}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Cetak A4</span>
                    </button>
                  </div>
                </div>

                {/* 2. All Registered QRs */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      Semua QR Code di Database ({qrList.length} QR)
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                      Total
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Seluruh QR Code aktif, nonaktif, dan belum aktif untuk arsip atau cetak ulang lengkap.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={qrList.length === 0 || zipDownloading}
                      onClick={() => {
                        setBulkExportModalOpen(false);
                        handleDownloadZip(qrList);
                      }}
                      className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh ZIP</span>
                    </button>
                    <button
                      type="button"
                      disabled={qrList.length === 0}
                      onClick={() => {
                        setBulkExportModalOpen(false);
                        handleOpenPrintSheet(qrList);
                      }}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Cetak A4</span>
                    </button>
                    <button
                      type="button"
                      disabled={qrList.length === 0}
                      onClick={() => {
                        exportQRsAsCSV(qrList);
                      }}
                      className="py-1.5 px-3 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition"
                      title="Export CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress info if zip is running */}
              {zipDownloading && zipProgress && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs text-blue-900 animate-pulse font-semibold">
                  Sedang memproses dan mengemas file ({zipProgress.current} dari {zipProgress.total})...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
