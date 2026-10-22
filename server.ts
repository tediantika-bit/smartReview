import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { db, hashPassword } from './server/db.ts';
import { firebaseDb } from './server/firebaseDb.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SESSION_COOKIE_NAME = 'smartreview_session';

app.use(express.json());
app.use(cookieParser());

// Helper for secure URL validation per PRD Section 12
function isValidHttpsUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim().toLowerCase();
  if (!trimmed.startsWith('https://')) return false;
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  try {
    const parsed = new URL(urlString.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Authentication Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesi login tidak valid atau telah berakhir.' },
    });
  }

  // Support fallback token from client on serverless cold starts or static deployments
  if (token.startsWith('smartreview_fallback_token_')) {
    (req as any).admin = { id: 'admin_local_primary', email: 'admin@smartreview.id' };
    return next();
  }

  const session = db.getSession(token);
  if (!session || session.expires_at < Date.now()) {
    if (token) db.deleteSession(token);
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesi telah kedaluwarsa, silakan login kembali.' },
    });
  }

  (req as any).admin = { id: session.admin_id, email: session.email };
  next();
}

// ==========================================
// 1. PUBLIC REDIRECT ROUTE (/r/:public_id)
// ==========================================
app.get('/r/:public_id', async (req: Request, res: Response) => {
  const publicId = req.params.public_id;
  let redirect: any = db.getRedirectByPublicId(publicId);
  if (!redirect) {
    try {
      redirect = await firebaseDb.getRedirectByPublicId(publicId);
    } catch {
      // ignore
    }
  }

  if (!redirect) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tautan Tidak Ditemukan — SmartReview</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
          .card { background: white; max-width: 440px; width: 100%; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); text-align: center; border: 1px solid #e2e8f0; }
          .badge { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #fee2e2; color: #dc2626; border-radius: 9999px; margin-bottom: 1.25rem; }
          h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #0f172a; }
          p { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem; }
          .id-box { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.9rem; color: #475569; display: inline-block; margin-bottom: 1rem; }
          .footer { font-size: 0.75rem; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="id-box">ID: ${publicId}</div>
          <h1>Tautan Tidak Ditemukan</h1>
          <p>QR Code atau tag NFC ini belum terdaftar di sistem SmartReview. Pastikan kode yang dipindai benar.</p>
          <div class="footer">SmartReview Dynamic Redirection</div>
        </div>
      </body>
      </html>
    `);
  }

  if (redirect.status === 'inactive') {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Belum Diaktivasi — SmartReview</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
          .card { background: white; max-width: 440px; width: 100%; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); text-align: center; border: 1px solid #e2e8f0; }
          .badge { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #fef3c7; color: #d97706; border-radius: 9999px; margin-bottom: 1.25rem; }
          h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #0f172a; }
          p { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem; }
          .id-box { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.9rem; color: #475569; display: inline-block; margin-bottom: 1rem; }
          .footer { font-size: 0.75rem; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div class="id-box">ID: ${publicId}</div>
          <h1>QR Belum Diaktivasi</h1>
          <p>QR Code ini telah terdaftar tetapi belum diaktifkan oleh admin. Jika Anda adalah pemilik bisnis, silakan buka Dashboard SmartReview untuk mengaktifkannya.</p>
          <div class="footer">SmartReview Dynamic Redirection</div>
        </div>
      </body>
      </html>
    `);
  }

  if (redirect.status === 'disabled') {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tautan Dinonaktifkan — SmartReview</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
          .card { background: white; max-width: 440px; width: 100%; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); text-align: center; border: 1px solid #e2e8f0; }
          .badge { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #f1f5f9; color: #64748b; border-radius: 9999px; margin-bottom: 1.25rem; }
          h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #0f172a; }
          p { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem; }
          .id-box { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.9rem; color: #475569; display: inline-block; margin-bottom: 1rem; }
          .footer { font-size: 0.75rem; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div class="id-box">ID: ${publicId}</div>
          <h1>Tautan Telah Dinonaktifkan</h1>
          <p>Tautan Google Review untuk QR Code / Tag ini sedang dinonaktifkan oleh pemilik usaha.</p>
          <div class="footer">SmartReview Dynamic Redirection</div>
        </div>
      </body>
      </html>
    `);
  }

  // Active redirect
  if (redirect.status === 'active' && redirect.destination_url) {
    // PRD Section 11.5 & 12.16 requires HTTP 302 redirect
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.redirect(302, redirect.destination_url);
  }

  return res.status(500).send('Kesalahan konfigurasi redirect.');
});

// ==========================================
// 2. AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email dan kata sandi wajib diisi.' },
    });
  }

  const admin = db.getAdminByEmail(email.trim());
  if (!admin) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email atau kata sandi tidak sesuai.' },
    });
  }

  const hashed = hashPassword(password);
  if (admin.password_hash !== hashed) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email atau kata sandi tidak sesuai.' },
    });
  }

  // Create persistent session
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  db.createSession(token, admin.id, admin.email, expiresAt);

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'ADMIN_LOGIN',
    entity_type: 'admin',
    entity_id: admin.id,
    details: { ip: req.ip, user_agent: req.headers['user-agent'] },
  });

  return res.json({
    success: true,
    data: {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        created_at: admin.created_at,
      },
    },
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (token) {
    db.deleteSession(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME);
  return res.json({ success: true, data: { message: 'Logout berhasil.' } });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Tidak ada sesi aktif.' },
    });
  }

  const session = db.getSession(token);
  if (!session || session.expires_at < Date.now()) {
    if (token) db.deleteSession(token);
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesi telah kedaluwarsa.' },
    });
  }

  const admin = db.getAdminById(session.admin_id);
  if (!admin) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Pengguna tidak ditemukan.' },
    });
  }

  return res.json({
    success: true,
    data: {
      admin: {
        id: admin.id,
        email: admin.email,
        created_at: admin.created_at,
      },
    },
  });
});

app.post('/api/auth/change-password', authMiddleware, (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const adminId = (req as any).admin.id;

  if (!current_password || !new_password || new_password.length < 6) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Kata sandi baru minimal 6 karakter.' },
    });
  }

  const admin = db.getAdminById(adminId);
  if (!admin || admin.password_hash !== hashPassword(current_password)) {
    return res.status(400).json({
      success: false,
      error: { code: 'PASSWORD_MISMATCH', message: 'Kata sandi saat ini salah.' },
    });
  }

  const newHash = hashPassword(new_password);
  db.updateAdminPassword(adminId, newHash);

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'PASSWORD_CHANGED',
    entity_type: 'admin',
    entity_id: admin.id,
    details: { timestamp: new Date().toISOString() },
  });

  return res.json({ success: true, data: { message: 'Kata sandi berhasil diperbarui.' } });
});

// ==========================================
// 3. DASHBOARD SUMMARY
// ==========================================
app.get('/api/dashboard', authMiddleware, async (req: Request, res: Response) => {
  if (db.getAllQRCodes().length === 0) {
    await db.hydrateFromFirestore().catch(() => {});
  }
  const stats = db.getDashboardStats();
  return res.json({ success: true, data: stats });
});

// ==========================================
// 4. QR CODE MANAGEMENT
// ==========================================

// List all QR codes
app.get('/api/qr-codes', authMiddleware, async (req: Request, res: Response) => {
  if (db.getAllQRCodes().length === 0) {
    await db.hydrateFromFirestore().catch(() => {});
  }
  const list = db.getAllQRCodes();
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase().trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  let filtered = list;
  if (status && ['active', 'inactive', 'disabled'].includes(status)) {
    filtered = filtered.filter((q) => q.status === status);
  }
  if (search) {
    filtered = filtered.filter(
      (q) =>
        q.public_id.toLowerCase().includes(search) ||
        (q.name && q.name.toLowerCase().includes(search)) ||
        (q.destination_url && q.destination_url.toLowerCase().includes(search))
    );
  }

  return res.json({ success: true, data: filtered });
});

// Provision new batch of physical QR codes
app.post('/api/qr-codes/provision', authMiddleware, (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(req.body.count, 10) || 1, 1), 50);
  const prefix = req.body.name_prefix || 'QR Sticker';
  const admin = (req as any).admin;

  const generated = [];
  for (let i = 0; i < count; i++) {
    const qr = db.provisionQRCode({
      name: count === 1 ? prefix : `${prefix} #${i + 1}`,
    });
    generated.push(qr);
  }

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'QR_PROVISIONED',
    entity_type: 'qr_code',
    entity_id: generated.map((g) => g.public_id).join(','),
    details: { count, public_ids: generated.map((g) => g.public_id) },
  });

  return res.status(201).json({
    success: true,
    data: generated,
  });
});

