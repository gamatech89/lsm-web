/**
 * Login Page
 * 
 * Redesigned with:
 * - Landeseiten.de brand colors (purple gradient)
 * - Dribbble-inspired layout (glassmorphism, rounded cards)
 * - Dark/Light theme support
 * - German/English i18n
 */

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Form, Input, Button, Typography, App, Switch, Dropdown } from 'antd';
import { 
  LockOutlined, 
  MailOutlined, 
  MoonOutlined, 
  SunOutlined,
  GlobalOutlined,
  SafetyOutlined,
  DashboardOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { api } from '@/lib/api';
import type { LoginRequest } from '@lsm/types';

const { Title, Text } = Typography;

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isAuthenticated, setAuth } = useAuthStore();
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const isDark = resolvedTheme === 'dark';

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const response = await api.auth.login({
        email: values.email,
        password: values.password,
        device_name: 'web-browser',
      });

      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setAuth(user, token);
        message.success(`${t('login.welcome')}, ${user.name}!`);
        navigate('/dashboard');
      } else {
        message.error(response.data.message || t('login.errors.loginFailed'));
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(err.message || t('login.errors.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const languageItems = [
    { key: 'en', label: '🇬🇧 English' },
    { key: 'de', label: '🇩🇪 Deutsch' },
  ];

  const features = [
    {
      icon: <SafetyOutlined />,
      title: t('login.features.credentials'),
      desc: t('login.features.credentialsDesc'),
    },
    {
      icon: <DashboardOutlined />,
      title: t('login.features.monitoring'),
      desc: t('login.features.monitoringDesc'),
    },
    {
      icon: <TeamOutlined />,
      title: t('login.features.team'),
      desc: t('login.features.teamDesc'),
    },
  ];

  return (
    <div style={styles.container(isDark)}>
      {/* Controls - Theme & Language */}
      <div style={styles.controls}>
        <Dropdown
          menu={{
            items: languageItems,
            onClick: ({ key }) => changeLanguage(key),
            selectedKeys: [i18n.language?.split('-')[0] || 'en'],
          }}
          trigger={['click']}
        >
          <Button
            type="text"
            icon={<GlobalOutlined />}
            style={styles.controlButton(isDark)}
          >
            {i18n.language?.split('-')[0].toUpperCase() || 'EN'}
          </Button>
        </Dropdown>
        <Switch
          checked={isDark}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          style={{ marginLeft: 8 }}
        />
      </div>

      {/* Left Column - Branding */}
      <div style={styles.leftColumn}>
        {/* Animated Background Pattern */}
        <div style={styles.backgroundPattern} />
        
        <div style={styles.brandingContent}>
          {/* Logo */}
          <div style={styles.logoContainer}>
            <img
              src="/logo-landeseiten.svg"
              alt="Landeseiten.de"
              style={styles.logo}
            />
          </div>

          {/* Tagline */}
          <Text style={styles.tagline}>
            {t('login.branding.tagline')}
          </Text>

          {/* Features */}
          <div style={styles.features}>
            {features.map((feature, index) => (
              <div key={index} style={styles.featureItem}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <div style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div style={styles.rightColumn(isDark)}>
        <div style={styles.formCard(isDark)}>
          <Title level={2} style={styles.formTitle(isDark)}>
            {t('login.title')}
          </Title>
          <Text style={styles.formSubtitle(isDark)}>
            {t('login.subtitle')}
          </Text>

          <Form
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            requiredMark={false}
            style={styles.form}
          >
            <Form.Item
              name="email"
              label={<span style={styles.label(isDark)}>{t('login.email')}</span>}
              rules={[
                { required: true, message: t('login.errors.emailRequired') },
                { type: 'email', message: t('login.errors.emailInvalid') },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: isDark ? '#94A3B8' : '#94a3b8' }} />}
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                style={styles.input(isDark)}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={styles.label(isDark)}>{t('login.password')}</span>}
              rules={[{ required: true, message: t('login.errors.passwordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? '#94A3B8' : '#94a3b8' }} />}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                style={styles.input(isDark)}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={styles.submitButton}
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </Button>
            </Form.Item>
          </Form>

          <Text style={styles.footer(isDark)}>
            {t('login.contactAdmin')}
          </Text>
        </div>
      </div>
    </div>
  );
}

// Styles with theme support
const styles = {
  container: (isDark: boolean): React.CSSProperties => ({
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    background: isDark ? '#161218' : '#F8F9FC',
  }),

  controls: {
    position: 'fixed' as const,
    top: 24,
    right: 24,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  controlButton: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? '#E2E8F0' : '#64748B',
    fontWeight: 500,
  }),

  // Left Column - Purple Gradient
  leftColumn: {
    background: 'linear-gradient(135deg, #440C71 0%, #6B21A8 50%, #7C3AED 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    position: 'relative' as const,
    overflow: 'hidden',
  },

  backgroundPattern: {
    position: 'absolute' as const,
    inset: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(255,255,255,0.03) 0%, transparent 30%)
    `,
    pointerEvents: 'none' as const,
  },

  brandingContent: {
    position: 'relative' as const,
    zIndex: 1,
    textAlign: 'center' as const,
    maxWidth: 420,
  },

  logoContainer: {
    marginBottom: 24,
  },

  logo: {
    width: 220,
    height: 'auto',
    maxHeight: 200,
    filter: 'brightness(1.1)',
  },

  tagline: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 18,
    fontWeight: 500,
    display: 'block',
    marginBottom: 48,
  },

  features: {
    textAlign: 'left' as const,
  },

  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
    padding: '20px 24px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
  },

  featureIcon: {
    fontSize: 24,
    color: '#52B37C',
    lineHeight: 1,
    marginTop: 2,
  },

  featureText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },

  featureTitle: {
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: 15,
    display: 'block',
  },

  featureDesc: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    display: 'block',
  },

  // Right Column - Form
  rightColumn: (isDark: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    background: isDark ? '#161218' : '#F8F9FC',
  }),

  formCard: (isDark: boolean): React.CSSProperties => ({
    width: '100%',
    maxWidth: 420,
    padding: 40,
    background: isDark ? '#1F1A23' : '#FFFFFF',
    borderRadius: 24,
    boxShadow: isDark 
      ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 8px 32px rgba(0, 0, 0, 0.08)',
    border: isDark ? '1px solid rgba(255,255,255,0.06)' : 'none',
  }),

  formTitle: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? '#F8FAFC' : '#1F1A23',
    fontWeight: 700,
    margin: 0,
    fontSize: 28,
  }),

  formSubtitle: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? '#94A3B8' : '#64748B',
    display: 'block',
    marginTop: 8,
    marginBottom: 36,
    fontSize: 15,
  }),

  form: {
    width: '100%',
  },

  label: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? '#E2E8F0' : '#334155',
    fontWeight: 500,
    fontSize: 14,
  }),

  input: (isDark: boolean): React.CSSProperties => ({
    height: 52,
    borderRadius: 12,
    background: isDark ? '#2D2735' : '#F8F9FC',
    border: isDark ? '1px solid #3D3347' : '1px solid #E2E8F0',
  }),

  submitButton: {
    height: 56,
    fontWeight: 600,
    fontSize: 16,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #52B37C 0%, #3AA68D 100%)',
    border: 'none',
    boxShadow: '0 4px 16px rgba(82, 179, 124, 0.3)',
    transition: 'all 0.3s ease',
  },

  footer: (isDark: boolean): React.CSSProperties => ({
    color: isDark ? '#64748B' : '#94A3B8',
    fontSize: 13,
    display: 'block',
    textAlign: 'center' as const,
    marginTop: 28,
  }),
};

// Add responsive styles
const responsiveStyles = `
  @media (max-width: 900px) {
    .login-container > div:first-child {
      display: none !important;
    }
    .login-container {
      grid-template-columns: 1fr !important;
    }
  }
  
  /* Style Ant Design inputs in dark mode */
  [data-theme="dark"] .ant-input,
  [data-theme="dark"] .ant-input-password input {
    background: #2D2735 !important;
    border-color: #3D3347 !important;
    color: #F8FAFC !important;
  }
  
  [data-theme="dark"] .ant-input::placeholder,
  [data-theme="dark"] .ant-input-password input::placeholder {
    color: #64748B !important;
  }
  
  [data-theme="dark"] .ant-input-affix-wrapper {
    background: #2D2735 !important;
    border-color: #3D3347 !important;
  }
  
  [data-theme="dark"] .ant-form-item-label > label {
    color: #E2E8F0 !important;
  }
  
  /* Green button hover effect */
  .ant-btn-primary:hover {
    filter: brightness(1.1) !important;
    transform: translateY(-1px);
  }
  
  /* Feature card hover */
  .feature-item:hover {
    background: rgba(255, 255, 255, 0.12) !important;
    transform: translateX(4px);
  }
`;

// Inject responsive styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('login-responsive-styles');
  if (existingStyle) {
    existingStyle.textContent = responsiveStyles;
  } else {
    const styleEl = document.createElement('style');
    styleEl.id = 'login-responsive-styles';
    styleEl.textContent = responsiveStyles;
    document.head.appendChild(styleEl);
  }
}
