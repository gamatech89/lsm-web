/**
 * Media Section - Scan for and clean up unused media library images.
 */

import { useState } from 'react';
import {
  Typography,
  Card,
  Space,
  Button,
  Alert,
  Table,
  Image,
  Tag,
  Popconfirm,
  App,
  Statistic,
  Row,
  Col,
  Checkbox,
  Empty,
  Progress,
} from 'antd';
import {
  PictureOutlined,
  SearchOutlined,
  DeleteOutlined,
  FileImageOutlined,
  CloudOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ConnectWordPressCard } from '../ConnectWordPressCard';
import { useThemeStore } from '@/stores/theme';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const { Text } = Typography;

interface MediaSectionProps {
  project: any;
}

interface UnusedMediaItem {
  id: number;
  title: string;
  filename: string;
  url: string;
  thumbnail_url: string;
  file_size: number;
  dimensions: string | null;
  uploaded_date: string;
  mime_type: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

export default function MediaSection({ project }: MediaSectionProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [scanResult, setScanResult] = useState<{
    unused: UnusedMediaItem[];
    total_media: number;
    unused_count: number;
    total_size: number;
    scanned_at: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Check if WordPress is connected
  const hasLsmConnection = !!project.health_check_secret;

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: () => api.lsm.getUnusedMedia(project.id).then(r => r.data?.data || r.data),
    onSuccess: (data: any) => {
      setScanResult(data);
      setSelectedIds([]);
      setHasScanned(true);
      const count = data?.unused_count || 0;
      if (count > 0) {
        message.success(`Found ${count} unused image${count !== 1 ? 's' : ''}`);
      } else {
        message.success('No unused images found — your media library is clean!');
      }
    },
    onError: () => message.error('Failed to scan media library. The site may be unreachable or the scan timed out.'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.lsm.deleteMedia(project.id, ids).then(r => r.data?.data || r.data),
    onSuccess: (data: any) => {
      const deleted = data?.deleted || 0;
      const freed = data?.freed_bytes || 0;
      message.success(`Deleted ${deleted} image${deleted !== 1 ? 's' : ''} (${formatFileSize(freed)} freed)`);
      // Remove deleted items from the scan results
      if (scanResult) {
        const deletedSet = new Set(selectedIds);
        const remaining = scanResult.unused.filter(item => !deletedSet.has(item.id));
        const removedSize = scanResult.unused
          .filter(item => deletedSet.has(item.id))
          .reduce((sum, item) => sum + item.file_size, 0);
        setScanResult({
          ...scanResult,
          unused: remaining,
          unused_count: remaining.length,
          total_size: scanResult.total_size - removedSize,
        });
      }
      setSelectedIds([]);
    },
    onError: () => message.error('Failed to delete media'),
  });

  // Not connected state
  if (!hasLsmConnection) {
    return <ConnectWordPressCard project={project} />;
  }

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? '#1e293b' : '#fff',
    marginBottom: 16,
  };

