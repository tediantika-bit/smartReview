export interface Admin {
  id: string;
  email: string;
  created_at: string;
}

export interface QRCodeItem {
  id: string;
  redirect_id: string;
  public_id: string;
  name?: string;
  status: 'inactive' | 'active' | 'disabled';
  destination_url?: string;
  activated_at: string | null;
  scan_count?: number;
  last_scanned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NFCTagItem {
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

export interface AuditLogItem {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface ScanEventItem {
  id: string;
  public_id: string;
  qr_name?: string;
  device_type: 'android' | 'ios' | 'desktop' | 'other';
  user_agent?: string;
  created_at: string;
}

export interface ScanAnalyticsSummary {
  total_scans: number;
  scans_today: number;
  scans_7_days: number;
  top_qrs: Array<{
    public_id: string;
    name: string;
    scan_count: number;
    last_scanned_at: string | null;
    status: 'inactive' | 'active' | 'disabled';
    destination_url?: string;
  }>;
  hourly_distribution: Array<{ hour: number; label: string; count: number }>;
  daily_trends: Array<{ date: string; label: string; count: number }>;
  device_breakdown: {
    android: number;
    ios: number;
    desktop: number;
    other: number;
  };
  recent_scans: ScanEventItem[];
}

export interface DashboardStats {
  qr_summary: {
    total: number;
    active: number;
    inactive: number;
    disabled: number;
  };
  nfc_summary: {
    total: number;
    direct: number;
    redirect: number;
    written: number;
    pending: number;
  };
  recent_logs: AuditLogItem[];
  scan_analytics?: ScanAnalyticsSummary;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
