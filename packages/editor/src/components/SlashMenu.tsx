import { useLayoutEffect, useRef } from 'react'
import { Empty } from 'antd'
import type { SlashItemConfig } from '../modules/types'

interface SlashMenuProps {
  items: SlashItemConfig[]
  index: number
  query: string
  position: { left: number; top: number } | null
  onPick: (item: SlashItemConfig) => void
  onHover: (index: number) => void
  onSizeChange?: (size: { width: number; height: number } | null) => void
}

// / 插入菜单弹层
export function SlashMenu({ items, index, query, position, onPick, onHover, onSizeChange }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const open = !!position

  // 向上层上报菜单实际尺寸，供其判断是否需要翻转或关闭
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const measure = () => onSizeChange?.({ width: el.offsetWidth, height: el.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      ro.disconnect()
      onSizeChange?.(null)
    }
  }, [open, onSizeChange])

  if (!position) return null
  return (
    <div className="slash-menu-wrap">
      <div className="slash-menu" ref={menuRef} style={{ left: position.left, top: position.top }}>
        <div className="slash-menu-search">/{query}</div>
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配项" />
        ) : (
          <ul className="slash-menu-list">
            {items.map((item, i) => {
              const Icon = item.icon
              return (
                <li
                  key={item.id}
                  className={`slash-menu-item${i === index ? ' is-active' : ''}`}
                  onMouseEnter={() => onHover(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onPick(item)
                  }}
                >
                  {Icon ? <span className="slash-menu-icon"><Icon /></span> : null}
                  <span className="slash-menu-body">
                    <span className="slash-menu-title">{item.title}</span>
                    {item.description ? <span className="slash-menu-desc">{item.description}</span> : null}
                  </span>
                  {item.group ? <span className="slash-menu-group">{item.group}</span> : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}