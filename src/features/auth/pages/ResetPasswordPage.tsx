/**
 * Reset Password Page
 * 
 * Handles password reset from email link.
 * URL: /reset-password?token=xxx&email=xxx
 * 
 * Responsive design matching login page.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Typography, App, Switch, Dropdown, Result } from 'antd';
import { 
  LockOutlined, 
  MoonOutlined, 
  SunOutlined,
  GlobalOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

// Inject responsive styles (shared with LoginPage)
const STYLE_ID = 'auth-responsive-styles';

function injectStyles() {
  if (typeof document === 'undefined') return;
  // LoginPage already injects the shared styles
  // But if user navigates directly here, we need them too
  if (document.getElementById(STYLE_ID)) return;
  
  // Import from login page CSS — the shared auth styles
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    .auth-container {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      position: relative;
    }
    .auth-controls {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
    }
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
    .auth-input {
      height: 50px;
      border-radius: 12px;
    }
    @media (max-width: 1024px) {
      .auth-container { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .auth-branding { padding: 32px 24px; }
      .auth-branding-content { max-width: 600px; }
      .auth-form-column { padding: 32px 24px; }
    }
    @media (max-width: 767px) {
      .auth-container { grid-template-columns: 1fr; grid-template-rows: auto 1fr; min-height: 100dvh; }
      .auth-branding { padding: 28px 20px 20px; }
      .auth-branding-content { max-width: 100%; }
      .auth-logo { width: 100px; margin-bottom: 8px; }
      .auth-tagline { font-size: 14px; margin-bottom: 16px; }
      .auth-form-column { padding: 24px 20px 32px; align-items: flex-start; }
      .auth-form-card { padding: 28px 24px; border-radius: 20px; max-width: 100%; }
      .auth-form-title { font-size: 24px !important; }
      .auth-form-subtitle { font-size: 14px; margin-bottom: 24px; }
      .auth-submit-btn { height: 48px; font-size: 15px; }
      .auth-input { height: 46px; }
      .auth-controls { top: 12px; right: 12px; }
    }
    @media (max-width: 400px) {
      .auth-form-card { padding: 24px 16px; }
      .auth-branding { padding: 24px 16px 16px; }
    }
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
  `;
  document.head.appendChild(el);
}

export function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const isDark = resolvedTheme === 'dark';

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  useEffect(() => { injectStyles(); }, []);

  // Validate URL parameters
  if (!token || !email) {
    return (
      <div
        className="auth-container"
        style={{
          background: isDark ? '#161218' : '#F8F9FC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Result
          status="error"
          title={t('resetPassword.invalidLink', 'Invalid Reset Link')}
          subTitle={t('resetPassword.invalidLinkDesc', 'This password reset link is invalid or has expired. Please request a new one.')}
          extra={
            <Button type="primary" onClick={() => navigate('/login')} className="auth-submit-btn">
              {t('resetPassword.backToLogin', 'Back to Login')}
            </Button>
          }
        />
      </div>
    );
  }

  const handleSubmit = async (values: { password: string; password_confirmation: string }) => {
    setLoading(true);
    try {
      const response = await api.auth.resetPassword({
        token,
        email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        message.error(response.data.message || t('resetPassword.error', 'Failed to reset password'));
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || t('resetPassword.error', 'Failed to reset password');
      message.error(errorMsg);
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

  // Success state
  if (success) {
    return (
      <div
        className="auth-container"
        style={{
          background: isDark ? '#161218' : '#F8F9FC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="auth-controls">
          <Dropdown
            menu={{
              items: languageItems,
              onClick: ({ key }) => changeLanguage(key),
              selectedKeys: [i18n.language?.split('-')[0] || 'en'],
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<GlobalOutlined />}
              style={{ color: isDark ? '#E2E8F0' : '#64748B', fontWeight: 500 }}
            >
              {i18n.language?.split('-')[0].toUpperCase() || 'EN'}
            </Button>
          </Dropdown>
          <Switch checked={isDark} onChange={toggleTheme}
            checkedChildren={<MoonOutlined />} unCheckedChildren={<SunOutlined />}
          />
        </div>
        <div
          className="auth-form-card"
          data-theme={isDark ? 'dark' : 'light'}
          style={{
            background: isDark ? '#1F1A23' : '#FFFFFF',
            textAlign: 'center',
          }}
        >
          <CheckCircleFilled style={{ fontSize: 64, color: '#52B37C', marginBottom: 24 }} />
          <Title level={3} style={{ color: isDark ? '#F8FAFC' : '#1F1A23', margin: '0 0 12px' }}>
            {t('resetPassword.successTitle', 'Password Reset Successful')}
          </Title>
          <Text style={{ color: isDark ? '#94A3B8' : '#64748B', display: 'block', marginBottom: 32, fontSize: 15 }}>
            {t('resetPassword.successDesc', 'Your password has been changed. You can now sign in with your new password.')}
          </Text>
          <Button type="primary" onClick={() => navigate('/login')} className="auth-submit-btn" block>
            {t('resetPassword.goToLogin', 'Go to Login')}
          </Button>
        </div>
      </div>
    );
  }

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
          <Button type="text" icon={<GlobalOutlined />}
            style={{ color: isDark ? '#E2E8F0' : '#64748B', fontWeight: 500 }}
          >
            {i18n.language?.split('-')[0].toUpperCase() || 'EN'}
          </Button>
        </Dropdown>
        <Switch checked={isDark} onChange={toggleTheme}
          checkedChildren={<MoonOutlined />} unCheckedChildren={<SunOutlined />}
        />
      </div>

      {/* Left - Branding (simplified for reset page) */}
      <div className="auth-branding">
        <div className="auth-branding-bg" />
        <div className="auth-branding-content">
          <img src="/logo-landeseiten.svg" alt="Landeseiten.de" className="auth-logo" />
          <Text className="auth-tagline">
            {t('login.branding.tagline')}
          </Text>
          <div style={{
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <LockOutlined style={{ fontSize: 40, color: '#52B37C', marginBottom: 16 }} />
            <Text style={{ color: '#fff', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 8 }}>
              {t('resetPassword.secureReset', 'Secure Password Reset')}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'block' }}>
              {t('resetPassword.secureResetDesc', 'Choose a strong password to protect your account.')}
            </Text>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="auth-form-column" style={{ background: isDark ? '#161218' : '#F8F9FC' }}>
        <div
          className="auth-form-card"
          data-theme={isDark ? 'dark' : 'light'}
          style={{ background: isDark ? '#1F1A23' : '#FFFFFF' }}
        >
          <Title level={2} className="auth-form-title" style={{ color: isDark ? '#F8FAFC' : '#1F1A23' }}>
            {t('resetPassword.title', 'Reset Password')}
          </Title>
          <Text className="auth-form-subtitle" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            {t('resetPassword.subtitle', 'Enter your new password for')} <strong>{email}</strong>
          </Text>

          <Form
            name="reset-password"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="password"
              label={<span style={{ color: isDark ? '#E2E8F0' : '#334155', fontWeight: 500, fontSize: 14 }}>
                {t('resetPassword.newPassword', 'New Password')}
              </span>}
              rules={[
                { required: true, message: t('resetPassword.passwordRequired', 'Please enter a new password') },
                { min: 8, message: t('resetPassword.passwordMin', 'Password must be at least 8 characters') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                placeholder={t('resetPassword.newPasswordPlaceholder', 'Enter new password')}
                className="auth-input"
                style={{
                  background: isDark ? '#2D2735' : '#F8F9FC',
                  border: isDark ? '1px solid #3D3347' : '1px solid #E2E8F0',
                }}
              />
            </Form.Item>

            <Form.Item
              name="password_confirmation"
              label={<span style={{ color: isDark ? '#E2E8F0' : '#334155', fontWeight: 500, fontSize: 14 }}>
                {t('resetPassword.confirmPassword', 'Confirm Password')}
              </span>}
              dependencies={['password']}
              rules={[
                { required: true, message: t('resetPassword.confirmRequired', 'Please confirm your password') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('resetPassword.passwordMismatch', 'Passwords do not match')));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                placeholder={t('resetPassword.confirmPlaceholder', 'Confirm new password')}
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
                {loading ? t('resetPassword.resetting', 'Resetting...') : t('resetPassword.resetButton', 'Reset Password')}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Button type="link" onClick={() => navigate('/login')} style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              {t('resetPassword.backToLogin', 'Back to Login')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
