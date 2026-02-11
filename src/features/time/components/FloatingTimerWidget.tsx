/**
 * Floating Timer Widget Component
 *
 * A Toggl-style floating timer button in the bottom-right corner
 * with popup form for starting time entries.
 * Uses Landeseiten brand colors.
 */

import { useEffect, useState, useRef } from 'react';
import { Button, Select, Space, Typography, Tooltip, Popconfirm, Tag, Input, App, Card } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  CloseOutlined,
  MinusOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  useTimerStore,
  calculateElapsedSeconds,
  formatDuration,
} from '@/stores/timer';
import { useAuthStore } from '@/stores/auth';

const { Text } = Typography;

// Landeseiten Brand Colors
const BRAND = {
  deepPurple: '#440C71',
  vibrantPurple: '#6B21A8',
  teal: '#3AA68D',
  tealLight: '#52B37C',
  accentViolet: '#A13CF0',
  darkPurple: '#2D0A4E',
};

interface TimerResponse {
  success: boolean;
  data: {
    id: number;
    project_id: number;
    description: string | null;
    started_at: string;
    is_billable: boolean;
    project?: { id: number; name: string; url: string };
  } | null;
  message?: string;
}

interface ProjectItem {
  id: number;
  name: string;
  url: string;
}

export function FloatingTimerWidget() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const popupRef = useRef<HTMLDivElement>(null);

  // Import auth store to check user role
  const user = useAuthStore((state) => state.user);
  
  // Hide for admin users - they don't track time
  if (user?.role === 'admin') {
    return null;
  }
  
  const {
    runningTimer,
    elapsedSeconds,
    setRunningTimer,
    setElapsedSeconds,
    incrementElapsed,
    clearTimer,
    isPopupOpen,
    setIsPopupOpen
  } = useTimerStore();

  // Local state
  const [isMinimized, setIsMinimized] = useState(false);

  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  // Fetch current timer on mount
  const { data: currentTimer, isFetching } = useQuery({
    queryKey: ['timer', 'current'],
    queryFn: () => api.timer.getCurrent().then((r: { data: TimerResponse }) => r.data || null),
    refetchInterval: 60000,
  });

  // Fetch project options
  const { data: projects } = useQuery({
    queryKey: ['timer', 'projects'],
    queryFn: () => api.timer.getProjects().then((r: { data: { success: boolean; data: ProjectItem[] } }) => r.data.data),
  });

  // Start timer mutation
  const startMutation = useMutation({
    mutationFn: (data: { project_id: number; description?: string }) =>
      api.timer.start(data).then((r: { data: TimerResponse }) => r.data),
    onSuccess: (response: TimerResponse) => {
      if (response.data) {
        const entry = response.data;
        setRunningTimer({
          id: entry.id,
          project_id: entry.project_id,
          project_name: entry.project?.name || 'Unknown',
          description: entry.description,
          started_at: entry.started_at,
          is_billable: entry.is_billable,
        });
        setElapsedSeconds(0);
        message.success('Timer started!');
      }
      setSelectedProject(null);
      setDescription('');
      setIsPopupOpen(false);
      queryClient.invalidateQueries({ queryKey: ['timer'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to start timer');
    },
  });

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: (data?: { description?: string }) =>
      api.timer.stop(data).then((r: { data: TimerResponse }) => r.data),
    onSuccess: () => {
      clearTimer();
      message.success('Time logged successfully!');
      queryClient.invalidateQueries({ queryKey: ['timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to stop timer');
    },
  });

  // Discard timer mutation
  const discardMutation = useMutation({
    mutationFn: () => api.timer.discard().then((r: { data: { success: boolean; message?: string } }) => r.data),
    onSuccess: () => {
      clearTimer();
      message.info('Timer discarded');
      queryClient.invalidateQueries({ queryKey: ['timer'] });
    },
  });

  // Sync with server state
  useEffect(() => {
    if (currentTimer?.data && !runningTimer) {
      const entry = currentTimer.data;
      setRunningTimer({
        id: entry.id,
        project_id: entry.project_id,
        project_name: entry.project?.name || 'Unknown',
        description: entry.description,
        started_at: entry.started_at,
        is_billable: entry.is_billable,
      });
      setElapsedSeconds(calculateElapsedSeconds(entry.started_at));
    } else if (!currentTimer?.data && runningTimer && !isFetching) {
      clearTimer();
    }
  }, [currentTimer, isFetching]);

  // Tick the timer every second
  useEffect(() => {
    if (!runningTimer) return;
    setElapsedSeconds(calculateElapsedSeconds(runningTimer.started_at));
    const interval = setInterval(() => incrementElapsed(), 1000);
    return () => clearInterval(interval);
  }, [runningTimer?.id]);

  // Close popup on outside click (but not when clicking dropdown portals)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't close if clicking inside the popup
      if (popupRef.current && popupRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on Ant Design dropdown portals
      if (target.closest('.ant-select-dropdown') || 
          target.closest('.ant-popover') ||
          target.closest('.ant-popconfirm')) {
        return;
      }
      
      // Close popup if not running
      if (!runningTimer) {
        setIsPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [runningTimer]);

  // Handle start timer
  const handleStart = () => {
    if (!selectedProject) {
      message.warning('Please select a project');
      return;
    }
    startMutation.mutate({
      project_id: selectedProject,
      description: description || undefined,
    });
  };

  // If timer is running, show running state
  if (runningTimer) {
    // Minimized state - compact pill
    if (isMinimized) {
      return (
        <div style={styles.floatingContainer} ref={popupRef}>
          <Tooltip title="Expand timer" placement="left">
            <Button
              type="primary"
              shape="round"
              size="large"
              onClick={() => setIsMinimized(false)}
              style={styles.minimizedPill}
            >
              <div style={styles.pulsingDotSmall} />
              <span style={styles.minimizedTime}>{formatDuration(elapsedSeconds)}</span>
              <ExpandOutlined style={{ marginLeft: 8, fontSize: 14 }} />
            </Button>
          </Tooltip>
        </div>
      );
    }

    // Expanded running state
    return (
      <div style={styles.floatingContainer} ref={popupRef}>
        <div style={styles.runningWidget}>
          {/* Header with minimize */}
          <div style={styles.runningHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={styles.pulsingDot} />
              <Text style={styles.timerTime}>{formatDuration(elapsedSeconds)}</Text>
            </div>
            <Tooltip title="Minimize">
              <Button
                type="text"
                icon={<MinusOutlined />}
                onClick={() => setIsMinimized(true)}
                style={{ color: 'rgba(255,255,255,0.7)' }}
                size="small"
              />
            </Tooltip>
          </div>

          {/* Project info */}
          <div style={styles.runningInfo}>
            <Tag color={BRAND.vibrantPurple} style={{ margin: 0 }}>
              {runningTimer.project_name}
            </Tag>
            {runningTimer.description && (
              <Text style={styles.runningDesc} ellipsis>
                {runningTimer.description}
              </Text>
            )}
          </div>

          {/* Actions */}
          <div style={styles.runningActions}>
            <Button
              type="primary"
              size="large"
              icon={<PauseCircleOutlined />}
              onClick={() => stopMutation.mutate({})}
              loading={stopMutation.isPending}
              style={styles.stopButton}
              block
            >
              Stop & Save
            </Button>
            <Popconfirm
              title="Discard timer?"
              description="Time will not be saved."
              onConfirm={() => discardMutation.mutate()}
              okText="Discard"
              placement="topRight"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{ color: 'rgba(255,255,255,0.7)' }}
              />
            </Popconfirm>
          </div>
        </div>
      </div>
    );
  }

  // Not running - show floating button or popup
  return (
    <div style={styles.floatingContainer} ref={popupRef}>
      {isPopupOpen ? (
        <Card
          style={styles.popup}
          styles={{ body: { padding: 20 } }}
          title={
            <div style={styles.popupHeader}>
              <ClockCircleOutlined style={{ color: BRAND.accentViolet, marginRight: 8 }} />
              <span>Start Timer</span>
            </div>
          }
          extra={
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setIsPopupOpen(false)}
              size="small"
            />
          }
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* Project selection */}
            <div>
              <Text strong style={styles.label}>Project</Text>
              <Select
                placeholder="Select a project..."
                style={{ width: '100%', marginTop: 4 }}
                size="large"
                value={selectedProject}
                onChange={setSelectedProject}
                options={projects?.map((p: ProjectItem) => ({ label: p.name, value: p.id })) || []}
                loading={!projects}
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>

            {/* Description */}
            <div>
              <Text strong style={styles.label}>What are you working on?</Text>
              <Input.TextArea
                placeholder="Describe your task..."
                style={{ marginTop: 4 }}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Start button */}
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={startMutation.isPending}
              disabled={!selectedProject}
              style={styles.startButtonLarge}
              block
            >
              Start Timer
            </Button>
          </Space>
        </Card>
      ) : (
        <Tooltip title="Start Timer" placement="left">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<PlayCircleOutlined style={{ fontSize: 28 }} />}
            onClick={() => setIsPopupOpen(true)}
            style={styles.fab}
          />
        </Tooltip>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  floatingContainer: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 1000,
  },

  fab: {
    width: 64,
    height: 64,
    background: `linear-gradient(135deg, ${BRAND.deepPurple} 0%, ${BRAND.vibrantPurple} 100%)`,
    border: 'none',
    boxShadow: '0 6px 24px rgba(68, 12, 113, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },

  popup: {
    width: 320,
    borderRadius: 16,
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.2)',
    border: `1px solid ${BRAND.vibrantPurple}20`,
  },

  popupHeader: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: 16,
  },

  label: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  startButtonLarge: {
    height: 48,
    background: `linear-gradient(135deg, ${BRAND.teal} 0%, ${BRAND.tealLight} 100%)`,
    border: 'none',
    fontWeight: 600,
    fontSize: 16,
  },

  // Running state
  runningWidget: {
    background: `linear-gradient(135deg, ${BRAND.deepPurple} 0%, ${BRAND.vibrantPurple} 100%)`,
    borderRadius: 16,
    padding: 16,
    minWidth: 280,
    boxShadow: '0 8px 32px rgba(68, 12, 113, 0.5)',
  },

  runningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#ef4444',
    animation: 'pulse 2s infinite',
  },

  timerTime: {
    fontFamily: 'monospace',
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '2px',
  },

  runningInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 16,
  },

  runningDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 4,
  },

  runningActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },

  stopButton: {
    background: `linear-gradient(135deg, #dc2626 0%, #ef4444 100%)`,
    border: 'none',
    height: 44,
    fontWeight: 600,
  },

  // Minimized state
  minimizedPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingLeft: 16,
    paddingRight: 16,
    background: `linear-gradient(135deg, ${BRAND.deepPurple} 0%, ${BRAND.vibrantPurple} 100%)`,
    border: 'none',
    boxShadow: '0 4px 16px rgba(68, 12, 113, 0.4)',
  },

  pulsingDotSmall: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ef4444',
    animation: 'pulse 2s infinite',
  },

  minimizedTime: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '1px',
  },
};

// Add CSS animation for pulsing dot
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  
  .timer-fab:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 32px rgba(68, 12, 113, 0.5);
  }
`;
if (!document.getElementById('timer-animations')) {
  styleSheet.id = 'timer-animations';
  document.head.appendChild(styleSheet);
}
