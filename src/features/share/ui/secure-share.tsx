/**
 * Shared "Secure Share" UI primitives — the branded two-column layout, card,
 * copy affordances and helpers used by the public credential-share page.
 * Extracted verbatim so the ephemeral one-time-secret page matches it exactly.
 */
import { useEffect, useState, useCallback } from 'react';
import { Typography, Tooltip, message } from 'antd';
import { CopyOutlined, CheckOutlined, SafetyOutlined } from '@ant-design/icons';

const { Text } = Typography;

const STYLE_ID = 'secure-share-styles-v1';

const css = `
  .auth-container {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;
    background: #161218;
    overflow: hidden;
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
  .auth-branding-content { position: relative; z-index: 1; text-align: center; max-width: 420px; width: 100%; }
  .auth-logo { width: 180px; height: auto; max-height: 160px; filter: brightness(1.1); margin-bottom: 16px; }
  .auth-tagline { color: rgba(255,255,255,0.85); font-size: 17px; font-weight: 500; display: block; margin-bottom: 40px; }
  .auth-form-column {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 48px; background: #161218; overflow-y: auto;
  }
  @media (max-width: 1024px) {
    .auth-container { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .auth-branding { padding: 32px 24px; }
    .auth-form-column { padding: 32px 24px; }
  }
  @media (max-width: 767px) {
    .auth-container { min-height: 100dvh; }
    .auth-branding { padding: 28px 20px 20px; }
    .auth-logo { width: 100px; margin-bottom: 8px; }
    .auth-tagline { font-size: 14px; margin-bottom: 16px; }
    .auth-form-column { padding: 24px 20px 32px; justify-content: flex-start; }
  }

  .sp-card {
    position: relative; z-index: 1; width: 100%; max-width: 440px;
    background: #1F1A23; border: 1px solid rgba(255,255,255,0.06); border-radius: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05); overflow: hidden;
  }

  .sp-header { padding: 28px 28px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .sp-type-badge {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px;
    background: rgba(99,102,241,0.1); color: #818CF8; font-size: 11px; font-weight: 600;
    letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;
  }
  .sp-title { color: #F1F5F9 !important; font-weight: 700 !important; font-size: 20px !important; margin: 0 0 4px !important; line-height: 1.3 !important; }
  .sp-project { color: rgba(255,255,255,0.35); font-size: 13px; }

  .sp-meta { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .sp-meta-item { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid rgba(255,255,255,0.06); }
  .sp-meta-item:last-child { border-right: none; }
  .sp-meta-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.3); }
  .sp-meta-value { font-size: 13px; font-weight: 600; color: #E2E8F0; }
  .sp-meta-value.warning { color: #FBBF24; }
  .sp-meta-value.danger  { color: #EF4444; }
  .sp-meta-value.ok      { color: #34D399; }

  .sp-gate { padding: 40px 28px; text-align: center; }
  .sp-gate-icon {
    width: 56px; height: 56px; border-radius: 14px; background: rgba(255,255,255,0.04);
    display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 20px;
    font-size: 24px; color: rgba(255,255,255,0.5);
  }
  .sp-gate-title { color: #F1F5F9 !important; font-weight: 600 !important; font-size: 18px !important; margin: 0 0 6px !important; }
  .sp-gate-desc { color: rgba(255,255,255,0.4); font-size: 13px; margin-bottom: 24px; display: block; }
  .sp-gate-input {
    height: 44px; border-radius: 10px; background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; margin-bottom: 12px;
  }
  .sp-gate-input .ant-input { background: transparent !important; color: #fff !important; }
  .sp-gate-input .ant-input::placeholder { color: rgba(255,255,255,0.25) !important; }
  .sp-gate-input .ant-input-prefix, .sp-gate-input .ant-input-suffix { color: rgba(255,255,255,0.3); }
  .sp-gate-btn { height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; background: #6366F1 !important; border: none !important; }

  .sp-body { padding: 20px 28px 24px; }
  .sp-fields { display: flex; flex-direction: column; gap: 2px; }
  .sp-field { display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04); gap: 12px; }
  .sp-field:last-child { border-bottom: none; }
  .sp-field-info { flex: 1; min-width: 0; }
  .sp-field-label { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.3); margin-bottom: 3px; display: block; }
  .sp-field-value { font-size: 14px; color: #F1F5F9; font-family: 'SF Mono','Menlo','Monaco','Consolas',monospace; word-break: break-all; line-height: 1.5; }
  .sp-field-value a { color: #818CF8; text-decoration: none; }
  .sp-field-value a:hover { text-decoration: underline; }
  .sp-field-masked { letter-spacing: 2px; color: rgba(255,255,255,0.4); }
  .sp-field-note { font-family: inherit; white-space: pre-wrap; line-height: 1.6; font-size: 13px; color: rgba(255,255,255,0.6); }
  .sp-field-actions { display: flex; gap: 4px; flex-shrink: 0; }

  .sp-icon-btn {
    width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
    border: none; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.15s; padding: 0; font-size: 13px;
  }
  .sp-icon-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
  .sp-icon-btn.copied { background: rgba(16,185,129,0.12); color: #34D399; }

  .sp-footer-cta { padding: 0 28px 24px; }
  .sp-copy-all {
    width: 100%; height: 44px; border-radius: 10px; font-weight: 600; font-size: 13px;
    background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.7) !important;
    transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  }
  .sp-copy-all:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.15) !important; color: #fff !important; }
  .sp-copy-all.copied { background: rgba(16,185,129,0.1) !important; border-color: rgba(16,185,129,0.3) !important; color: #34D399 !important; }

  .sp-share-note { margin: 0 28px 20px; padding: 12px 14px; border-radius: 10px; background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.1); }
  .sp-share-note.danger { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.15); }
  .sp-share-note-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #818CF8; margin-bottom: 4px; display: block; }
  .sp-share-note.danger .sp-share-note-label { color: #F87171; }
  .sp-share-note-text { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.5; }

  .sp-loading { text-align: center; padding: 56px 28px; }
  .sp-error { text-align: center; padding: 48px 28px; }
  .sp-error-icon {
    width: 56px; height: 56px; border-radius: 14px; background: rgba(239,68,68,0.1);
    display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; color: #EF4444;
  }
  .sp-error-title { color: #F1F5F9 !important; font-weight: 600 !important; font-size: 18px !important; margin: 0 0 6px !important; }
  .sp-error-desc { color: rgba(255,255,255,0.4); font-size: 13px; }

  .sp-page-footer { position: relative; z-index: 1; text-align: center; margin-top: 24px; color: rgba(255,255,255,0.4); font-size: 12px; display: flex; align-items: center; gap: 6px; }
`;

