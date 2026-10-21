import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  type Firestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const firebaseConfig = require('../firebase-applet-config.json');

// Silence internal gRPC stream chatter in Node.js logs
try {
  setLogLevel('silent');
} catch {
  // ignore
}

let firestoreInstance: Firestore | null = null;

function getDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  try {
    const config = firebaseConfig;
    if (!config || !config.projectId || !config.apiKey) return null;
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreInstance = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
    return firestoreInstance;
  } catch (e) {
    console.warn('Failed to initialize Firebase in server:', e);
    return null;
  }
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface RedirectLink {
  id: string;
  public_id: string;
  destination_url: string;
  status: 'inactive' | 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface QRCodeRecord {
  id: string;
  redirect_id: string;
  public_id: string;
  name?: string;
  status: 'inactive' | 'active' | 'disabled';
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NFCTag {
  id: string;
  name: string;
  mode: 'direct' | 'redirect';
  destination_url: string | null;
  redirect_id: string | null;
  public_id?: string | null;
  write_status: 'pending' | 'success' | 'failed';
  last_written_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
}

export class FirebaseDatabase {
  // --- REDIRECT LINKS ---
  async getRedirectByPublicId(publicId: string): Promise<RedirectLink | null> {
    try {
      const firestore = getDb();
      if (!firestore) return null;
      const snap = await getDoc(doc(firestore, 'redirect_links', publicId));
      if (snap.exists()) {
        return snap.data() as RedirectLink;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAllRedirectLinks(): Promise<RedirectLink[]> {
    try {
      const firestore = getDb();
      if (!firestore) return [];
      const snap = await getDocs(collection(firestore, 'redirect_links'));
      const list: RedirectLink[] = [];
      snap.forEach((d) => list.push(d.data() as RedirectLink));
      return list;
    } catch {
      return [];
    }
  }

  async saveRedirectLink(link: RedirectLink): Promise<void> {
    const firestore = getDb();
    if (!firestore) return;
    await setDoc(doc(firestore, 'redirect_links', link.public_id), link);
  }

  // --- QR CODES ---
  async getAllQRCodes(): Promise<QRCodeRecord[]> {
    try {
      const firestore = getDb();
      if (!firestore) return [];
      const snap = await getDocs(collection(firestore, 'qr_codes'));
      const list: QRCodeRecord[] = [];
      snap.forEach((d) => list.push(d.data() as QRCodeRecord));
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  async getQRCodeByPublicId(publicId: string): Promise<QRCodeRecord | null> {
    try {
      const firestore = getDb();
      if (!firestore) return null;
      const q = query(collection(firestore, 'qr_codes'), where('public_id', '==', publicId), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as QRCodeRecord;
      }
      return null;
    } catch {
      return null;
    }
  }

  async saveQRCode(qr: QRCodeRecord): Promise<void> {
    const firestore = getDb();
    if (!firestore) return;
    await setDoc(doc(firestore, 'qr_codes', qr.id), qr);
  }

  // --- NFC TAGS ---
  async getAllNFCTags(): Promise<NFCTag[]> {
    try {
      const firestore = getDb();
      if (!firestore) return [];
      const snap = await getDocs(collection(firestore, 'nfc_tags'));
      const list: NFCTag[] = [];
      snap.forEach((d) => list.push(d.data() as NFCTag));
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  async saveNFCTag(tag: NFCTag): Promise<void> {
    const firestore = getDb();
    if (!firestore) return;
    await setDoc(doc(firestore, 'nfc_tags', tag.id), tag);
  }

  // --- AUDIT LOGS ---
  async addAuditLog(log: AuditLog): Promise<void> {
    try {
      const firestore = getDb();
      if (!firestore) return;
      await setDoc(doc(firestore, 'audit_logs', log.id), log);
    } catch {
      // handled silently
    }
  }

  async getAuditLogs(count = 50): Promise<AuditLog[]> {
    try {
      const firestore = getDb();
      if (!firestore) return [];
      const snap = await getDocs(collection(firestore, 'audit_logs'));
      const list: AuditLog[] = [];
      snap.forEach((d) => list.push(d.data() as AuditLog));
      return list
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, count);
    } catch {
      return [];
    }
  }

  async checkConnection(): Promise<{ connected: boolean; latencyMs?: number; projectId?: string; databaseId?: string; error?: string }> {
    try {
      const config = firebaseConfig;
      const firestore = getDb();
      if (!firestore) {
        return { connected: false, error: 'Inisialisasi Firestore gagal' };
      }
      const start = Date.now();
      await getDoc(doc(firestore, 'test', 'connection'));
      const latencyMs = Date.now() - start;
      return {
        connected: true,
        latencyMs,
        projectId: config.projectId,
        databaseId: config.firestoreDatabaseId || '(default)',
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err?.message || 'Gagal terhubung ke Firestore',
      };
    }
  }
}

export const firebaseDb = new FirebaseDatabase();
