/**
 * Activity Log Page (Admin only)
 * Shows audit trail of all activities
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Input,
  Select,
  DatePicker,
  Typography,
  Row,
  Col,
  Space,
  Tag,
  Avatar,
} from 'antd';
import {
  SearchOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@lsm/utils';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ActivityLog {
  id: number;
  description: string;
  subject_type: string;
  subject_id: number;
  causer_id: number;
  causer?: {
    id: number;
    name: string;
  };
  properties: Record<string, unknown>;
  created_at: string;
}

export function ActivityPage() {
  const { t } = useTranslation();

  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    search: '',
    subject_type: undefined as string | undefined,
    date_from: undefined as string | undefined,
    date_to: undefined as string | undefined,
  });

  const subjectTypeOptions = [
    { label: t('activity.types.all'), value: undefined },
    { label: t('activity.types.project'), value: 'Project' },
    { label: t('activity.types.credential'), value: 'Credential' },
    { label: t('activity.types.todo'), value: 'Todo' },
    { label: t('activity.types.user'), value: 'User' },
  ];

  // Fetch activity logs
  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity', filters],
    queryFn: () => api.activity.list(filters).then(r => r.data),
  });

  const getSubjectTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      Project: 'blue',
      Credential: 'purple',
      Todo: 'green',
      User: 'orange',
    };
    return colors[type] || 'default';
  };

  const columns: ColumnsType<ActivityLog> = [
    {
      title: t('activity.table.user'),
      key: 'user',
      width: 150,
      render: (_, record) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#6366f1' }}>
            {record.causer?.name?.charAt(0) || '?'}
          </Avatar>
          <Text>{record.causer?.name || t('activity.types.system')}</Text>
        </Space>
      ),
    },
    {
      title: t('activity.table.action'),
      dataIndex: 'description',
      key: 'description',
      render: (text) => <Text>{text || '-'}</Text>,
    },
    {
      title: t('activity.table.subject'),
      key: 'subject',
      width: 120,
      render: (_, record) => (
        <Tag color={getSubjectTypeColor(record.subject_type || '')}>
          {record.subject_type || t('activity.types.unknown')}
        </Tag>
      ),
    },
    {
      title: t('activity.table.time'),
      key: 'time',
      width: 150,
      render: (_, record) => (
        <Text type="secondary">{record.created_at ? formatRelativeTime(record.created_at) : '-'}</Text>
      ),
    },
  ];

  // Get safe data values
  const tableData = data?.data || [];
  const currentPage = data?.current_page || 1;
  const totalItems = data?.total || 0;

  return (
    <div className="page-container">
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <HistoryOutlined style={{ fontSize: 24, color: '#6366f1' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>{t('activity.title')}</Title>
              <Text type="secondary">
                {t('activity.subtitle')}
              </Text>
            </div>
          </Space>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder={t('activity.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filters.subject_type}
              onChange={(value) => setFilters(f => ({ ...f, subject_type: value, page: 1 }))}
              options={subjectTypeOptions}
              placeholder={t('activity.subjectType')}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                setFilters(f => ({
                  ...f,
                  date_from: dates?.[0]?.format('YYYY-MM-DD'),
                  date_to: dates?.[1]?.format('YYYY-MM-DD'),
                  page: 1,
                }));
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: isError ? t('activity.loadError') : t('activity.noActivity') }}
          pagination={{
            current: currentPage,
            total: totalItems,
            pageSize: filters.per_page,
            onChange: (page) => setFilters(f => ({ ...f, page })),
            showSizeChanger: false,
          }}
        />
      </Card>
    </div>
  );
}
