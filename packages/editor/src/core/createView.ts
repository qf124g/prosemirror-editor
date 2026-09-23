import { Schema, DOMParser } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'

export interface CreateStateOptions {
  schema: Schema
  doc?: any
  initialHTML?: string
  plugins: any[]
}

// 创建初始 EditorState：优先 doc JSON，其次 initialHTML，最后空文档
export function createEditorState(options: CreateStateOptions): EditorState {
  const { schema, doc, initialHTML, plugins } = options
  if (doc) {
    return EditorState.create({ schema, doc: schema.nodeFromJSON(doc), plugins })
  }
  if (initialHTML) {
    const div = document.createElement('div')
    div.innerHTML = initialHTML
    const node = DOMParser.fromSchema(schema).parse(div)
    return EditorState.create({ schema, doc: node, plugins })
  }
  return EditorState.create({ schema, plugins })
}