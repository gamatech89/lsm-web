import { Table } from 'antd';
import type { TableProps } from 'antd';
import { useIsMobile } from '@/hooks/useMediaQuery';

export interface ResponsiveTableProps<T> extends TableProps<T> {
  renderCard?: (record: T) => React.ReactNode;
}

export function ResponsiveTable<T extends object>({
  renderCard,
  dataSource,
  rowKey,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (isMobile && renderCard && dataSource) {
    const keyOf = (rec: T, i: number): React.Key => {
      if (typeof rowKey === 'function') {
        return rowKey(rec, i);
      }
      if (typeof rowKey === 'string') {
        return (rec as Record<string, unknown>)[rowKey] as React.Key ?? i;
      }
      return i;
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(dataSource as T[]).map((rec, i) => (
          <div key={keyOf(rec, i)}>{renderCard(rec)}</div>
        ))}
      </div>
    );
  }

  return <Table<T> dataSource={dataSource} rowKey={rowKey} {...tableProps} />;
}
