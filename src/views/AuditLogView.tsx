import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, ArrowDownRight, RefreshCw, FileText } from 'lucide-react';
import { AuditLogItem } from '../types';
import { api } from '../lib/api';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.audit.list(200);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        log.admin_email.toLowerCase().includes(q) ||
        JSON.stringify(log.details).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('ACTIVATED') || action.includes('SUCCESS') || action.includes('WRITTEN')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('UPDATED')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (action.includes('DISABLED') || action.includes('FAILED')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (action.includes('PROVISIONED')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>Audit Trail & Riwayat Perubahan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log mutlak semua perubahan URL tujuan, aktivasi stiker, penonaktifan, dan penulisan tag NFC.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, tindakan, email admin, atau kata kunci..."
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 text-xs sm:w-auto">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'QR_ACTIVATED', label: 'Aktivasi QR' },
              { id: 'QR_DESTINATION_UPDATED', label: 'Ubah Tujuan' },
              { id: 'QR_DISABLED', label: 'Nonaktif QR' },
              { id: 'NFC_TAG_WRITTEN', label: 'Tulis NFC' },
              { id: 'QR_PROVISIONED', label: 'Cetak Baru' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterAction(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterAction === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Memuat log audit...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada catatan audit yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Waktu</th>
                  <th className="px-5 py-3.5">Tindakan</th>
                  <th className="px-5 py-3.5">Target Entitas</th>
                  <th className="px-5 py-3.5">Admin Pelaksana</th>
                  <th className="px-5 py-3.5">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-slate-800 text-[11px]">
                      {log.entity_id}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.admin_email}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px] max-w-xs truncate">
                      {log.details?.destination_url ? (
                        <span className="text-blue-600 truncate block">
                          Tujuan: {log.details.destination_url}
                        </span>
                      ) : log.details?.new_destination ? (
                        <span className="text-blue-600 truncate block">
                          Baru: {log.details.new_destination}
                        </span>
                      ) : (
                        JSON.stringify(log.details)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Rincian Log Audit</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">ID Log</span>
                <span className="font-mono text-slate-700">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Aksi</span>
                <span className="font-bold font-mono text-slate-900">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Target ID</span>
                <span className="font-mono font-bold text-blue-600">{selectedLog.entity_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Admin</span>
                <span className="text-slate-700">{selectedLog.admin_email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Waktu</span>
                <span className="text-slate-700">{new Date(selectedLog.created_at).toLocaleString('id-ID')}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 font-bold block mb-1">Payload Rincian (JSON):</span>
                <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-2xl overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="mt-5 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
