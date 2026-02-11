import { Card, Typography, Button, App } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';
import { useTranslation } from 'react-i18next';
import { useTimerStore } from '@/stores/timer';

const { Text } = Typography;

export function ActiveTimerWidget() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { 
    runningTimer, 
    elapsedSeconds, 
    clearTimer, 
    setIsPopupOpen 
  } = useTimerStore();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: () => api.timer.stop().then(r => r.data),
    onSuccess: () => {
      clearTimer();
      message.success('Time logged successfully!');
      queryClient.invalidateQueries({ queryKey: ['timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: () => {
      message.error('Failed to stop timer');
    },
  });

  if (!runningTimer) {
    return (
      <Card
        style={{
          borderRadius: 16,
          border: 'none',
          background: isDark 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 22,
              }}
            >
              <PlayCircleOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>{t('dashboard.noTimerRunning')}</Text>
              <div style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>{t('dashboard.startTracking')}</div>
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={() => setIsPopupOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
              border: 'none',
              borderRadius: 10,
              height: 44,
              fontWeight: 600,
            }}
          >
            {t('dashboard.startTimer')}
          </Button>
        </div>
      </Card>
    );
  }

  // Calculate formatted duration string from elapsedSeconds
  const hours = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const secs = elapsedSeconds % 60;
  const formattedDuration = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <Card
      style={{
        borderRadius: 16,
        border: 'none',
        background: isDark 
          ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(107, 33, 168, 0.15) 100%)'
          : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(255, 255, 255, 0.95) 100%)',
        marginBottom: 24,
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              animation: 'pulse 2s infinite',
            }}
          >
            <ClockCircleOutlined />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>{t('dashboard.timerRunning')}</Text>
            <div style={{ fontWeight: 700, fontSize: 28, fontFamily: 'monospace', marginTop: 2 }}>
              {formattedDuration}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            {runningTimer.project_name}
          </div>
          <Button
            type="primary"
            danger
            size="large"
            icon={<PauseCircleOutlined />}
            loading={stopMutation.isPending}
            onClick={() => stopMutation.mutate()}
            style={{
              borderRadius: 10,
              height: 44,
              fontWeight: 600,
            }}
          >
            {t('dashboard.stopTimer')}
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </Card>
  );
}