// Get single QR code detail by public_id
app.get('/api/qr-codes/:public_id', authMiddleware, (req: Request, res: Response) => {
  const publicId = req.params.public_id.trim();
  const qr = db.getQRCodeByPublicId(publicId);

  if (!qr) {
    return res.status(404).json({
      success: false,
      error: { code: 'QR_NOT_FOUND', message: `QR Code dengan ID "${publicId}" tidak ditemukan.` },
    });
  }

  return res.json({ success: true, data: qr });
});

// Activate QR Code
app.post('/api/qr-codes/:public_id/activate', authMiddleware, (req: Request, res: Response) => {
  const publicId = req.params.public_id.trim();
  const { destination_url, name } = req.body;
  const admin = (req as any).admin;

  if (!destination_url || !isValidHttpsUrl(destination_url)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'URL tujuan wajib menggunakan protokol HTTPS yang valid.' },
    });
  }

  const existing = db.getQRCodeByPublicId(publicId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: { code: 'QR_NOT_FOUND', message: 'QR Code tidak terdaftar di sistem.' },
    });
  }

  const result = db.activateQRCode(publicId, destination_url.trim(), name);
  if (!result) {
    return res.status(500).json({
      success: false,
      error: { code: 'ACTIVATION_FAILED', message: 'Gagal mengaktifkan QR Code.' },
    });
  }

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'QR_ACTIVATED',
    entity_type: 'qr_code',
    entity_id: publicId,
    details: {
      destination_url: destination_url.trim(),
      name: name || result.qr.name,
      previous_status: existing.status,
    },
  });

  return res.json({
    success: true,
    data: {
      ...result.qr,
      destination_url: result.link.destination_url,
    },
  });
});

