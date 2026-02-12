/**
 * Public Credential Share Page — v2
 * 
 * Clean, modern design with minimal branding.
 * Shows view count, expiry, and "Copy All" structured clipboard.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Input,
  Button,
  Typography,
  Spin,
  message,
  Tooltip,
} from 'antd';
import {
  LockOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckOutlined,
  LinkOutlined,
  SnippetsOutlined,
  ClockCircleOutlined,
  EyeFilled,
  SafetyOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/lib/api';

const { Title, Text } = Typography;

// ── Styles ──────────────────────────────────────────
const STYLE_ID = 'share-page-styles-v2';

const css = `
  /* ── Base ── */
  .sp {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #0F0F13;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  }

  .sp::before {
    content: '';
    position: absolute;
    top: -40%;
    left: -20%;
    width: 80%;
    height: 80%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
    pointer-events: none;
  }
  .sp::after {
    content: '';
    position: absolute;
    bottom: -30%;
    right: -10%;
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 60%);
    pointer-events: none;
  }

  /* ── Brand ── */
  .sp-brand {
    position: relative;
    z-index: 1;
    text-align: center;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .sp-brand img {
    height: 28px;
    opacity: 0.7;
  }
  .sp-brand-divider {
    width: 1px;
    height: 20px;
    background: rgba(255,255,255,0.15);
  }
  .sp-brand-label {
    color: rgba(255,255,255,0.4);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  /* ── Card ── */
  .sp-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 440px;
    background: #18181F;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    overflow: hidden;
  }

  /* ── Header ── */
  .sp-header {
    padding: 28px 28px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sp-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(99, 102, 241, 0.1);
    color: #818CF8;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .sp-title {
    color: #F1F5F9 !important;
    font-weight: 700 !important;
    font-size: 20px !important;
    margin: 0 0 4px !important;
    line-height: 1.3 !important;
  }
  .sp-project {
    color: rgba(255,255,255,0.35);
    font-size: 13px;
  }

  /* ── Meta Bar ── */
  .sp-meta {
    display: flex;
    gap: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sp-meta-item {
    flex: 1;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .sp-meta-item:last-child {
    border-right: none;
  }
  .sp-meta-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: rgba(255,255,255,0.3);
  }
  .sp-meta-value {
    font-size: 13px;
    font-weight: 600;
    color: #E2E8F0;
  }
  .sp-meta-value.warning {
    color: #FBBF24;
  }
  .sp-meta-value.danger {
    color: #EF4444;
  }
  .sp-meta-value.ok {
    color: #34D399;
  }

  /* ── Body/Fields ── */
  .sp-body {
    padding: 20px 28px 24px;
  }
  .sp-fields {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sp-field {
    display: flex;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    gap: 12px;
  }
  .sp-field:last-child {
    border-bottom: none;
  }
  .sp-field-info {
    flex: 1;
    min-width: 0;
  }
  .sp-field-label {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.3);
    margin-bottom: 3px;
    display: block;
  }
  .sp-field-value {
    font-size: 14px;
    color: #F1F5F9;
    font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
    word-break: break-all;
    line-height: 1.5;
  }
  .sp-field-value a {
    color: #818CF8;
    text-decoration: none;
  }
  .sp-field-value a:hover {
    text-decoration: underline;
  }
  .sp-field-masked {
    letter-spacing: 2px;
    color: rgba(255,255,255,0.4);
  }
  .sp-field-note {
    font-family: inherit;
    white-space: pre-wrap;
    line-height: 1.6;
    font-size: 13px;
    color: rgba(255,255,255,0.6);
  }
  .sp-field-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  /* ── Icon Button ── */
  .sp-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
    font-size: 13px;
  }
  .sp-icon-btn:hover {
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.8);
  }
  .sp-icon-btn.copied {
    background: rgba(16, 185, 129, 0.12);
    color: #34D399;
  }

  /* ── Footer CTA ── */
  .sp-footer-cta {
    padding: 0 28px 24px;
  }
  .sp-copy-all {
    width: 100%;
    height: 44px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    background: rgba(255,255,255,0.05) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: rgba(255,255,255,0.7) !important;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }
  .sp-copy-all:hover {
    background: rgba(255,255,255,0.08) !important;
    border-color: rgba(255,255,255,0.15) !important;
    color: #fff !important;
  }
  .sp-copy-all.copied {
    background: rgba(16, 185, 129, 0.1) !important;
    border-color: rgba(16, 185, 129, 0.3) !important;
    color: #34D399 !important;
  }

  /* ── Share Note ── */
  .sp-share-note {
    margin: 0 28px 20px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(99, 102, 241, 0.06);
    border: 1px solid rgba(99, 102, 241, 0.1);
  }
  .sp-share-note-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #818CF8;
    margin-bottom: 4px;
    display: block;
  }
  .sp-share-note-text {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    line-height: 1.5;
  }

  /* ── Page Footer ── */
  .sp-page-footer {
    position: relative;
    z-index: 1;
    text-align: center;
    margin-top: 24px;
    color: rgba(255,255,255,0.2);
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ── Password Gate ── */
  .sp-gate {
    padding: 40px 28px;
    text-align: center;
  }
  .sp-gate-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    font-size: 24px;
    color: rgba(255,255,255,0.5);
  }
  .sp-gate-title {
    color: #F1F5F9 !important;
    font-weight: 600 !important;
    font-size: 18px !important;
    margin: 0 0 6px !important;
  }
  .sp-gate-desc {
    color: rgba(255,255,255,0.4);
    font-size: 13px;
    margin-bottom: 24px;
    display: block;
  }
  .sp-gate-input {
    height: 44px;
    border-radius: 10px;
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: #fff !important;
    margin-bottom: 12px;
  }
  .sp-gate-input .ant-input {
    background: transparent !important;
    color: #fff !important;
  }
  .sp-gate-input .ant-input::placeholder {
    color: rgba(255,255,255,0.25) !important;
  }
  .sp-gate-input .ant-input-prefix,
  .sp-gate-input .ant-input-suffix {
    color: rgba(255,255,255,0.3);
  }
  .sp-gate-btn {
    height: 44px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    background: #6366F1 !important;
    border: none !important;
  }

  /* ── Error ── */
  .sp-error {
    text-align: center;
    padding: 48px 28px;
  }
  .sp-error-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: rgba(239, 68, 68, 0.1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    font-size: 24px;
    color: #EF4444;
  }
  .sp-error-title {
    color: #F1F5F9 !important;
    font-weight: 600 !important;
    font-size: 18px !important;
    margin: 0 0 6px !important;
  }
  .sp-error-desc {
    color: rgba(255,255,255,0.4);
    font-size: 13px;
  }

  /* ── Loading ── */
  .sp-loading {
    text-align: center;
    padding: 56px 28px;
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .sp { padding: 16px; }
    .sp-card { border-radius: 14px; }
    .sp-header { padding: 22px 20px 16px; }
    .sp-body { padding: 16px 20px 20px; }
    .sp-footer-cta { padding: 0 20px 20px; }
    .sp-share-note { margin: 0 20px 16px; }
    .sp-meta-item { padding: 12px 10px; }
    .sp-meta-label { font-size: 9px; }
    .sp-meta-value { font-size: 12px; }
    .sp-title { font-size: 18px !important; }
    .sp-field { padding: 12px 0; }
    .sp-gate { padding: 32px 20px; }
    .sp-error { padding: 40px 20px; }
  }
