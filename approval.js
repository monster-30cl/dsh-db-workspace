import { inspectSql } from './sql-policy.js'

/** Ask the host directly; an AI-supplied approved:true is never accepted. */
export async function approveSql(ctx, exec, alias, sql) {
  const plan = inspectSql(sql)
  const approval = ctx.get?.('approval')
  if (!approval || !exec.agent) throw new Error('APPROVAL_UNAVAILABLE: 没有可用的用户批准通道，数据库操作已终止')
  if (exec.signal?.aborted) throw new Error('数据库操作已取消')
  const reason = `数据库连接：${alias}\n操作类型：${plan.category}\nSQL（仅批准本次原文执行）：\n${plan.sql}\n`
    + (plan.category === 'write' ? '该操作可能新增、修改、删除数据或数据库对象，可能持锁并影响其他会话。DDL 在部分数据库中会隐式提交，无法保证回滚。\n' : '')
    + (plan.impact ? '性能提醒：分析/执行计划/维护操作可能扫描大量数据、消耗 CPU/IO 或持锁，影响数据库使用效率。EXPLAIN ANALYZE 会实际执行 SQL。\n' : '')
    + '是否允许执行一次？拒绝或取消将立即终止，不会连接数据库。'
  const outcome = await approval.request({ agent: exec.agent, toolName: 'db_execute', callId: exec.callId, reason, signal: exec.signal })
  if (outcome !== 'allowed-once' || exec.signal?.aborted) throw new Error('APPROVAL_DENIED: 用户未批准或已取消，操作立即终止；不得自动重试或改用其他入口')
  return plan
}
