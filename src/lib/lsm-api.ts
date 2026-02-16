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
     * Update a specific plugin
     */
    updatePlugin: (projectId: number, slug: string) =>
      client.post<any>(`${basePath(projectId)}/update-plugin`, { slug }),

    /**
     * Update all plugins
     */
    updateAllPlugins: (projectId: number) =>
      client.post<any>(`${basePath(projectId)}/update-all-plugins`),

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

    // =========================================================================
    // SECURITY SCANNING
    // =========================================================================

    /**
     * Trigger a security scan on the WordPress site
     */
    triggerSecurityScan: (projectId: number, scanType: 'full' | 'quick' = 'full', modules?: string) =>
      client.post<{ success: boolean; data: any }>(
        `${basePath(projectId)}/security-scan`,
        { scan_type: scanType, modules },
        { timeout: 150000 } // 2.5 min timeout for scans
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
  };
}

export type LsmApi = ReturnType<typeof createLsmApi>;
