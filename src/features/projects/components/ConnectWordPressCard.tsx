/**
 * Connect WordPress Card - Reusable component for API key connection
 * 
 * Displays a beautiful connection UI when WordPress is not connected.
 * Can be used in MaintenanceSection, SettingsSection, or any other section.
 */

import { useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Input,
  Space,
  App,
} from 'antd';
import {
  ApiOutlined,
  SaveOutlined,
  RocketOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useThemeStore } from '@/stores/theme';

const { Title, Text, Paragraph } = Typography;

interface ConnectWordPressCardProps {
  project: any;
  compact?: boolean; // For inline use in Settings
}

export function ConnectWordPressCard({ project, compact = false }: ConnectWordPressCardProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [downloadingPlugin, setDownloadingPlugin] = useState(false);

  // Save API Key
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      message.error('Please enter an API key');
      return;
    }
    setSavingApiKey(true);
    try {
      await api.projects.update(project.id, { health_check_secret: apiKeyInput });
      message.success('API key saved successfully! Connection established.');
      // Invalidate and refetch to update UI
      await queryClient.invalidateQueries({ queryKey: ['projects', project.id] });
      await queryClient.invalidateQueries({ queryKey: ['lsm-status', project.id] });
      await queryClient.refetchQueries({ queryKey: ['projects', project.id] });
    } catch (error) {
      message.error('Failed to save API key');
    } finally {
      setSavingApiKey(false);
    }
  };

  // Download Plugin
  const handleDownloadPlugin = async () => {
    setDownloadingPlugin(true);
    try {
      const response = await api.lsm.downloadPlugin(project.id);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'landeseiten-maintenance.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('Plugin downloaded! Install it on your WordPress site.');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download plugin');
    } finally {
      setDownloadingPlugin(false);
    }
  };

  // Compact version for Settings section
  if (compact) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>API Key</Text>
          <Input.Password
            placeholder="Paste API key from WordPress plugin..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onPressEnter={handleSaveApiKey}
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            Find this in WP Admin → Landeseiten → API Connection
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingApiKey}
            onClick={handleSaveApiKey}
          >
            Save & Connect
          </Button>
          <Button
            type="link"
            icon={<RocketOutlined />}
            onClick={handleDownloadPlugin}
            loading={downloadingPlugin}
          >
            Download Plugin
          </Button>
        </Space>
      </Space>
    );
  }

  // Full version for MaintenanceSection
  return (
    <div style={{ padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        }}>
          <ApiOutlined style={{ fontSize: 36, color: '#fff' }} />
        </div>
        <Title level={4} style={{ marginBottom: 8 }}>Connect WordPress Site</Title>
        <Paragraph type="secondary" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
          Install the <strong>Landeseiten Maintenance</strong> plugin on your WordPress site, 
          then paste the API key below to enable remote management.
        </Paragraph>
      </div>
      
      <Card 
        style={{ 
          maxWidth: 500, 
          margin: '0 auto', 
          borderRadius: 12,
          background: isDark ? '#1e293b' : '#fff',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>API Key</Text>
          <Input.Password
            size="large"
            placeholder="Paste API key from Landeseiten Maintenance plugin..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onPressEnter={handleSaveApiKey}
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
            Find this in WordPress Admin → Landeseiten → API Connection
          </Text>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={savingApiKey}
          onClick={handleSaveApiKey}
          block
          size="large"
        >
          Save & Connect
        </Button>
      </Card>
      
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Don't have the plugin yet?
        </Text>
        <Button 
          icon={<RocketOutlined />}
          onClick={handleDownloadPlugin}
          loading={downloadingPlugin}
        >
          Download Plugin
        </Button>
      </div>
    </div>
  );
}
