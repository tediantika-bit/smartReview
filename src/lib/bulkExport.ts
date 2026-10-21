import QRCode from 'qrcode';
import JSZip from 'jszip';
import { QRCodeItem } from '../types';

/**
 * Generates a pure, high-resolution square QR code image as a PNG Blob.
 * No borders, banners, or frames — just the crisp QR code itself.
 */
export async function renderPureQRCodeBlob(qr: QRCodeItem, origin: string, size = 1024): Promise<Blob> {
  const redirectUrl = `${origin}/r/${qr.public_id}`;
  const dataUrl = await QRCode.toDataURL(redirectUrl, {
    width: size,
    margin: 2, // Standard quiet zone for reliable camera detection
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Generates and downloads a ZIP package containing pure QR code PNG files.
 * Each file is named: QR_{public_id}.png
 */
export async function downloadQRsAsZip(
  qrs: QRCodeItem[],
  zipFilename = 'SmartReview-QR-Codes.zip',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const origin = window.location.origin;

  for (let i = 0; i < qrs.length; i++) {
    const qr = qrs[i];
    if (onProgress) onProgress(i + 1, qrs.length);

    // Generate pure QR code blob
    const blob = await renderPureQRCodeBlob(qr, origin, 1024);
    
    // Clean, standard filename: QR_{public_id}.png
    const filename = `QR_${qr.public_id}.png`;

    zip.file(filename, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exports QR code metadata to CSV format.
 */
export function exportQRsAsCSV(qrs: QRCodeItem[], filename = 'SmartReview-QR-List.csv'): void {
  const origin = window.location.origin;
  const headers = ['No', 'Public ID', 'Nama Stiker', 'Status', 'URL Redirect Publik', 'URL Tujuan', 'Dibuat Pada'];
  const rows = qrs.map((qr, idx) => [
    idx + 1,
    `"${qr.public_id}"`,
    `"${(qr.name || '').replace(/"/g, '""')}"`,
    qr.status,
    `"${origin}/r/${qr.public_id}"`,
    `"${(qr.destination_url || '').replace(/"/g, '""')}"`,
    `"${new Date(qr.created_at).toLocaleString('id-ID')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
