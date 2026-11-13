# dsh-db-workspace · 数据库连接工作区

[English](README.md) · [简体中文](README.zh.md)

DSH 右侧栏的数据库连接管理插件。在应用内配置数据库、同时编辑多个连接，并测试连接是否可用。

[项目仓库](https://github.com/monster-30cl/dsh-db-workspace) · [下载源码](https://github.com/monster-30cl/dsh-db-workspace/archive/refs/heads/main.zip)

## 功能

- 按别名、驱动、主机、数据库或用户名搜索连接，支持刷新和设置默认连接。
- 编辑表单直接展开在对应卡片内，与摘要共用外框；支持同时展开多个连接。
- 每个表单独立保存草稿，收起和搜索不会丢失未保存内容。保存或取消只关闭当前表单，保存失败保留输入。
- 支持新增连接、测试已保存连接或未保存草稿，以及带行内确认的删除操作。
- 操作提醒在面板顶部悬浮显示，控件适配宿主主题，表单按可用宽度切换列数。
- 用户名直接显示，已保存密码默认遮掩；支持的 Windows 账户可在系统验证通过后临时查看密码。

支持 Kingbase、PostgreSQL、MySQL、Oracle，以及 OceanBase 的 MySQL / Oracle 租户模式。插件还提供只读 SQL 查询与表结构检查，按 SQL 词法区分字段名和操作关键字，在只读事务中执行读取；写入、DDL 和维护操作通过 `db_execute` 获取逐次用户批准。

## 安装

需要支持本插件侧栏、语言、远程命令及宿主工具服务的 DeepSeek Harness 环境，以及 Node.js 和 npm。它是应用插件，不是独立网站。仓库已包含构建好的 `client.js`。

```sh
git clone https://github.com/monster-30cl/dsh-db-workspace.git
cd dsh-db-workspace
node install.mjs --profile-dir "<profile目录>" --dry-run
node install.mjs --profile-dir "<profile目录>"
```

将 `<profile目录>` 替换为应用当前使用的 profile。安装后重启 DSH，从右侧栏或 Start 页引导入口打开**数据库连接**。

如果环境已提供 `DSH_PROFILE_DIR`，直接执行 `node install.mjs` 即可使用该 profile。否则脚本按 `<DSH_HOME>/profiles/<DSH_PROFILE 或 desktop>` 定位，home 缺省为 `~/.dsh`。桌面应用可能使用其他 home，请优先指定真实 profile 路径。安装脚本会增加本地 `link:` 依赖、bundle 条目和目录联接点，安装后请保留源码目录。

连接别名支持中文、英文字母、数字、短横线和下划线，以中文、英文字母或数字开头，最长 64 个字符，不支持空格及其他标点。重命名保留已有凭据，并同步更新对应的默认连接别名。

## 本机配置

公开版 `cordis.patch.yml` 使用下列宿主默认值。如需覆盖，请在本机配置，不要将个人配置提交至公开仓库。

| 配置项 | 用途 | 默认值 |
| --- | --- | --- |
| `configPath` | 数据库连接 JSON 文件 | `DSH_DB_CONFIG_PATH` 或当前 profile/home，见下文 |
| `driverDirectory` | 包含驱动 `node_modules` 的目录 | 当前 DSH profile/home 下的 `database-drivers` |
| `connectTimeoutMs` | 驱动连接超时，毫秒 | `10000` |
| `testTimeoutMs` | 连通性测试截止时间，毫秒 | `15000` |

在 `driverDirectory` 中安装需要的驱动：

| 连接类型 | 驱动包 |
| --- | --- |
| Kingbase / PostgreSQL | `pg`、`pg-connection-string` |
| MySQL | `mysql2` |
| Oracle | `oracledb` |
| OceanBase | `oceanbase` |

例如：`npm install --prefix "<驱动目录>" pg pg-connection-string`。

以下是**虚构配置示例**，不能直接连接数据库。请在本机替换示例值，或通过页面新增连接。

```json
{
  "default": "demo-postgres",
  "databases": {
    "demo-postgres": {
      "driver": "postgres",
      "dsn": "postgresql://demo_user:REPLACE_ME@db.example.invalid:5432/demo"
    },
    "demo-oceanbase": {
      "driver": "oceanbase",
      "host": "db.example.invalid",
      "port": 2883,
      "user": "demo_user",
      "password": "REPLACE_ME",
      "tenant": "demo_tenant",
      "cluster": "demo_cluster",
      "database": "demo",
      "mode": "mysql"
    }
  }
}
```

编辑已有连接且驱动未改变时，连接串和密码留空表示沿用已保存值。需要替换密码时输入新值并保存。保存会先将旧文件备份为 `<文件>.bak`，写入 `<文件>.tmp`，再重命名替换目标文件。

## 跨设备默认使用插件工具

启用插件时自动注册系统提示词：先用 db_connections 确认连接别名，再使用 db_test_connection、db_query、db_schema 或需要批准的 db_execute。工具失败或 SQL 被拦截时报告原因，不自动回退到终端脚本。这是模型使用规则，不是限制其他工具的沙箱。

驱动目录优先使用面板保存的本机选择；没有保存选择时使用显式插件配置。其他配置仍以显式插件配置优先。未配置时，configPath 依次使用 DSH_DB_CONFIG_PATH、DSH_PROFILE_DIR/db-config.json、DSH_HOME/db-config.json、~/.dsh/db-config.json；驱动目录依次使用显式 driverDirectory、DSH_DB_DRIVER_DIRECTORY、当前 DSH profile/home 下的 database-drivers。保留已有显式路径，不自动迁移或上传连接。新设备安装插件到当前 profile、在对应目录安装驱动、通过面板新增本机连接并设置默认别名，重启后加载工具和规则。

queryTimeoutMs 默认 30000，范围 1000–480000 毫秒。db_query 接受 env、sql、limit（默认 100，最大 1000）；db_schema 接受 env、可选 table/schema 和 limit，不传 table 列出表，传入则列出字段，暂不提供完整 DDL/索引导出。结构过滤使用各驱动的绑定参数。行数限制只约束输出，不约束数据库运算量，请在 SQL 中适当限行。每次操作在独立数据库进程中执行；完成、取消或超时后，在工具返回前结束执行进程，关闭其连接资源。建议使用数据库只读账户：只读事务并非隔离数据库函数外部副作用的沙箱。UPDATE_TIME、CREATE_USER 等字段名不再误拦截；多语句、可执行注释及不支持的过程调用会被拒绝，不得绕过。

## 批准机制与连接释放

SQL 规则位于 sql-policy.js，query.js 中的 guardQuery 是只读入口。使用词法边界识别注释、引号及关键字，不改写 SQL 原文。db_query 不执行 DML、DDL 或分析语句；使用 db_execute 向宿主申请本次连接和单条 SQL 的用户批准。缺少批准界面、拒绝或取消时，在连接前终止。不接受模型自报的批准参数，批准不会持久化或复用。

EXPLAIN（包括 ANALYZE）、ANALYZE、VACUUM、OPTIMIZE、REINDEX 等也要求批准，并提前提醒 CPU/IO、全表扫描、持锁及影响其他用户的风险。EXPLAIN ANALYZE 会实际执行 SQL；DDL 可能隐式提交，不能保证回滚。超时或断连后写入结果可能不确定，必须先核实，禁止自动重试。

连接按次创建，使用完立即关闭，不会故意保留 8 分钟。connectionMaxLifetimeMs 默认 480000 毫秒，只能调小，最小 1000；实际截止时间取操作超时与连接寿命的较小值。独立子进程在到期或取消时终止，即使驱动关闭卡住，也结束进程释放连接。等待批准不占用数据库连接。现有本机显式连接配置保持不变。

## 查看密码

点击已保存密码右侧的眼睛按钮，插件会打开原生 **Windows 安全中心**验证框，验证当前本地 Windows 账户密码，并检查验证账户与运行进程账户一致。

- 使用账户密码，不是 Windows Hello PIN、指纹或人脸识别。域账户、Microsoft 账户、远程及非交互宿主场景不属于已支持验证的配置。
- 空密码账户拒绝查看，并提示先在 Windows 登录选项中设置账户密码。无法确定账户状态或任何验证失败也会拒绝查看。
- 本机验证等待上限为 60 秒，页面另有 70 秒等待保护。验证过程中只禁用眼睛按钮，不锁定整张表单。
- 验证通过后，密码在原输入框临时显示，最长 20 秒；切换窗口、修改表单、收起或搜索隐藏卡片时自动隐藏。查看值与编辑草稿分离。
- 本机验证进程不接收数据库密码。命令通道仅传输加密后的密码数据，由当前页面持有的一次性私钥解密。

验证组件只为自己的 PowerShell 子进程设置 `RemoteSigned`，不修改系统执行策略；组织策略仍可能禁止运行。以下命令可检查组件加载，不会请求凭据：

```powershell
powershell.exe -NoProfile -NonInteractive -STA -ExecutionPolicy RemoteSigned -File .\reveal-password.ps1 -Check
```

返回 `ready` 仅表示编译、加载成功，不代表交互验证已通过。错误提示区分凭据解析失败、账户不匹配及 Windows 登录失败，并在可用时附数字错误码。

## 命令与工具

| 入口 | 用途 |
| --- | --- |
| `db_connections` | 列出连接元数据，不返回已保存密码和连接串 |
| `db_test_connection` | 建立并关闭一次已保存连接，验证是否可用 |
| `db_query` | 按 env、sql 和可选 limit 执行只读查询 |
| `db_execute` | 写入、DDL、分析和维护操作的逐次用户批准入口 |
| `db_schema` | 按 env、table、schema 和 limit 查看表或字段 |
| `/db-config list` | 获取连接列表 |
| `/db-config test <别名>` | 测试已保存连接 |
| `/db-config test-draft <json>` | 测试未保存草稿 |
| `/db-config save <json>` | 保存连接 |
| `/db-config default <别名>` | 设置默认连接 |
| `/db-config delete <别名>` | 删除连接 |

密码查看使用带一次性公钥和随机挑战值的内部 `/db-config reveal <json>` 请求，不是返回明文密码的命令。连接面板使用独立的已认证 RPC 通道，读取列表、测试、设默认、删除及查看密码不再生成聊天命令行，失败仅在面板提示。只有新增或修改保存成功，才通过一次性且绑定会话的回执发送简短完成提示。命令输入不记录（`recordInput: false`），完成提示不包含连接配置或凭据；用户手动输入的斜杠命令仍保留正常命令历史。

## 开发与校验

```sh
npm install
npm run build
npm test
npm run verify
```

`build` 重新生成 `client.js`；`test` 使用桩驱动运行离线测试；`verify` 使用空连接配置检查插件注册及客户端产物加载。这些检查不验证真实数据库连通性，也不覆盖完整 Windows 凭据弹窗流程。

| 文件 | 用途 |
| --- | --- |
| `client/`、`client.js` | React 页面源码及客户端构建产物 |
| `index.js`、`config.js`、`store.js` | 宿主注册、元数据及连接持久化 |
| `drivers.js`、`probe.js` | 驱动加载、连通性测试及错误脱敏 |
| `credentials.js`、`reveal*.js`、`reveal-password.ps1` | 凭据提取、加密传输及本机身份验证 |
| `cordis.patch.yml`、`install.mjs` | 插件配置及 profile 安装 |
| `test/`、`verify.mjs` | 离线测试及产物校验 |

## 公开仓库与隐私

公开发布版只包含源码和虚构示例。不要提交真实连接文件、凭据、配置备份或本机部署路径。`.gitignore` 排除了常见连接文件名、环境文件、备份、临时文件和压缩包，但无法识别粘贴进源码或文档中的敏感值，发布前仍需检查差异。`package.json` 中的 `private: true` 用于阻止 npm 发布，不影响 GitHub 仓库公开访问。

在设置 → 常规 → 编辑快捷键中搜索 “打开数据库工作区”，可自定义打开页面的快捷键。默认未绑定，需要先选中对话。

### 驱动检测与下载

驱动区域默认收起，点击标题可展开或收起。展开后点击驱动路径打开系统文件夹选择窗口，选择文件夹后点击“保存并检测”立即切换检测、下载及后续数据库连接所用目录；不会移动或删除原驱动。选择保存在连接文件旁的本机 `db-workspace.settings.json`，重启后优先于部署行配置和环境变量生效；此文件不应随项目发布。

安装脚本检测驱动，不自行下载。面板顶部展示驱动目录和缺失状态；点击“确认下载”后，从 npm 下载对应驱动及依赖，不发送数据库凭据。需要带 npm 的 Node.js 和网络；最长等待 3 分钟，失败后可重新检测、重试。安装禁用生命周期脚本，需要额外原生客户端的特殊模式仍需单独配置。

新设备驱动目录默认跟随当前 DSH profile/home，与连接文件位置解耦。显式 configPath、driverDirectory 优先保留，不自动迁移或覆盖连接；旧设备的显式路径应在新设备移除或调整。
