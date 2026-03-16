/**
 * Accessibility Audit Section — Coming Soon
 */

import { Result, Typography, Tag, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface AccessibilityAuditSectionProps {
  project: any;
}

export default function AccessibilityAuditSection({ project }: AccessibilityAuditSectionProps) {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '48px 0' }}>
      <Result
        icon={<EyeOutlined style={{ color: '#0891b2', fontSize: 64 }} />}
        title={
          <Space direction="vertical" size={8} align="center">
            <span>{t('accessibility.title', 'Accessibility Audit')}</span>
            <Tag color="cyan" style={{ fontSize: 13, padding: '4px 16px', fontWeight: 600 }}>
              Coming Soon
            </Tag>
          </Space>
        }
        subTitle={
          <Text type="secondary" style={{ fontSize: 14 }}>
            {t(
              'accessibility.comingSoon',
              'WCAG 2.1 Level AA accessibility auditing is currently being improved. This feature will be available soon.'
            )}
          </Text>
        }
      />
    </div>
  );
}
