import React, { useEffect, useState } from 'react';
import {
  Radio,
  Wifi,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Layers,
  ArrowRight,
  RotateCw,
  Clock,
  ExternalLink,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { NFCTagItem, QRCodeItem } from '../types';
import { api } from '../lib/api';

export const NFCWriterView: React.FC = () => {
  const [tags, setTags] = useState<NFCTagItem[]>([]);
  const [activeQRs, setActiveQRs] = useState<QRCodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [mode, setMode] = useState<'direct' | 'redirect'>('redirect');
  const [tagName, setTagName] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [selectedPublicId, setSelectedPublicId] = useState('');

  // Hardware Web NFC State
  const [hasWebNFC, setHasWebNFC] = useState<boolean>(false);
  const [writeState, setWriteState] = useState<'idle' | 'waiting_tag' | 'writing' | 'success' | 'error'>('idle');
  const [writeMessage, setWriteMessage] = useState<string>('');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);

  useEffect(() => {
    // Detect Web NFC API support
    const supported = typeof window !== 'undefined' && 'NDEFReader' in window;
    setHasWebNFC(supported);
    if (!supported) {
      setIsSimulatorMode(true);
    }

    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tagList, qrList] = await Promise.all([
        api.nfc.list(),
        api.qr.list(undefined, 'active'),
      ]);
      setTags(tagList);
      setActiveQRs(qrList);

      if (qrList.length > 0 && !selectedPublicId) {
        setSelectedPublicId(qrList[0].public_id);
      }
    } catch (err: any) {
      if (err?.message?.includes('Sesi')) return;
      console.warn('Failed to load NFC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTargetUrlToWrite = (): string => {
    if (mode === 'direct') {
      return directUrl.trim();
    }
    // Mode redirect uses SmartReview URL
    const origin = window.location.origin;
    return `${origin}/r/${selectedPublicId}`;
  };

  const startNFCWrite = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = getTargetUrlToWrite();

    if (!tagName.trim()) {
      setWriteState('error');
      setWriteMessage('Nama tag NFC wajib diisi.');
      return;
    }

    if (!targetUrl.startsWith('https://')) {
      setWriteState('error');
      setWriteMessage('URL tujuan wajib diawali dengan https://');
      return;
    }

    setWriteState('waiting_tag');
    setWriteMessage('Dekatkan chip atau stiker NFC ke bagian belakang HP Anda...');

    try {
      // Step 1: Create record in database as pending
      const createdTag = await api.nfc.create({
        name: tagName.trim(),
        mode,
        destination_url: mode === 'direct' ? directUrl.trim() : null,
        public_id: mode === 'redirect' ? selectedPublicId : null,
      });

      setActiveTagId(createdTag.id);

      // Step 2: Write to physical NFC chip via Web NFC API (or Simulator)
      if (hasWebNFC && !isSimulatorMode) {
        // Real Web NFC API
        const NDEFReaderClass = (window as any).NDEFReader;
        const ndef = new NDEFReaderClass();

        // Start write
        await ndef.write({
          records: [
            {
              recordType: 'url',
              data: targetUrl,
            },
          ],
        });

        // Step 3: Browser confirmed write success
        setWriteState('success');
        setWriteMessage(`Berhasil menulis URL ke tag NFC: ${targetUrl}`);
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        // Confirm to backend
        await api.nfc.confirmWrite(createdTag.id, 'success', {
          url: targetUrl,
          mode,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Desktop / Simulator Mode
        setWriteState('writing');
        setWriteMessage(`[Mode Simulasi] Menghubungkan ke tag NFC virtual... Menulis URL: ${targetUrl}`);

        await new Promise((resolve) => setTimeout(resolve, 1800));

        setWriteState('success');
        setWriteMessage(`[Simulasi Berhasil] URL "${targetUrl}" berhasil ditulis ke tag NFC virtual.`);

        await api.nfc.confirmWrite(createdTag.id, 'success', {
          simulated: true,
          url: targetUrl,
          mode,
          timestamp: new Date().toISOString(),
        });
      }

      loadData();
    } catch (err: any) {
      console.error('NFC Write Error:', err);
      setWriteState('error');

      let errorExplanation = 'Penulisan NFC gagal. ';
      if (err.name === 'NotAllowedError') {
        errorExplanation += 'Izin akses NFC ditolak oleh pengguna atau sistem.';
      } else if (err.name === 'NotSupportedError') {
        errorExplanation += 'Tag NFC tidak kompatibel dengan format NDEF atau terkunci (read-only).';
      } else {
        errorExplanation += err.message || 'Tag terlepas terlalu cepat sebelum proses penulisan selesai.';
      }
      setWriteMessage(errorExplanation);

      if (activeTagId) {
        await api.nfc.confirmWrite(activeTagId, 'failed', { error: err.message }).catch(() => {});
      }
    }
  };

  const handleRewriteTag = async (tag: NFCTagItem) => {
    setTagName(tag.name);
    setMode(tag.mode);
    if (tag.mode === 'direct' && tag.destination_url) {
      setDirectUrl(tag.destination_url);
    } else if (tag.mode === 'redirect' && tag.public_id) {
      setSelectedPublicId(tag.public_id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-blue-600" />
            <span>NFC Writer Google Review</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tulis tautan Google Review langsung ke chip / kartu NFC (Direct atau Redirect dinamis).
          </p>
        </div>

        {/* Hardware Status Pill */}
        <div className="flex items-center gap-2">
          {hasWebNFC ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Web NFC Aktif & Didukung</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Simulator Mode (Desktop / iOS)</span>
            </div>
          )}
        </div>
      </div>

      {/* Hardware Capability Notice */}
      {!hasWebNFC && (
        <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold">Informasi Kompatibilitas Web NFC:</h4>
            <p className="text-amber-800 leading-relaxed">
              Penulisan fisik NFC membutuhkan browser dengan dukungan <strong>Web NFC API</strong> (biasanya Chrome di HP Android dengan chip NFC aktif dan HTTPS).
              Pada perangkat desktop atau browser yang tidak mendukung, Anda dapat menggunakan <strong>Mode Simulasi</strong> di bawah untuk menguji alur penulisan, mencatat inventaris tag, dan memverifikasi redirect!
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Writer & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: NFC Writer Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
              <Radio className="w-5 h-5 text-blue-600" />
              <span>Formulir Penulisan Tag NFC</span>
            </h2>

            {/* Mode Selection Pill */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Mode Penulisan NFC
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Redirect Mode */}
                <div
                  onClick={() => setMode('redirect')}
                  className={`p-4 rounded-2xl cursor-pointer border transition ${
                    mode === 'redirect'
                      ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">Mode Redirect (Direkomendasikan)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">Dinamis</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Menulis URL SmartReview (<code>/r/:public_id</code>). Tujuan Google Review bisa diubah kapan saja dari dashboard tanpa menulis ulang tag fisik.
                  </p>
                </div>

                {/* Direct Mode */}
                <div
                  onClick={() => setMode('direct')}
                  className={`p-4 rounded-2xl cursor-pointer border transition ${
                    mode === 'direct'
                      ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">Mode Direct</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Langsung</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Menulis URL Google Review asli langsung ke chip NFC. Perubahan tujuan di masa depan mengharuskan tag ditulis ulang secara fisik.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Inputs */}
            <form onSubmit={startNFCWrite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama / Lokasi Tag NFC
                </label>
                <input
                  type="text"
                  required
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Contoh: Kartu Kasir 1, Akrilik Meja Bar, Stiker Pintu Masuk"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
                />
              </div>

              {/* Mode Specific Inputs */}
              {mode === 'redirect' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pilih Tautan Redirect (Public ID)
                  </label>
                  {activeQRs.length > 0 ? (
                    <select
                      value={selectedPublicId}
                      onChange={(e) => setSelectedPublicId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
                    >
                      {activeQRs.map((qr) => (
                        <option key={qr.public_id} value={qr.public_id}>
                          [{qr.public_id}] {qr.name || 'QR Code'} &rarr; {qr.destination_url}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      Belum ada QR Code aktif. Silakan aktivasi QR Code terlebih dahulu pada tab "Aktivasi QR".
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    URL yang akan ditulis ke tag NFC:{' '}
                    <code className="text-blue-600 font-mono font-semibold">
                      {window.location.origin}/r/{selectedPublicId || 'public_id'}
                    </code>
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    URL Google Review Langsung (Wajib HTTPS)
                  </label>
                  <input
                    type="url"
                    required
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/... atau https://g.page/r/..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Pelanggan yang menempelkan HP ke NFC akan langsung membuka URL ini.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={writeState === 'waiting_tag' || writeState === 'writing'}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md shadow-blue-600/20 transition disabled:opacity-60"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                <span>
                  {hasWebNFC
                    ? 'Mulai Menulis ke Tag NFC'
                    : 'Uji Penulisan Tag (Mode Simulasi)'}
                </span>
              </button>
            </form>

            {/* Live Writing Interaction Modal / Card */}
            {writeState !== 'idle' && (
              <div
                className={`p-5 rounded-2xl border transition animate-in zoom-in-95 ${
                  writeState === 'waiting_tag' || writeState === 'writing'
                    ? 'bg-blue-50/90 border-blue-300 text-blue-900'
                    : writeState === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {writeState === 'waiting_tag' && (
                      <div className="p-2.5 bg-blue-600 text-white rounded-2xl animate-bounce">
                        <Smartphone className="w-6 h-6" />
                      </div>
                    )}
                    {writeState === 'writing' && (
                      <div className="p-2.5 bg-blue-600 text-white rounded-2xl animate-spin">
                        <RotateCw className="w-6 h-6" />
                      </div>
                    )}
                    {writeState === 'success' && (
                      <div className="p-2.5 bg-emerald-600 text-white rounded-2xl">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    )}
                    {writeState === 'error' && (
                      <div className="p-2.5 bg-rose-600 text-white rounded-2xl">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-sm">
                        {writeState === 'waiting_tag' && 'Menunggu Tag NFC...'}
                        {writeState === 'writing' && 'Sedang Menulis Data...'}
                        {writeState === 'success' && 'Penulisan NFC Berhasil!'}
                        {writeState === 'error' && 'Penulisan Gagal'}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed">{writeMessage}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setWriteState('idle')}
                    className="text-xs font-semibold px-2 py-1 bg-white/70 hover:bg-white rounded-lg transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Registered NFC Tags Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Daftar Tag NFC Tercatat</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">{tags.length} Tag</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Memuat riwayat NFC...
              </div>
            ) : tags.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada tag NFC yang tercatat. Tulis tag baru menggunakan formulir di sebelah kiri.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{tag.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              tag.mode === 'redirect'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            Mode {tag.mode}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tag.write_status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tag.write_status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tag.write_status === 'success'
                              ? 'Tertulis'
                              : tag.write_status === 'failed'
                              ? 'Gagal'
                              : 'Pending'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRewriteTag(tag)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        Tulis Ulang
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono truncate bg-white p-2 rounded-xl border border-slate-100">
                      {tag.mode === 'redirect'
                        ? `${window.location.origin}/r/${tag.public_id || ''}`
                        : tag.destination_url}
                    </div>

                    {tag.last_written_at && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          Ditulis: {new Date(tag.last_written_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
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
