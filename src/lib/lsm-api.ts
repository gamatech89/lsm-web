/**
 * LSM (Landeseiten Maintenance) API Helper
 * 
 * API client for WordPress site management via the LSM plugin.
 */

import type { AxiosInstance } from 'axios';

export interface LsmStatus {
  configured: boolean;
  connected?: boolean;
  plugin_version?: string;
  message: string;
}

export interface LsmHealth {
  timestamp: string;
  status: string;
  site_url: string;
  wordpress: {
    version: string;
    is_multisite: boolean;
    locale: string;
    timezone: string;
  };
  php: {
    version: string;
  };
  ssl: {
    enabled: boolean;
    expires_at?: string;
  };
  plugins: {
    total: number;
    active: number;
    outdated_count: number;
    outdated?: Array<{ name: string; current: string; new: string }>;
  };
  theme: {
    name: string;
    version: string;
  };
  security: {
    debug_mode: boolean;
    file_editing: boolean;
    wordfence_active: boolean;
  };
}

export interface LsmLoginToken {
  success: boolean;
  token: string;
  login_url: string;
  expires_in: number;
}

export interface LsmUpdates {
  core: { current_version: string; new_version: string } | null;
  plugins: Array<{
    plugin: string;
    slug: string;
    current_version: string;
    new_version: string;
  }>;
  themes: Array<{
    theme: string;
    current_version: string;
    new_version: string;
  }>;
}

export interface LsmCacheResult {
  success: boolean;
  cleared: string[];
  message: string;
}

export interface LsmRecoveryStatus {
  maintenance_mode: boolean;
  disabled_plugins: string[];
  current_theme: string;
  mu_plugin_installed: boolean;
  recovery_token_exists: boolean;
}

// Managed .htaccess hardening — shapes are fixed by the API contract
// (lsm-api docs/superpowers/specs/2026-09-21-htaccess-hardening-design.md).

export type HardeningRuleKey = 'block_archives' | 'block_debug_log' | 'block_uploads_php';

export type HardeningRuleState = 'on' | 'off' | 'paused' | 'manual' | 'drift' | 'unsupported';

export type HardeningUnsupportedReason =
  | 'multisite'
  | 'openlitespeed'
  | 'unknown_server'
  | 'not_writable';

export type HardeningPauseMinutes = 15 | 30 | 60;

export interface HardeningRuleStatus {
  state: HardeningRuleState;
  desired: boolean;
  unsupported_reason: HardeningUnsupportedReason | null;
  /** Sticky until the next successful apply of this rule. `at` is unix seconds. */
  last_failure: { at: number; reason: string } | null;
}

export interface HardeningLastResult {
  at: number;
  /** enable | disable | pause | resume | auto_resume | crash_recovery | deactivate */
  action: string;
  rule: HardeningRuleKey | null;
  ok: boolean;
  reason: string | null;
  warnings: string[];
}

export interface HardeningStatus {
  plugin_version: string;
  server: string;
  rules: Record<HardeningRuleKey, HardeningRuleStatus>;
  /** Unix seconds, block_archives only. Stays set (in the past) while a resume is overdue. */
  pause_until: number | null;
  pause_overdue: boolean;
  archive_attachments: number;
  last_result: HardeningLastResult | null;
}

/** Per user and project, straight from the API's Gate. Never derived from the role client-side. */
export interface HardeningAbilities {
  pause: boolean;
  enable: boolean;
  disable: boolean;
}

/**
 * GET /hardening. Always HTTP 200: an old plugin or an unreachable site comes
 * back as flags with `status: null`, not as an error.
 */
export interface HardeningOverview {
  reachable: boolean;
  plugin_outdated: boolean;
  min_version: string;
  status: HardeningStatus | null;
  /** The platform's own open pause row. Only its presence is used here. */
  open_pause: Record<string, unknown> | null;
  pause_overdue: boolean;
  can?: HardeningAbilities;
}

/**
 * 200 body of the three hardening POSTs. `status` is nullable: the API's
 * mapper passes through whatever the plugin sent, and a plugin reply that
 * doesn't parse as a status object maps to `null` even on `success: true`.
 */
export interface HardeningActionResponse {
  success: boolean;
  message: string;
  warnings: string[];
  status: HardeningStatus | null;
  open_pause: Record<string, unknown> | null;
  pause_overdue: boolean;
  can?: HardeningAbilities;
}

