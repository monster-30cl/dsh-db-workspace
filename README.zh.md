# dsh-db-workspace（数据库连接工作区）

JoyinCode 的数据库连接工作区：配置 `db-config.json` 里的连接，并验证每条连接能否连上对应的服务器。

它是 `<db-helper-directory>` 的插件形态。插件只负责配置与连通性，不注册任何查询、表结构或 SQL 工具——语句执行仍然交给那个目录里的 `db.js`，两边读同一个文件。

## 提供什么

| 入口 | 内容 |
| --- | --- |
| 右侧栏 **数据库连接** 页 | 列出、新增、编辑、删除、设默认，以及测试某条连接 |
| Start 页引导卡片 | 打开同一个页面 |
| 模型工具 | `db_connections`（列出别名，不含凭据）、`db_test_connection`（建立并关闭一次连接） |
| 斜杠命令 | `/db-config {list \| test <别名> \| test-draft <json> \| save <json> \| delete <别名> \| default <别名>}` |

页面通过 `ctx.remote.commands.execute` 调用这条命令：独立的客户端 bundle 在没有生成 Typert remote 之前，没有别的宿主调用通道，所以页面上每个动作都会在对话里留下一条命令结果。`recordInput: false` 保证提交的密码不进入会话日志。

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `index.js` | Host 插件：`name`/`inject`/`apply`、两个工具、`/db-config` 与其解析 |
| `config.js` | 读连接文件、按别名取条目、脱敏描述 |
| `store.js` | 归一化、保存、重命名、删除、设默认；先备份再原子写入 |
| `drivers.js` | 按 `driverDirectory` 分发驱动（`pg`、`mysql2`、`oracledb`、`oceanbase`） |
| `probe.js` | 带超时的建立-关闭探测，并做凭据脱敏 |
| `client/` | 连接管理页面 |
| `client.js` | 客户端产物（`node build.mjs`） |
| `cordis.patch.yml` | Bundle patch：加载行 |
| `test/`、`verify.mjs` | 假驱动离线测试与产物校验 |
| `install.mjs` | profile 接入脚本 |

## 启用

`node install.mjs` 会写进启动器实际使用的 profile：设置了 `DSH_PROFILE_DIR` 时用它（即正在运行的 App 的 profile），否则用 `<DSH_HOME>/profiles/<DSH_PROFILE 或 desktop>`。`--profile-dir`、`--profile`、`--home` 可分别覆盖；`--dry-run` 只打印计划不落盘。脚本会写入 `link:` 依赖、bundle 条目和 `node_modules` 联接点。之后重启 JoyinCode 生效。

桌面版的 profile 在自己的 DSH home 下（`%APPDATA%\@joyin\joyin-worker\dsh\accounts\<账号>\profiles\<profile>`），不是 `~/.dsh`；在 JoyinCode 会话里运行脚本会通过 `DSH_PROFILE_DIR` 自动定位。

部署相关的取值改 `cordis.patch.yml`。

## 配置项

| 字段 | 含义 | 默认 |
| --- | --- | --- |
| `configPath` | 读写的连接文件 | `~/.dsh/db-config.json` |
| `driverDirectory` | 驱动包所在目录 | `configPath` 所在目录 |
| `connectTimeoutMs` | 驱动的连接超时 | `10000` |
| `testTimeoutMs` | 探测截止时间，工具自身超时为其加 30 秒 | `15000` |

## 连接文件

文件沿用独立脚本的格式，`db.js` 与 `gui-server.js` 仍然可用：

```json
{
  "default": "demo-postgres",
  "databases": {
    "demo-postgres": { "driver": "kingbase", "dsn": "postgresql://用户:密码@主机:54321/库" },
    "demo-oceanbase": {
      "driver": "oceanbase", "host": "db.example.invalid", "port": 2883,
      "user": "demo_user", "password": "…", "tenant": "…", "cluster": "…",
      "database": "demo_user", "mode": "oracle"
    }
  }
}
```

保存时先把旧内容备份为 `<文件>.bak`，写入 `<文件>.tmp` 再改名覆盖，因此 `db.js` 不会读到写了一半的文件。

