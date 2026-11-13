/** Localized copy owned by the database workspace plugin. */
export type DatabaseLocaleKey =
  | 'driverChecked'
  | 'driverHostRestartRequired'
  | 'driverDirectoryPick' | 'driverDirectoryPicking' | 'driverDirectoryPickFailed'
  | 'driverDirectoryLabel' | 'driverDirectorySave' | 'driverDirectoryHint' | 'driverDirectorySaved'
  | 'driversTitle' | 'driverCheck' | 'driverDownloadHint' | 'driverMissing' | 'driverReady' | 'driverDownload' | 'driverInstalling' | 'driverInstalled'
  | 'loadFailed'
  | 'noticeFailed'
  | 'collapseAction'
  | 'revealWaiting'
  | 'revealTimeout'
  | 'revealShown'
  | 'hidePassword'
  | 'showPassword'
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
  driverChecked: 'Driver check complete.',
  driverHostRestartRequired: 'The DSH backend has not loaded the driver-directory update. Fully quit and restart DSH, then retry. Refreshing this panel alone does not update the backend.',
  driverDirectoryPick: 'Choose driver folder', driverDirectoryPicking: 'Choose a folder in the system dialog…',
  driverDirectoryPickFailed: 'Could not open the system folder picker. Check that DSH native directory selection is available.',
  driverDirectoryLabel: 'Driver directory', driverDirectorySave: 'Save and check',
  driverDirectoryHint: 'Click the path to choose a folder, then use the top-right button to save and check. With no directory change, the same button checks again. The saved directory applies to downloads and subsequent connections after restart. Existing packages are not moved.',
  driverDirectorySaved: 'Driver directory saved and checked.',
  driversTitle: 'Database drivers',
  driverCheck: 'Check drivers',
  driverDownloadHint: 'Download only the drivers you need. Confirm to install packages and dependencies from npm into the directory above (up to 3 minutes). Requires Node.js with npm and internet access. No database credentials are sent.',
  driverMissing: 'Not installed', driverReady: 'Available', driverDownload: 'Confirm download',
  driverInstalling: 'Downloading and installing…', driverInstalled: 'Driver installed. You can test the connection now.',
  loadFailed: 'Could not load connections. Check the connection and retry.',
  noticeFailed: 'Saved successfully, but the chat notification could not be delivered.',
  collapseAction: 'Collapse',
  revealWaiting: 'Complete the Windows Security prompt. It closes after 60 seconds; you can keep using the form.',
  revealTimeout: 'Verification timed out. Please retry.',
  revealShown: 'Password shown temporarily. It hides after 20 seconds or when you switch windows.',
  hidePassword: 'Hide password',
  showPassword: 'Show password',
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
  driverChecked: '驱动检测完成。',
  driverHostRestartRequired: 'DSH 后端尚未加载驱动目录修改功能。请完全退出并重新启动 DSH 后重试，仅刷新面板不会更新后端。',
  driverDirectoryPick: '选择驱动文件夹', driverDirectoryPicking: '请在系统窗口中选择文件夹…',
  driverDirectoryPickFailed: '无法打开系统文件夹选择窗口，请检查 DSH 是否支持本机目录选择。',
  driverDirectoryLabel: '驱动目录', driverDirectorySave: '保存并检测',
  driverDirectoryHint: '点击路径选择文件夹，再点击右上角按钮保存并检测；目录未变化时，同一按钮用于重新检测。保存后的目录用于下载及后续连接，重启后保留；不会移动原驱动。',
  driverDirectorySaved: '驱动目录已保存，已重新检测。',
  driversTitle: '数据库驱动',
  driverCheck: '重新检测',
  driverDownloadHint: '按需下载即可。点击确认后，从 npm 下载驱动及依赖到上述目录（最长 3 分钟）。需要带 npm 的 Node.js 和网络，不会发送数据库凭据。',
  driverMissing: '未安装', driverReady: '已就绪', driverDownload: '确认下载',
  driverInstalling: '正在下载安装…', driverInstalled: '驱动已安装，可以测试数据库连接。',
  loadFailed: '连接列表加载失败，请检查连接后刷新重试。',
  noticeFailed: '连接已保存，但工作区完成提示发送失败。',
  collapseAction: '收起',
  revealWaiting: '请在 Windows 安全中心窗口完成验证，60 秒后超时关闭；表单仍可操作。',
  revealTimeout: '验证等待超时，请重试。',
  revealShown: '密码已临时显示，20 秒后或切换窗口时自动隐藏。',
  hidePassword: '隐藏密码',
  showPassword: '显示密码',
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
