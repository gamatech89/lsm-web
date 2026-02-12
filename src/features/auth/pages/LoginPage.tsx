/**
 * Login Page
 * 
 * Responsive design:
 * - Desktop (>1024px): Side-by-side branding + form
 * - Tablet (768-1024px): Stacked branding (compact) + form
 * - Mobile (<768px): Form-only with compact branding header
 */

import { useState, useEffect } from 'react';
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

// Inject responsive styles once
const STYLE_ID = 'auth-responsive-styles';

const responsiveCSS = `
  /* ==================== AUTH PAGES RESPONSIVE ==================== */
  
  .auth-container {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;
  }

  /* Controls */
  .auth-controls {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Left Column - Branding */
  .auth-branding {
    background: linear-gradient(135deg, #440C71 0%, #6B21A8 50%, #7C3AED 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    position: relative;
    overflow: hidden;
  }

  .auth-branding-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(255,255,255,0.03) 0%, transparent 30%);
    pointer-events: none;
  }

  .auth-branding-content {
    position: relative;
    z-index: 1;
    text-align: center;
    max-width: 420px;
    width: 100%;
  }

  .auth-logo {
    width: 180px;
    height: auto;
    max-height: 160px;
    filter: brightness(1.1);
    margin-bottom: 16px;
  }

  .auth-tagline {
    color: rgba(255, 255, 255, 0.85);
    font-size: 17px;
    font-weight: 500;
    display: block;
    margin-bottom: 40px;
  }

  .auth-features {
    text-align: left;
  }

  .auth-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 16px;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }
  .auth-feature-item:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateX(4px);
  }

  .auth-feature-icon {
    font-size: 22px;
    color: #52B37C;
    line-height: 1;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .auth-feature-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .auth-feature-title {
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    display: block;
  }

  .auth-feature-desc {
    color: rgba(255, 255, 255, 0.65);
    font-size: 13px;
    display: block;
  }

  /* Right Column - Form */
  .auth-form-column {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
  }

  .auth-form-card {
    width: 100%;
    max-width: 420px;
    padding: 40px;
    border-radius: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  }
  .auth-form-card[data-theme="dark"] {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.06);
  }

  .auth-form-title {
    font-weight: 700 !important;
    margin: 0 !important;
    font-size: 28px !important;
  }

  .auth-form-subtitle {
    display: block;
    margin-top: 8px;
    margin-bottom: 32px;
    font-size: 15px;
  }

  .auth-submit-btn {
    height: 52px;
    font-weight: 600;
    font-size: 16px;
    border-radius: 12px;
    background: linear-gradient(135deg, #52B37C 0%, #3AA68D 100%) !important;
    border: none !important;
    box-shadow: 0 4px 16px rgba(82, 179, 124, 0.3);
    transition: all 0.3s ease;
  }
  .auth-submit-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .auth-footer {
    font-size: 13px;
    display: block;
    text-align: center;
    margin-top: 24px;
  }

  .auth-input {
    height: 50px;
    border-radius: 12px;
  }

  /* ==================== TABLET (768px - 1024px) ==================== */
  @media (max-width: 1024px) {
    .auth-container {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .auth-branding {
      padding: 32px 24px;
    }

    .auth-branding-content {
      max-width: 600px;
    }

    .auth-features {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .auth-feature-item {
      flex: 1 1 calc(33% - 8px);
      min-width: 180px;
      margin-bottom: 0;
      padding: 12px 16px;
    }

    .auth-tagline {
      margin-bottom: 24px;
      font-size: 15px;
    }

    .auth-logo {
      width: 140px;
      margin-bottom: 12px;
    }

    .auth-form-column {
      padding: 32px 24px;
    }
  }

  /* ==================== MOBILE (<768px) ==================== */
  @media (max-width: 767px) {
    .auth-container {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      min-height: 100dvh;
    }

    .auth-branding {
      padding: 28px 20px 20px;
    }

    .auth-branding-content {
      max-width: 100%;
    }

    .auth-logo {
      width: 100px;
      margin-bottom: 8px;
    }

    .auth-tagline {
      font-size: 14px;
      margin-bottom: 16px;
    }

    .auth-features {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 4px;
    }

    .auth-feature-item {
      flex: 0 0 auto;
      min-width: 150px;
      max-width: 180px;
      margin-bottom: 0;
      padding: 10px 14px;
    }

    .auth-feature-title {
      font-size: 13px;
    }

    .auth-feature-desc {
      font-size: 12px;
    }

    .auth-feature-icon {
      font-size: 18px;
    }

    .auth-form-column {
      padding: 24px 20px 32px;
      align-items: flex-start;
    }

    .auth-form-card {
      padding: 28px 24px;
      border-radius: 20px;
      max-width: 100%;
    }

    .auth-form-title {
      font-size: 24px !important;
    }

    .auth-form-subtitle {
      font-size: 14px;
      margin-bottom: 24px;
    }

    .auth-submit-btn {
      height: 48px;
      font-size: 15px;
    }

    .auth-input {
      height: 46px;
    }

    .auth-controls {
      top: 12px;
      right: 12px;
    }
  }

  /* ==================== SMALL MOBILE (<400px) ==================== */
  @media (max-width: 400px) {
    .auth-form-card {
      padding: 24px 16px;
    }

    .auth-branding {
      padding: 24px 16px 16px;
    }

    .auth-feature-item {
      min-width: 130px;
    }
  }

  /* ==================== DARK MODE STYLES ==================== */
  [data-theme="dark"] .auth-input,
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
`;

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = responsiveCSS;
  document.head.appendChild(el);
}

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isAuthenticated, setAuth } = useAuthStore();
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => { injectStyles(); }, []);

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
    <div
      className="auth-container"
      style={{ background: isDark ? '#161218' : '#F8F9FC' }}
    >
      {/* Controls */}
      <div className="auth-controls">
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
            style={{ color: isDark ? '#E2E8F0' : '#64748B', fontWeight: 500 }}
          >
            {i18n.language?.split('-')[0].toUpperCase() || 'EN'}
          </Button>
        </Dropdown>
        <Switch
          checked={isDark}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </div>

      {/* Left - Branding */}
      <div className="auth-branding">
        <div className="auth-branding-bg" />
        <div className="auth-branding-content">
          <img
            src="/logo-landeseiten.svg"
            alt="Landeseiten.de"
            className="auth-logo"
          />
          <Text className="auth-tagline">
            {t('login.branding.tagline')}
          </Text>
          <div className="auth-features">
            {features.map((feature, index) => (
              <div key={index} className="auth-feature-item">
                <div className="auth-feature-icon">{feature.icon}</div>
                <div className="auth-feature-text">
                  <Text className="auth-feature-title">{feature.title}</Text>
                  <Text className="auth-feature-desc">{feature.desc}</Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div
        className="auth-form-column"
        style={{ background: isDark ? '#161218' : '#F8F9FC' }}
      >
        <div
          className="auth-form-card"
          data-theme={isDark ? 'dark' : 'light'}
          style={{
            background: isDark ? '#1F1A23' : '#FFFFFF',
          }}
        >
          <Title level={2} className="auth-form-title" style={{ color: isDark ? '#F8FAFC' : '#1F1A23' }}>
            {t('login.title')}
          </Title>
          <Text className="auth-form-subtitle" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            {t('login.subtitle')}
          </Text>

          <Form
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label={<span style={{ color: isDark ? '#E2E8F0' : '#334155', fontWeight: 500, fontSize: 14 }}>{t('login.email')}</span>}
              rules={[
                { required: true, message: t('login.errors.emailRequired') },
                { type: 'email', message: t('login.errors.emailInvalid') },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                className="auth-input"
                style={{
                  background: isDark ? '#2D2735' : '#F8F9FC',
                  border: isDark ? '1px solid #3D3347' : '1px solid #E2E8F0',
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ color: isDark ? '#E2E8F0' : '#334155', fontWeight: 500, fontSize: 14 }}>{t('login.password')}</span>}
              rules={[{ required: true, message: t('login.errors.passwordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                className="auth-input"
                style={{
                  background: isDark ? '#2D2735' : '#F8F9FC',
                  border: isDark ? '1px solid #3D3347' : '1px solid #E2E8F0',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 28 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="auth-submit-btn"
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </Button>
            </Form.Item>
          </Form>

          <Text className="auth-footer" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            {t('login.contactAdmin')}
          </Text>
        </div>
      </div>
    </div>
  );
}
