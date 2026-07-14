import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Input, Button, Typography, Spin, Tooltip, App, message as staticMessage } from 'antd';
import {
  LockOutlined, EyeOutlined, EyeInvisibleOutlined, LinkOutlined, SafetyOutlined,
  ClockCircleOutlined, EyeFilled, SnippetsOutlined, CheckOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import type { EphemeralSecretMeta, EphemeralSecretReveal } from '@lsm/types';
import {
  useSecureShareStyles, Brand, Footer, useCopyToClipboard, CopyIconBtn, formatExpiry, getExpiryStatus,
} from '../ui/secure-share';

const { Title, Text } = Typography;

type RevealData = EphemeralSecretReveal['data'];

const LABELS: Record<string, string> = { database_name: 'Database', url: 'URL', hostname: 'Host', port: 'Port' };
const labelFor = (k: string) => LABELS[k] ?? (k.charAt(0).toUpperCase() + k.slice(1));

export function EphemeralSecretRevealPage() {
  const { token = '' } = useParams();
  const { message } = App.useApp ? App.useApp() : { message: staticMessage };
  useSecureShareStyles();

  const [meta, setMeta] = useState<EphemeralSecretMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [secret, setSecret] = useState<RevealData | null>(null);
  const [gone, setGone] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { copiedField, copy } = useCopyToClipboard();

  useEffect(() => {
    api.ephemeralSecrets.show(token)
      .then((res) => setMeta(res.data))
      .catch((e) => setMeta(e.response?.data ?? { available: false, reason: 'not_found' }))
      .finally(() => setLoading(false));
  }, [token]);

  const reveal = async () => {
    setRevealing(true);
    try {
      const res = await api.ephemeralSecrets.access(token, password || undefined);
      setSecret(res.data.data);
    } catch (e: any) {
      if (e.response?.status === 403) {
        message.error('Incorrect password');
      } else {
        setGone(e.response?.data?.reason ?? 'not_found');
      }
    } finally {
      setRevealing(false);
    }
  };

  const reasonText = (r?: string) =>
    r === 'expired' ? 'This link has expired.'
      : r === 'viewed' ? 'This secret has already been viewed and is no longer available.'
        : 'This link is invalid or has expired.';

  const copyAll = () => {
    if (!secret) return;
    const order = ['hostname', 'port', 'database_name', 'username', 'password', 'url', 'note'] as const;
    const lines = order
      .filter((k) => secret[k])
      .map((k) => `${labelFor(k)}: ${secret[k]}`);
    copy(lines.join('\n'), 'all');
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="auth-container">
        <Brand />
        <div className="auth-form-column">
          <div className="sp-card">
            <div className="sp-loading">
              <Spin size="large" />
              <Text style={{ display: 'block', color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 13 }}>
                Loading secret…
              </Text>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Unavailable ──
  if (gone || !meta?.available) {
    return (
      <div className="auth-container">
        <Brand />
        <div className="auth-form-column">
          <div className="sp-card">
            <div className="sp-error">
              <div className="sp-error-icon">✕</div>
              <Title level={4} className="sp-error-title">Unavailable</Title>
              <Text className="sp-error-desc">{reasonText(gone ?? meta?.reason)}</Text>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // ── Revealed ──
  if (secret) {
    const type = secret.type || 'Secret';
    const rows: Array<{ key: string; label: string }> = [
      { key: 'hostname', label: 'Host' },
      { key: 'port', label: 'Port' },
      { key: 'database_name', label: 'Database' },
      { key: 'username', label: 'Username' },
    ];
    return (
      <div className="auth-container">
        <Brand />
        <div className="auth-form-column">
          <div className="sp-card">
            <div className="sp-header">
              <div className="sp-type-badge"><SafetyOutlined />{type}</div>
              <Title level={4} className="sp-title">{secret.title || 'Shared secret'}</Title>
            </div>

            <div className="sp-share-note danger">
              <span className="sp-share-note-label">One-time secret</span>
              <span className="sp-share-note-text">This was the only view — the secret has now been deleted.</span>
            </div>

            <div className="sp-body">
              <div className="sp-fields">
                {rows.map(({ key, label }) => {
                  const value = secret[key as keyof RevealData];
                  if (!value) return null;
                  return (
                    <div key={key} className="sp-field">
                      <div className="sp-field-info">
                        <span className="sp-field-label">{label}</span>
                        <span className="sp-field-value">{value}</span>
                      </div>
                      <div className="sp-field-actions">
                        <CopyIconBtn field={label} value={String(value)} copiedField={copiedField} onCopy={copy} />
                      </div>
                    </div>
                  );
                })}

                {secret.password && (
                  <div className="sp-field">
                    <div className="sp-field-info">
                      <span className="sp-field-label">Password</span>
                      <span className={`sp-field-value ${showPassword ? '' : 'sp-field-masked'}`}>
                        {showPassword ? secret.password : '••••••••••••'}
                      </span>
                    </div>
                    <div className="sp-field-actions">
                      <Tooltip title={showPassword ? 'Hide' : 'Reveal'}>
                        <button className="sp-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        </button>
                      </Tooltip>
                      <CopyIconBtn field="Password" value={secret.password} copiedField={copiedField} onCopy={copy} />
                    </div>
                  </div>
                )}

                {secret.url && (
                  <div className="sp-field">
                    <div className="sp-field-info">
                      <span className="sp-field-label">URL</span>
                      <span className="sp-field-value">
                        <a href={secret.url} target="_blank" rel="noopener noreferrer">{secret.url}</a>
                      </span>
                    </div>
                    <div className="sp-field-actions">
                      <CopyIconBtn field="URL" value={secret.url} copiedField={copiedField} onCopy={copy} />
                      <Tooltip title="Open">
                        <button className="sp-icon-btn" onClick={() => window.open(secret.url, '_blank')}>
                          <LinkOutlined />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {secret.note && (
                  <div className="sp-field">
                    <div className="sp-field-info">
                      <span className="sp-field-label">Notes</span>
                      <span className="sp-field-value sp-field-note">{secret.note}</span>
                    </div>
                    <div className="sp-field-actions" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                      <CopyIconBtn field="Notes" value={secret.note} copiedField={copiedField} onCopy={copy} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sp-footer-cta">
              <button className={`sp-copy-all ${copiedField === 'all' ? 'copied' : ''}`} onClick={copyAll}>
                {copiedField === 'all'
                  ? <><CheckOutlined /> Copied to clipboard</>
                  : <><SnippetsOutlined /> Copy all</>}
              </button>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // ── Gate: reveal (with optional password) ──
  const hasPw = !!meta.has_password;
  return (
    <div className="auth-container">
      <Brand />
      <div className="auth-form-column">
        <div className="sp-card">
          <div className="sp-header">
            <div className="sp-type-badge"><SafetyOutlined />One-time secret</div>
            <Title level={4} className="sp-title">{meta.title || 'A secret was shared with you'}</Title>
          </div>

          {meta.expires_at && (
            <div className="sp-meta">
              <div className="sp-meta-item">
                <span className="sp-meta-label"><ClockCircleOutlined style={{ marginRight: 4 }} />Expires</span>
                <span className={`sp-meta-value ${getExpiryStatus(meta.expires_at)}`}>{formatExpiry(meta.expires_at)}</span>
              </div>
              <div className="sp-meta-item">
                <span className="sp-meta-label"><EyeFilled style={{ marginRight: 4 }} />Views</span>
                <span className="sp-meta-value warning">1 / 1</span>
              </div>
            </div>
          )}

          <div className="sp-gate">
            <div className="sp-gate-icon">{hasPw ? <LockOutlined /> : <SafetyOutlined />}</div>
            <Title level={4} className="sp-gate-title">{hasPw ? 'Password Protected' : 'Reveal this secret'}</Title>
            <Text className="sp-gate-desc">
              {hasPw
                ? 'Enter the password to reveal this one-time secret.'
                : 'This secret can be viewed once. Revealing it deletes it immediately.'}
            </Text>
            {hasPw && (
              <Input.Password
                size="large"
                placeholder="Enter access password"
                prefix={<LockOutlined />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPressEnter={() => { if (password) reveal(); }}
                className="sp-gate-input"
              />
            )}
            <Button
              type="primary"
              size="large"
              block
              loading={revealing}
              disabled={hasPw && !password}
              onClick={reveal}
              className="sp-gate-btn"
            >
              {hasPw ? 'Unlock & reveal' : 'Reveal secret'}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
