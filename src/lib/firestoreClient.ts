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
import { QRCodeItem, NFCTagItem, DashboardStats, AuditLogItem } from '../types';

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
      const snap = await getDocs(collection(db, 'qr_codes'));
      snap.forEach((d) => {
        list.push(d.data() as QRCodeItem);
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

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const list = await this.listQRs();
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
    };
  },
};