## 凭据

编辑连接时用户名直接显示，已保存的密码以固定遮掩符显示。眼睛按钮通过 Windows 安全中心原生凭据窗口验证当前账户密码，然后在原密码框临时显示数据库密码（20 秒、切换窗口或修改表单后隐藏）。查看值与编辑值分离，不会意外写回。页面生成一次性 RSA-OAEP 密钥，Host 仅在本机验证通过后通过 AES-GCM 加密密码并封装密钥；命令结果仅包含密文，解密私钥仅保留在当前页面内存中。验证进程不接收数据库密码。

当前仅支持运行插件的同一台 Windows 电脑上的本地账户。空密码账户拒绝查看，提示先在 Windows 登录选项中设置账户密码；域账户、Microsoft 账户、非交互宿主、验证失败或无法确定安全条件时均拒绝。这里使用账户密码，不支持 PIN。新增或已修改但未保存的密码不会通过眼睛按钮显示。

验证组件仅对自己的 PowerShell 子进程使用 `RemoteSigned`，不修改系统执行策略；组织策略禁止运行时仍拒绝查看，并显示明确提示。`powershell.exe -NoProfile -NonInteractive -STA -ExecutionPolicy RemoteSigned -File .\reveal-password.ps1 -Check` 可检查组件能否加载，不读取凭据或弹出验证窗口。

页面操作提示统一在面板顶部悬浮显示，不随内容滚动消失；可手动关闭，非错误结果在操作结束后 6 秒收起，错误保留至关闭或下一次操作。

点击连接卡片的“编辑”可在同一卡片内展开表单，支持同时编辑多个连接。收起和搜索不会丢失草稿，保存成功或取消只关闭当前连接的表单，保存失败保留输入。新增表单可与已有连接的编辑区同时打开；每个表单的密码查看状态独立，收起或搜索隐藏时会隐藏明文密码。

验证窗口设置置顶父窗口，使用 `CredUIPromptForWindowsCredentialsW`；60 秒未完成则终止验证进程，页面额外设置 70 秒等待上限。等待验证只禁用眼睛按钮，取消、失败或超时后可重试。更改表单或离开页面会使在途结果失效。

原生凭据中的 `电脑名\用户名` 会拆分为账户名与域；无域的本地用户名使用本机域，UPN 使用空域。验证前后均检查账户 SID 与当前进程账户一致。凭据解析、账户不匹配、Windows 登录失败分别报告；解析和登录失败附数字错误码，不返回原生凭据内容。

客户端永远拿不到密码和连接串：列表里的条目只有 `hasDsn`、`hasPassword` 两个布尔值。编辑时凭据字段留空表示沿用已存值——与独立 GUI 规则一致。探测失败的信息在变成命令结果或工具结果之前会脱敏：连接串与密码替换成 `[已隐藏]`，且先替换较长的连接串，避免密码被替换后连接串的其余部分漏出。

## 校验

```sh
node --test     # 49 个离线用例：配置模型、写入、驱动分发、探测脱敏、命令动作
node build.mjs  # 改动页面后重建 client.js
node verify.mjs # 用打包后的行配置校验 Host 注册与客户端 bundle
```

测试使用会记录每次调用的桩驱动包，因此可以断言一次探测只建立并关闭一次连接，以及被拒绝的保存不会改动文件（逐字节比对）。

## 已知限制

- 按设计没有查询能力。需要查数据时，让 agent 在 `<db-helper-directory>` 下执行 `node db.js query "<sql>" --env <别名>`。
- 页面动作经 `/db-config` 往返，每次都会出现在对话里。
- 驱动必须装在 `driverDirectory`；缺少时会直接给出 `npm install` 命令。
- 删除没有二次确认；旧内容仍留在 `<文件>.bak`。


## Public distribution

This repository contains source code and fictional examples only. No existing database connections are included. The default connection file is `~/.dsh/db-config.json`; configure your local path and drivers privately. Never commit connection files or backups. Run `npm install` before rebuilding with `npm run build`.
