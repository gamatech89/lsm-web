import { useState } from 'react';
import {
  Button, Card, Empty, Typography, Tag, Space, Popconfirm,
  Modal, Form, Input, App, Tooltip, Badge,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ShareAltOutlined,
  CommentOutlined, PlayCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useThemeStore } from '@/stores/theme';
import type { Project } from '@lsm/types';
import type { SiteReview } from '@/lib/site-reviews-api';
import { SiteReviewCanvas } from '../SiteReviewCanvas';
import { SiteReviewShareModal } from '../SiteReviewShareModal';

const { Title, Text } = Typography;

interface Props {
  project: Project;
}

export default function SiteReviewsSection({ project }: Props) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [openReview, setOpenReview] = useState<SiteReview | null>(null);
  const [shareReview, setShareReview] = useState<SiteReview | null>(null);
  const [form] = Form.useForm();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: queryKeys.projects.siteReviews(project.id),
    queryFn: () => api.siteReviews.list(project.id).then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: { title: string; url: string }) =>
      api.siteReviews.create(project.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.siteReviews(project.id) });
      message.success('Review session created');
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Failed to create review'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.siteReviews.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.siteReviews(project.id) });
      message.success('Review deleted');
    },
    onError: () => message.error('Failed to delete review'),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.siteReviews.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.siteReviews(project.id) }),
    onError: () => message.error('Failed to update review'),
  });

  const statusColor = (s: SiteReview['status']) =>
    s === 'active' ? 'green' : s === 'draft' ? 'default' : 'orange';

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Site Reviews</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          New Review
        </Button>
      </div>

      {isLoading ? null : reviews.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No review sessions yet — create one to start annotating"
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Create First Review
          </Button>
        </Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map(review => (
            <Card
              key={review.id}
              size="small"
              styles={{
                body: {
                  padding: '12px 16px',
                  background: isDark ? '#1e293b' : '#fff',
                }
              }}
              style={{
                borderRadius: 10,
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 14 }}>{review.title}</Text>
                    <Tag color={statusColor(review.status)} style={{ fontSize: 11 }}>
                      {review.status}
                    </Tag>
                    {review.share_active && (
                      <Tag color="blue" style={{ fontSize: 11 }}>shared</Tag>
                    )}
                  </div>
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}
                  >
                    {review.url}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>
                    <CommentOutlined style={{ marginRight: 4 }} />
                    {review.annotation_count ?? 0} pin{(review.annotation_count ?? 0) !== 1 ? 's' : ''}
                    {' · '}{new Date(review.created_at).toLocaleDateString()}
                    {review.creator && <> · {review.creator}</>}
                  </Text>
                </div>

                <Space>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => setOpenReview(review)}
                  >
                    Open
                  </Button>
                  <Tooltip title={review.status === 'archived' ? 'Unarchive' : 'Archive'}>
                    <Button
                      size="small"
                      icon={review.status === 'archived' ? <PlayCircleOutlined /> : <StopOutlined />}
                      onClick={() =>
                        archiveMutation.mutate({
                          id: review.id,
                          status: review.status === 'archived' ? 'active' : 'archived',
                        })
                      }
                    />
                  </Tooltip>
                  <Tooltip title="Share with client">
                    <Button
                      size="small"
                      icon={<ShareAltOutlined />}
                      onClick={() => setShareReview(review)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Delete this review?"
                    description="All annotations and screenshots will be lost."
                    onConfirm={() => deleteMutation.mutate(review.id)}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        title="New Review Session"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={createMutation.mutate} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Homepage review — April sprint" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL"
            rules={[{ required: true }, { type: 'url', message: 'Enter a valid URL' }]}
          >
            <Input placeholder="https://dev.example.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Full-screen Review Canvas */}
      {openReview && (
        <SiteReviewCanvas
          review={openReview}
          onClose={() => {
            setOpenReview(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.siteReviews(project.id) });
          }}
        />
      )}

      {/* Share Modal */}
      {shareReview && (
        <SiteReviewShareModal
          review={shareReview}
          onClose={() => {
            setShareReview(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.siteReviews(project.id) });
          }}
        />
      )}
    </div>
  );
}
