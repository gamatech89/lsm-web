/**
 * Create an integration token, then show it once.
 *
 * The reveal step is deliberately a separate mode of the same modal: the user
 * must not be able to dismiss the form and lose the only copy of the token by
 * accident, and the copyable `claude mcp add` line turns "I have a token" into
 * "I have a working client" without a trip to the docs.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Typography,
  Alert,
  Space,
  Button,
  App,
} from 'antd';
import { CopyOutlined, KeyOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateIntegrationTokenPayload,
  IntegrationTokenExpiry,
  IntegrationTokenScope,
} from '@lsm/types';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/auth';

const { Text, Paragraph } = Typography;

/**
 * The MCP endpoint lives on the API host, not this app's own origin, so it
 * must come from the same source src/lib/api.ts:40 uses to reach the API
 * (VITE_API_URL) — never guessed from window.location. Guessing previously
 * meant string-replacing "app." with "api." in the current origin, which was
 * a no-op in local dev (no "app." to replace, landing on the Vite dev server
 * instead of the API) and an unverified hostname assumption in production.
 * `new URL(value, base)` resolves both the absolute production URL and the
 * relative dev fallback ('/api/v1') to the right origin; the try/catch is
 * only there so a malformed env value degrades to window.location.origin
 * instead of throwing at module scope and blanking the whole page.
 *
 * `new URL(value, base)` does not throw on a scheme-less value — it silently
 * treats it as a path relative to `base` instead. A misconfigured env value
 * like "api.example.com/api/v1" (missing "https://") would then resolve to
 * this app's own origin rather than surfacing as the malformed input it is,
 * which is exactly the wrong-host failure mode the try/catch below exists to
 * catch. Requiring an explicit http(s) scheme before treating the value as
 * absolute closes that gap.
 */
