import { useState } from 'react';
import { Modal, Button, Input, Space, Typography, Form, DatePicker, App, Tag, Popconfirm } from 'antd';
import { CopyOutlined, CheckOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SiteReview } from '@/lib/site-reviews-api';

const { Text, Paragraph } = Typography;

interface Props {
  review: SiteReview;
  onClose: () => void;
}

export function SiteReviewShareModal({ review, onClose }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(review.share_url);

  const generateMutation = useMutation({
    mutationFn: (values: { password?: string; expires_at?: any }) =>
      api.siteReviews.generateShare(review.id, {
        password: values.password || undefined,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined,
      }),
    onSuccess: (res) => {
      setShareUrl(res.data.data.share_url);
      queryClient.invalidateQueries({ queryKey: ['site-reviews'] });
      message.success('Share link generated');
    },
    onError: () => message.error('Failed to generate share link'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => api.siteReviews.revokeShare(review.id),
    onSuccess: () => {
      setShareUrl(null);
      queryClient.invalidateQueries({ queryKey: ['site-reviews'] });
      message.success('Share link revoked');
      form.resetFields();
    },
    onError: () => message.error('Failed to revoke share link'),
  });

  const copyUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      open
      title={
        <Space>
          <LinkOutlined />
          Share with Client — {review.title}
        </Space>
      }
      onCancel={onClose}
      footer={null}
      width={480}
    >
      {shareUrl ? (
        <div>
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            Send this link to your client. They can view the page, add pins, and reply to existing comments.
            {review.share_has_password && <> A <strong>password</strong> is required to access it.</>}
          </Paragraph>

          <Input
            value={shareUrl}
            readOnly
            addonAfter={
              <Button
                type="link"
                size="small"
                icon={copied ? <CheckOutlined style={{ color: '#22c55e' }} /> : <CopyOutlined />}
                onClick={copyUrl}
                style={{ height: 'auto', padding: 0 }}
              />
            }
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => { setShareUrl(null); form.resetFields(); }}>
              Update settings
            </Button>
            <Popconfirm
              title="Revoke share link?"
              description="The current link will stop working immediately."
              onConfirm={() => revokeMutation.mutate()}
              okText="Revoke"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} loading={revokeMutation.isPending}>
                Revoke
              </Button>
            </Popconfirm>
          </div>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={generateMutation.mutate}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="password"
            label="Password (optional)"
            extra="Leave blank for open access"
          >
            <Input.Password placeholder="Client password" />
          </Form.Item>
          <Form.Item
            name="expires_at"
            label="Expires at (optional)"
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={generateMutation.isPending}
            block
          >
            Generate Share Link
          </Button>
        </Form>
      )}
    </Modal>
  );
}
