window.__ModuleLoader__.load({id:"@local/dsh-db-workspace",factory:(require)=>{var module={exports:{}};var exports=module.exports;var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.tsx
var index_exports = {};
__export(index_exports, {
  DB_PANE_ID: () => DB_PANE_ID,
  DB_PANE_KIND: () => DB_PANE_KIND,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// client/DatabasePage.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var DRIVERS = ["kingbase", "postgres", "mysql", "oracle", "oceanbase"];
function draftOf(connection) {
  return {
    name: connection?.name ?? "",
    oldName: connection?.name ?? "",
    driver: connection?.driver ?? "kingbase",
    dsn: "",
    user: connection?.user ?? "",
    password: "",
    host: connection?.host ?? "",
    port: connection?.port === void 0 || connection?.port === "" ? "" : String(connection.port),
    database: connection?.database ?? "",
    tenant: connection?.tenant ?? "",
    cluster: connection?.cluster ?? "",
    mode: connection?.mode === "oracle" ? "oracle" : "mysql"
  };
}
function entryPayload(draft) {
  const base = { driver: draft.driver };
  if (draft.driver === "oceanbase") {
    return {
      ...base,
      host: draft.host.trim(),
      port: draft.port.trim(),
      user: draft.user.trim(),
      password: draft.password,
      tenant: draft.tenant.trim(),
      cluster: draft.cluster.trim(),
      database: draft.database.trim(),
      mode: draft.mode
    };
  }
  return { ...base, dsn: draft.dsn.trim(), user: draft.user.trim(), password: draft.password };
}
function applyListing(value, setConnections, setDefaultAlias) {
  setConnections(Array.isArray(value?.connections) ? value.connections : []);
  setDefaultAlias(value?.default ?? "");
}
var paneCss = `
.db-workspace { --db-accent: #4678e8; --db-border: var(--dsw-alias-border-default, #8884); --db-muted: var(--dsw-alias-bg-secondary, #8881); box-sizing: border-box; container-type: inline-size; }
.db-workspace * { box-sizing: border-box; }
.db-workspace :is(button,input,select) { transition: border-color .15s, background .15s; }
.db-workspace button:hover:not(:disabled) { background: var(--db-muted) !important; border-color: var(--db-accent) !important; }
.db-workspace :is(button,input,select):focus-visible { outline: 2px solid var(--db-accent); outline-offset: 3px; }
.db-workspace :disabled { opacity: .45; cursor: not-allowed; }
.db-workspace input::placeholder { color: inherit; opacity: .45; }
.db-workspace .db-primary { background: var(--db-accent) !important; color: white !important; border-color: var(--db-accent) !important; font-weight: 600; }
.db-workspace .db-primary:hover:not(:disabled) { background: #3565d0 !important; }
.db-workspace .db-danger { color: #d75159 !important; }
.db-workspace .db-card:hover { border-color: var(--db-accent) !important; }
.db-workspace .db-expanded { border-color: var(--db-accent) !important; }
.db-workspace button[aria-expanded="true"] { color: var(--db-accent) !important; background: #4678e812 !important; border-color: var(--db-accent) !important; }
.db-workspace .db-default { border-left: 3px solid var(--db-accent) !important; }
.db-workspace .db-fields { display: grid; grid-template-columns: 1fr; gap: 14px; }
.db-workspace .db-wide { grid-column: 1 / -1; }
.db-workspace .db-status[data-tone="error"] { border-color: #d75159 !important; }
.db-workspace .db-status[data-tone="success"] { border-color: #30976b !important; }
@container (min-width: 460px) { .db-workspace .db-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .db-workspace * { transition: none !important; } }
`;
var styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    height: "100%",
    minHeight: 0,
    padding: "24px 20px",
    overflowY: "auto",
    color: "var(--dsw-alias-label-primary)",
    font: '13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif'
  },
  header: { display: "flex", flexDirection: "column", gap: 8, paddingBottom: 18, borderBottom: "1px solid var(--db-border)" },
  title: { margin: 0, fontSize: 20, fontWeight: 650, letterSpacing: "-.4px" },
  hint: { margin: 0, fontSize: 12, opacity: 0.7 },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  sectionTitle: { margin: 0, fontSize: 13, fontWeight: 600 },
  list: { display: "flex", flexDirection: "column", gap: 12, margin: 0, padding: 0, listStyle: "none" },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    border: "1px solid var(--db-border)",
    background: "var(--dsw-alias-bg-elevated)"
  },
  rowHead: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontWeight: 650, fontSize: 14, overflowWrap: "anywhere", marginRight: "auto" },
  badge: {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 10,
    background: "var(--dsw-alias-bg-secondary, rgba(0,0,0,0.08))",
    opacity: 0.9
  },
  meta: { fontSize: 12, opacity: 0.75, overflowWrap: "anywhere", fontFamily: "ui-monospace, monospace" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: 18,
    borderRadius: 12,
    border: "1px solid var(--dsw-alias-border-default)",
    background: "var(--dsw-alias-bg-elevated)"
  },
  inlineForm: { display: "flex", flexDirection: "column", gap: 18, marginTop: 4, paddingTop: 20, borderTop: "1px solid var(--db-border)" },
  formActions: { display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid var(--db-border)" },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  label: { fontSize: 12, opacity: 0.75 },
  input: {
    width: "100%",
    minWidth: 0,
    padding: "9px 11px",
    borderRadius: 8,
    border: "1px solid var(--db-border)",
    background: "var(--dsw-alias-bg-primary, transparent)",
    color: "inherit",
    font: "inherit"
  },
  button: {
    padding: "7px 11px",
    borderRadius: 8,
    border: "1px solid var(--db-border)",
    background: "var(--dsw-alias-bg-primary, transparent)",
    color: "inherit",
    font: "inherit",
    cursor: "pointer"
  },
  status: { margin: 0, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--db-border)", fontSize: 12, overflowWrap: "anywhere" },
  empty: { padding: "32px 16px", textAlign: "center", border: "1px dashed var(--db-border)", borderRadius: 12 }
};
function ConnectionEditor({ connection, embedded = false, visible, sessionId, busy, t, invoke, mutate, probe, setTone, setStatus, fail, onClose }) {
  const [draft, setDraft] = (0, import_react.useState)(() => draftOf(connection));
  const [revealing, setRevealing] = (0, import_react.useState)(false);
  const [revealed, setRevealed] = (0, import_react.useState)("");
  const [showNewPassword, setShowNewPassword] = (0, import_react.useState)(false);
  const revealRequest = (0, import_react.useRef)(0);
  const passwordId = connection ? "db-password-existing-" + encodeURIComponent(connection.name) : "db-password-new";
  (0, import_react.useEffect)(() => {
    revealRequest.current++;
    setRevealed("");
    setRevealing(false);
    return () => {
      revealRequest.current++;
    };
  }, [draft, sessionId, visible]);
  (0, import_react.useEffect)(() => {
    if (!revealed) return;
    const hide = () => {
      setRevealed("");
    };
    const timer = window.setTimeout(hide, 2e4);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [revealed]);
  const reveal = async () => {
    if (revealed) {
      setRevealed("");
      return;
    }
    if (!draft || revealing) return;
    const request = ++revealRequest.current;
    setRevealing(true);
    setTone("info");
    setStatus(t("revealWaiting"));
    let deadline;
    try {
      const result = await Promise.race([
        (async () => {
          const pair = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, false, ["encrypt", "decrypt"]);
          const publicKey = await crypto.subtle.exportKey("jwk", pair.publicKey);
          const challenge = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
          const value = await invoke(`/db-config reveal ${JSON.stringify({ alias: draft.oldName, publicKey, challenge })}`);
          if (!value || value.challenge !== challenge || !value.wrappedKey || !value.iv || !value.data) throw new Error(t("commandFailed"));
          const bytes = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
          const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, pair.privateKey, bytes(value.wrappedKey));
          try {
            const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
            return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(value.iv), additionalData: new TextEncoder().encode(challenge) }, key, bytes(value.data)));
          } finally {
            new Uint8Array(raw).fill(0);
          }
        })(),
        new Promise((_, reject) => {
          deadline = window.setTimeout(() => {
            reject(new Error(t("revealTimeout")));
          }, 7e4);
        })
      ]);
      if (request !== revealRequest.current) return;
      setRevealed(result);
      setTone("success");
      setStatus(t("revealShown"));
    } catch (cause) {
      if (request === revealRequest.current) fail(cause);
    } finally {
      if (deadline !== void 0) window.clearTimeout(deadline);
      if (request === revealRequest.current) setRevealing(false);
    }
  };
  const save = () => {
    if (draft === null) return;
    const name = draft.name.trim();
    if (name === "") {
      setTone("error");
      setStatus(t("aliaseRequired"));
      return;
    }
    const payload = { name, oldName: draft.oldName, entry: entryPayload(draft) };
    mutate(`/db-config save ${JSON.stringify(payload)}`, t("saved"), onClose);
  };
  const passwordField = () => {
    if (draft === null) return null;
    const stored = connection;
    const passwordVisible = stored ? !!revealed : showNewPassword;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.field, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: styles.label, htmlFor: passwordId, children: t("passwordLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: passwordId,
            style: styles.input,
            type: passwordVisible ? "text" : "password",
            autoComplete: "new-password",
            readOnly: !!revealed,
            value: revealed || draft.password,
            placeholder: stored?.hasPassword ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
            disabled: busy,
            onChange: (event) => {
              setDraft({ ...draft, password: event.target.value });
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: { ...styles.button, flexShrink: 0 },
            disabled: busy || !!stored && (revealing || !stored.hasPassword || draft.driver !== stored.driver || draft.password !== ""),
            title: t(passwordVisible ? "hidePassword" : stored ? "revealAction" : "showPassword"),
            "aria-label": t(passwordVisible ? "hidePassword" : stored ? "revealAction" : "showPassword"),
            "aria-pressed": passwordVisible,
            onClick: () => {
              if (stored) {
                void reveal();
              } else {
                setShowNewPassword((value) => !value);
              }
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", "aria-hidden": "true", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "3" }),
              passwordVisible && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m3 3 18 18" })
            ] })
          }
        )
      ] }),
      stored && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.hint, children: t("revealHint") })
    ] });
  };
  const input = (key, value, onChange, options) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: styles.field, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.label, children: t(key) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        style: styles.input,
        type: options?.type ?? "text",
        value,
        disabled: busy || (options?.disabled ?? false),
        placeholder: options?.placeholder,
        spellCheck: false,
        onChange: (event) => {
          onChange(event.target.value);
        }
      }
    )
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { style: embedded ? styles.inlineForm : styles.form, onSubmit: (event) => {
    event.preventDefault();
    if (!busy) save();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: styles.sectionTitle, children: draft.oldName === "" ? t("newTitle") : t("editTitle") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "db-fields", children: [
      input("aliasLabel", draft.name, (value) => {
        setDraft({ ...draft, name: value });
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: styles.field, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.label, children: t("driverLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "select",
          {
            style: styles.input,
            disabled: busy,
            value: draft.driver,
            onChange: (event) => {
              setDraft({ ...draft, driver: event.target.value });
            },
            children: DRIVERS.map((driver) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: driver, children: driver }, driver))
          }
        )
      ] }),
      draft.driver === "oceanbase" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        input("hostLabel", draft.host, (value) => {
          setDraft({ ...draft, host: value });
        }),
        input("portLabel", draft.port, (value) => {
          setDraft({ ...draft, port: value });
        }, { placeholder: "2883" }),
        input("userLabel", draft.user, (value) => {
          setDraft({ ...draft, user: value });
        }),
        passwordField(),
        input("tenantLabel", draft.tenant, (value) => {
          setDraft({ ...draft, tenant: value });
        }),
        input("clusterLabel", draft.cluster, (value) => {
          setDraft({ ...draft, cluster: value });
        }),
        input("databaseLabel", draft.database, (value) => {
          setDraft({ ...draft, database: value });
        }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: styles.field, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.label, children: t("modeLabel") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "select",
            {
              style: styles.input,
              disabled: busy,
              value: draft.mode,
              onChange: (event) => {
                setDraft({ ...draft, mode: event.target.value });
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "mysql", children: t("modeMysql") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "oracle", children: t("modeOracle") })
              ]
            }
          )
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "db-wide", children: [
          input("dsnLabel", draft.dsn, (value) => {
            setDraft({ ...draft, dsn: value });
          }, {
            placeholder: draft.driver === "oracle" ? "oracle://user:pass@host:1521/service" : draft.driver === "mysql" ? "mysql://user:pass@host:3306/db" : "postgresql://user:pass@host:54321/db"
          }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { ...styles.hint, marginTop: 6 }, children: t("dsnHint") })
        ] }),
        input("userLabel", draft.user, (value) => {
          setDraft({ ...draft, user: value });
        }),
        passwordField()
      ] })
    ] }),
    draft.oldName === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.hint, children: t("passwordKeepHint") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.formActions, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          style: styles.button,
          disabled: busy,
          onClick: () => {
            const payload = { ...entryPayload(draft), name: draft.name.trim(), oldName: draft.oldName };
            probe(`/db-config test-draft ${JSON.stringify(payload)}`);
          },
          children: t("testAction")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "db-primary", style: styles.button, disabled: busy, children: t("saveAction") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.button, disabled: busy, onClick: onClose, children: t("cancelAction") })
    ] })
  ] });
}
function DatabasePage({ sessionId, t, runCommand }) {
  const [connections, setConnections] = (0, import_react.useState)([]);
  const [defaultAlias, setDefaultAlias] = (0, import_react.useState)("");
  const [editors, setEditors] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
  const [expanded, setExpanded] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
  const [newConnection, setNewConnection] = (0, import_react.useState)(false);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [status, setStatus] = (0, import_react.useState)("");
  const [tone, setTone] = (0, import_react.useState)("info");
  const [search, setSearch] = (0, import_react.useState)("");
  const [deleteName, setDeleteName] = (0, import_react.useState)(null);
  const [listState, setListState] = (0, import_react.useState)("loading");
  const orderedConnections = [...connections].sort((left, right) => Number(defaultAlias ? right.name === defaultAlias : right.isDefault) - Number(defaultAlias ? left.name === defaultAlias : left.isDefault));
  const visibleConnections = orderedConnections.filter((item) => [item.name, item.driver, item.host, item.database, item.user].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const invoke = (0, import_react.useCallback)(async (command) => {
    if (sessionId === void 0) throw new Error(t("commandFailed"));
    const text = await runCommand(sessionId, command);
    try {
      return JSON.parse(text);
    } catch {
      return void 0;
    }
  }, [runCommand, sessionId, t]);
  const fail = (cause) => {
    setTone("error");
    setStatus(cause instanceof Error ? cause.message : String(cause));
  };
  const refresh = (0, import_react.useCallback)(() => {
    setListState("loading");
    setBusy(true);
    setTone("info");
    setStatus(t("loading"));
    void invoke("/db-config list").then((value) => {
      if (!Array.isArray(value?.connections)) throw new Error(t("loadFailed"));
      applyListing(value, setConnections, setDefaultAlias);
      setListState("ready");
      setStatus("");
    }).catch((cause) => {
      setListState("error");
      fail(cause);
    }).finally(() => {
      setBusy(false);
    });
  }, [invoke, t]);
  (0, import_react.useEffect)(() => {
    refresh();
  }, [refresh]);
  (0, import_react.useEffect)(() => {
    if (status === "" || busy || tone === "error") return;
    const timer = window.setTimeout(() => {
      setStatus("");
    }, 6e3);
    return () => {
      window.clearTimeout(timer);
    };
  }, [status, busy, tone]);
  const mutate = (command, done, after) => {
    setBusy(true);
    setTone("info");
    setStatus(t("saving"));
    void invoke(command).then((value) => {
      applyListing(value, setConnections, setDefaultAlias);
      setTone("success");
      setStatus(value?.notificationWarning ? `${done} \xB7 ${value.notificationWarning}` : done);
      after?.();
    }, fail).finally(() => {
      setBusy(false);
    });
  };
  const probe = (command) => {
    setBusy(true);
    setTone("info");
    setStatus(t("testing"));
    void invoke(command).then((value) => {
      setTone("success");
      setStatus(value?.message ?? t("testOk"));
    }, fail).finally(() => {
      setBusy(false);
    });
  };
  const closeEditor = (name) => {
    setEditors((current) => {
      const next = new Set(current);
      next.delete(name);
      return next;
    });
    setExpanded((current) => {
      const next = new Set(current);
      next.delete(name);
      return next;
    });
  };
  const editorProps = { sessionId, busy, t, invoke, mutate, probe, setTone, setStatus, fail };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "db-workspace", style: styles.root, "aria-busy": busy, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: paneCss }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "sticky", top: 0, height: 0, flexShrink: 0, zIndex: 100, pointerEvents: "none" }, children: status === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        role: tone === "error" ? "alert" : "status",
        "aria-atomic": "true",
        className: "db-status",
        "data-tone": tone,
        style: {
          ...styles.status,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          pointerEvents: "auto",
          borderLeftWidth: 4,
          background: "var(--dsw-alias-bg-elevated, Canvas)",
          color: "var(--dsw-alias-label-primary, CanvasText)",
          boxShadow: "0 6px 24px #0002"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 }, children: status }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              style: { ...styles.button, padding: "0 5px", border: 0, background: "transparent", flexShrink: 0 },
              "aria-label": t("dismissAction"),
              onClick: () => {
                setStatus("");
              },
              children: "\xD7"
            }
          )
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { style: styles.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: styles.title, children: t("title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.hint, children: t("description") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.sectionHead, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { style: styles.sectionTitle, children: [
        t("connectionsTitle"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.badge, children: listState !== "ready" && connections.length === 0 ? "\u2014" : connections.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.actions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.button, disabled: busy, onClick: refresh, children: t("refreshAction") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: styles.button,
            className: "db-primary",
            disabled: busy || newConnection || listState !== "ready",
            onClick: () => {
              setNewConnection(true);
            },
            children: t("addAction")
          }
        )
      ] })
    ] }),
    newConnection && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionEditor, { ...editorProps, visible: true, onClose: () => {
      setNewConnection(false);
    } }),
    connections.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: styles.input, type: "search", "aria-label": t("searchPlaceholder"), placeholder: t("searchPlaceholder"), value: search, onChange: (event) => {
      setSearch(event.target.value);
    } }),
    connections.length > 0 && visibleConnections.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.empty, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.hint, children: t("noSearchResults") }) }),
    connections.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.empty, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: styles.sectionTitle, children: listState === "error" ? t("loadFailed") : listState === "loading" ? t("loading") : t("emptyList") }),
      listState === "ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.hint, children: t("emptyHint") }),
      listState === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...styles.button, marginTop: 12 }, disabled: busy, onClick: refresh, children: t("refreshAction") })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { style: styles.list, children: orderedConnections.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: `db-card ${item.isDefault || item.name === defaultAlias ? "db-default" : ""} ${expanded.has(item.name) ? "db-expanded" : ""}`, style: { ...styles.row, display: visibleConnections.some((row) => row.name === item.name) ? "flex" : "none" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.rowHead, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.name, children: item.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.badge, children: item.driver }),
        item.isDefault || item.name === defaultAlias ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.badge, children: t("defaultBadge") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.badge, children: item.hasPassword ? t("passwordStored") : t("noPassword") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.meta, children: [item.host, item.port, item.database, item.user].filter((part) => part !== "" && part !== void 0).join(" \xB7 ") || (item.hasDsn ? t("dsnLabel") : "") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.actions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.button, disabled: busy, onClick: () => {
          probe(`/db-config test ${item.name}`);
        }, children: t("testAction") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: styles.button,
            disabled: busy,
            "aria-expanded": expanded.has(item.name),
            "aria-controls": "db-editor-" + encodeURIComponent(item.name),
            onClick: () => {
              setEditors((current) => new Set(current).add(item.name));
              setExpanded((current) => {
                const next = new Set(current);
                if (next.has(item.name)) next.delete(item.name);
                else next.add(item.name);
                return next;
              });
            },
            children: t(expanded.has(item.name) ? "collapseAction" : "editAction")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: styles.button,
            disabled: busy || item.isDefault || item.name === defaultAlias,
            onClick: () => {
              mutate(`/db-config default ${item.name}`, t("saved"));
            },
            children: t("defaultAction")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "db-danger", style: { ...styles.button, marginLeft: "auto" }, disabled: busy, onClick: () => {
          setDeleteName(item.name);
        }, children: t("deleteAction") })
      ] }),
      deleteName === item.name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.status, role: "group", "aria-label": t("deleteConfirm"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: { margin: "0 0 10px" }, children: [
          t("deleteConfirm"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { style: { overflowWrap: "anywhere" }, children: item.name })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.actions, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "db-danger", style: styles.button, disabled: busy, onClick: () => {
            mutate(`/db-config delete ${item.name}`, t("removed"), () => {
              setDeleteName(null);
              closeEditor(item.name);
            });
          }, children: t("deleteAction") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.button, disabled: busy, onClick: () => {
            setDeleteName(null);
          }, children: t("cancelAction") })
        ] })
      ] }),
      editors.has(item.name) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: "db-editor-" + encodeURIComponent(item.name), hidden: !expanded.has(item.name), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionEditor, { ...editorProps, connection: item, embedded: true, visible: expanded.has(item.name) && visibleConnections.some((row) => row.name === item.name), onClose: () => {
        closeEditor(item.name);
      } }) })
    ] }, item.name)) })
  ] });
}

