# dsh-db-workspace

[English](README.md) · [简体中文](README.zh.md)

A database connection manager for JoyinCode's right sidebar. Configure connections, edit multiple connections in the list, and test availability without leaving the app.

[Repository](https://github.com/monster-30cl/dsh-db-workspace) · [Download source](https://github.com/monster-30cl/dsh-db-workspace/archive/refs/heads/main.zip)

## Features

- Search by alias, driver, host, database, or user; refresh the list and set a default connection.
- Expand editors inside their connection cards. Multiple editors can stay open with independent drafts.
- Collapse and search without losing unsaved edits. Saving or cancelling closes only that editor; failed saves retain input.
- Add connections, test saved connections or unsaved drafts, and delete with inline confirmation.
- View notifications at the top of the panel, with theme-aware controls and responsive form columns.
- Display usernames and mask stored passwords. On supported Windows accounts, reveal a password after native account-password verification.

Supports Kingbase, PostgreSQL, MySQL, Oracle, and OceanBase (MySQL or Oracle tenant mode). The plugin also provides read-only SQL queries and schema inspection. It inspects SQL words instead of keyword substrings in field names. Reads use read-only transactions; writes, DDL and maintenance require one-time user approval through `db_execute`.

## Installation

Requires a compatible JoyinCode/Harness host with sidebar, locale, remote command, and tool services, plus Node.js and npm. This is an application plugin, not a standalone website. The built `client.js` is included.

```sh
git clone https://github.com/monster-30cl/dsh-db-workspace.git
cd dsh-db-workspace
node install.mjs --profile-dir "<profile-directory>" --dry-run
node install.mjs --profile-dir "<profile-directory>"
```

Replace `<profile-directory>` with the app's active profile. Restart JoyinCode and open **Database connections** from the right sidebar or Start page guide.

If the environment supplies `DSH_PROFILE_DIR`, `node install.mjs` uses it automatically. Otherwise the script resolves `<DSH_HOME>/profiles/<DSH_PROFILE or desktop>`, with `~/.dsh` as the fallback home. The desktop app may use a different home; prefer its actual profile path. The installer adds a local `link:` dependency, a bundle entry, and a directory junction. Keep the checkout in place afterwards.

Connection aliases may contain Chinese characters, ASCII letters, digits, hyphens and underscores. Start with a Chinese character, letter or digit; the maximum length is 64 characters. Spaces and other punctuation are not supported. Renaming retains stored credentials and updates the default alias when applicable.

## Local configuration

The public `cordis.patch.yml` uses the host defaults below. Keep personal configuration overrides out of public commits.

| Field | Purpose | Default |
| --- | --- | --- |
| `configPath` | Connection JSON file | `DSH_DB_CONFIG_PATH`, then current profile/home (see below) |
| `driverDirectory` | Directory containing driver `node_modules` | Parent of `configPath` |
| `connectTimeoutMs` | Driver connection timeout, ms | `10000` |
| `testTimeoutMs` | Connection probe deadline, ms | `15000` |

Install the packages needed for your connections in `driverDirectory`:

| Connection type | Packages |
| --- | --- |
| Kingbase / PostgreSQL | `pg`, `pg-connection-string` |
| MySQL | `mysql2` |
| Oracle | `oracledb` |
| OceanBase | `oceanbase` |

For example: `npm install --prefix "<driver-directory>" pg pg-connection-string`.

This is a **fictional example**, not a working configuration. Replace the values privately, or create connections through the UI.

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

For an existing connection with an unchanged driver, blank connection-string and password inputs retain stored values. To replace a password, enter a new one and save. Saves back up the previous file as `<file>.bak`, write `<file>.tmp`, and rename it into place.

## Default database tools on every device

Enabling the plugin registers its own system-prompt section: use db_connections first to resolve aliases, then db_test_connection, db_query, db_schema or the approval-gated db_execute. Tool errors and blocked queries must be reported without automatically falling back to terminal scripts. This is model guidance, not a sandbox restriction on other tools.

Explicit plugin configuration takes precedence. Otherwise configPath uses DSH_DB_CONFIG_PATH, then DSH_PROFILE_DIR/db-config.json, DSH_HOME/db-config.json, and finally ~/.dsh/db-config.json. Drivers use explicit driverDirectory, then DSH_DB_DRIVER_DIRECTORY, then the connection file parent. Existing explicit paths are preserved; nothing is migrated or uploaded. On another device install the plugin in the active profile, install drivers there, add local connections in the panel, and select a default alias. Restart the app to load the tools and policy.

queryTimeoutMs defaults to 30000 (1000–480000). db_query accepts env, sql and limit (default 100, maximum 1000). db_schema accepts env, optional table/schema and limit; omit table to list tables, provide it to list columns (not a complete DDL/index export). Schema filters use driver-specific bound parameters. Returned row limits only bound output, not server work: add an appropriate SQL row limit. Operations run in dedicated database processes. Completion, cancellation or timeout terminates the process before the tool returns, closing its sockets. Read-only credentials are recommended because database functions and external effects are not a SQL sandbox. UPDATE_TIME and CREATE_USER are valid field names. Multiple statements, executable comments and unsupported procedural calls are rejected; never bypass a rejection.

## Approval and connection lifetime

SQL policy is implemented in sql-policy.js; guardQuery in query.js is the read-only entry. Word boundaries, comments and quoted values are inspected without changing SQL text. db_query cannot execute DML, DDL or analysis. Use db_execute to request host approval for the exact connection and single SQL statement. Missing approval UI, rejection or cancellation terminates before connection creation. AI-supplied approval flags are not accepted. No write approval is persisted or reused.

EXPLAIN (including ANALYZE), ANALYZE, VACUUM, OPTIMIZE and REINDEX also require approval and warn about CPU/IO, scans, locks and possible impact on other users. EXPLAIN ANALYZE actually executes its statement. DDL can implicitly commit; it is not generally rollback-safe. After timeout or disconnection, write outcomes may be uncertain: verify before any retry.

Connections are opened per operation and closed immediately after use; they are not retained for 8 minutes. connectionMaxLifetimeMs defaults to 480000 ms and can only be reduced (minimum 1000). The effective deadline is the smaller of the operation timeout and this lifetime. A dedicated child process is terminated on deadline or cancellation, including when driver close hangs. Approval waits do not hold database connections. Local explicit connection settings remain unchanged.

## Password viewing

Click the eye button beside a stored password. A native **Windows Security** dialog requests the current local Windows account password. The plugin checks that the authenticated account matches the running process.

- Use the account password, not a Windows Hello PIN, fingerprint, or face recognition. Domain, Microsoft, remote, and noninteractive account scenarios are not supported as a verified configuration.
- Blank-password accounts are refused and prompted to set an account password in Windows sign-in settings. Uncertain account state or any verification failure also refuses access.
- Verification times out after 60 seconds; the page has an additional 70-second wait limit. Waiting disables the eye button, not the entire form.
- A verified password appears in its original input for up to 20 seconds. It hides on window switching, form changes, collapse, or search hiding the card. The revealed value is separate from the editable draft.
- The native verifier receives no database password. Only encrypted password data crosses the command bridge; a one-use private key in the current page decrypts it.

The helper sets `RemoteSigned` only for its own PowerShell process, without changing system execution policy. Organization policy can still prevent it from running. To check loading without requesting credentials:

```powershell
powershell.exe -NoProfile -NonInteractive -STA -ExecutionPolicy RemoteSigned -File .\reveal-password.ps1 -Check
```

`ready` confirms compilation/loading only, not successful interactive authentication. Failures distinguish credential parsing errors, account mismatch, and Windows logon errors, with numeric codes where available.

## Commands and tools

| Entry | Purpose |
| --- | --- |
| `db_connections` | List metadata without stored passwords or connection strings |
| `db_test_connection` | Open and close one saved connection to test availability |
| `db_query` | Read-only SQL with env, sql and optional limit |
| `db_execute` | One-time user approval for writes, DDL, analysis or maintenance |
| `db_schema` | List tables or inspect columns with env, table, schema and limit |
| `/db-config list` | Refresh the listing |
| `/db-config test <alias>` | Test a saved connection |
| `/db-config test-draft <json>` | Test an unsaved draft |
| `/db-config save <json>` | Save a connection |
| `/db-config default <alias>` | Set the default connection |
| `/db-config delete <alias>` | Delete a connection |

Password viewing uses an internal `/db-config reveal <json>` request with an ephemeral public key and challenge; it is not a plaintext-password command. Connection-panel actions use a separate authenticated RPC channel. Listing, testing, choosing the default, deleting and password viewing do not add conversation command rows; errors stay in the panel. Only a successful add or edit emits a short completion notice via a single-use, session-bound receipt. Submitted command input is not recorded (`recordInput: false`); notices contain no connection settings or credentials. Manually entered slash commands still use the ordinary command history.

## Development and verification

```sh
npm install
npm run build
npm test
npm run verify
```

`build` regenerates `client.js`; `test` runs the offline suite with stub drivers; `verify` checks plugin registration and bundle loading against an empty connection configuration. These checks do not verify live database access or the full Windows credential dialog flow.

| Files | Role |
| --- | --- |
| `client/`, `client.js` | React UI source and built client bundle |
| `index.js`, `config.js`, `store.js` | Host registration, metadata and persistence |
| `drivers.js`, `probe.js` | Driver loading, connection tests and error redaction |
| `credentials.js`, `reveal*.js`, `reveal-password.ps1` | Credential extraction, encrypted transport and native verification |
| `cordis.patch.yml`, `install.mjs` | Plugin configuration and profile installation |
| `test/`, `verify.mjs` | Offline tests and artifact checks |

## Public repository hygiene

The public distribution contains source code and fictional examples only. Never commit real connection files, credentials, backups, or local deployment paths. `.gitignore` excludes common connection-file names, environment files, backups, temporary files, and archives; it cannot detect sensitive values pasted into source or documentation. Review changes before publishing. The package remains `private: true` for npm; GitHub visibility is public.
