/**
 * Public Credential Share Page
 * Allows viewing shared credentials via a public token link
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  Result,
  Spin,
  message,
} from 'antd';
import {
  LockOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckOutlined,
  SafetyCertificateOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/lib/api';

const { Title, Text, Paragraph } = Typography;

interface SharedCredential {
  title: string;
  type: string;
  url?: string;
  username?: string;
  password: string;
  note?: string;
  expires_at?: string;
  project_name?: string;
  metadata?: Record<string, any>;
}

export function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [credential, setCredential] = useState<SharedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, [token]);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/share/${token}`);
      
      if (response.data.success) {
        const meta = response.data.data;
        // set title/etc from meta to show while asking for password
        // We can store meta in a temp state or partial credential
        setCredential({
           title: meta.credential_title,
           type: meta.credential_type,
           password: '', // Hidden initially
           expires_at: meta.expires_at
        } as SharedCredential);

        if (meta.has_password) {
          setRequiresPassword(true);
          setLoading(false);
        } else {
          // If no password, auto-reveal
          revealCredential();
        }
      }
    } catch (err: unknown) {
       handleError(err);
       setLoading(false);
    }
  };

  const revealCredential = async (password?: string) => {
    try {
       setLoading(true);
       const response = await apiClient.post(`/share/${token}/access`, { password });
       
       if (response.data.success) {
          setCredential(response.data.data);
          setRequiresPassword(false);
       }
    } catch (err: unknown) {
       handleError(err);
       if ((err as any).response?.status === 403) {
          setRequiresPassword(true); // Should already be true, but ensure it
       }
    } finally {
       setLoading(false);
    }
  };

  const handleError = (err: unknown) => {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status === 404) {
        setError('Share not found or has expired');
      } else if (error.response?.status === 410) {
        setError('This share has expired');
      } else if (error.response?.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else if (error.response?.status === 403) {
        // Incorrect password
        message.error('Incorrect password');
      } else {
        setError(error.response?.data?.message || 'Failed to load credential');
      }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput) {
      revealCredential(passwordInput);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>Loading credential...</Paragraph>
          </div>
        </Card>
      </div>
    );
  }

  // Error - requires password
  if (requiresPassword && !credential) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <SafetyCertificateOutlined style={{ fontSize: 48, color: '#6366f1' }} />
            <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
              Password Required
            </Title>
            <Text type="secondary">
              This shared credential is protected with a password
            </Text>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input.Password
              size="large"
              placeholder="Enter password"
              prefix={<LockOutlined />}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onPressEnter={handlePasswordSubmit}
            />
            <Button
              type="primary"
              size="large"
              block
              onClick={handlePasswordSubmit}
              disabled={!passwordInput}
            >
              View Credential
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !credential) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <Result
            status="error"
            title="Unable to Load Credential"
            subTitle={error}
          />
        </Card>
      </div>
    );
  }

  // Success - show credential
  if (credential) {
    return (
      <div style={styles.container}>
        {/* Branding */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
           <img src="/logo-landeseiten.svg" alt="Company Logo" style={{ height: 48, marginBottom: 16 }} />
           <Text style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
              Secure Credentials Share
           </Text>
        </div>

        <Card style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <SafetyCertificateOutlined style={{ fontSize: 48, color: '#10b981' }} />
            <Title level={3} style={{ marginTop: 16, marginBottom: 8, color: '#fff' }}>
              {credential.title}
            </Title>
            {credential.project_name && (
              <Text style={{ color: 'rgba(255,255,255,0.6)' }}>{credential.project_name}</Text>
            )}
          </div>

          {credential.expires_at && (
            <Alert
              message={`This share expires on ${new Date(credential.expires_at).toLocaleDateString()}`}
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
             {/* Dynamic Metadata (Hostname, Port, DB Name, etc.) */}
             {credential.metadata && Object.entries(credential.metadata).map(([key, value]) => (
                <div key={key}>
                   <Text style={{ fontSize: 12, textTransform: 'capitalize', color: 'rgba(255,255,255,0.5)' }}>
                      {key.replace(/_/g, ' ')}
                   </Text>
                   <Input 
                      value={value} 
                      readOnly 
                      suffix={
                         <Button
                            type="text"
                            size="small"
                            icon={copiedField === key ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => copyToClipboard(String(value), key)}
                         />
                      }
                   />
                </div>
             ))}

            {credential.url && (
              <div>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>URL</Text>
                <Input
                  value={credential.url}
                  readOnly
                  suffix={
                    <Space size={4}>
                      <Button
                        type="text"
                        size="small"
                        icon={copiedField === 'url' ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={() => copyToClipboard(credential.url!, 'url')}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => window.open(credential.url, '_blank')}
                      />
                    </Space>
                  }
                />
              </div>
            )}

            {credential.username && (
              <div>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Username</Text>
                <Input
                  value={credential.username}
                  readOnly
                  suffix={
                    <Button
                      type="text"
                      size="small"
                      icon={copiedField === 'username' ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => copyToClipboard(credential.username!, 'username')}
                    />
                  }
                />
              </div>
            )}
            
            <div>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Password</Text>
              <Input.Password
                value={credential.password}
                readOnly
                visibilityToggle={{
                  visible: showPassword,
                  onVisibleChange: setShowPassword,
                }}
                iconRender={(visible) =>
                  visible ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                suffix={
                  <Button
                    type="text"
                    size="small"
                    icon={copiedField === 'password' ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() => copyToClipboard(credential.password, 'password')}
                  />
                }
              />
            </div>

            {credential.note && (
              <div>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Note</Text>
                <Input.TextArea value={credential.note} readOnly rows={2} />
              </div>
            )}
          </Space>
        </Card>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, color: 'rgba(255,255,255,0.6)' }}>
          Shared securely via LSM Platform
        </Text>
      </div>
    );
  }

  return null;
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    width: '100%',
    maxWidth: 450,
    borderRadius: 16,
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    background: 'rgba(30, 30, 40, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
};
