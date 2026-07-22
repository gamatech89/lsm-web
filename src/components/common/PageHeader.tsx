import React from 'react';
import { Button, Dropdown, Typography } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useThemeStore } from '@/stores/theme';

const { Text } = Typography;

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  prefix?: React.ReactNode;
  tags?: React.ReactNode;
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode;
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  prefix,
  tags,
  actions,
  primaryAction,
  sticky = true,
}: PageHeaderProps) {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const surfaceBg = isDark ? '#1e293b' : '#fff';
  const surfaceBorder = isDark ? '1px solid #334155' : '1px solid #e2e8f0';

  const titleNode = (
    <div style={{ minWidth: 0 }}>
      <Text
        strong
        style={{
          fontSize: isMobile ? 18 : 16,
          lineHeight: 1.3,
          display: 'block',
          overflowWrap: 'anywhere',   // wrap by words, never letter-by-letter
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text type="secondary" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
          {subtitle}
        </Text>
      )}
    </div>
  );

  const containerStyle: React.CSSProperties = sticky
    ? {
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: surfaceBg,
        padding: isMobile ? '10px 0' : '10px 0',
      }
    : { padding: '10px 0' };

  if (isMobile) {
    const overflow = actions ? (
      <Dropdown trigger={['click']} dropdownRender={() => (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8, padding: 8,
          background: surfaceBg, border: surfaceBorder, borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        }}>
          {actions}
        </div>
      )}>
        <Button icon={<MoreOutlined />} type="text" aria-label="More actions" />
      </Dropdown>
    ) : null;

    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {prefix}
          <div style={{ flex: 1, minWidth: 0 }}>{titleNode}</div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {primaryAction}
            {overflow}
          </div>
        </div>
        {tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {tags}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {prefix}
        {titleNode}
        {tags && <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{tags}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {primaryAction}
        {actions}
      </div>
    </div>
  );
}