const API_ORIGIN = (() => {
  const envUrl = import.meta.env.VITE_API_URL;

  try {
    if (envUrl && !/^https?:\/\//i.test(envUrl)) {
      throw new Error('VITE_API_URL is not an absolute http(s) URL');
    }

    return new URL(envUrl || '/api/v1', window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
})();

const MCP_URL = `${API_ORIGIN}/mcp`;

interface ScopeMeta {
  value: IntegrationTokenScope;
  /** Key segment under integrationTokens.scopes.<key>.{label,hint}. */
  i18nKey: string;
  /** Roles allowed to select it. Mirrors StoreIntegrationTokenRequest::ROLE_SCOPES. */
  roles: string[];
}

// Label and hint text live in i18n (integrationTokens.scopes.*); only the
// role gating is static data.
const SCOPE_META: ScopeMeta[] = [
  {
    value: 'mcp:read',
    i18nKey: 'read',
    roles: ['admin', 'manager', 'developer', 'viewer'],
  },
  {
    value: 'mcp:write',
    i18nKey: 'write',
    roles: ['admin', 'manager', 'developer'],
  },
  {
    value: 'mcp:wp',
    i18nKey: 'wp',
    roles: ['admin', 'manager', 'developer'],
  },
  {
    value: 'mcp:wp-destructive',
    i18nKey: 'wpDestructive',
    roles: ['admin', 'manager'],
  },
];

// Expiry option labels live in i18n (integrationTokens.expiryOptions.*).
const EXPIRY_META: { value: IntegrationTokenExpiry; i18nKey: string }[] = [
  { value: '30d', i18nKey: 'days30' },
  { value: '90d', i18nKey: 'days90' },
  { value: '1y', i18nKey: 'year1' },
  { value: 'never', i18nKey: 'never' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateTokenModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm<CreateIntegrationTokenPayload>();
  const [revealed, setRevealed] = useState<string | null>(null);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // Falls back to the narrowest role, not 'developer': mirrors the backend's
  // own choice for an unrecognised role (StoreIntegrationTokenRequest's
  // FALLBACK_SCOPES = ['mcp:read']), which a test pins as "falls back to read
  // only, not to developer". Defaulting wider here than the API allows would
  // just mean every checkbox renders as if it might be selectable and then
  // 422s on submit.
  const role = useAuthStore((state) => state.user?.role ?? 'viewer');

  const createMutation = useMutation({
    mutationFn: (payload: CreateIntegrationTokenPayload) =>
      api.integrationTokens.create(payload),
    onSuccess: (response) => {
      setRevealed(response.data.data.token);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationTokens.all() });
    },
    onError: (error) => {
      message.error(getApiErrorMessage(error, t('integrationTokens.toasts.createError')));
    },
  });

  const handleClose = () => {
    // Only reset while the <Form> is actually mounted (the create step, not
    // the reveal step): onSuccess already reset the fields once, while the
    // form was still on screen, so by the time "Fertig" calls this the form
    // has been swapped out for the reveal <Space> and this instance isn't
    // connected to any rendered Form element — calling it here would just
    // log antd's "not connected" warning on every create-and-acknowledge run.
    if (!revealed) {
      form.resetFields();
    }
    setRevealed(null);
    onClose();
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    message.success(t('integrationTokens.toasts.copied'));
  };

  const connectCommand = revealed
    ? `claude mcp add --transport http lsm ${MCP_URL} \\\n  --header "Authorization: Bearer ${revealed}" --scope user`
    : '';

  // Label/hint text is translated here rather than at module scope: it must
  // come from t(), which is only available inside the component.
  const SCOPE_OPTIONS = SCOPE_META.map((scope) => ({
    ...scope,
    label: t(`integrationTokens.scopes.${scope.i18nKey}.label`),
    hint: t(`integrationTokens.scopes.${scope.i18nKey}.hint`),
  }));

  const EXPIRY_OPTIONS = EXPIRY_META.map((expiry) => ({
    value: expiry.value,
    label: t(`integrationTokens.expiryOptions.${expiry.i18nKey}`),
  }));

  // Pre-checking 'mcp:read' unconditionally contradicted the disabled state
  // for a role that isn't in its `roles` list (initialValues populates form
  // state regardless of a field's disabled rendering): the checkbox showed
  // disabled with "für deine Rolle nicht verfügbar" while the form still
  // carried it as a selected value. Only default it in when this role can
  // actually select it; otherwise start with nothing checked.
  const canSelectReadByDefault =
    SCOPE_META.find((scope) => scope.value === 'mcp:read')?.roles.includes(role) ?? false;
  const initialScopes: IntegrationTokenScope[] = canSelectReadByDefault ? ['mcp:read'] : [];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={revealed ? t('integrationTokens.create.createdTitle') : t('integrationTokens.create.title')}
      footer={
        revealed
          ? [
              <Button key="done" type="primary" onClick={handleClose}>
                {t('integrationTokens.create.done')}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                {t('integrationTokens.create.cancel')}
              </Button>,
              <Button
                key="submit"
                type="primary"
                icon={<KeyOutlined />}
                loading={createMutation.isPending}
                onClick={() => form.submit()}
              >
                {t('integrationTokens.create.submit')}
              </Button>,
            ]
      }
      width={640}
      // The reveal step shows the token exactly once — closing this modal by
      // any dismissal path other than the explicit "Fertig" button loses it
      // permanently. `closable`/`maskClosable` alone don't cover Escape: antd
      // forwards `keyboard` to rc-dialog, which defaults it to `true` and
      // checks it independently of `closable`, so Escape would otherwise
      // still fire onCancel even with the X hidden and the mask locked. All
      // three must stay tied to `!revealed` together — do not "simplify" this
      // back down to just the first two.
      maskClosable={!revealed}
      closable={!revealed}
      keyboard={!revealed}
    >
      {revealed ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message={t('integrationTokens.create.revealWarningTitle')}
            description={t('integrationTokens.create.revealWarningDescription')}
          />

          <div>
            <Text strong>{t('integrationTokens.create.tokenLabel')}</Text>
            <Input.TextArea
              value={revealed}
              readOnly
              autoSize
              style={{ fontFamily: 'monospace', marginTop: 8 }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={() => copy(revealed)}
              style={{ marginTop: 8 }}
            >
              {t('integrationTokens.create.copyToken')}
            </Button>
          </div>

          <div>
            <Text strong>{t('integrationTokens.create.connectClient')}</Text>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              {t('integrationTokens.create.connectInstructions')}
            </Paragraph>
            <Input.TextArea
              value={connectCommand}
              readOnly
              autoSize
              style={{ fontFamily: 'monospace' }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={() => copy(connectCommand)}
              style={{ marginTop: 8 }}
            >
              {t('integrationTokens.create.copyCommand')}
            </Button>
          </div>
        </Space>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ scopes: initialScopes, expires_in: '90d' }}
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label={t('integrationTokens.create.nameLabel')}
            rules={[{ required: true, message: t('integrationTokens.create.nameRequired') }]}
            extra={t('integrationTokens.create.nameHelp')}
          >
            <Input maxLength={100} placeholder={t('integrationTokens.create.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="scopes"
            label={t('integrationTokens.create.scopesLabel')}
            rules={[{ required: true, message: t('integrationTokens.create.scopesRequired') }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {SCOPE_OPTIONS.map((scope) => {
                  const disabled = !scope.roles.includes(role);

                  return (
                    <Checkbox key={scope.value} value={scope.value} disabled={disabled}>
                      <Text strong={!disabled} type={disabled ? 'secondary' : undefined}>
                        {scope.label}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {scope.hint}
                        {disabled && t('integrationTokens.create.scopeUnavailable')}
                      </Text>
                    </Checkbox>
                  );
                })}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="expires_in" label={t('integrationTokens.create.expiryLabel')} rules={[{ required: true }]}>
            <Select options={EXPIRY_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('integrationTokens.create.passwordLabel')}
            rules={[{ required: true, message: t('integrationTokens.create.passwordRequired') }]}
            extra={t('integrationTokens.create.passwordHelp')}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
