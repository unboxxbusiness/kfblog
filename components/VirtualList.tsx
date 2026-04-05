'use client'

import * as React from 'react'
import { List, type RowComponentProps } from 'react-window'

type VirtualListProps<T> = {
  items: T[]
  height: number
  itemHeight: number
  width?: number | string
  overscanCount?: number
  className?: string
  renderItem: (args: { item: T; index: number }) => React.ReactNode
}

type ItemData<T> = {
  items: T[]
  renderItem: (args: { item: T; index: number }) => React.ReactNode
}

function Row<T>({ index, style, items, renderItem }: RowComponentProps<ItemData<T>>) {
  const item = items[index]

  return <div style={style}>{renderItem({ item, index })}</div>
}

export default function VirtualList<T>({
  items,
  height,
  itemHeight,
  width = '100%',
  overscanCount = 6,
  className,
  renderItem,
}: VirtualListProps<T>) {
  const itemData = React.useMemo<ItemData<T>>(
    () => ({ items, renderItem }),
    [items, renderItem]
  )

  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <div className={className}>
      <List
        rowCount={items.length}
        rowHeight={itemHeight}
        rowComponent={Row as any}
        rowProps={itemData as any}
        defaultHeight={height}
        overscanCount={overscanCount}
        style={{
          height,
          width,
        }}
      >
        {null}
      </List>
    </div>
  )
}