  const unused = scanResult?.unused || [];
  const allSelected = unused.length > 0 && selectedIds.length === unused.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < unused.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unused.map(item => item.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedSize = unused
    .filter(item => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + item.file_size, 0);

  const columns = [
    {
      title: (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleSelectAll}
        />
      ),
      width: 48,
      render: (_: any, record: UnusedMediaItem) => (
        <Checkbox
          checked={selectedIds.includes(record.id)}
          onChange={() => toggleSelect(record.id)}
        />
      ),
    },
    {
      title: 'Preview',
      width: 80,
      render: (_: any, record: UnusedMediaItem) => (
        <Image
          src={record.thumbnail_url}
          alt={record.title}
          width={56}
          height={56}
          style={{ objectFit: 'cover', borderRadius: 6 }}
          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNhYWEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5OL0E8L3RleHQ+PC9zdmc+"
          preview={{ mask: <SearchOutlined /> }}
        />
      ),
    },
    {
      title: 'Filename',
      dataIndex: 'filename',
      ellipsis: true,
      render: (filename: string, record: UnusedMediaItem) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{filename}</Text>
          {record.dimensions && (
            <div><Text type="secondary" style={{ fontSize: 11 }}>{record.dimensions}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      width: 100,
      sorter: (a: UnusedMediaItem, b: UnusedMediaItem) => a.file_size - b.file_size,
      render: (size: number) => (
        <Tag color={size > 1024 * 1024 ? 'orange' : 'default'}>
          {formatFileSize(size)}
        </Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'mime_type',
      width: 100,
      render: (mime: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {mime.replace('image/', '').toUpperCase()}
        </Text>
      ),
    },
    {
      title: 'Uploaded',
      dataIndex: 'uploaded_date',
      width: 120,
      sorter: (a: UnusedMediaItem, b: UnusedMediaItem) =>
        new Date(a.uploaded_date).getTime() - new Date(b.uploaded_date).getTime(),
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Scan Card */}
      <Card
        style={cardStyle}
        title={
          <Space>
            <PictureOutlined />
            <span>Media Library Cleanup</span>
          </Space>
        }
        extra={
          <Space>
            {hasScanned && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => scanMutation.mutate()}
                loading={scanMutation.isPending}
              >
                Re-scan
              </Button>
            )}
            {selectedIds.length > 0 && (
              <Popconfirm
                title={`Delete ${selectedIds.length} image${selectedIds.length !== 1 ? 's' : ''}?`}
                description={
                  <div>
                    <p>This will permanently remove {selectedIds.length} image{selectedIds.length !== 1 ? 's' : ''} ({formatFileSize(selectedSize)}) from the media library.</p>
                    <p style={{ color: '#ff4d4f', fontWeight: 500 }}>This action cannot be undone.</p>
                  </div>
                }
                onConfirm={() => deleteMutation.mutate(selectedIds)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending}
                >
                  Delete Selected ({selectedIds.length})
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {/* Pre-scan state */}
        {!hasScanned && !scanMutation.isPending && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <FileImageOutlined style={{ fontSize: 48, color: isDark ? '#64748b' : '#d9d9d9', marginBottom: 16 }} />
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Scan the media library to find images that are not used anywhere on the site.
              </Text>
            </div>
            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Checks post content, featured images, Elementor data, WooCommerce galleries, theme settings, and widgets.
              </Text>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={() => scanMutation.mutate()}
              loading={scanMutation.isPending}
            >
              Scan for Unused Images
            </Button>
          </div>
        )}

        {/* Scanning state */}
        {scanMutation.isPending && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Progress
              type="circle"
              percent={99}
              status="active"
              format={() => <SearchOutlined style={{ fontSize: 24 }} />}
              size={80}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Scanning media library... This may take a moment for large libraries.</Text>
            </div>
          </div>
        )}

        {/* Results */}
        {hasScanned && !scanMutation.isPending && scanResult && (
          <>
            {/* Stats Row */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={8}>
                <Statistic
                  title="Total Images"
                  value={scanResult.total_media}
                  prefix={<PictureOutlined />}
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Unused"
                  value={scanResult.unused_count}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: scanResult.unused_count > 0 ? '#f59e0b' : '#22c55e' }}
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Potential Savings"
                  value={formatFileSize(scanResult.total_size)}
                  prefix={<CloudOutlined />}
                  valueStyle={{ color: scanResult.total_size > 0 ? '#f59e0b' : '#22c55e' }}
                />
              </Col>
            </Row>

            {scanResult.unused_count > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Review before deleting"
                description="These images appear to be unused, but some may be referenced in custom CSS, hardcoded in theme files, or used by third-party plugins. Please review before deleting."
              />
            )}

            {scanResult.unused_count === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No unused images found — your media library is clean!"
              />
            ) : (
              <Table
                dataSource={unused}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} unused images`,
                }}
                scroll={{ x: 600 }}
                style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
