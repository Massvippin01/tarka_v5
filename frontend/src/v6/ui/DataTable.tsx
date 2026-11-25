import React from 'react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  isAmount?: boolean;
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
  getRowId?: (row: T, index: number) => string | number;
  selectedId?: string | number;
  isSuspect?: (row: T) => boolean;
  isScanning?: (row: T, index: number) => boolean;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  getRowId,
  selectedId,
  isSuspect,
  isScanning,
  className,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  return (
    <div className={clsx('v6-table-wrap', className)}>
      <table className="v6-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={clsx(
                  col.align === 'right' || col.isAmount ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-[var(--fg-3)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const rowId = getRowId ? getRowId(row, index) : index;
              const isSelected = selectedId !== undefined && selectedId === rowId;
              const suspect = isSuspect ? isSuspect(row) : false;
              const scanning = isScanning ? isScanning(row, index) : false;

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(row, index)}
                  className={clsx(
                    'row',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'bg-[var(--surface-3)]',
                    suspect && 'suspect',
                    scanning && 'scanning'
                  )}
                >
                  {columns.map((col) => {
                    const value = (row as any)[col.key];
                    const content = col.render ? col.render(row, index) : value;

                    return (
                      <td
                        key={col.key}
                        className={clsx(
                          col.isAmount && 'amt',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
