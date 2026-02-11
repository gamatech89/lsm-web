/**
 * Shared Constants for Project Features
 * 
 * Centralizes options that are used across multiple components
 * to ensure consistency and easier maintenance.
 */

export const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Critical', value: 'critical' },
];

export const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

// Consistent control height for form elements
export const CONTROL_HEIGHT = 40;
