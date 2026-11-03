# dsh-db-workspace · 数据库连接工作区

[English](README.md) · [简体中文](README.zh.md)

JoyinCode 右侧栏的数据库连接管理插件。在应用内配置数据库、同时编辑多个连接，并测试连接是否可用。

[项目仓库](https://github.com/monster-30cl/dsh-db-workspace) · [下载源码](https://github.com/monster-30cl/dsh-db-workspace/archive/refs/heads/main.zip)

## 功能

- 按别名、驱动、主机、数据库或用户名搜索连接，支持刷新和设置默认连接。
- 编辑表单直接展开在对应卡片内，与摘要共用外框；支持同时展开多个连接。
- 每个表单独立保存草稿，收起和搜索不会丢失未保存内容。保存或取消只关闭当前表单，保存失败保留输入。
- 支持新增连接、测试已保存连接或未保存草稿，以及带行内确认的删除操作。
- 操作提醒在面板顶部悬浮显示，控件适配宿主主题，表单按可用宽度切换列数。
- 用户名直接显示，已保存密码默认遮掩；支持的 Windows 账户可在系统验证通过后临时查看密码。

支持 Kingbase、PostgreSQL、MySQL、Oracle，以及 OceanBase 的 MySQL / Oracle 租户模式。插件负责连接配置与连通性测试，不提供 SQL 查询或表结构检查；另行配置的 `db.js` 工具可以共用同一连接文件。

## 安装

需要支持本插件侧栏、语言、远程命令及宿主工具服务的 JoyinCode/Harness 环境，以及 Node.js 和 npm。它是应用插件，不是独立网站。仓库已包含构建好的 `client.js`。

```sh
git clone https://github.com/monster-30cl/dsh-db-workspace.git
cd dsh-db-workspace
node install.mjs --profile-dir "<profile目录>" --dry-run
node install.mjs --profile-dir "<profile目录>"
```

将 `<profile目录>` 替换为应用当前使用的 profile。安装后重启 JoyinCode，从右侧栏或 Start 页引导入口打开**数据库连接**。

如果环境已提供 `DSH_PROFILE_DIR`，直接执行 `node install.mjs` 即可使用该 profile。否则脚本按 `<DSH_HOME>/profiles/<DSH_PROFILE 或 desktop>` 定位，home 缺省为 `~/.dsh`。桌面应用可能使用其他 home，请优先指定真实 profile 路径。安装脚本会增加本地 `link:` 依赖、bundle 条目和目录联接点，安装后请保留源码目录。

## 本机配置

公开版 `cordis.patch.yml` 使用下列宿主默认值。如需覆盖，请在本机配置，不要将个人配置提交至公开仓库。

| 配置项 | 用途 | 默认值 |
| --- | --- | --- |
| `configPath` | 数据库连接 JSON 文件 | `~/.dsh/db-config.json` |
| `driverDirectory` | 包含驱动 `node_modules` 的目录 | `configPath` 的父目录 |
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
| `/db-config list` | 获取连接列表 |
| `/db-config test <别名>` | 测试已保存连接 |
| `/db-config test-draft <json>` | 测试未保存草稿 |
| `/db-config save <json>` | 保存连接 |
| `/db-config default <别名>` | 设置默认连接 |
| `/db-config delete <别名>` | 删除连接 |

密码查看使用带一次性公钥和随机挑战值的内部 `/db-config reveal <json>` 请求，不是返回明文密码的命令。页面动作通过远程命令通道执行，结果可能出现在对话中。提交的命令输入不记录（`recordInput: false`），连通性测试错误会对已配置的敏感值脱敏。

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