/**
 * Body of a failed hardening POST. Two distinct shapes share this type,
 * distinguished by whether `status` is present at all (the API merges the
 * platform state — `warnings`, `open_pause`, `pause_overdue`, `can` — into
 * every response body that carries a `status` key, even when its value is
 * `null`):
 *  - 409 busy / 422 plugin refusal or rollback: a plugin-side reply, so
 *    `status`, `warnings`, `open_pause`, `pause_overdue` and `can` are all
 *    present (`status` itself may still be `null`).
 *  - 409 plugin_outdated (+ `min_version`) / 502 unauthorized / 502
 *    unreachable: a platform-level failure with no plugin reply at all, so
 *    only `success`, `reason` and `message` are present.
 * `reason` is a plain string (or `null` for a stale/garbage plugin reply) on
 * purpose: a newer plugin may send codes this build does not know.
 */
export interface HardeningErrorBody {
  success: false;
  reason: string | null;
  message: string;
  warnings?: string[];
  status?: HardeningStatus | null;
  open_pause?: Record<string, unknown> | null;
  pause_overdue?: boolean;
  can?: HardeningAbilities;
  min_version?: string;
}

export function createLsmApi(client: AxiosInstance) {
  const basePath = (projectId: number) => `/projects/${projectId}/lsm`;

  return {
    /**
     * Get LSM connection status
     */
    getStatus: (projectId: number) =>
      client.get<LsmStatus>(`${basePath(projectId)}/status`),

    /**
     * Get full health data
     */
    getHealth: (projectId: number) =>
      client.get<LsmHealth>(`${basePath(projectId)}/health`),

    /**
     * Get all installed themes
     */
    getThemes: (projectId: number) =>
      client.get<any>(`${basePath(projectId)}/themes`),

    /**
     * Generate SSO login token
     */
    generateLoginToken: (projectId: number) =>
      client.post<LsmLoginToken>(`${basePath(projectId)}/login-token`),

    /**
     * Clear all caches
     */
    clearCache: (projectId: number) =>
      client.post<LsmCacheResult>(`${basePath(projectId)}/clear-cache`),

    /**
     * Optimize database
     */
    optimizeDatabase: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/optimize-db`),

    /**
     * Cleanup database - removes revisions, transients, drafts, spam, trash, orphan meta
     */
    cleanupDatabase: (projectId: number, options?: {
      revisions?: boolean;
      transients?: boolean;
      drafts?: boolean;
      spam?: boolean;
      trash?: boolean;
      orphan_meta?: boolean;
    }) =>
      client.post<any>(`${basePath(projectId)}/cleanup-db`, options || {}),

    /**
     * Get database statistics for cleanup preview (counts for each category)
     */
    getDatabaseStats: (projectId: number) =>
      client.get<any>(`${basePath(projectId)}/database-stats`),

    /**
     * Flush rewrite rules
     */
    flushRewrite: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/flush-rewrite`),

    /**
     * Get available updates
     */
    getUpdates: (projectId: number) =>
      client.get<LsmUpdates>(`${basePath(projectId)}/updates`),

    /**
     * Get all installed plugins
     */
    getPlugins: (projectId: number) =>
      client.get<any>(`${basePath(projectId)}/plugins`),

    /**
     * Update a specific plugin (longer timeout for download + install)
     */
    updatePlugin: (projectId: number, slug: string) =>
      client.post<any>(`${basePath(projectId)}/update-plugin`, { slug }, { timeout: 120000 }),

    /**
     * Update all plugins (longer timeout for download + install)
     */
    updateAllPlugins: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/update-all-plugins`, {}, { timeout: 120000 }),

    /**
     * Activate a plugin
     */
    activatePlugin: (projectId: number, slug: string) =>
      client.post<any>(`${basePath(projectId)}/activate-plugin`, { slug }),

    /**
     * Deactivate a plugin
     */
    deactivatePlugin: (projectId: number, slug: string) =>
      client.post<any>(`${basePath(projectId)}/deactivate-plugin`, { slug }),

    /**
     * Delete a plugin
     */
    deletePlugin: (projectId: number, slug: string) =>
      client.post<any>(`${basePath(projectId)}/delete-plugin`, { slug }),

    /**
     * Update WordPress core
     */
    updateCore: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/update-core`),

    /**
     * Get recovery status
     */
    getRecoveryStatus: (projectId: number) =>
      client.get<LsmRecoveryStatus>(`${basePath(projectId)}/recovery-status`),

    /**
     * Enable maintenance mode
     */
    enableMaintenance: (projectId: number, message?: string) =>
      client.post<any>(`${basePath(projectId)}/enable-maintenance`, { message }),

    /**
     * Disable maintenance mode
     */
    disableMaintenance: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/disable-maintenance`),

    /**
     * Disable all plugins (emergency)
     */
    disablePlugins: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/disable-plugins`),

    /**
     * Restore disabled plugins
     */
    restorePlugins: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/restore-plugins`),

    /**
     * Switch to default theme
     */
    switchTheme: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/switch-theme`),

    /**
     * Activate a specific theme
     */
    activateTheme: (projectId: number, slug: string) =>
      client.post<any>(`${basePath(projectId)}/activate-theme`, { slug }),

    /**
     * Update a specific theme (longer timeout for download + install)
     */
    updateTheme: (projectId: number, slug: string) =>
      client.post<any>(`${basePath(projectId)}/update-theme`, { slug }, { timeout: 120000 }),

    /**
     * Execute full emergency recovery
     */
    emergencyRecovery: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/emergency-recovery`),

    /**
     * Download the plugin zip
     */
    downloadPlugin: (projectId: number) =>
      client.get(`${basePath(projectId)}/download-plugin`, { responseType: 'blob' }),

    // ================================================================
    // PHP ERROR MONITORING
    // ================================================================

    /**
     * Get PHP errors directly from WordPress
     */
    getPhpErrorsFromWp: (projectId: number, params?: { type?: string; limit?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.type) queryParams.set('type', params.type);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      const query = queryParams.toString();
      return client.get<any>(`${basePath(projectId)}/php-errors${query ? `?${query}` : ''}`);
    },

    /**
     * Get PHP error statistics from WordPress
     */
    getPhpErrorStatsFromWp: (projectId: number) =>
      client.get<any>(`${basePath(projectId)}/php-errors/stats`),

    /**
     * Sync PHP errors from WordPress to local database
     */
    syncPhpErrors: (projectId: number) =>
      client.post<{ success: boolean; synced: number; skipped: number; synced_at: string }>(`${basePath(projectId)}/php-errors/sync`),

    /**
     * Clear PHP errors on WordPress site
     */
    clearPhpErrorsOnWp: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/php-errors/clear`),

    // ================================================================
    // ACTIVITY LOG
    // ================================================================

    /**
     * Get activity log from WordPress
     */
    getActivityFromWp: (projectId: number, params?: { limit?: number; action?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.action) queryParams.set('action', params.action);
      const query = queryParams.toString();
      return client.get<{
        success: boolean;
        activity: Array<{
          action: string;
          status: string;
          context: Record<string, any>;
          timestamp: string;
          user_ip: string;
          user_id: number;
          username: string | null;
        }>;
        total: number;
      }>(`${basePath(projectId)}/activity${query ? `?${query}` : ''}`);
    },

    /**
     * Get activity statistics from WordPress
     */
    getActivityStatsFromWp: (projectId: number) =>
      client.get<{
        success: boolean;
        stats: {
          total: number;
          by_action: Record<string, number>;
          by_status: Record<string, number>;
          last_activity: string | null;
        };
      }>(`${basePath(projectId)}/activity/stats`),

    // ================================================================
    // SITE INFO & SECURITY SETTINGS
    // ================================================================

    /**
     * Get comprehensive site information (users, content, comments)
     */
    getSiteInfo: (projectId: number) =>
      client.get<{
        success: boolean;
        data: {
          users: { total: number; by_role: Record<string, number> };
          content: {
            posts: { published: number; draft: number; trash: number; total: number };
            pages: { published: number; draft: number; total: number };
            media: number;
          };
          comments: { total: number; approved: number; pending: number; spam: number; trash: number };
          settings: {
            comments_enabled: boolean;
            registration_enabled: boolean;
            xmlrpc_enabled: boolean;
            rest_api_public: boolean;
          };
        };
      }>(`${basePath(projectId)}/site-info`),

    /**
     * Get list of WordPress users
     */
    getUsers: (projectId: number) =>
      client.get<{
        success: boolean;
        data: Array<{
          id: number;
          username: string;
          email: string;
          display_name: string;
          roles: string[];
          registered: string;
          last_login: string | null;
        }>;
      }>(`${basePath(projectId)}/users`),

    /**
     * Get security settings
     */
    getSecuritySettings: (projectId: number) =>
      client.get<{
        success: boolean;
        data: {
          comments_enabled: boolean;
          registration_enabled: boolean;
          xmlrpc_enabled: boolean;
          rest_api_public: boolean;
          file_editing_disabled: boolean;
          debug_enabled: boolean;
          security_headers_enabled: boolean;
        };
      }>(`${basePath(projectId)}/security-settings`),

    /**
     * Update security settings
     */
    updateSecuritySettings: (projectId: number, settings: {
      comments_enabled?: boolean;
      registration_enabled?: boolean;
      xmlrpc_enabled?: boolean;
      rest_api_public?: boolean;
      file_editing_disabled?: boolean;
      debug_enabled?: boolean;
      security_headers_enabled?: boolean;
    }) =>
      client.post<{ success: boolean; message: string; changes: Record<string, boolean> }>(
        `${basePath(projectId)}/security-settings`,
        settings
      ),

    /**
     * Get security headers status
     */
    getSecurityHeaders: (projectId: number) =>
      client.get<{
        success: boolean;
        data: {
          headers: Record<string, {
            name: string;
            description: string;
            recommendation: string;
            present: boolean;
            value: string | null;
          }>;
          score: number;
          present_count: number;
          total_count: number;
        };
      }>(`${basePath(projectId)}/security-headers`),

    /**
     * Get security header configuration snippets for Apache, Nginx, and PHP
     */
    getSecurityHeaderSnippets: (projectId: number) =>
      client.get<{
        success: boolean;
        data: {
          apache: string;
          nginx: string;
          php: string;
        };
      }>(`${basePath(projectId)}/security-headers/snippets`),

    // ================================================================
    // SERVER HARDENING (.htaccess)
    // ================================================================

    /**
     * Get managed .htaccess hardening status (always answers 200, see HardeningOverview)
     */
    getHardening: (projectId: number) =>
      // The API waits up to 30 s for the plugin; the client default is 30 s too, so without
      // this the browser gives up first and a hanging site never reaches the quiet state.
      client.get<HardeningOverview>(`${basePath(projectId)}/hardening`, { timeout: 40000 }),

    /**
     * Turn one hardening rule on or off. The API waits up to 120 s for the
     * plugin's write + self-test, so the browser has to wait longer than that.
     */
    setHardeningRule: (projectId: number, rule: HardeningRuleKey, enabled: boolean) =>
      client.post<HardeningActionResponse>(
        `${basePath(projectId)}/hardening/rule`,
        { rule, enabled },
        { timeout: 130000 }
      ),

    /**
     * Pause the archive rule for a download (same long timeout as above)
     */
    pauseHardening: (projectId: number, minutes: HardeningPauseMinutes) =>
      client.post<HardeningActionResponse>(
        `${basePath(projectId)}/hardening/pause`,
        { minutes },
        { timeout: 130000 }
      ),

    /**
     * Put the archive rule back before the pause runs out (same long timeout as above)
     */
    resumeHardening: (projectId: number) =>
      client.post<HardeningActionResponse>(
        `${basePath(projectId)}/hardening/resume`,
        {},
        { timeout: 130000 }
      ),

    // =========================================================================
    // SECURITY SCANNING
    // =========================================================================

    /**
     * Trigger a security scan on the WordPress site
     */
    triggerSecurityScan: (projectId: number, scanType: 'full' | 'standard' | 'quick' = 'full', modules?: string) =>
      client.post<{ success: boolean; data: any }>(
        `${basePath(projectId)}/security-scan`,
        { scan_type: scanType, modules },
        { timeout: scanType === 'full' ? 660000 : scanType === 'standard' ? 210000 : 90000 }
      ),

    /**
     * Get security scan history for a project
     */
    getSecurityScans: (projectId: number, limit = 20) =>
      client.get<{ success: boolean; data: any[] }>(
        `${basePath(projectId)}/security-scans`,
        { params: { limit } }
      ),

    /**
     * Get the latest completed scan for a project
     */
    getLatestScan: (projectId: number) =>
      client.get<{ success: boolean; data: any }>(
        `${basePath(projectId)}/security-scans/latest`
      ),

    /**
     * Get scan statistics for a project
     */
    getScanStats: (projectId: number) =>
      client.get<{ success: boolean; data: any }>(
        `${basePath(projectId)}/security-scans/stats`
      ),

    /**
     * Delete a security scan
     */
    deleteSecurityScan: (projectId: number, scanId: number) =>
      client.delete<{ success: boolean; message: string }>(
        `${basePath(projectId)}/security-scans/${scanId}`
      ),

    /**
     * Get real-time scan progress (polls WP transient)
     */
    getScanProgress: (projectId: number) =>
      client.get<{ success: boolean; scanning: boolean; data: any }>(
        `${basePath(projectId)}/security-scans/progress`
      ),

    // =========================================================================
    // WP ACCOUNT SYNC
    // =========================================================================

    /**
     * Trigger full sync of WordPress user accounts for team members
     */
    syncWpAccounts: (projectId: number) =>
      client.post<{ success: boolean; message: string }>(
        `${basePath(projectId)}/sync-wp-accounts`
      ),

    // =========================================================================
    // MEDIA
    // =========================================================================

    getUnusedMedia: (projectId: number) =>
      client.get(`${basePath(projectId)}/unused-media`),

    deleteMedia: (projectId: number, ids: number[]) =>
      client.post(`${basePath(projectId)}/delete-media`, { ids }),
  };
}

export type LsmApi = ReturnType<typeof createLsmApi>;
