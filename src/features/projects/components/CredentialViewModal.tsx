import { useState } from 'react';
import {
  Modal,
  Typography,
  Space,
  Tag,
  Button,
  Divider,
  App,
  Tooltip,
} from 'antd';
import {
  LockOutlined,
  UserOutlined,
  LinkOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CloudServerOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Credential } from '@lsm/types';
import { useThemeStore } from '@/stores/theme';

const { Text, Title } = Typography;

interface CredentialViewModalProps {
  open: boolean;
  onClose: () => void;
  credential: Credential | null;
}

const typeColor = (type: string) => {
  switch (type) {
    case 'ssh': return 'geekblue';
    case 'database': return 'orange';
    case 'wordpress': return 'blue';
    case 'ftp': return 'cyan';
    case 'api': return 'purple';
    case 'email': return 'green';
    case 'hosting': return 'magenta';
    default: return 'default';
  }
};

function Field({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
        {label}
      </Text>
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
        borderRadius: 6,
        padding: '6px 10px',
        fontFamily: mono ? 'monospace' : undefined,
        fontSize: mono ? 13 : 14,
        wordBreak: 'break-all',
      }}>
        {value}
      </div>
    </div>
  );
}

export function CredentialViewModal({ open, onClose, credential }: CredentialViewModalProps) {
  const { message } = App.useApp();
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const revealMutation = useMutation({
    mutationFn: () => api.credentials.reveal(credential!.id),
    onSuccess: (res) => {
      const pwd = res.data.data?.password;
      if (pwd) {
        setRevealedPassword(pwd);
        navigator.clipboard.writeText(pwd);
        message.success('Password copied to clipboard');
      }
    },
    onError: () => message.error('Failed to reveal password'),
  });

  const handleClose = () => {
    setRevealedPassword(null);
    setShowPassword(false);
    onClose();
  };

  if (!credential) return null;

  const meta = (credential.metadata ?? {}) as Record<string, string | undefined>;
  const isSSH = credential.type === 'ssh';
  const hasHostInfo = !!(meta.hostname || meta.port);
  const hasDbName = !!meta.database_name;
  const isKeyAuth = !!meta.key_auth;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={520}
      title={null}
      footer={
        <Button onClick={handleClose}>Close</Button>
      }
      destroyOnClose
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Space size={10}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LockOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>{credential.title}</Title>
            <Space size={6} style={{ marginTop: 2 }}>
              <Tag color={typeColor(credential.type)} style={{ margin: 0 }}>
                {credential.type?.toUpperCase()}
              </Tag>
              {isKeyAuth && <Tag color="geekblue" style={{ margin: 0 }}>Key Auth</Tag>}
            </Space>
          </div>
        </Space>
      </div>

      <Divider style={{ margin: '0 0 16px' }} />

      {/* Connection info */}
      {hasHostInfo && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
            <CloudServerOutlined style={{ marginRight: 4 }} />Host / Port
          </Text>
          <div style={{ display: 'flex', gap: 8 }}>
            {meta.hostname && (
              <div style={{ flex: 1, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 }}>
                {meta.hostname}
              </div>
            )}
            {meta.port && (
              <div style={{ width: 70, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '6px 10px', fontFamily: 'monospace', fontSize: 13, textAlign: 'center' }}>
                {meta.port}
              </div>
            )}
          </div>
        </div>
      )}

      {hasDbName && <Field label="Database Name" value={meta.database_name} mono />}

      <Field label="Username" value={credential.username} mono />

      {/* Password row */}
      {(credential.has_password && !isKeyAuth) && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
            <LockOutlined style={{ marginRight: 4 }} />Password
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <div style={{
              flex: 1,
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRight: 'none',
              borderRadius: '6px 0 0 6px',
              padding: '6px 10px',
              fontFamily: 'monospace',
              fontSize: 13,
              minHeight: 34,
              display: 'flex',
              alignItems: 'center',
            }}>
              {revealedPassword
                ? (showPassword ? revealedPassword : '••••••••••••')
                : '••••••••'}
            </div>
            {revealedPassword && (
              <Tooltip title={showPassword ? 'Hide' : 'Show'}>
                <Button
                  icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowPassword(v => !v)}
                  style={{ borderRadius: 0 }}
                />
              </Tooltip>
            )}
            <Tooltip title={revealedPassword ? 'Copy again' : 'Reveal & copy'}>
              <Button
                icon={<CopyOutlined />}
                loading={revealMutation.isPending}
                onClick={() => {
                  if (revealedPassword) {
                    navigator.clipboard.writeText(revealedPassword);
                    message.success('Copied');
                  } else {
                    revealMutation.mutate();
                  }
                }}
                style={{ borderRadius: revealedPassword ? 0 : '0 6px 6px 0' }}
              >
                {revealedPassword ? 'Copy' : 'Reveal & Copy'}
              </Button>
            </Tooltip>
            {revealedPassword && (
              <Button
                style={{ borderRadius: '0 6px 6px 0' }}
                onClick={() => { setRevealedPassword(null); setShowPassword(false); }}
              >
                Hide
              </Button>
            )}
          </Space.Compact>
        </div>
      )}

      {credential.url && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
            <LinkOutlined style={{ marginRight: 4 }} />URL
          </Text>
          <a href={credential.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
            {credential.url}
          </a>
        </div>
      )}

      {credential.note && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              <FileTextOutlined style={{ marginRight: 4 }} />Notes
            </Text>
            <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{credential.note}</Text>
          </div>
        </>
      )}
    </Modal>
  );
}
