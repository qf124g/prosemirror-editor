# prosemirror-editor

基于 React + ProseMirror 的模块化富文本编辑器。编辑器独立为 `@full-editor/editor` 包，可在任意 React 或原生环境中集成，并通过模块注册与事件系统灵活扩展。

## 特性

- 模块化架构：文本、标题、列表、引用、代码块、链接、颜色、图片、视频、语音、表格、AI 摘要等能力各自独立为一个模块，由主模块统一注册
- 斜杠菜单：输入 `/` 唤起插入菜单，支持关键字过滤与键盘选择
- 媒体资源异步加载：图片 / 视频 / 语音仅存储 `resourceId`，通过 `resourceResolver` 异步解析 URL 并懒加载
- 虚拟滚动：媒体块级虚拟化 + `content-visibility` 加速长文本
- 内容导入导出：JSON / HTML / Markdown / 纯文本
- AI 摘要：对接任意 OpenAI 兼容接口
- 事件系统：外部可监听 `update` / `selectionChange` 事件并扩展功能

## 技术栈

- 编辑器：React 18 + ProseMirror（state / view / model / schema-list / tables / gapcursor / history / inputrules / keymap）
- UI：Ant Design 5
- 后端：Node.js + Express（文档存取、资源上传、AI 摘要）
- 工程：pnpm monorepo + TypeScript + Vite + tsup

## 目录结构

```
.
├── packages
│   ├── editor            # 编辑器核心包（@full-editor/editor）
│   │   └── src
│   │       ├── core      # 创建编辑器、序列化、插入等
│   │       ├── manager   # 模块/事件注册中心
│   │       ├── modules   # 各能力模块（一种能力一个文件）
│   │       ├── plugins   # 斜杠菜单等插件
│   │       ├── nodes     # 媒体 NodeView
│   │       └── components# 工具栏 / 斜杠菜单 / AI 摘要面板
│   └── app               # 演示应用
└── server                # Express 后端
```

## 快速开始

要求 Node.js 20+ 与 pnpm。

```bash
# 安装依赖
pnpm install

# 启动后端（端口 4000）
pnpm dev:server

# 启动前端演示（端口 5173）
pnpm dev:app
```

## 作为 npm 包集成

```tsx
import { RichEditor } from '@full-editor/editor'
import '@full-editor/editor/dist/index.css'

function App() {
  return (
    <RichEditor
      onChange={(doc) => console.log(doc)}
      resourceResolver={async (id) => ({ url: `/api/resources/${id}`, mime: 'image/png' })}
      uploadMedia={async (file) => ({ resourceId: 'xx', mime: file.type })}
      aiSummary={async (text) => '摘要'}
    />
  )
}
```

无 React 环境下可用 headless API：

```ts
import { createEditor } from '@full-editor/editor'

const { view, manager, destroy } = createEditor({
  element: document.querySelector('#editor')!,
  resourceResolver: async (id) => ({ url: `/api/resources/${id}`, mime: 'image/png' }),
})
```

## 自定义模块

实现 `EditorModule` 接口即可在运行时注册新能力（节点、标记、命令、快捷键、NodeView、工具栏项、斜杠菜单项）：

```ts
import type { EditorModule } from '@full-editor/editor'

export const myModule: EditorModule = {
  name: 'myModule',
  commands: { hello: (state, dispatch) => true },
  slashItems: [{ id: 'hello', title: '你好', command: 'hello', group: '自定义' }],
}
```

## 环境变量

后端 AI 摘要依赖以下环境变量（不配置时接口返回未配置错误）：

- `OPENAI_BASE_URL`：OpenAI 兼容接口地址，默认 `https://api.openai.com/v1`
- `OPENAI_API_KEY`：API 密钥
- `OPENAI_MODEL`：模型名，默认 `gpt-4o-mini`