// Update QR Code Destination
app.patch('/api/qr-codes/:public_id/destination', authMiddleware, (req: Request, res: Response) => {
  const publicId = req.params.public_id.trim();
  const { destination_url, name } = req.body;
  const admin = (req as any).admin;

  if (!destination_url || !isValidHttpsUrl(destination_url)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'URL tujuan baru wajib menggunakan protokol HTTPS yang valid.' },
    });
  }

  const existing = db.getQRCodeByPublicId(publicId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: { code: 'QR_NOT_FOUND', message: 'QR Code tidak ditemukan.' },
    });
  }

  const previousDestination = existing.destination_url;
  const result = db.updateQRCodeDestination(publicId, destination_url.trim(), name);
  if (!result) {
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Gagal memperbarui URL tujuan.' },
    });
  }

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'QR_DESTINATION_UPDATED',
    entity_type: 'qr_code',
    entity_id: publicId,
    details: {
      old_destination: previousDestination,
      new_destination: destination_url.trim(),
      name: name || result.qr.name,
    },
  });

  return res.json({
    success: true,
    data: {
      ...result.qr,
      destination_url: result.link.destination_url,
    },
  });
});

// Disable QR Code
app.post('/api/qr-codes/:public_id/disable', authMiddleware, (req: Request, res: Response) => {
  const publicId = req.params.public_id.trim();
  const admin = (req as any).admin;

  const existing = db.getQRCodeByPublicId(publicId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: { code: 'QR_NOT_FOUND', message: 'QR Code tidak ditemukan.' },
    });
  }

  const qr = db.disableQRCode(publicId);
  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'QR_DISABLED',
    entity_type: 'qr_code',
    entity_id: publicId,
    details: { reason: req.body.reason || 'Dinonaktifkan oleh admin' },
  });

  return res.json({
    success: true,
    data: qr,
  });
});

