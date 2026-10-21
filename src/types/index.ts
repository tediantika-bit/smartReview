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
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
