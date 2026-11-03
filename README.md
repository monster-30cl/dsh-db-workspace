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

Supports Kingbase, PostgreSQL, MySQL, Oracle, and OceanBase (MySQL or Oracle tenant mode). The plugin manages configuration and connection tests; it does not provide SQL queries or schema inspection. A separately configured `db.js` helper can share the same connection file.

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

## Local configuration

The public `cordis.patch.yml` uses the host defaults below. Keep personal configuration overrides out of public commits.

| Field | Purpose | Default |
| --- | --- | --- |
| `configPath` | Connection JSON file | `~/.dsh/db-config.json` |
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
| `/db-config list` | Refresh the listing |
| `/db-config test <alias>` | Test a saved connection |
| `/db-config test-draft <json>` | Test an unsaved draft |
| `/db-config save <json>` | Save a connection |
| `/db-config default <alias>` | Set the default connection |
| `/db-config delete <alias>` | Delete a connection |

Password viewing uses an internal `/db-config reveal <json>` request with an ephemeral public key and challenge; it is not a plaintext-password command. Page actions use the remote command bridge, so command results may appear in the conversation. Submitted command input is not recorded (`recordInput: false`); probe failures redact configured secrets.

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