`;

function injectStyles() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) { existing.textContent = css; return; }
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}


// ── Types ──────────────────────────────────────────
interface SharedCredential {
  title: string;
  type: string;
  url?: string;
  username?: string;
  password: string;
  note?: string;
  metadata?: Record<string, any>;
  project_name?: string;
}

interface ShareInfo {
  expires_at?: string;
  view_count?: number;
  max_views?: number;
  views_remaining?: number;
  note?: string;
}


// ── Component ──────────────────────────────────────
export function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [credential, setCredential] = useState<SharedCredential | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => { fetchMetadata(); }, [token]);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/share/${token}`);
      if (response.data.success) {
        const data = response.data.data;
        setMeta(data);
        setShareInfo({
          expires_at: data.expires_at,
          view_count: data.view_count,
          max_views: data.max_views,
          views_remaining: data.views_remaining,
        });

        if (data.has_password) {
          setRequiresPassword(true);
          setLoading(false);
        } else {
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
        // Update share info from access response
        if (response.data.share_info) {
          setShareInfo(response.data.share_info);
        }
      }
    } catch (err: unknown) {
      handleError(err);
      if ((err as any).response?.status === 403) {
        setRequiresPassword(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err: unknown) => {
    const error = err as { response?: { status?: number; data?: { message?: string } } };
    if (error.response?.status === 404) {
      setError('This share link is invalid or has expired.');
    } else if (error.response?.status === 410) {
      setError('This share link has expired.');
    } else if (error.response?.status === 429) {
      setError('Too many access attempts. Please try again later.');
    } else if (error.response?.status === 403) {
      message.error('Incorrect password');
    } else {
      setError(error.response?.data?.message || 'Unable to load this credential.');
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput) revealCredential(passwordInput);
  };

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    message.success({ content: `${field} copied`, duration: 1.5 });
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const copyAllCredentials = useCallback(async () => {
    if (!credential) return;
    const lines: string[] = [];
    
    if (credential.metadata) {
      Object.entries(credential.metadata).forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        lines.push(`${label}: ${value}`);
      });
    }
    if (credential.url) lines.push(`URL: ${credential.url}`);
    if (credential.username) lines.push(`Username: ${credential.username}`);
    lines.push(`Password: ${credential.password}`);
    if (credential.note) {
      lines.push(`Notes: ${credential.note}`);
    }

    await copyToClipboard(lines.join('\n'), 'all');
  }, [credential, copyToClipboard]);

  // ── Helpers ──
  const formatExpiry = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    if (diffH >= 24) {
      const days = Math.floor(diffH / 24);
      return `${days}d ${diffH % 24}h`;
    }
    if (diffH > 0) return `${diffH}h ${diffM}m`;
    return `${diffM}m`;
  };

  const getViewsStatus = () => {
    const remaining = shareInfo.views_remaining ?? 0;
    const max = shareInfo.max_views ?? 0;
    if (remaining <= 0) return 'danger';
    if (remaining === 1) return 'warning';
    return 'ok';
  };

  const getExpiryStatus = () => {
    if (!shareInfo.expires_at) return 'ok';
    const d = new Date(shareInfo.expires_at);
    const diffMs = d.getTime() - Date.now();
    if (diffMs <= 0) return 'danger';
    if (diffMs < 3600000) return 'warning'; // < 1 hour
    return 'ok';
  };

  // ── Icon Button ──
  const Btn = ({ field, value, icon }: { field: string; value: string; icon?: React.ReactNode }) => (
    <Tooltip title={copiedField === field ? 'Copied!' : 'Copy'}>
      <button
        className={`sp-icon-btn ${copiedField === field ? 'copied' : ''}`}
        onClick={() => copyToClipboard(value, field)}
      >
        {copiedField === field ? <CheckOutlined /> : (icon || <CopyOutlined />)}
      </button>
    </Tooltip>
  );

  // ── Render: Loading ──
  if (loading) {
    return (
      <div className="sp">
        <Brand />
        <div className="sp-card">
          <div className="sp-loading">
            <Spin size="large" />
            <Text style={{ display: 'block', color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 13 }}>
              Accessing credentials...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Error ──
  if (error && !credential) {
    return (
      <div className="sp">
        <Brand />
        <div className="sp-card">
          <div className="sp-error">
            <div className="sp-error-icon">✕</div>
            <Title level={4} className="sp-error-title">Access Denied</Title>
            <Text className="sp-error-desc">{error}</Text>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Render: Password Gate ──
  if (requiresPassword) {
    return (
      <div className="sp">
        <Brand />
        <div className="sp-card">
          {/* Show basic meta if available */}
          {meta && (
            <div className="sp-header">
              <div className="sp-type-badge">
                <SafetyOutlined />{meta.credential_type || 'Credential'}
              </div>
              <Title level={4} className="sp-title">{meta.credential_title || 'Shared Credential'}</Title>
            </div>
          )}
          {shareInfo.expires_at && (
            <div className="sp-meta">
              <div className="sp-meta-item">
                <span className="sp-meta-label">Expires in</span>
                <span className={`sp-meta-value ${getExpiryStatus()}`}>{formatExpiry(shareInfo.expires_at)}</span>
              </div>
              {shareInfo.max_views && (
                <div className="sp-meta-item">
                  <span className="sp-meta-label">Views left</span>
                  <span className={`sp-meta-value ${getViewsStatus()}`}>
                    {shareInfo.views_remaining} / {shareInfo.max_views}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="sp-gate">
            <div className="sp-gate-icon"><LockOutlined /></div>
            <Title level={4} className="sp-gate-title">Password Protected</Title>
            <Text className="sp-gate-desc">
              Enter the password to view this credential.
            </Text>
            <Input.Password
              size="large"
              placeholder="Enter access password"
              prefix={<LockOutlined />}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onPressEnter={handlePasswordSubmit}
              className="sp-gate-input"
            />
            <Button
              type="primary"
              size="large"
              block
              onClick={handlePasswordSubmit}
              disabled={!passwordInput}
              className="sp-gate-btn"
            >
              Unlock
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Render: Credential View ──
  if (!credential) return null;

  return (
    <div className="sp">
      <Brand />

      <div className="sp-card">
        {/* Header */}
        <div className="sp-header">
          <div className="sp-type-badge">
            <SafetyOutlined />{credential.type || 'Credential'}
          </div>
          <Title level={4} className="sp-title">{credential.title}</Title>
          {credential.project_name && (
            <Text className="sp-project">{credential.project_name}</Text>
          )}
        </div>

        {/* Meta Bar */}
        <div className="sp-meta">
          {shareInfo.expires_at && (
            <div className="sp-meta-item">
              <span className="sp-meta-label"><ClockCircleOutlined style={{ marginRight: 4 }} />Expires</span>
              <span className={`sp-meta-value ${getExpiryStatus()}`}>
                {formatExpiry(shareInfo.expires_at)}
              </span>
            </div>
          )}
          {shareInfo.max_views != null && (
            <div className="sp-meta-item">
              <span className="sp-meta-label"><EyeFilled style={{ marginRight: 4 }} />Views</span>
              <span className={`sp-meta-value ${getViewsStatus()}`}>
                {shareInfo.view_count} / {shareInfo.max_views}
              </span>
            </div>
          )}
        </div>

        {/* Share Note */}
        {shareInfo.note && (
          <div className="sp-share-note">
            <span className="sp-share-note-label">Note from sender</span>
            <span className="sp-share-note-text">{shareInfo.note}</span>
          </div>
        )}

        {/* Credential Fields */}
        <div className="sp-body">
          <div className="sp-fields">
            {/* Dynamic Metadata */}
            {credential.metadata && Object.entries(credential.metadata).map(([key, value]) => (
              <div key={key} className="sp-field">
                <div className="sp-field-info">
                  <span className="sp-field-label">{key.replace(/_/g, ' ')}</span>
                  <span className="sp-field-value">{String(value)}</span>
                </div>
                <div className="sp-field-actions">
                  <Btn field={key} value={String(value)} />
                </div>
              </div>
            ))}

            {/* URL */}
            {credential.url && (
              <div className="sp-field">
                <div className="sp-field-info">
                  <span className="sp-field-label">URL</span>
                  <span className="sp-field-value">
                    <a href={credential.url} target="_blank" rel="noopener noreferrer">
                      {credential.url}
                    </a>
                  </span>
                </div>
                <div className="sp-field-actions">
                  <Btn field="URL" value={credential.url} />
                  <Tooltip title="Open">
                    <button className="sp-icon-btn" onClick={() => window.open(credential.url, '_blank')}>
                      <LinkOutlined />
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Username */}
            {credential.username && (
              <div className="sp-field">
                <div className="sp-field-info">
                  <span className="sp-field-label">Username</span>
                  <span className="sp-field-value">{credential.username}</span>
                </div>
                <div className="sp-field-actions">
                  <Btn field="Username" value={credential.username} />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="sp-field">
              <div className="sp-field-info">
                <span className="sp-field-label">Password</span>
                <span className={`sp-field-value ${showPassword ? '' : 'sp-field-masked'}`}>
                  {showPassword ? credential.password : '••••••••••••'}
                </span>
              </div>
              <div className="sp-field-actions">
                <Tooltip title={showPassword ? 'Hide' : 'Reveal'}>
                  <button className="sp-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </Tooltip>
                <Btn field="Password" value={credential.password} />
              </div>
            </div>

            {/* Note */}
            {credential.note && (
              <div className="sp-field">
                <div className="sp-field-info">
                  <span className="sp-field-label">Notes</span>
                  <span className="sp-field-value sp-field-note">{credential.note}</span>
                </div>
                <div className="sp-field-actions" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  <Btn field="Notes" value={credential.note} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Copy All */}
        <div className="sp-footer-cta">
          <button
            className={`sp-copy-all ${copiedField === 'all' ? 'copied' : ''}`}
            onClick={copyAllCredentials}
          >
            {copiedField === 'all' ? (
              <><CheckOutlined /> Copied to clipboard</>
            ) : (
              <><SnippetsOutlined /> Copy all credentials</>
            )}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ── Sub Components ──
function Brand() {
  return (
    <div className="sp-brand">
      <img src="/logo-landeseiten.svg" alt="LSM" />
      <div className="sp-brand-divider" />
      <span className="sp-brand-label">Secure Share</span>
    </div>
  );
}

function Footer() {
  return (
    <div className="sp-page-footer">
      <SafetyOutlined /> End-to-end encrypted · LSM Platform
    </div>
  );
}
