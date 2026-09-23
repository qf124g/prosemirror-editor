import { Button, ColorPicker, Dropdown, Space, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { toggleMark } from 'prosemirror-commands'
import type { EditorState } from 'prosemirror-state'
import type { EditorAPI, ToolbarItemConfig, ToolbarOption } from '../modules/types'

interface ToolbarProps {
  state: EditorState
  api: EditorAPI
  items: ToolbarItemConfig[]
}

// 执行工具栏项（命令名或自定义 onClick）
function runItem(api: EditorAPI, item: ToolbarItemConfig | ToolbarOption): void {
  const onClick = (item as ToolbarItemConfig).onClick
  if (onClick) onClick(api)
  else if (item.command && api.commands[item.command]) api.commands[item.command]!(api.view.state, api.view.dispatch)
}

function ToolbarButton(props: { item: ToolbarItemConfig; active: boolean; api: EditorAPI }) {
  const { item, active, api } = props
  const Icon = item.icon
  return (
    <Tooltip title={item.label}>
      <Button
        type={active ? 'primary' : 'text'}
        size="small"
        icon={Icon ? <Icon /> : undefined}
        onClick={() => runItem(api, item)}
      >
        {item.label}
      </Button>
    </Tooltip>
  )
}

function ToolbarDropdown(props: { item: ToolbarItemConfig; api: EditorAPI; state: EditorState }) {
  const { item, api, state } = props
  const Icon = item.icon
  const options = item.options || []
  const menuItems: MenuProps['items'] = options.map((opt) => ({
    key: opt.id,
    label: opt.label,
    icon: opt.icon ? (() => { const O = opt.icon; return <O /> })() : undefined,
  }))
  const onClick: MenuProps['onClick'] = ({ key }) => {
    const opt = options.find((o) => o.id === key)
    if (opt) runItem(api, opt)
  }
  const active = options.some((o) => o.active?.(state))
  return (
    <Dropdown menu={{ items: menuItems, onClick }}>
      <Button type={active ? 'primary' : 'text'} size="small" icon={Icon ? <Icon /> : undefined}>
        {item.label}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}

function ToolbarColor(props: { item: ToolbarItemConfig; api: EditorAPI }) {
  const { item, api } = props
  const Icon = item.icon
  const apply = (hex: string | null) => {
    const markName = item.colorKind === 'text' ? 'textColor' : 'backgroundColor'
    const markType = api.view.state.schema.marks[markName]
    if (markType && hex) toggleMark(markType, { color: hex })(api.view.state, api.view.dispatch)
  }
  return (
    <Tooltip title={item.label}>
      <ColorPicker
        size="small"
        format="hex"
        onChangeComplete={(color) => apply(color.toHexString())}
      >
        <Button size="small" type="text" icon={Icon ? <Icon /> : undefined}>
          {item.label}
        </Button>
      </ColorPicker>
    </Tooltip>
  )
}

// 按 group 聚合同组工具栏项：同组相邻、不同组之间插入分隔线
function groupItems(items: ToolbarItemConfig[]): ToolbarItemConfig[][] {
  const groups: ToolbarItemConfig[][] = []
  const indexByGroup = new Map<string, number>()
  for (const item of items) {
    const g = item.group || ''
    if (!indexByGroup.has(g)) {
      indexByGroup.set(g, groups.length)
      groups.push([item])
    } else {
      groups[indexByGroup.get(g)!].push(item)
    }
  }
  return groups
}

// 渲染单个工具栏项
function renderItem(state: EditorState, api: EditorAPI, item: ToolbarItemConfig) {
  if (item.type === 'button') {
    return <ToolbarButton key={item.id} item={item} api={api} active={!!item.active?.(state)} />
  }
  if (item.type === 'dropdown') {
    return <ToolbarDropdown key={item.id} item={item} api={api} state={state} />
  }
  if (item.type === 'color') {
    return <ToolbarColor key={item.id} item={item} api={api} />
  }
  return null
}

// 工具栏：聚合各模块 toolbarItems 渲染
export function Toolbar({ state, api, items }: ToolbarProps) {
  const groups = groupItems(items)
  return (
    <div className="full-editor-toolbar">
      <Space size={2} split={<span className="toolbar-divider" />} wrap>
        {groups.map((group) => (
          <Space key={group[0].id} size={2} wrap>
            {group.map((item) => renderItem(state, api, item))}
          </Space>
        ))}
      </Space>
    </div>
  )
}