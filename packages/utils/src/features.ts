/**
 * Feature Flags
 *
 * Controls which modules are enabled in the application.
 * Future modules can be toggled on/off here.
 */

export interface FeatureFlags {
  // Phase 1 - Current (Maintenance)
  maintenance: boolean;
  projects: boolean;
  credentials: boolean;
  vault: boolean;
  todos: boolean;
  maintenanceReports: boolean;
  healthMonitoring: boolean;
  
  // Phase 2 - Future (Deployment)
  deployment: boolean;
  cicd: boolean;
  serverManagement: boolean;
  
  // Phase 3 - Future (Design)
  design: boolean;
  figmaIntegration: boolean;
  componentLibrary: boolean;
  
  // Analytics & Extras
  analytics: boolean;
  publicApi: boolean;
}

/**
 * Current feature configuration
 */
export const features: FeatureFlags = {
  // Phase 1 - Enabled
  maintenance: true,
  projects: true,
  credentials: true,
  vault: true,
  todos: true,
  maintenanceReports: true,
  healthMonitoring: true,
  
  // Phase 2 - Disabled (future)
  deployment: false,
  cicd: false,
  serverManagement: false,
  
  // Phase 3 - Disabled (future)
  design: false,
  figmaIntegration: false,
  componentLibrary: false,
  
  // Extras - Disabled
  analytics: false,
  publicApi: false,
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return features[feature] ?? false;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): (keyof FeatureFlags)[] {
  return (Object.keys(features) as (keyof FeatureFlags)[]).filter(
    key => features[key]
  );
}
