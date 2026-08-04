/**
 * Create an integration token, then show it once.
 *
 * The reveal step is deliberately a separate mode of the same modal: the user
 * must not be able to dismiss the form and lose the only copy of the token by
 * accident, and the copyable `claude mcp add` line turns "I have a token" into
 * "I have a working client" without a trip to the docs.
 */

import { useState } from 'react';
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
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/auth';

const { Text, Paragraph } = Typography;

const MCP_URL = `${window.location.origin.replace('app.', 'api.')}/mcp`;

interface ScopeOption {
  value: IntegrationTokenScope;
  label: string;
  hint: string;
  /** Roles allowed to select it. Mirrors StoreIntegrationTokenRequest::ROLE_SCOPES. */
  roles: string[];
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    value: 'mcp:read',
    label: 'Lesen',
    hint: 'Projekte, Todos, Zeiten und Team einsehen. Ändert nichts.',
    roles: ['admin', 'manager', 'developer'],
  },
  {
    value: 'mcp:write',
    label: 'Schreiben',
    hint: 'Todos, Zeiterfassung und Projektdaten anlegen und ändern.',
    roles: ['admin', 'manager', 'developer'],
  },
  {
    value: 'mcp:wp',
    label: 'WordPress',
    hint: 'Wartungsmodus, Cache, Updates und Backups auf Kundenseiten. Umkehrbar.',
    roles: ['admin', 'manager', 'developer'],
  },
  {
    value: 'mcp:wp-destructive',
    label: 'WordPress — kritisch',
    hint: 'Notfall-Wiederherstellung, Backup-Restore und Massenaktionen über alle Seiten. Nicht umkehrbar.',
    roles: ['admin', 'manager'],
  },
];

const EXPIRY_OPTIONS: { value: IntegrationTokenExpiry; label: string }[] = [
  { value: '30d', label: '30 Tage' },
  { value: '90d', label: '90 Tage' },
  { value: '1y', label: '1 Jahr' },
  { value: 'never', label: 'Läuft nie ab' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateTokenModal({ open, onClose }: Props) {
  const [form] = Form.useForm<CreateIntegrationTokenPayload>();
  const [revealed, setRevealed] = useState<string | null>(null);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role ?? 'developer');

  const createMutation = useMutation({
    mutationFn: (payload: CreateIntegrationTokenPayload) =>
      api.integrationTokens.create(payload),
    onSuccess: (response) => {
      setRevealed(response.data.data.token);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: queryKeys.integrationTokens.all() });
    },
    onError: () => {
      message.error('Token konnte nicht erstellt werden. Passwort korrekt?');
    },
  });

  const handleClose = () => {
    setRevealed(null);
    form.resetFields();
    onClose();
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    message.success('In die Zwischenablage kopiert');
  };

  const connectCommand = revealed
    ? `claude mcp add --transport http lsm ${MCP_URL} \\\n  --header "Authorization: Bearer ${revealed}" --scope user`
    : '';

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={revealed ? 'Token erstellt' : 'Neuen Integrations-Token erstellen'}
      footer={
        revealed
          ? [
              <Button key="done" type="primary" onClick={handleClose}>
                Fertig — ich habe den Token gespeichert
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                Abbrechen
              </Button>,
              <Button
                key="submit"
                type="primary"
                icon={<KeyOutlined />}
                loading={createMutation.isPending}
                onClick={() => form.submit()}
              >
                Token erstellen
              </Button>,
            ]
      }
      width={640}
      destroyOnClose={false}
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
            message="Dieser Token wird nur einmal angezeigt."
            description="Kopiere ihn jetzt. Danach lässt er sich nicht wieder anzeigen — nur widerrufen und neu erstellen."
          />

          <div>
            <Text strong>Token</Text>
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
              Token kopieren
            </Button>
          </div>

          <div>
            <Text strong>Client verbinden</Text>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              Diesen Befehl im Terminal ausführen:
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
              Befehl kopieren
            </Button>
          </div>
        </Space>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ scopes: ['mcp:read'], expires_in: '90d' }}
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Bitte einen Namen angeben' }]}
            extra="Wofür ist dieser Token? z. B. „Claude Code — MacBook“"
          >
            <Input maxLength={100} placeholder="Claude Code — MacBook" />
          </Form.Item>

          <Form.Item
            name="scopes"
            label="Berechtigungen"
            rules={[{ required: true, message: 'Mindestens eine Berechtigung wählen' }]}
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
                        {disabled && ' — für deine Rolle nicht verfügbar'}
                      </Text>
                    </Checkbox>
                  );
                })}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="expires_in" label="Gültigkeit" rules={[{ required: true }]}>
            <Select options={EXPIRY_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="password"
            label="Aktuelles Passwort"
            rules={[{ required: true, message: 'Passwort zur Bestätigung eingeben' }]}
            extra="Zur Bestätigung, dass du das wirklich bist."
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
