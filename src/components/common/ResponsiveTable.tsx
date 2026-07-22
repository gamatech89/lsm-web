import { Table, Spin, Empty, Pagination } from 'antd';
import type { TableProps, TablePaginationConfig } from 'antd';
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

    const { loading, pagination } = tableProps;

    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spin size="large" />
        </div>
      );
    }

    const rows = dataSource as T[];

    if (rows.length === 0) {
      return <Empty style={{ padding: '48px 0' }} />;
    }

    const paginationConfig: TablePaginationConfig | false | undefined = pagination;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((rec, i) => (
          <div key={keyOf(rec, i)}>{renderCard(rec)}</div>
        ))}
        {paginationConfig && (
          <Pagination
            current={paginationConfig.current}
            pageSize={paginationConfig.pageSize}
            total={paginationConfig.total}
            onChange={paginationConfig.onChange}
            onShowSizeChange={paginationConfig.onShowSizeChange}
            showSizeChanger={paginationConfig.showSizeChanger}
            showTotal={paginationConfig.showTotal}
            pageSizeOptions={paginationConfig.pageSizeOptions}
            style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}
          />
        )}
      </div>
    );
  }

  return <Table<T> dataSource={dataSource} rowKey={rowKey} {...tableProps} />;
}