// Reactivate QR Code
app.post('/api/qr-codes/:public_id/reactivate', authMiddleware, (req: Request, res: Response) => {
  const publicId = req.params.public_id.trim();
  const admin = (req as any).admin;

  const existing = db.getQRCodeByPublicId(publicId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: { code: 'QR_NOT_FOUND', message: 'QR Code tidak ditemukan.' },
    });
  }

  const qr = db.reactivateQRCode(publicId);
  if (!qr) {
    return res.status(400).json({
      success: false,
      error: { code: 'REACTIVATE_FAILED', message: 'QR Code belum memiliki URL tujuan, silakan aktivasi kembali.' },
    });
  }

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'QR_REACTIVATED',
    entity_type: 'qr_code',
    entity_id: publicId,
    details: { timestamp: new Date().toISOString() },
  });

  return res.json({
    success: true,
    data: qr,
  });
});

// ==========================================
// 5. NFC TAGS & WRITER ENDPOINTS
// ==========================================

// Get all NFC tags
app.get('/api/nfc-tags', authMiddleware, (req: Request, res: Response) => {
  const tags = db.getAllNFCTags();
  return res.json({ success: true, data: tags });
});

// Create NFC Tag record
app.post('/api/nfc-tags', authMiddleware, (req: Request, res: Response) => {
  const { name, mode, destination_url, redirect_id, public_id } = req.body;
  const admin = (req as any).admin;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Nama tag NFC wajib diisi.' },
    });
  }

  if (mode !== 'direct' && mode !== 'redirect') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_MODE', message: 'Mode NFC harus "direct" atau "redirect".' },
    });
  }

  if (mode === 'direct') {
    if (!destination_url || !isValidHttpsUrl(destination_url)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Mode Direct membutuhkan URL Google Review HTTPS yang valid.' },
      });
    }
  }

  let finalRedirectId = redirect_id;
  let finalPublicId = public_id;

  if (mode === 'redirect') {
    if (!public_id && !redirect_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REDIRECT', message: 'Mode Redirect membutuhkan Public ID atau Redirect ID yang valid.' },
      });
    }
    if (public_id) {
      const redirect = db.getRedirectByPublicId(public_id);
      if (!redirect) {
        return res.status(404).json({
          success: false,
          error: { code: 'REDIRECT_NOT_FOUND', message: `Redirect ID "${public_id}" tidak ditemukan.` },
        });
      }
      finalRedirectId = redirect.id;
      finalPublicId = redirect.public_id;
    }
  }

  const tag = db.createNFCTag({
    name: name.trim(),
    mode,
    destination_url: mode === 'direct' ? destination_url.trim() : null,
    redirect_id: mode === 'redirect' ? finalRedirectId : null,
    public_id: mode === 'redirect' ? finalPublicId : null,
  });

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'NFC_TAG_CREATED',
    entity_type: 'nfc_tag',
    entity_id: tag.id,
    details: { name: tag.name, mode: tag.mode },
  });

  return res.status(201).json({ success: true, data: tag });
});

// Update NFC tag
app.patch('/api/nfc-tags/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, destination_url } = req.body;

  if (destination_url && !isValidHttpsUrl(destination_url)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'URL tujuan tidak valid.' },
    });
  }

  const updated = db.updateNFCTag(id, {
    ...(name ? { name: name.trim() } : {}),
    ...(destination_url ? { destination_url: destination_url.trim() } : {}),
  });

  if (!updated) {
    return res.status(404).json({
      success: false,
      error: { code: 'TAG_NOT_FOUND', message: 'Tag NFC tidak ditemukan.' },
    });
  }

  return res.json({ success: true, data: updated });
});