// client/locales.ts
var en = {
  loadFailed: "Could not load connections. Check the connection and retry.",
  noticeFailed: "Saved successfully, but the chat notification could not be delivered.",
  collapseAction: "Collapse",
  revealWaiting: "Complete the Windows Security prompt. It closes after 60 seconds; you can keep using the form.",
  revealTimeout: "Verification timed out. Please retry.",
  revealShown: "Password shown temporarily. It hides after 20 seconds or when you switch windows.",
  hidePassword: "Hide password",
  showPassword: "Show password",
  dismissAction: "Dismiss notification",
  revealAction: "View password with Windows verification",
  revealHint: "Verify your Windows account password in a local window to view. An account password is required.",
  refreshAction: "Refresh",
  searchPlaceholder: "Search alias, host, database\u2026",
  noSearchResults: "No matching connections. Try another search.",
  emptyHint: "Add your first connection to get started.",
  deleteConfirm: "Delete this connection?",
  title: "Database connections",
  description: "Manage your databases and test connection availability.",
  connectionsTitle: "Connections",
  emptyList: "No connection is configured yet.",
  loading: "Loading connections\u2026",
  addAction: "New connection",
  newTitle: "New connection",
  editTitle: "Edit connection",
  aliasLabel: "Alias",
  driverLabel: "Driver",
  dsnLabel: "Connection string",
  dsnHint: "Kingbase: postgresql://user:pass@host:54321/db or jdbc:kingbase8://host:54321/db \xB7 MySQL: mysql://user:pass@host:3306/db \xB7 Oracle: oracle://user:pass@host:1521/service",
  userLabel: "User",
  passwordLabel: "Password",
  passwordKeepHint: "Leave blank to keep the stored password.",
  hostLabel: "Host",
  portLabel: "Port",
  databaseLabel: "Database",
  tenantLabel: "Tenant",
  clusterLabel: "Cluster",
  modeLabel: "Mode",
  modeMysql: "MySQL tenant",
  modeOracle: "Oracle tenant",
  testAction: "Test",
  saveAction: "Save",
  cancelAction: "Cancel",
  editAction: "Edit",
  deleteAction: "Delete",
  defaultAction: "Set default",
  defaultBadge: "default",
  passwordStored: "password stored",
  noPassword: "no password",
  testing: "Testing\u2026",
  saving: "Saving\u2026",
  testOk: "Connection succeeded",
  saved: "Saved",
  removed: "Removed",
  aliaseRequired: "Enter an alias.",
  commandFailed: "Command failed"
};
var zh = {
  loadFailed: "\u8FDE\u63A5\u5217\u8868\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u540E\u5237\u65B0\u91CD\u8BD5\u3002",
  noticeFailed: "\u8FDE\u63A5\u5DF2\u4FDD\u5B58\uFF0C\u4F46\u5DE5\u4F5C\u533A\u5B8C\u6210\u63D0\u793A\u53D1\u9001\u5931\u8D25\u3002",
  collapseAction: "\u6536\u8D77",
  revealWaiting: "\u8BF7\u5728 Windows \u5B89\u5168\u4E2D\u5FC3\u7A97\u53E3\u5B8C\u6210\u9A8C\u8BC1\uFF0C60 \u79D2\u540E\u8D85\u65F6\u5173\u95ED\uFF1B\u8868\u5355\u4ECD\u53EF\u64CD\u4F5C\u3002",
  revealTimeout: "\u9A8C\u8BC1\u7B49\u5F85\u8D85\u65F6\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  revealShown: "\u5BC6\u7801\u5DF2\u4E34\u65F6\u663E\u793A\uFF0C20 \u79D2\u540E\u6216\u5207\u6362\u7A97\u53E3\u65F6\u81EA\u52A8\u9690\u85CF\u3002",
  hidePassword: "\u9690\u85CF\u5BC6\u7801",
  showPassword: "\u663E\u793A\u5BC6\u7801",
  dismissAction: "\u5173\u95ED\u63D0\u9192",
  revealAction: "\u9A8C\u8BC1 Windows \u5BC6\u7801\u540E\u67E5\u770B",
  revealHint: "\u5728\u672C\u673A\u7A97\u53E3\u9A8C\u8BC1 Windows \u8D26\u6237\u5BC6\u7801\u540E\u67E5\u770B\uFF1B\u672A\u8BBE\u7F6E\u8D26\u6237\u5BC6\u7801\u65F6\u62D2\u7EDD\u67E5\u770B\u3002",
  refreshAction: "\u5237\u65B0",
  searchPlaceholder: "\u641C\u7D22\u522B\u540D\u3001\u4E3B\u673A\u3001\u6570\u636E\u5E93\u2026",
  noSearchResults: "\u672A\u627E\u5230\u5339\u914D\u7684\u8FDE\u63A5\uFF0C\u8BD5\u8BD5\u5176\u4ED6\u5173\u952E\u8BCD\u3002",
  emptyHint: "\u70B9\u51FB\u201C\u65B0\u589E\u8FDE\u63A5\u201D\uFF0C\u914D\u7F6E\u4F60\u7684\u7B2C\u4E00\u4E2A\u6570\u636E\u5E93\u3002",
  deleteConfirm: "\u786E\u5B9A\u5220\u9664\u6B64\u8FDE\u63A5\uFF1F",
  title: "\u6570\u636E\u5E93\u8FDE\u63A5",
  description: "\u96C6\u4E2D\u7BA1\u7406\u6570\u636E\u5E93\u8FDE\u63A5\uFF0C\u968F\u65F6\u9A8C\u8BC1\u8FDE\u63A5\u662F\u5426\u53EF\u7528\u3002",
  connectionsTitle: "\u8FDE\u63A5\u5217\u8868",
  emptyList: "\u8FD8\u6CA1\u6709\u914D\u7F6E\u4EFB\u4F55\u8FDE\u63A5\u3002",
  loading: "\u6B63\u5728\u52A0\u8F7D\u8FDE\u63A5\u2026",
  addAction: "\u65B0\u589E\u8FDE\u63A5",
  newTitle: "\u65B0\u589E\u8FDE\u63A5",
  editTitle: "\u7F16\u8F91\u8FDE\u63A5",
  aliasLabel: "\u522B\u540D",
  driverLabel: "\u9A71\u52A8",
  dsnLabel: "\u8FDE\u63A5\u4E32",
  dsnHint: "Kingbase\uFF1Apostgresql://\u7528\u6237:\u5BC6\u7801@\u4E3B\u673A:54321/\u5E93 \u6216 jdbc:kingbase8://\u4E3B\u673A:54321/\u5E93 \xB7 MySQL\uFF1Amysql://\u7528\u6237:\u5BC6\u7801@\u4E3B\u673A:3306/\u5E93 \xB7 Oracle\uFF1Aoracle://\u7528\u6237:\u5BC6\u7801@\u4E3B\u673A:1521/\u670D\u52A1",
  userLabel: "\u7528\u6237\u540D",
  passwordLabel: "\u5BC6\u7801",
  passwordKeepHint: "\u7559\u7A7A\u8868\u793A\u4FDD\u7559\u5DF2\u4FDD\u5B58\u7684\u5BC6\u7801\u3002",
  hostLabel: "\u4E3B\u673A",
  portLabel: "\u7AEF\u53E3",
  databaseLabel: "\u6570\u636E\u5E93",
  tenantLabel: "\u79DF\u6237",
  clusterLabel: "\u96C6\u7FA4",
  modeLabel: "\u6A21\u5F0F",
  modeMysql: "MySQL \u79DF\u6237",
  modeOracle: "Oracle \u79DF\u6237",
  testAction: "\u6D4B\u8BD5",
  saveAction: "\u4FDD\u5B58",
  cancelAction: "\u53D6\u6D88",
  editAction: "\u7F16\u8F91",
  deleteAction: "\u5220\u9664",
  defaultAction: "\u8BBE\u4E3A\u9ED8\u8BA4",
  defaultBadge: "\u9ED8\u8BA4",
  passwordStored: "\u5DF2\u5B58\u5BC6\u7801",
  noPassword: "\u65E0\u5BC6\u7801",
  testing: "\u6B63\u5728\u6D4B\u8BD5\u2026",
  saving: "\u6B63\u5728\u4FDD\u5B58\u2026",
  testOk: "\u8FDE\u63A5\u6210\u529F",
  saved: "\u5DF2\u4FDD\u5B58",
  removed: "\u5DF2\u5220\u9664",
  aliaseRequired: "\u8BF7\u586B\u5199\u522B\u540D\u3002",
  commandFailed: "\u547D\u4EE4\u6267\u884C\u5931\u8D25"
};

