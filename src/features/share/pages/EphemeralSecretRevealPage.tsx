import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Input, Button, Typography, Result, Spin, Space, Tag, App, message as staticMessage } from 'antd';
import { CopyOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import type { EphemeralSecretMeta, EphemeralSecretReveal } from '@lsm/types';

const { Text, Paragraph } = Typography;

type RevealData = EphemeralSecretReveal['data'];

export function EphemeralSecretRevealPage() {
  const { token = '' } = useParams();
  const { message } = App.useApp ? App.useApp() : { message: staticMessage };
  const [meta, setMeta] = useState<EphemeralSecretMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [secret, setSecret] = useState<RevealData | null>(null);
  const [gone, setGone] = useState<string | null>(null);

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

  const copy = (value?: string) => {
    if (value) {
      navigator.clipboard.writeText(value);
      message.success('Copied');
    }
  };

  const reasonText = (r?: string) =>
    r === 'expired' ? 'This link has expired.'
      : r === 'viewed' ? 'This secret has already been viewed and is no longer available.'
      : 'This link is invalid.';

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}><Spin /></div>;
  }

  if (gone || !meta?.available) {
    return <Result status="warning" title="Unavailable" subTitle={reasonText(gone ?? meta?.reason)} />;
  }

  if (secret) {
    const fields: Array<keyof RevealData> = ['username', 'password', 'hostname', 'port', 'database_name', 'url', 'note'];
    const labels: Record<string, string> = { database_name: 'Database', url: 'URL', hostname: 'Host', port: 'Port' };
    const labelFor = (k: string) => labels[k] ?? (k.charAt(0).toUpperCase() + k.slice(1));
    return (
      <div style={{ maxWidth: 480, margin: '40px auto' }}>
        <Card title={secret.title || 'Shared secret'}>
          {secret.type && <Tag color="purple" style={{ marginBottom: 12, textTransform: 'uppercase' }}>{secret.type}</Tag>}
          <Paragraph type="danger">This was the only view — the secret has now been deleted.</Paragraph>
          {fields.map((k) =>
            secret[k] ? (
              <div key={k} style={{ marginBottom: 12 }}>
                <Text type="secondary">{labelFor(k)}</Text>
                <Space.Compact style={{ width: '100%' }}>
                  <Input value={secret[k]} readOnly />
                  <Button icon={<CopyOutlined />} onClick={() => copy(secret[k])} />
                </Space.Compact>
              </div>
            ) : null,
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <Card title={meta.title || 'A secret was shared with you'}>
        <Paragraph>This is a one-time secret. Once you reveal it, it cannot be viewed again.</Paragraph>
        {meta.has_password && (
          <Input.Password
            placeholder="Access password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginBottom: 12 }}
          />
        )}
        <Button type="primary" icon={<EyeOutlined />} loading={revealing} onClick={reveal} block>
          Reveal (one-time)
        </Button>
      </Card>
    </div>
  );
}
