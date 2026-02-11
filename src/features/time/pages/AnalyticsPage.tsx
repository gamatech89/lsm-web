/**
 * Time Analytics Page
 *
 * Dashboard with charts and insights for time tracking:
 * - Weekly time trends
 * - Project time breakdown
 * - Developer utilization
 * - Summary statistics
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  DatePicker,
  Space,
  Spin,
  Empty,
  Progress,
  Table,
  Tag,
} from 'antd';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  ProjectOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Column, Pie } from '@ant-design/charts';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { api } from '@/lib/api';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Color palette for charts
const CHART_COLORS = [
  '#440C71',
  '#6366f1',
  '#6B21A8',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#EC4899',
];

interface TimeEntry {
  id: number;
  user_id: number;
  project_id: number;
  started_at: string;
  duration_minutes: number | null;
  user?: { id: number; name: string };
  project?: { id: number; name: string };
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  // State
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // Build filters - all_users for team-wide analytics
  const filters = {
    date_from: dateRange[0].format('YYYY-MM-DD'),
    date_to: dateRange[1].format('YYYY-MM-DD'),
    per_page: 1000, // Get all entries for analytics
    all_users: true, // Show all team members for admins/managers
  };

  // Fetch time entries
  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['analytics', 'entries', filters],
    queryFn: async () => {
      const response = await api.timeEntries.list(filters);
      return (response.data.data || []) as TimeEntry[];
    },
  });

  // Calculate analytics
  const analytics = calculateAnalytics(entriesData || []);

  // Weekly trend data for column chart
  const weeklyData = calculateWeeklyTrend(entriesData || [], dateRange);

  // Project breakdown for pie chart
  const projectBreakdown = calculateProjectBreakdown(entriesData || []);

  // Developer leaderboard
  const developerStats = calculateDeveloperStats(entriesData || []);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <BarChartOutlined style={{ fontSize: 24, color: '#6366f1' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>{t('analytics.title')}</Title>
            <Text type="secondary">{t('analytics.subtitle')}</Text>
          </div>
        </Space>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
            presets={[
              { label: t('analytics.presets.last7'), value: [dayjs().subtract(7, 'days'), dayjs()] },
              { label: t('analytics.presets.last30'), value: [dayjs().subtract(30, 'days'), dayjs()] },
              { label: t('analytics.presets.thisMonth'), value: [dayjs().startOf('month'), dayjs()] },
              { label: t('analytics.presets.lastMonth'), value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            ]}
          />
        </Space>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title={t('analytics.totalHours')}
                  value={analytics.totalHours}
                  precision={1}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#6366f1' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title={t('analytics.totalEntries')}
                  value={analytics.totalEntries}
                  prefix={<ProjectOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title={t('analytics.activeProjects')}
                  value={analytics.activeProjects}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#6366f1' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title={t('analytics.avgHoursDay')}
                  value={analytics.avgHoursPerDay}
                  precision={1}
                  prefix={analytics.trend >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  valueStyle={{ color: analytics.trend >= 0 ? '#6366f1' : '#EF4444' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {/* Weekly Trend */}
            <Col xs={24} lg={14}>
              <Card title={t('analytics.weeklyTrend')} size="small">
                {weeklyData.length > 0 ? (
                  <Column
                    data={weeklyData}
                    xField="week"
                    yField="hours"
                    color="#6366f1"
                    height={280}
                    label={{
                      position: 'top',
                      style: { fill: '#666', fontSize: 11 },
                      formatter: (datum: { hours: number }) => `${datum.hours.toFixed(1)}h`,
                    }}
                    xAxis={{ label: { autoRotate: false } }}
                    yAxis={{ title: { text: t('analytics.hours') } }}
                    tooltip={{
                      formatter: (datum: { hours: number }) => ({ name: t('analytics.hours'), value: `${datum.hours.toFixed(1)}h` }),
                    }}
                  />
                ) : (
                  <Empty description={t('analytics.noData')} />
                )}
              </Card>
            </Col>

            {/* Project Breakdown */}
            <Col xs={24} lg={10}>
              <Card title={t('analytics.timeByProject')} size="small">
                {projectBreakdown.length > 0 ? (
                  <Pie
                    data={projectBreakdown}
                    angleField="hours"
                    colorField="project"
                    color={CHART_COLORS}
                    radius={0.8}
                    innerRadius={0.5}
                    height={280}
                    label={{
                      type: 'outer',
                      content: '{name}: {percentage}',
                    }}
                    legend={{ position: 'bottom' }}
                    tooltip={{
                      formatter: (datum: { hours: number }) => ({ name: t('analytics.hours'), value: `${datum.hours.toFixed(1)}h` }),
                    }}
                  />
                ) : (
                  <Empty description={t('analytics.noData')} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Developer Stats */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title={t('analytics.teamLeaderboard')} size="small">
                <Table
                  scroll={{ x: 500 }}
                  dataSource={developerStats}
                  rowKey="userId"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: t('analytics.table.developer'),
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string, _: unknown, index: number) => (
                        <Space>
                          {index < 3 && <TrophyOutlined style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }} />}
                          <Text strong>{name}</Text>
                        </Space>
                      ),
                    },
                    {
                      title: t('analytics.table.hours'),
                      dataIndex: 'hours',
                      key: 'hours',
                      render: (hours: number) => <Tag color="purple">{hours.toFixed(1)}h</Tag>,
                      sorter: (a: { hours: number }, b: { hours: number }) => b.hours - a.hours,
                      defaultSortOrder: 'descend',
                    },
                    {
                      title: t('analytics.table.entries'),
                      dataIndex: 'entries',
                      key: 'entries',
                    },
                    {
                      title: t('analytics.table.avgPerEntry'),
                      key: 'avg',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      render: (_: any, record: any) => 
                        `${(record.hours / (record.entries || 1)).toFixed(1)}h`,
                    },
                  ]}
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title={t('analytics.projectDistribution')} size="small">
                {projectBreakdown.slice(0, 5).map((project, index) => (
                  <div key={project.project} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>{project.project}</Text>
                      <Text strong>{project.hours.toFixed(1)}h ({project.percentage}%)</Text>
                    </div>
                    <Progress
                      percent={project.percentage}
                      showInfo={false}
                      strokeColor={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  </div>
                ))}
                {projectBreakdown.length === 0 && (
                  <Empty description={t('analytics.noData')} />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

// Helper functions
function calculateAnalytics(entries: TimeEntry[]) {
  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;
  const projects = new Set(entries.map(e => e.project_id));
  const days = new Set(entries.map(e => dayjs(e.started_at).format('YYYY-MM-DD'))).size || 1;
  
  return {
    totalHours,
    totalEntries: entries.length,
    activeProjects: projects.size,
    avgHoursPerDay: totalHours / days,
    trend: 0, // Could calculate vs previous period
  };
}

function calculateWeeklyTrend(entries: TimeEntry[], dateRange: [Dayjs, Dayjs]) {
  const weekMap = new Map<string, number>();
  
  // Initialize weeks
  let current = dateRange[0].startOf('isoWeek');
  while (current.isBefore(dateRange[1]) || current.isSame(dateRange[1], 'week')) {
    const weekLabel = `W${current.isoWeek()}`;
    weekMap.set(weekLabel, 0);
    current = current.add(1, 'week');
  }

  // Sum hours per week
  entries.forEach(entry => {
    const weekLabel = `W${dayjs(entry.started_at).isoWeek()}`;
    const hours = (entry.duration_minutes || 0) / 60;
    if (weekMap.has(weekLabel)) {
      weekMap.set(weekLabel, (weekMap.get(weekLabel) || 0) + hours);
    }
  });

  return Array.from(weekMap.entries()).map(([week, hours]) => ({ week, hours }));
}

function calculateProjectBreakdown(entries: TimeEntry[]) {
  const projectMap = new Map<string, { id: number; hours: number }>();
  
  entries.forEach(entry => {
    const projectName = entry.project?.name || 'Unknown';
    const projectId = entry.project_id;
    const hours = (entry.duration_minutes || 0) / 60;
    
    if (projectMap.has(projectName)) {
      const existing = projectMap.get(projectName)!;
      existing.hours += hours;
    } else {
      projectMap.set(projectName, { id: projectId, hours });
    }
  });

  const total = Array.from(projectMap.values()).reduce((sum, p) => sum + p.hours, 0);
  
  return Array.from(projectMap.entries())
    .map(([project, data]) => ({
      project,
      hours: data.hours,
      percentage: total > 0 ? Math.round((data.hours / total) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);
}

function calculateDeveloperStats(entries: TimeEntry[]) {
  const devMap = new Map<number, { name: string; hours: number; entries: number }>();
  
  entries.forEach(entry => {
    const userId = entry.user_id;
    const userName = entry.user?.name || 'Unknown';
    const hours = (entry.duration_minutes || 0) / 60;
    
    if (devMap.has(userId)) {
      const existing = devMap.get(userId)!;
      existing.hours += hours;
      existing.entries += 1;
    } else {
      devMap.set(userId, { name: userName, hours, entries: 1 });
    }
  });

  return Array.from(devMap.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.hours - a.hours);
}
