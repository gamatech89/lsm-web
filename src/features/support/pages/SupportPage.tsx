/**
 * Support Page — Coming Soon
 */

import { useTranslation } from 'react-i18next';
import { Typography, Card } from 'antd';
import { CustomerServiceOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useThemeStore } from '@/stores/theme';

const { Title, Text } = Typography;

function SupportPage() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CustomerServiceOutlined style={{ color: '#a855f7' }} />
          {t('nav.support')}
        </Title>
        <Text type="secondary">
          {t('support.subtitle')}
        </Text>
      </div>

      {/* Coming Soon Card */}
      <Card
        style={{
          borderRadius: 16,
          background: isDark
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #faf5ff 0%, #f0e7ff 100%)',
          border: `1px solid ${isDark ? '#334155' : '#e9d5ff'}`,
          textAlign: 'center',
          padding: '60px 24px',
        }}
      >
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: isDark
            ? 'rgba(139, 92, 246, 0.15)'
            : 'rgba(139, 92, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <ClockCircleOutlined style={{ fontSize: 36, color: '#a855f7' }} />
        </div>

        <Title level={3} style={{ marginBottom: 8, color: isDark ? '#e2e8f0' : '#1e293b' }}>
          {t('support.comingSoon')}
        </Title>
        <Text type="secondary" style={{ fontSize: 16, maxWidth: 480, display: 'block', margin: '0 auto' }}>
          {t('support.comingSoonDescription')}
        </Text>
      </Card>
    </div>
  );
}

export default SupportPage;