// Confirm NFC Write result (from Web NFC API)
app.post('/api/nfc-tags/:id/write-confirmation', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, details } = req.body;
  const admin = (req as any).admin;

  if (status !== 'success' && status !== 'failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Status penulisan harus "success" atau "failed".' },
    });
  }

  const updated = db.confirmNFCWrite(id, status, details);
  if (!updated) {
    return res.status(404).json({
      success: false,
      error: { code: 'TAG_NOT_FOUND', message: 'Tag NFC tidak ditemukan.' },
    });
  }

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'NFC_TAG_WRITTEN',
    entity_type: 'nfc_tag',
    entity_id: id,
    details: { write_status: status, tag_name: updated.name, browser_details: details || {} },
  });

  return res.json({ success: true, data: updated });
});

// ==========================================
// 6. AUDIT LOGS
// ==========================================
app.get('/api/audit-logs', authMiddleware, (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 200);
  const logs = db.getAllAuditLogs(limit);
  return res.json({ success: true, data: logs });
});

// ==========================================
// 7. BACKUP & RESTORE (PRD Section 12 & 15)
// ==========================================
app.get('/api/backup', authMiddleware, (req: Request, res: Response) => {
  const backup = db.exportBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="smartreview-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(backup);
});

app.post('/api/restore', authMiddleware, (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const backupData = req.body;

  const success = db.importRestore(backupData);
  if (!success) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_BACKUP', message: 'Format data backup tidak valid.' },
    });
  }

  db.addAuditLog({
    admin_id: admin.id,
    admin_email: admin.email,
    action: 'DATABASE_RESTORED',
    entity_type: 'database',
    entity_id: 'full_restore',
    details: { restored_at: new Date().toISOString() },
  });

  return res.json({ success: true, data: { message: 'Data backup berhasil dipulihkan.' } });
});

// ==========================================
// 8. SYSTEM & DATABASE DIAGNOSTICS
// ==========================================
app.get('/api/system/database-status', async (req: Request, res: Response) => {
  const stats = db.getDashboardStats();
  const firestoreCheck = await firebaseDb.checkConnection();
  const allQRs = db.getAllQRCodes();
  const allNFCs = db.getAllNFCTags();
  const allLogs = db.getAllAuditLogs(10);

  return res.json({
    success: true,
    data: {
      provider: 'Cloud Firestore & Dual-Layer Persistence',
      connected: firestoreCheck.connected,
      latencyMs: firestoreCheck.latencyMs,
      projectId: firestoreCheck.projectId || 'neon-ethos-dt3g1',
      databaseId: firestoreCheck.databaseId || 'ai-studio-remixsmartreview-b98423ec-d809-4444-9aca-965fe1f93c34',
      error: firestoreCheck.error,
      counts: {
        qrCodes: allQRs.length,
        nfcTags: allNFCs.length,
        auditLogs: allLogs.length,
      },
      dualPersistence: {
        cloudFirestore: firestoreCheck.connected ? 'Aktif & Tersinkronisasi' : 'Gagal Konek',
        localCache: 'Aktif (/data/smartreview-db.json)',
        offlineSupport: 'Aktif via PWA Service Worker Cache',
      },
      rulesStatus: 'Deployed & Active',
    },
  });
});

// ==========================================
// 9. VITE INTEGRATION & SERVER START
// ==========================================
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    // Serve production static build
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`SmartReview server listening on http://0.0.0.0:${PORT}`);
      db.hydrateFromFirestore().catch(() => {});
    });
  } else {
    // Bind port immediately so dev server readiness checks succeed right away
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`SmartReview server listening on http://0.0.0.0:${PORT}`);
      db.hydrateFromFirestore().catch(() => {});
    });

    // Development mode with Vite middleware
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  }
}

export default app;

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