// client/index.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var inject = ["slots", "locale", "sidebarRightTabs", "sidebarRight", "uiSession", "layout", "shortcuts", "remote", "remote.commands", "connection"];
var NS = "db.workspace";
var DB_PANE_ID = "@local/dsh-db-workspace/page";
var DB_PANE_KIND = "dbWorkspace";
function DatabaseIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { viewBox: "0 0 64 64", width: 20, height: 20, "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { width: "64", height: "64", rx: "14", fill: "#1D4ED8" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ellipse", { cx: "32", cy: "19", rx: "15", ry: "6", fill: "#FFFFFF" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M17 19v10c0 3.3 6.7 6 15 6s15-2.7 15-6V19c0 3.3-6.7 6-15 6s-15-2.7-15-6z", fill: "#FFFFFF", opacity: "0.86" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M17 33v10c0 3.3 6.7 6 15 6s15-2.7 15-6V33c0 3.3-6.7 6-15 6s-15-2.7-15-6z", fill: "#FFFFFF", opacity: "0.68" })
  ] });
}
function apply(ctx) {
  const shortcutText = ctx.locale.bind("dbWorkspace.shortcuts");
  ctx.effect(() => ctx.locale.register("dbWorkspace.shortcuts", { zh: { "open": "\u6253\u5F00\u6570\u636E\u5E93\u5DE5\u4F5C\u533A", "noSession": "\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u5BF9\u8BDD" }, en: { "open": "Open database workspace", "noSession": "Select a conversation first" } }), "dbWorkspace.shortcuts: dictionaries");
  ctx.effect(() => ctx.shortcuts.register({
    id: "db.workspace.open",
    label: () => shortcutText("open"),
    aliases: ["DB", "\u6570\u636E\u5E93", "\u6570\u636E\u5E93\u5DE5\u4F5C\u533A", "database workspace"],
    defaults: {},
    regions: ["page", "editable", "terminal"],
    modals: [],
    resolve: () => {
      const sessionId = ctx.uiSession.adapter.current.getSnapshot().key;
      if (sessionId === void 0) return { status: "blocked", reason: shortcutText("noSession") };
      return { status: "handled", run: () => {
        ctx.layout.selectPanel(null);
        let attempts = 0;
        const open = () => {
          if (ctx.uiSession.adapter.current.getSnapshot().key !== sessionId) return;
          if (ctx.sidebarRight.mounted.getSnapshot() === sessionId) {
            try {
              ctx.sidebarRight.openTab("dbWorkspace");
              return;
            } catch (error) {
              if (!(error instanceof Error) || !error.message.includes("no session surface is mounted")) throw error;
            }
          }
          if (++attempts < 120) requestAnimationFrame(open);
        };
        requestAnimationFrame(open);
      } };
    }
  }), "db.workspace.open: shortcut");
  const t = ctx.locale.bind(NS);
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), "db: dictionaries");
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: DB_PANE_ID,
    kind: DB_PANE_KIND,
    priority: "builtin",
    title: () => t("title"),
    guide: [{
      commandId: "db.workspace.open",
      order: 32,
      title: () => t("title"),
      description: () => t("description"),
      icon: DatabaseIcon
    }]
  }), "db: right sidebar");
  ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
    name: "sidebar.right.pane.tab",
    key: DB_PANE_ID,
    locale: NS,
    inject: () => ({
      runCommand: async (sessionId, command) => {
        const result = await ctx.connection.rpc.call("/api", "db-workspace/panel", { sessionId, command });
        if (!result.ok) throw new Error(result.error.message);
        const value = result.value;
        if (value === void 0) throw new Error(t("commandFailed"));
        if (value.noticeToken) {
          try {
            const notice = await ctx.remote.commands.execute(sessionId, `/db-config notify ${value.noticeToken}`, []);
            if (!notice.ok || notice.value?.result?.kind !== "success") throw new Error("notice failed");
          } catch {
            return JSON.stringify({ ...JSON.parse(value.text), notificationWarning: t("noticeFailed") });
          }
        }
        return value.text ?? "";
      }
    })
  }, DatabasePage));
}

return module.exports;}});
