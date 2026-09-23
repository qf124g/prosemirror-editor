import { DOMSerializer, DOMParser } from 'prosemirror-model'
import type { Schema } from 'prosemirror-model'
import type { Node as PMNode } from 'prosemirror-model'

// 文档 JSON 序列化与反序列化
export function toJSON(doc: PMNode): any {
  return doc.toJSON()
}

export function fromJSON(schema: Schema, json: any): PMNode {
  return schema.nodeFromJSON(json)
}

// HTML 序列化与反序列化
export function toHTML(schema: Schema, doc: PMNode): string {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

export function fromHTML(schema: Schema, html: string): PMNode {
  const div = document.createElement('div')
  div.innerHTML = html
  return DOMParser.fromSchema(schema).parse(div)
}

const esc = (s: string): string =>
  s.replace(/\\([\\`*_[\]{}()#+\-.!>])/g, '$1').replace(/\n/g, ' ')

// 简易 Markdown 序列化（仅导出方向，覆盖基础块与行内标记）
export function toMarkdown(schema: Schema, doc: PMNode): string {
  const lines: string[] = []
  const serializeNode = (node: PMNode, prefix = ''): void => {
    if (node.type.name === 'paragraph') {
      lines.push(prefix + serializeInline(node))
      return
    }
    if (node.type.name === 'heading') {
      lines.push(prefix + '#'.repeat(node.attrs.level) + ' ' + serializeInline(node))
      return
    }
    if (node.type.name === 'blockquote') {
      node.forEach((c) => serializeNode(c, prefix + '> '))
      return
    }
    if (node.type.name === 'code_block') {
      const text = node.textContent
      text.split('\n').forEach((l) => lines.push(prefix + '    ' + l))
      return
    }
    if (node.type.name === 'bullet_list') {
      node.forEach((li) => {
        lines.push(prefix + '- ' + serializeInline(li.firstChild!))
      })
      return
    }
    if (node.type.name === 'ordered_list') {
      let idx = node.attrs.order || 1
      node.forEach((li) => {
        lines.push(prefix + idx + '. ' + serializeInline(li.firstChild!))
        idx += 1
      })
      return
    }
    if (node.type.name === 'horizontal_rule') {
      lines.push(prefix + '---')
      return
    }
    if (node.isTextblock) {
      lines.push(prefix + serializeInline(node))
      return
    }
    // 媒体等原子块
    const mediaText = serializeMedia(node)
    if (mediaText) lines.push(prefix + mediaText)
  }

  const serializeMedia = (node: PMNode): string => {
    const rid = node.attrs.resourceId
    if (node.type.name === 'imageResource') return `![${node.attrs.alt || 'image'}](${rid})`
    if (node.type.name === 'videoResource') return `![视频](${rid})`
    if (node.type.name === 'audioResource') return `![语音](${rid})`
    return ''
  }

  const serializeInline = (node: PMNode): string => {
    let text = ''
    node.forEach((child) => {
      if (child.isText) {
        let t = child.text || ''
        child.marks.forEach((mark) => {
          const name = mark.type.name
          if (name === 'strong') t = `**${t}**`
          else if (name === 'em') t = `*${t}*`
          else if (name === 'code') t = '`' + t + '`'
          else if (name === 'strike') t = '~~' + t + '~~'
          else if (name === 'link') t = `[${t}](${mark.attrs.href})`
        })
        text += t
      } else if (child.type.name === 'hard_break') {
        text += '\n'
      }
    })
    return text
  }

  doc.forEach((node) => serializeNode(node))
  return lines.filter((l) => l !== '' || lines.length === 0).join('\n').trim()
}

// 下载文本内容为文件
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 从 PMNode 提取纯文本
export function toPlainText(doc: PMNode): string {
  return doc.textBetween(0, doc.content.size, '\n\n')
}