/**
 * Timer Widget Component
 *
 * Global timer widget that appears in the header.
 * Shows current running timer or quick-start options.
 */

import { useEffect, useState } from 'react';
import { Button, Select, Space, Typography, Tooltip, Popconfirm, Tag, Input, App } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  useTimerStore,
  calculateElapsedSeconds,
  formatDuration,
} from '@/stores/timer';

const { Text } = Typography;

export function TimerWidget() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  
  const {
    runningTimer,
    elapsedSeconds,
    isLoading,
    setRunningTimer,
    setElapsedSeconds,
    incrementElapsed,
    setLoading,
    clearTimer,
  } = useTimerStore();

  // Local state for quick start
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [showInput, setShowInput] = useState(false);

  // Fetch current timer on mount
  const { data: currentTimer, isFetching } = useQuery({
    queryKey: ['timer', 'current'],
    queryFn: () => api.timer.getCurrent().then(r => r.data),
    refetchInterval: 60000, // Sync every minute
  });

  // Fetch project options
  const { data: projects } = useQuery({
    queryKey: ['timer', 'projects'],
    queryFn: () => api.timer.getProjects().then(r => r.data.data),
  });

  // Start timer mutation
  const startMutation = useMutation({
    mutationFn: (data: { project_id: number; description?: string }) =>
      api.timer.start(data).then(r => r.data),
    onSuccess: (response) => {
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
        message.success('Timer started');
      }
      setSelectedProject(null);
      setDescription('');
      setShowInput(false);
      queryClient.invalidateQueries({ queryKey: ['timer'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to start timer');
    },
  });

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: (data?: { description?: string }) =>
      api.timer.stop(data).then(r => r.data),
    onSuccess: () => {
      clearTimer();
      message.success('Timer stopped');
      queryClient.invalidateQueries({ queryKey: ['timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to stop timer');
    },
  });

  // Discard timer mutation
  const discardMutation = useMutation({
    mutationFn: () => api.timer.discard().then(r => r.data),
    onSuccess: () => {
      clearTimer();
      message.info('Timer discarded');
      queryClient.invalidateQueries({ queryKey: ['timer'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to discard timer');
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
      // Server says no timer, clear local state
      clearTimer();
    }
  }, [currentTimer, isFetching]);

  // Tick the timer every second
  useEffect(() => {
    if (!runningTimer) return;

    // Initial sync
    setElapsedSeconds(calculateElapsedSeconds(runningTimer.started_at));

    const interval = setInterval(() => {
      incrementElapsed();
    }, 1000);

    return () => clearInterval(interval);
  }, [runningTimer?.id]);

  // Update loading state
  useEffect(() => {
    setLoading(startMutation.isPending || stopMutation.isPending || discardMutation.isPending);
  }, [startMutation.isPending, stopMutation.isPending, discardMutation.isPending]);

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

  // If timer is running, show the running state
  if (runningTimer) {
    return (
      <div style={styles.container}>
        <div style={styles.runningTimer}>
          {/* Timer display */}
          <div style={styles.timerDisplay}>
            <ClockCircleOutlined style={{ color: '#ef4444', marginRight: 8 }} />
            <Text strong style={styles.time}>
              {formatDuration(elapsedSeconds)}
            </Text>
          </div>

          {/* Project name */}
          <Tag color="purple" style={{ margin: '0 12px' }}>
            {runningTimer.project_name}
          </Tag>

          {/* Description (if any) */}
          {runningTimer.description && (
            <Text type="secondary" ellipsis style={{ maxWidth: 150 }}>
              {runningTimer.description}
            </Text>
          )}

          {/* Actions */}
          <Space style={{ marginLeft: 12 }}>
            <Tooltip title="Stop Timer">
              <Button
                type="primary"
                danger
                icon={<PauseCircleOutlined />}
                onClick={() => stopMutation.mutate({})}
                loading={stopMutation.isPending}
              >
                Stop
              </Button>
            </Tooltip>

            <Popconfirm
              title="Discard this timer?"
              description="Time will not be saved."
              onConfirm={() => discardMutation.mutate()}
              okText="Discard"
              cancelText="Cancel"
            >
              <Tooltip title="Discard Timer">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={discardMutation.isPending}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        </div>
      </div>
    );
  }

  // Not running - show quick start
  return (
    <div style={styles.container}>
      <Space>
        {showInput ? (
          <>
            <Select
              placeholder="Select project..."
              style={{ width: 180 }}
              value={selectedProject}
              onChange={setSelectedProject}
              options={projects?.map(p => ({ label: p.name, value: p.id })) || []}
              loading={!projects}
              showSearch
              optionFilterProp="label"
            />
            <Input
              placeholder="What are you working on?"
              style={{ width: 200 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPressEnter={handleStart}
            />
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={startMutation.isPending}
              disabled={!selectedProject}
            >
              Start
            </Button>
            <Button type="text" onClick={() => setShowInput(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="default"
            icon={<PlayCircleOutlined />}
            onClick={() => setShowInput(true)}
            style={styles.startButton}
          >
            Start Timer
          </Button>
        )}
      </Space>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
  },
  runningTimer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(239, 68, 68, 0.1)',
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  timerDisplay: {
    display: 'flex',
    alignItems: 'center',
  },
  time: {
    fontFamily: 'monospace',
    fontSize: 16,
    color: '#ef4444',
  },
  startButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};
