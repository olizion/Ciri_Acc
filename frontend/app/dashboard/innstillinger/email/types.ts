export interface EmailConnection {
  id: string;
  provider: "google" | "microsoft";
  email_address: string;
  status: "active" | "inactive" | "error" | "expired";
  is_active: boolean;
  last_sync_at: string | null;
  emails_processed: number;
  invoices_created: number;
  last_error: string | null;
  created_at: string | null;
}

export interface OAuthStatus {
  google_configured: boolean;
  microsoft_configured: boolean;
}

export interface NotificationSettings {
  notification_email: string | null;
  notification_day: number;
  notification_enabled: boolean;
}
