import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Input, Typography, Spin, Form, App } from 'antd';
import { LockOutlined, CommentOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { createSiteReviewsApi } from '@/lib/site-reviews-api';
import { SiteReviewCanvas } from '@/features/projects/components/SiteReviewCanvas';
import type { SiteReview, SiteReviewAnnotation } from '@/lib/site-reviews-api';

const { Title, Text, Paragraph } = Typography;

// Use the raw client (no auth token required for public endpoints)
const reviewsApi = createSiteReviewsApi(apiClient);

export function SiteReviewSharePage() {
  const { token } = useParams<{ token: string }>();
  const { message } = App.useApp();

  const [password, setPassword] = useState('');
  const [accessData, setAccessData] = useState<{
    id: number; title: string; url: string; pins: SiteReviewAnnotation[];
  } | null>(null);
  const [guestName, setGuestName] = useState('');
  const [nameSet, setNameSet] = useState(false);

  const { data: shareInfo, isLoading, error } = useQuery({
    queryKey: ['review-share-info', token],
    queryFn: () => reviewsApi.getShare(token!).then(r => r.data.data),
    enabled: !!token,
    retry: false,
  });

  const accessMutation = useMutation({
    mutationFn: (pwd?: string) => reviewsApi.accessShare(token!, pwd).then(r => r.data.data),
    onSuccess: (data) => setAccessData(data),
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Incorrect password or invalid link';
      message.error(msg);
    },
  });

  if (!token) return null;

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !shareInfo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Title level={3}>Link not found</Title>
        <Text type="secondary">This review link is invalid or has expired.</Text>
      </div>
    );
  }

  // Step 1: Enter name (always required so we can attribute client comments)
  if (!nameSet) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: 40,
          width: 400,
          border: '1px solid #334155',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CommentOutlined style={{ fontSize: 24, color: '#fff' }} />
            </div>
            <Title level={4} style={{ color: '#f1f5f9', margin: 0 }}>{shareInfo.title}</Title>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>Site Review</Text>
          </div>

          <Form
            layout="vertical"
            onFinish={({ name }) => {
              setGuestName(name);
              setNameSet(true);
              if (!shareInfo.has_password) {
                accessMutation.mutate(undefined);
              }
            }}
          >
            <Form.Item name="name" label={<span style={{ color: '#cbd5e1' }}>Your name</span>} rules={[{ required: true }]}>
              <Input placeholder="Enter your name" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large"
              style={{ background: '#6366f1', borderColor: '#6366f1' }}>
              Continue
            </Button>
          </Form>
        </div>
      </div>
    );
  }

  // Step 2: Password gate (if required)
  if (shareInfo.has_password && !accessData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: 40,
          width: 400,
          border: '1px solid #334155',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <LockOutlined style={{ fontSize: 32, color: '#6366f1', marginBottom: 12 }} />
            <Title level={4} style={{ color: '#f1f5f9', margin: 0 }}>Password required</Title>
            <Text style={{ color: '#94a3b8' }}>{shareInfo.title}</Text>
          </div>
          <Input.Password
            size="large"
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onPressEnter={() => accessMutation.mutate(password)}
            style={{ marginBottom: 12 }}
          />
          <Button
            type="primary"
            block
            size="large"
            loading={accessMutation.isPending}
            disabled={!password}
            onClick={() => accessMutation.mutate(password)}
            style={{ background: '#6366f1', borderColor: '#6366f1' }}
          >
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  // Loading after name entered (no password)
  if (!accessData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Step 3: Full review canvas
  const reviewProxy: SiteReview = {
    id: accessData.id,
    project_id: 0,
    title: accessData.title,
    url: accessData.url,
    status: 'active',
    share_url: null,
    share_has_password: false,
    share_expires_at: null,
    share_active: true,
    pins: accessData.pins,
    creator: null,
    created_at: '',
    updated_at: '',
  };

  return (
    <App>
      <SiteReviewCanvas
        review={reviewProxy}
        shareToken={token}
        guestName={guestName}
        onClose={() => {
          window.close();
        }}
      />
    </App>
  );
}
