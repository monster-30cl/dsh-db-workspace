/** Localized copy owned by the database workspace plugin. */
export type DatabaseLocaleKey =
  | 'loadFailed'
  | 'noticeFailed'
  | 'collapseAction'
  | 'revealWaiting'
  | 'revealTimeout'
  | 'revealShown'
  | 'hidePassword'
  | 'dismissAction'
  | 'revealAction'
  | 'revealHint'
  | 'refreshAction'
  | 'searchPlaceholder'
  | 'noSearchResults'
  | 'emptyHint'
  | 'deleteConfirm'
  | 'title'
  | 'description'
  | 'connectionsTitle'
  | 'emptyList'
  | 'loading'
  | 'addAction'
  | 'newTitle'
  | 'editTitle'
  | 'aliasLabel'
  | 'driverLabel'
  | 'dsnLabel'
  | 'dsnHint'
  | 'userLabel'
  | 'passwordLabel'
  | 'passwordKeepHint'
  | 'hostLabel'
  | 'portLabel'
  | 'databaseLabel'
  | 'tenantLabel'
  | 'clusterLabel'
  | 'modeLabel'
  | 'modeMysql'
  | 'modeOracle'
  | 'testAction'
  | 'saveAction'
  | 'cancelAction'
  | 'editAction'
  | 'deleteAction'
  | 'defaultAction'
  | 'defaultBadge'
  | 'passwordStored'
  | 'noPassword'
  | 'testing'
  | 'saving'
  | 'testOk'
  | 'saved'
  | 'removed'
  | 'aliaseRequired'
  | 'commandFailed'

export const en: Record<DatabaseLocaleKey, string> = {
  loadFailed: 'Could not load connections. Check the connection and retry.',
  noticeFailed: 'Saved successfully, but the chat notification could not be delivered.',
  collapseAction: 'Collapse',
  revealWaiting: 'Complete the Windows Security prompt. It closes after 60 seconds; you can keep using the form.',
  revealTimeout: 'Verification timed out. Please retry.',
  revealShown: 'Password shown temporarily. It hides after 20 seconds or when you switch windows.',
  hidePassword: 'Hide password',
  dismissAction: 'Dismiss notification',
  revealAction: 'View password with Windows verification',
  revealHint: 'Verify your Windows account password in a local window to view. An account password is required.',
  refreshAction: 'Refresh',
  searchPlaceholder: 'Search alias, host, database…',
  noSearchResults: 'No matching connections. Try another search.',
  emptyHint: 'Add your first connection to get started.',
  deleteConfirm: 'Delete this connection?',
  title: 'Database connections',
  description: 'Manage your databases and test connection availability.',
  connectionsTitle: 'Connections',
  emptyList: 'No connection is configured yet.',
  loading: 'Loading connections…',
  addAction: 'New connection',
  newTitle: 'New connection',
  editTitle: 'Edit connection',
  aliasLabel: 'Alias',
  driverLabel: 'Driver',
  dsnLabel: 'Connection string',
  dsnHint: 'Kingbase: postgresql://user:pass@host:54321/db or jdbc:kingbase8://host:54321/db · MySQL: mysql://user:pass@host:3306/db · Oracle: oracle://user:pass@host:1521/service',
  userLabel: 'User',
  passwordLabel: 'Password',
  passwordKeepHint: 'Leave blank to keep the stored password.',
  hostLabel: 'Host',
  portLabel: 'Port',
  databaseLabel: 'Database',
  tenantLabel: 'Tenant',
  clusterLabel: 'Cluster',
  modeLabel: 'Mode',
  modeMysql: 'MySQL tenant',
  modeOracle: 'Oracle tenant',
  testAction: 'Test',
  saveAction: 'Save',
  cancelAction: 'Cancel',
  editAction: 'Edit',
  deleteAction: 'Delete',
  defaultAction: 'Set default',
  defaultBadge: 'default',
  passwordStored: 'password stored',
  noPassword: 'no password',
  testing: 'Testing…',
  saving: 'Saving…',
  testOk: 'Connection succeeded',
  saved: 'Saved',
  removed: 'Removed',
  aliaseRequired: 'Enter an alias.',
  commandFailed: 'Command failed',
}

export const zh: Record<DatabaseLocaleKey, string> = {
  loadFailed: '连接列表加载失败，请检查连接后刷新重试。',
  noticeFailed: '连接已保存，但工作区完成提示发送失败。',
  collapseAction: '收起',
  revealWaiting: '请在 Windows 安全中心窗口完成验证，60 秒后超时关闭；表单仍可操作。',
  revealTimeout: '验证等待超时，请重试。',
  revealShown: '密码已临时显示，20 秒后或切换窗口时自动隐藏。',
  hidePassword: '隐藏密码',
  dismissAction: '关闭提醒',
  revealAction: '验证 Windows 密码后查看',
  revealHint: '在本机窗口验证 Windows 账户密码后查看；未设置账户密码时拒绝查看。',
  refreshAction: '刷新',
  searchPlaceholder: '搜索别名、主机、数据库…',
  noSearchResults: '未找到匹配的连接，试试其他关键词。',
  emptyHint: '点击“新增连接”，配置你的第一个数据库。',
  deleteConfirm: '确定删除此连接？',
  title: '数据库连接',
  description: '集中管理数据库连接，随时验证连接是否可用。',
  connectionsTitle: '连接列表',
  emptyList: '还没有配置任何连接。',
  loading: '正在加载连接…',
  addAction: '新增连接',
  newTitle: '新增连接',
  editTitle: '编辑连接',
  aliasLabel: '别名',
  driverLabel: '驱动',
  dsnLabel: '连接串',
  dsnHint: 'Kingbase：postgresql://用户:密码@主机:54321/库 或 jdbc:kingbase8://主机:54321/库 · MySQL：mysql://用户:密码@主机:3306/库 · Oracle：oracle://用户:密码@主机:1521/服务',
  userLabel: '用户名',
  passwordLabel: '密码',
  passwordKeepHint: '留空表示保留已保存的密码。',
  hostLabel: '主机',
  portLabel: '端口',
  databaseLabel: '数据库',
  tenantLabel: '租户',
  clusterLabel: '集群',
  modeLabel: '模式',
  modeMysql: 'MySQL 租户',
  modeOracle: 'Oracle 租户',
  testAction: '测试',
  saveAction: '保存',
  cancelAction: '取消',
  editAction: '编辑',
  deleteAction: '删除',
  defaultAction: '设为默认',
  defaultBadge: '默认',
  passwordStored: '已存密码',
  noPassword: '无密码',
  testing: '正在测试…',
  saving: '正在保存…',
  testOk: '连接成功',
  saved: '已保存',
  removed: '已删除',
  aliaseRequired: '请填写别名。',
  commandFailed: '命令执行失败',
}
