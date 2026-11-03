# dsh-db-workspace

Connection workspace for JoyinCode: configure the connections in `db-config.json` and verify that each one reaches its server.

This is the plugin form of `<db-helper-directory>`. The plugin owns configuration and connectivity only — it registers no query, table, or SQL tool. Statement execution stays with that directory's `db.js`, which reads the same file.

## What it contributes

| Surface | Contribution |
| --- | --- |
| Right-sidebar page **数据库连接** | List, add, edit, delete, mark default, and test one connection |
| Start page guide card | Opens the same page |
| Model tools | `db_connections` (list aliases without credentials), `db_test_connection` (open and close one connection) |
| Slash command | `/db-config {list \| test <别名> \| test-draft <json> \| save <json> \| delete <别名> \| default <别名>}` |

The page calls that one command through `ctx.remote.commands.execute`; a standalone client bundle has no other host-action channel without generated Typert remotes. Every page action therefore leaves one command result line in the conversation. `recordInput: false` keeps the submitted password out of the session log.

## Directory layout

| Path | Role |
| --- | --- |
| `index.js` | Host plugin: `name`/`inject`/`apply`, two tools, the `/db-config` command and its parser |
| `config.js` | Read the connection file, resolve one alias, describe entries without credentials |
| `store.js` | Normalize, save, rename, delete, and mark-default; backup, then atomic write |
| `drivers.js` | Driver dispatch over `driverDirectory` (`pg`, `mysql2`, `oracledb`, `oceanbase`) |
| `probe.js` | Open-and-close probe with a deadline and credential redaction |
| `client/index.tsx`, `client/DatabasePage.tsx` | The connection manager page |
| `client.js` | Built client bundle (`node build.mjs`) |
| `cordis.patch.yml` | Bundle patch: the loader row |
| `test/`, `verify.mjs` | Offline tests (stub drivers) and shipped-artifact verification |
| `install.mjs` | Profile wiring |

## Enable it

`node install.mjs` wires the profile the launcher named: `DSH_PROFILE_DIR` when it is set (that is the running app's profile), otherwise `<DSH_HOME>/profiles/<DSH_PROFILE or desktop>`. `--profile-dir`, `--profile`, and `--home` override each step independently, and `--dry-run` prints the plan without writing. The script adds the `link:` dependency, the bundle entry, and the `node_modules` junction. Restart JoyinCode afterwards.

The desktop application keeps its profiles under its own DSH home (`%APPDATA%\@joyin\joyin-worker\dsh\accounts\<account>\profiles\<profile>`), not `~/.dsh`; running the script inside a JoyinCode session resolves that through `DSH_PROFILE_DIR`.

Edit `cordis.patch.yml` to change deployment values.

## Configuration

| Field | Meaning | Default |
| --- | --- | --- |
| `configPath` | Connection file to read and write | `~/.dsh/db-config.json` |
| `driverDirectory` | Directory whose `node_modules` supplies the drivers | Directory of `configPath` |
| `connectTimeoutMs` | Driver connection timeout | `10000` |
| `testTimeoutMs` | Probe deadline; the tool's own timeout is this plus 30 s | `15000` |

## The connection file

The file keeps the standalone layout, so `db.js` and `gui-server.js` stay valid:

```json
{
  "default": "demo-postgres",
  "databases": {
    "demo-postgres": { "driver": "kingbase", "dsn": "postgresql://user:password@host:54321/db" },
    "demo-oceanbase": {
      "driver": "oceanbase", "host": "db.example.invalid", "port": 2883,
      "user": "demo_user", "password": "…", "tenant": "…", "cluster": "…",
      "database": "demo_user", "mode": "oracle"
    }
  }
}
```

Saving keeps `<file>.bak` with the previous content, writes `<file>.tmp`, then renames it over the target, so `db.js` never reads a half-written file.

## Credentials

The ordinary listing never exposes a password or a connection string: a listed connection carries only `hasDsn` and `hasPassword`. Editing a connection submits blank credential fields, which mean "keep the stored value" — the same rule the standalone GUI applies. A probe failure is redacted before it becomes a command result or a tool result: the connection string and password are replaced with `[已隐藏]`, longest first so the string cannot leak around the password substitution.

## Verification

```sh
node --test     # 49 offline cases: config model, store writes, driver dispatch, probe redaction, command actions
node build.mjs  # rebuild client.js after changing the page
node verify.mjs # host registration + client bundle evaluation against the packaged row configuration
```

The tests use stub driver packages that record every call, so a probe is asserted to open and close exactly one connection, and a rejected save is asserted to leave the file byte-identical.

## Known limitations

- No query path by design. Ask the agent to run `node db.js query "<sql>" --env <alias>` from that directory.
- Page actions round-trip through `/db-config`, so each one appears in the conversation.
- Every driver must be installed in `driverDirectory`; a missing package fails with the exact `npm install` command.
- Deletion requires inline confirmation; backups remain outside the repository.


## Public distribution

This repository contains source code and fictional examples only. No existing database connections are included. The default connection file is `~/.dsh/db-config.json`; configure your local path and drivers privately. Never commit connection files or backups. Run `npm install` before rebuilding with `npm run build`.
