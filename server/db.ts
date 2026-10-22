import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { firebaseDb } from './firebaseDb.ts';

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

export interface SessionRecord {
  token: string;
  admin_id: string;
  email: string;
  expires_at: number;
}

export interface DatabaseSchema {
  admins: Admin[];
  redirect_links: RedirectLink[];
  qr_codes: QRCodeRecord[];
  nfc_tags: NFCTag[];
  audit_logs: AuditLog[];
  sessions?: SessionRecord[];
}

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let bundledDb: DatabaseSchema | null = null;
try {
  bundledDb = require('../data/smartreview-db.json');
} catch {
  bundledDb = null;
}

const DATA_DIR = process.env.VERCEL
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'smartreview-db.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_smartreview_salt_2026').digest('hex');
}

export function generatePublicId(length = 6): string {
  // Base62 random string, readable and safe
  const chars = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

class Database {
  private data: DatabaseSchema = {
    admins: [],
    redirect_links: [],
    qr_codes: [],
    nfc_tags: [],
    audit_logs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else if (bundledDb && bundledDb.qr_codes && bundledDb.qr_codes.length > 0) {
        this.data = JSON.parse(JSON.stringify(bundledDb));
        this.save();
      } else {
        // Fallback: check raw path
        const originalPath = path.resolve(process.cwd(), 'data', 'smartreview-db.json');
        if (fs.existsSync(originalPath)) {
          try {
            const raw = fs.readFileSync(originalPath, 'utf-8');
            this.data = JSON.parse(raw);
          } catch {
            this.seedInitialData();
          }
        } else {
          this.seedInitialData();
        }
        this.save();
      }
    } catch (err) {
      console.error('Error initializing database, using seed:', err);
      if (bundledDb && bundledDb.qr_codes && bundledDb.qr_codes.length > 0) {
        this.data = JSON.parse(JSON.stringify(bundledDb));
      } else {
        this.seedInitialData();
      }
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private syncLinkToFirebase(link: RedirectLink) {
    firebaseDb.saveRedirectLink(link).catch(() => {});
  }

  private syncQRToFirebase(qr: QRCodeRecord) {
    firebaseDb.saveQRCode(qr).catch(() => {});
  }

  private syncTagToFirebase(tag: NFCTag) {
    firebaseDb.saveNFCTag(tag).catch(() => {});
  }

  private syncAuditToFirebase(log: AuditLog) {
    firebaseDb.addAuditLog(log).catch(() => {});
  }

  async hydrateFromFirestore() {
    try {
      const [links, qrs, tags, logs] = await Promise.all([
        firebaseDb.getAllRedirectLinks(),
        firebaseDb.getAllQRCodes(),
        firebaseDb.getAllNFCTags(),
        firebaseDb.getAuditLogs(100),
      ]);
      let changed = false;
      for (const link of links) {
        if (!this.data.redirect_links.some((l) => l.public_id === link.public_id)) {
          this.data.redirect_links.push(link);
          changed = true;
        }
      }
      for (const qr of qrs) {
        if (!this.data.qr_codes.some((q) => q.id === qr.id)) {
          this.data.qr_codes.push(qr);
          changed = true;
        }
      }
      for (const tag of tags) {
        if (!this.data.nfc_tags.some((t) => t.id === tag.id)) {
          this.data.nfc_tags.push(tag);
          changed = true;
        }
      }
      for (const log of logs) {
        if (!this.data.audit_logs.some((a) => a.id === log.id)) {
          this.data.audit_logs.push(log);
          changed = true;
        }
      }
      if (changed) {
        this.data.audit_logs.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.save();
      }
    } catch {
      // ignore initial hydration errors
    }
  }

  private seedInitialData() {
    const now = new Date().toISOString();
    const adminId = crypto.randomUUID();

    // Default admin: admin@smartreview.id / admin123456
    const defaultAdmin: Admin = {
      id: adminId,
      email: 'admin@smartreview.id',
      password_hash: hashPassword('admin123456'),
      created_at: now,
      updated_at: now,
    };

    this.data = {
      admins: [defaultAdmin],
      redirect_links: [],
      qr_codes: [],
      nfc_tags: [],
      audit_logs: [],
    };
  }

  // Admins
  getAdminByEmail(email: string): Admin | undefined {
    return this.data.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  getAdminById(id: string): Admin | undefined {
    return this.data.admins.find((a) => a.id === id);
  }

  updateAdminPassword(id: string, newPasswordHash: string): boolean {
    const admin = this.getAdminById(id);
    if (!admin) return false;
    admin.password_hash = newPasswordHash;
    admin.updated_at = new Date().toISOString();
    this.save();
    return true;
  }

  // Redirect Links
  getRedirectByPublicId(publicId: string): RedirectLink | undefined {
    return this.data.redirect_links.find((r) => r.public_id === publicId);
  }

  getRedirectById(id: string): RedirectLink | undefined {
    return this.data.redirect_links.find((r) => r.id === id);
  }

  // QR Codes
  getAllQRCodes(): (QRCodeRecord & { destination_url?: string })[] {
    return this.data.qr_codes.map((qr) => {
      const link = this.getRedirectById(qr.redirect_id);
      return {
        ...qr,
        destination_url: link ? link.destination_url : '',
      };
    });
  }

  getQRCodeByPublicId(publicId: string): (QRCodeRecord & { destination_url: string }) | null {
    const qr = this.data.qr_codes.find((q) => q.public_id === publicId);
    if (!qr) return null;
    const link = this.getRedirectById(qr.redirect_id);
    return {
      ...qr,
      destination_url: link ? link.destination_url : '',
    };
  }

  provisionQRCode(options?: { name?: string; length?: number }): QRCodeRecord {
    const now = new Date().toISOString();
    let publicId = generatePublicId(options?.length || 6);
    // Ensure uniqueness
    while (this.getRedirectByPublicId(publicId)) {
      publicId = generatePublicId(options?.length || 6);
    }

    const redirectId = crypto.randomUUID();
    const qrId = crypto.randomUUID();

    const redirectLink: RedirectLink = {
      id: redirectId,
      public_id: publicId,
      destination_url: '',
      status: 'inactive',
      created_at: now,
      updated_at: now,
    };

    const qrCode: QRCodeRecord = {
      id: qrId,
      redirect_id: redirectId,
      public_id: publicId,
      name: options?.name || `QR Sticker #${publicId}`,
      status: 'inactive',
      activated_at: null,
      created_at: now,
      updated_at: now,
    };

    this.data.redirect_links.push(redirectLink);
    this.data.qr_codes.push(qrCode);
    this.save();
    this.syncLinkToFirebase(redirectLink);
    this.syncQRToFirebase(qrCode);

    return qrCode;
  }

  activateQRCode(publicId: string, destinationUrl: string, name?: string): { qr: QRCodeRecord; link: RedirectLink } | null {
    const qr = this.data.qr_codes.find((q) => q.public_id === publicId);
    if (!qr) return null;

    const link = this.getRedirectById(qr.redirect_id);
    if (!link) return null;

    const now = new Date().toISOString();
    qr.status = 'active';
    qr.activated_at = now;
    qr.updated_at = now;
    if (name) qr.name = name;

    link.status = 'active';
    link.destination_url = destinationUrl;
    link.updated_at = now;

    this.save();
    this.syncLinkToFirebase(link);
    this.syncQRToFirebase(qr);
    return { qr, link };
  }

  updateQRCodeDestination(publicId: string, newDestinationUrl: string, name?: string): { qr: QRCodeRecord; link: RedirectLink } | null {
    const qr = this.data.qr_codes.find((q) => q.public_id === publicId);
    if (!qr) return null;

    const link = this.getRedirectById(qr.redirect_id);
    if (!link) return null;

    const now = new Date().toISOString();
    link.destination_url = newDestinationUrl;
    link.updated_at = now;
    qr.updated_at = now;
    if (name) qr.name = name;

    this.save();
    this.syncLinkToFirebase(link);
    this.syncQRToFirebase(qr);
    return { qr, link };
  }

  disableQRCode(publicId: string): QRCodeRecord | null {
    const qr = this.data.qr_codes.find((q) => q.public_id === publicId);
    if (!qr) return null;

    const link = this.getRedirectById(qr.redirect_id);
    const now = new Date().toISOString();

    qr.status = 'disabled';
    qr.updated_at = now;

    if (link) {
      link.status = 'disabled';
      link.updated_at = now;
      this.syncLinkToFirebase(link);
    }

    this.save();
    this.syncQRToFirebase(qr);
    return qr;
  }

  reactivateQRCode(publicId: string): QRCodeRecord | null {
    const qr = this.data.qr_codes.find((q) => q.public_id === publicId);
    if (!qr) return null;

    const link = this.getRedirectById(qr.redirect_id);
    if (!link || !link.destination_url) return null;

    const now = new Date().toISOString();
    qr.status = 'active';
    qr.updated_at = now;
    link.status = 'active';
    link.updated_at = now;

    this.save();
    this.syncLinkToFirebase(link);
    this.syncQRToFirebase(qr);
    return qr;
  }

  deleteQRCode(publicId: string): boolean {
    const idx = this.data.qr_codes.findIndex((q) => q.public_id === publicId);
    if (idx === -1) return false;
    this.data.qr_codes.splice(idx, 1);
    this.data.redirect_links = this.data.redirect_links.filter((l) => l.public_id !== publicId);
    this.save();
    return true;
  }

  // NFC Tags
  getAllNFCTags(): NFCTag[] {
    return [...this.data.nfc_tags].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getNFCTagById(id: string): NFCTag | undefined {
    return this.data.nfc_tags.find((t) => t.id === id);
  }

  createNFCTag(data: {
    name: string;
    mode: 'direct' | 'redirect';
    destination_url?: string | null;
    redirect_id?: string | null;
    public_id?: string | null;
  }): NFCTag {
    const now = new Date().toISOString();
    const tag: NFCTag = {
      id: crypto.randomUUID(),
      name: data.name,
      mode: data.mode,
      destination_url: data.destination_url || null,
      redirect_id: data.redirect_id || null,
      public_id: data.public_id || null,
      write_status: 'pending',
      last_written_at: null,
      created_at: now,
      updated_at: now,
    };

    this.data.nfc_tags.unshift(tag);
    this.save();
    this.syncTagToFirebase(tag);
    return tag;
  }

  updateNFCTag(id: string, updates: Partial<NFCTag>): NFCTag | null {
    const tag = this.getNFCTagById(id);
    if (!tag) return null;

    Object.assign(tag, updates, { updated_at: new Date().toISOString() });
    this.save();
    this.syncTagToFirebase(tag);
    return tag;
  }

  confirmNFCWrite(id: string, status: 'success' | 'failed', details?: Record<string, any>): NFCTag | null {
    const tag = this.getNFCTagById(id);
    if (!tag) return null;

    const now = new Date().toISOString();
    tag.write_status = status;
    if (status === 'success') {
      tag.last_written_at = now;
    }
    tag.updated_at = now;

    this.save();
    this.syncTagToFirebase(tag);
    return tag;
  }

  // Audit Logs
  addAuditLog(entry: {
    admin_id: string;
    admin_email: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: Record<string, any>;
  }): AuditLog {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      admin_id: entry.admin_id,
      admin_email: entry.admin_email,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details,
      created_at: new Date().toISOString(),
    };

    this.data.audit_logs.unshift(log);
    // Keep max 500 audit logs
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 500);
    }
    this.save();
    this.syncAuditToFirebase(log);
    return log;
  }

  getAllAuditLogs(limit = 100): AuditLog[] {
    return this.data.audit_logs.slice(0, limit);
  }

  // Dashboard Stats
  getDashboardStats() {
    const qrList = this.data.qr_codes;
    const nfcList = this.data.nfc_tags;

    return {
      qr_summary: {
        total: qrList.length,
        active: qrList.filter((q) => q.status === 'active').length,
        inactive: qrList.filter((q) => q.status === 'inactive').length,
        disabled: qrList.filter((q) => q.status === 'disabled').length,
      },
      nfc_summary: {
        total: nfcList.length,
        direct: nfcList.filter((n) => n.mode === 'direct').length,
        redirect: nfcList.filter((n) => n.mode === 'redirect').length,
        written: nfcList.filter((n) => n.write_status === 'success').length,
        pending: nfcList.filter((n) => n.write_status === 'pending').length,
      },
      recent_logs: this.data.audit_logs.slice(0, 5),
    };
  }

  // Sessions (Persistent across restarts)
  createSession(token: string, admin_id: string, email: string, expires_at: number) {
    if (!this.data.sessions) this.data.sessions = [];
    // Remove existing session for same token if any
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.data.sessions.push({ token, admin_id, email, expires_at });
    this.save();
  }

  getSession(token: string): SessionRecord | undefined {
    if (!this.data.sessions) return undefined;
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return undefined;
    if (session.expires_at < Date.now()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  deleteSession(token: string) {
    if (!this.data.sessions) return;
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  // Backup & Restore
  exportBackup(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  importRestore(backupData: DatabaseSchema): boolean {
    if (!backupData || !Array.isArray(backupData.admins) || !Array.isArray(backupData.qr_codes)) {
      return false;
    }
    this.data = backupData;
    this.save();
    return true;
  }
}

export const db = new Database();
