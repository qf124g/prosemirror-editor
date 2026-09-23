// 按“词”粒度对两个字符串做最小差异（LCS），产出原子操作序列

export type DiffOp =
  | { type: 'keep'; text: string }
  | { type: 'del'; text: string }
  | { type: 'add'; text: string }

// 保留空白按连续非空白/空白切分，便于把 diff 结果还原成可读文本
function tokenize(s: string): string[] {
  return s.match(/\s+|[^\s]+/g) || []
}

export function diffWords(a: string, b: string): DiffOp[] {
  const A = tokenize(a)
  const B = tokenize(b)
  const n = A.length
  const m = B.length

  // dp[i][j] = A[i:] 与 B[j:] 的最长公共子序列长度
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      ops.push({ type: 'keep', text: A[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', text: A[i] })
      i++
    } else {
      ops.push({ type: 'add', text: B[j] })
      j++
    }
  }
  while (i < n) {
    ops.push({ type: 'del', text: A[i] })
    i++
  }
  while (j < m) {
    ops.push({ type: 'add', text: B[j] })
    j++
  }
  return ops
}