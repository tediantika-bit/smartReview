import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { QRCodeItem, NFCTagItem, DashboardStats, AuditLogItem, ScanAnalyticsSummary, ScanEventItem } from '../types';

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generatePublicId(length = 6): string {
  const chars = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
}

const LOCAL_QR_KEY = 'smartreview_local_qrs';

function getLocalQRs(): QRCodeItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_QR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalQRs(qrs: QRCodeItem[]) {
  try {
    localStorage.setItem(LOCAL_QR_KEY, JSON.stringify(qrs));
  } catch {
    // ignore
  }
}

export const firestoreClient = {
  // Provision new batch of physical QR codes directly to Cloud Firestore
  async provisionBatch(count: number, namePrefix = 'QR Sticker'): Promise<QRCodeItem[]> {
    const safeCount = Math.min(Math.max(count || 1, 1), 50);
    const now = new Date().toISOString();
    const newItems: QRCodeItem[] = [];

    for (let i = 0; i < safeCount; i++) {
      const publicId = generatePublicId(6);
      const redirectId = safeUUID();
      const qrId = safeUUID();
      const name = safeCount === 1 ? namePrefix : `${namePrefix} #${i + 1}`;

      const qrRecord: QRCodeItem = {
        id: qrId,
        redirect_id: redirectId,
        public_id: publicId,
        name,
        status: 'inactive',
        destination_url: '',
        activated_at: null,
        created_at: now,
        updated_at: now,
      };

      const redirectRecord = {
        id: redirectId,
        public_id: publicId,
        destination_url: '',
        status: 'inactive',
        created_at: now,
        updated_at: now,
      };

      // Save directly to Cloud Firestore
      try {
        await Promise.all([
          setDoc(doc(db, 'qr_codes', qrId), qrRecord),
          setDoc(doc(db, 'redirect_links', publicId), redirectRecord),
        ]);
      } catch (fsErr) {
        console.warn('Firestore write warning:', fsErr);
      }

      newItems.push(qrRecord);
    }

    // Update local cache
    const existing = getLocalQRs();
    saveLocalQRs([...newItems, ...existing]);

    return newItems;
  },

  // List all QR codes from Firestore with local cache merge
  async listQRs(search?: string, status?: string): Promise<QRCodeItem[]> {
    let list: QRCodeItem[] = [];

    try {
      const [qrSnap, linkSnap] = await Promise.all([
        getDocs(collection(db, 'qr_codes')),
        getDocs(collection(db, 'redirect_links')),
      ]);
      const linkMap = new Map<string, string>();
      linkSnap.forEach((d) => {
        const data = d.data();
        if (data.public_id && data.destination_url) {
          linkMap.set(data.public_id, data.destination_url);
        }
      });

      qrSnap.forEach((d) => {
        const item = d.data() as QRCodeItem;
        if (!item.destination_url && linkMap.has(item.public_id)) {
          item.destination_url = linkMap.get(item.public_id) || '';
        }
        list.push(item);
      });
    } catch (e) {
      console.warn('Could not read from Firestore, using local cache:', e);
      list = getLocalQRs();
    }

    // Merge with any local cache items not yet synced
    const local = getLocalQRs();
    for (const item of local) {
      if (!list.some((q) => q.public_id === item.public_id)) {
        list.push(item);
      }
    }

    // Also populate destination_url from redirect_links if empty
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Filter
    let filtered = list;
    if (status && ['active', 'inactive', 'disabled'].includes(status)) {
      filtered = filtered.filter((q) => q.status === status);
    }
    if (search) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter(
        (q) =>
          q.public_id.toLowerCase().includes(s) ||
          (q.name && q.name.toLowerCase().includes(s)) ||
          (q.destination_url && q.destination_url.toLowerCase().includes(s))
      );
    }

    return filtered;
  },

  // Get single QR code by public_id
  async getQRByPublicId(publicId: string): Promise<QRCodeItem | null> {
    const list = await this.listQRs();
    const found = list.find((q) => q.public_id === publicId);
    if (found) return found;

    try {
      const q = query(collection(db, 'qr_codes'), where('public_id', '==', publicId), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as QRCodeItem;
      }
    } catch {
      // ignore
    }
    return null;
  },

  // Activate QR Code
  async activateQR(publicId: string, destinationUrl: string, name?: string): Promise<QRCodeItem> {
    const now = new Date().toISOString();
    const qr = await this.getQRByPublicId(publicId);
    if (!qr) throw new Error(`QR Code ${publicId} tidak ditemukan.`);

    const updatedQR: QRCodeItem = {
      ...qr,
      status: 'active',
      destination_url: destinationUrl,
      name: name || qr.name,
      activated_at: now,
      updated_at: now,
    };

    const redirectRecord = {
      id: qr.redirect_id,
      public_id: publicId,
      destination_url: destinationUrl,
      status: 'active',
      created_at: qr.created_at,
      updated_at: now,
    };

    try {
      await Promise.all([
        setDoc(doc(db, 'qr_codes', qr.id), updatedQR),
        setDoc(doc(db, 'redirect_links', publicId), redirectRecord),
      ]);
    } catch (e) {
      console.warn('Firestore update warning:', e);
    }

    // Update local cache
    const local = getLocalQRs();
    const idx = local.findIndex((q) => q.public_id === publicId);
    if (idx !== -1) {
      local[idx] = updatedQR;
    } else {
      local.unshift(updatedQR);
    }
    saveLocalQRs(local);

    return updatedQR;
  },

  // Update destination URL
  async updateQRDestination(publicId: string, newUrl: string, name?: string): Promise<QRCodeItem> {
    return this.activateQR(publicId, newUrl, name);
  },

  // Disable QR
  async disableQR(publicId: string): Promise<QRCodeItem> {
    const now = new Date().toISOString();
    const qr = await this.getQRByPublicId(publicId);
    if (!qr) throw new Error(`QR Code ${publicId} tidak ditemukan.`);

    const updatedQR: QRCodeItem = {
      ...qr,
      status: 'disabled',
      updated_at: now,
    };

    try {
      await Promise.all([
        updateDoc(doc(db, 'qr_codes', qr.id), { status: 'disabled', updated_at: now }),
        updateDoc(doc(db, 'redirect_links', publicId), { status: 'disabled', updated_at: now }),
      ]);
    } catch (e) {
      console.warn('Firestore disable warning:', e);
    }

    const local = getLocalQRs();
    const idx = local.findIndex((q) => q.public_id === publicId);
    if (idx !== -1) {
      local[idx] = updatedQR;
      saveLocalQRs(local);
    }

    return updatedQR;
  },

  // Reactivate QR
  async reactivateQR(publicId: string): Promise<QRCodeItem> {
    const now = new Date().toISOString();
    const qr = await this.getQRByPublicId(publicId);
    if (!qr) throw new Error(`QR Code ${publicId} tidak ditemukan.`);

    const updatedQR: QRCodeItem = {
      ...qr,
      status: 'active',
      updated_at: now,
    };

    try {
      await Promise.all([
        updateDoc(doc(db, 'qr_codes', qr.id), { status: 'active', updated_at: now }),
        updateDoc(doc(db, 'redirect_links', publicId), { status: 'active', updated_at: now }),
      ]);
    } catch (e) {
      console.warn('Firestore reactivate warning:', e);
    }

    const local = getLocalQRs();
    const idx = local.findIndex((q) => q.public_id === publicId);
    if (idx !== -1) {
      local[idx] = updatedQR;
      saveLocalQRs(local);
    }

    return updatedQR;
  },

  // Scan Tracking & Analytics
  async recordScanClient(publicId: string, deviceType: 'android' | 'ios' | 'desktop' | 'other' = 'other', userAgent = ''): Promise<void> {
    const now = new Date().toISOString();
    const eventId = safeUUID();

    const qr = await this.getQRByPublicId(publicId);
    const event: ScanEventItem = {
      id: eventId,
      public_id: publicId,
      qr_name: qr?.name || `QR #${publicId}`,
      device_type: deviceType,
      user_agent: (userAgent || '').slice(0, 200),
      created_at: now,
    };

    // 1. Write scan_event doc
    try {
      await setDoc(doc(db, 'scan_events', eventId), event);
    } catch (e) {
      console.warn('Failed to record scan event in Firestore:', e);
    }

    // 2. Increment scan_count on qr_codes doc
    if (qr) {
      const newCount = (qr.scan_count || 0) + 1;
      try {
        await updateDoc(doc(db, 'qr_codes', qr.id), {
          scan_count: newCount,
          last_scanned_at: now,
          updated_at: now,
        });
      } catch (e) {
        console.warn('Failed to update QR scan_count in Firestore:', e);
      }

      // Update local cache
      const local = getLocalQRs();
      const idx = local.findIndex((q) => q.public_id === publicId);
      if (idx !== -1) {
        local[idx].scan_count = newCount;
        local[idx].last_scanned_at = now;
        saveLocalQRs(local);
      }
    }
  },

  async getScanAnalyticsSummary(): Promise<ScanAnalyticsSummary> {
    const qrs = await this.listQRs();
    const events: ScanEventItem[] = [];

    try {
      const snap = await getDocs(query(collection(db, 'scan_events'), limit(500)));
      snap.forEach((d) => {
        events.push(d.data() as ScanEventItem);
      });
    } catch (e) {
      console.warn('Could not load scan_events from Firestore:', e);
    }

    events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalScans = Math.max(
      qrs.reduce((acc, q) => acc + (q.scan_count || 0), 0),
      events.length
    );

    const scansToday = events.filter((e) => e.created_at.slice(0, 10) === todayStr).length;
    const scans7Days = events.filter((e) => new Date(e.created_at) >= sevenDaysAgo).length;

    // Top QRs
    const topQRs = [...qrs]
      .sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0))
      .slice(0, 10)
      .map((q) => ({
        public_id: q.public_id,
        name: q.name || `QR #${q.public_id}`,
        scan_count: q.scan_count || 0,
        last_scanned_at: q.last_scanned_at || null,
        status: q.status,
        destination_url: q.destination_url || '',
      }));

    // Hourly distribution
    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;
    events.forEach((e) => {
      const d = new Date(e.created_at);
      const h = d.getHours();
      hourlyMap[h] = (hourlyMap[h] || 0) + 1;
    });

    const hourlyDistribution = Array.from({ length: 24 }).map((_, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      count: hourlyMap[h] || 0,
    }));

    // Daily trends
    const dailyTrends: Array<{ date: string; label: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const ds = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      const count = events.filter((e) => e.created_at.slice(0, 10) === ds).length;
      dailyTrends.push({ date: ds, label, count });
    }

    // Devices
    const devices = { android: 0, ios: 0, desktop: 0, other: 0 };
    events.forEach((e) => {
      const dt = e.device_type;
      if (dt in devices) {
        devices[dt as keyof typeof devices]++;
      } else {
        devices.other++;
      }
    });

    return {
      total_scans: totalScans,
      scans_today: scansToday,
      scans_7_days: scans7Days,
      top_qrs: topQRs,
      hourly_distribution: hourlyDistribution,
      daily_trends: dailyTrends,
      device_breakdown: devices,
      recent_scans: events.slice(0, 20),
    };
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const list = await this.listQRs();
    const scanAnalytics = await this.getScanAnalyticsSummary();
    return {
      qr_summary: {
        total: list.length,
        active: list.filter((q) => q.status === 'active').length,
        inactive: list.filter((q) => q.status === 'inactive').length,
        disabled: list.filter((q) => q.status === 'disabled').length,
      },
      nfc_summary: {
        total: 0,
        direct: 0,
        redirect: 0,
        written: 0,
        pending: 0,
      },
      recent_logs: [],
      scan_analytics: scanAnalytics,
    };
  },
};