/** Inject the shared stylesheet once. */
export function useSecureShareStyles() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById(STYLE_ID);
    if (existing) { existing.textContent = css; return; }
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }, []);
}

/** Left branded panel. */
export function Brand() {
  return (
    <div className="auth-branding">
      <div className="auth-branding-bg" />
      <div className="auth-branding-content">
        <img src="/logo-landeseiten.svg" alt="Landeseiten.de" className="auth-logo" />
        <Text className="auth-tagline">LSM Platform Secure Share</Text>
      </div>
    </div>
  );
}

/** Bottom footer. */
export function Footer() {
  return (
    <div className="sp-page-footer">
      <SafetyOutlined /> End-to-end encrypted · LSM Platform
    </div>
  );
}

/** Per-field copy state + handler with clipboard fallback. */
export function useCopyToClipboard() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copy = useCallback(async (text: string, field: string) => {
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
  return { copiedField, copy };
}

/** Copy icon button matching the credential share page. */
export function CopyIconBtn({ field, value, copiedField, onCopy, icon }: {
  field: string; value: string; copiedField: string | null; onCopy: (v: string, f: string) => void; icon?: React.ReactNode;
}) {
  const copied = copiedField === field;
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'}>
      <button className={`sp-icon-btn ${copied ? 'copied' : ''}`} onClick={() => onCopy(value, field)}>
        {copied ? <CheckOutlined /> : (icon || <CopyOutlined />)}
      </button>
    </Tooltip>
  );
}

export function formatExpiry(dateStr?: string | null): string {
  if (!dateStr) return '';
  const diffMs = new Date(dateStr).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH >= 24) return `${Math.floor(diffH / 24)}d ${diffH % 24}h`;
  if (diffH > 0) return `${diffH}h ${diffM}m`;
  return `${diffM}m`;
}

export function getExpiryStatus(dateStr?: string | null): 'ok' | 'warning' | 'danger' {
  if (!dateStr) return 'ok';
  const diffMs = new Date(dateStr).getTime() - Date.now();
  if (diffMs <= 0) return 'danger';
  if (diffMs < 3600000) return 'warning';
  return 'ok';
}
