var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var T = {
  zh: {
    subj: "\u8BF7\u786E\u8BA4\u8BA2\u9605\u4E9A\u6D32\u63A2\u6208\u5730\u56FE\u6D3B\u52A8\u6C47\u603B",
    body: /* @__PURE__ */ __name((l) => `\u8BF7\u572824\u5C0F\u65F6\u5185\u70B9\u51FB\u4E0B\u9762\u7684\u94FE\u63A5\u786E\u8BA4\u8BA2\u9605\uFF1A
${l}

\u5982\u679C\u4E0D\u662F\u60A8\u672C\u4EBA\u64CD\u4F5C\uFF0C\u8BF7\u5FFD\u7565\u8FD9\u5C01\u90AE\u4EF6\u3002`, "body"),
    ok: "\u8BA2\u9605\u6210\u529F\uFF01\u6BCF\u6708\u521D\u60A8\u4F1A\u6536\u5230\u6D3B\u52A8\u6C47\u603B\u3002",
    bad: "\u94FE\u63A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u8BA2\u9605\u3002",
    unsub: "\u5DF2\u9000\u8BA2\uFF0C\u60A8\u4E0D\u4F1A\u518D\u6536\u5230\u6D3B\u52A8\u6C47\u603B\u3002",
    unsubLine: "\u9000\u8BA2",
    foot: "\u968F\u65F6\u53EF\u9000\u8BA2\uFF0C\u4E0D\u4F1A\u628A\u60A8\u7684\u4FE1\u606F\u7ED9\u522B\u4EBA\u3002",
    back: "\u8FD4\u56DE\u4E9A\u6D32\u63A2\u6208\u5730\u56FE",
    home: "https://tangoweekend.org/zh/asia/"
  },
  en: {
    subj: "Confirm your Asia Tango Map subscription",
    body: /* @__PURE__ */ __name((l) => `Click this link within 24 hours to confirm:
${l}

If this wasn't you, just ignore this email.`, "body"),
    ok: "You're subscribed! Expect your first summary early next month.",
    bad: "This link is invalid or has expired. Please subscribe again.",
    unsub: "You're unsubscribed. You won't get any more summaries.",
    unsubLine: "Unsubscribe",
    foot: "Unsubscribe anytime. We never share your info.",
    back: "Back to the Asia Tango Map",
    home: "https://tangoweekend.org/asia/"
  }
};
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var DAY = 864e5;
var tok = /* @__PURE__ */ __name(() => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join(""), "tok");
var now = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var esc = /* @__PURE__ */ __name((s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]), "esc");
function cors(req, env) {
  const o = req.headers.get("Origin") || "";
  const ok = env.ALLOWED_ORIGINS.split(",").includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return ok ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" } : {};
}
__name(cors, "cors");
var json = /* @__PURE__ */ __name((d, s, h) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json", ...h } }), "json");
function page(lang, msg) {
  const t = T[lang] || T.en;
  return new Response(`<!doctype html><html lang="${lang === "zh" ? "zh-CN" : "en"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(msg)}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.1rem;color:#0a4f57;font-weight:700">${esc(msg)}</p><p><a href="${t.home}" style="color:#0e6e78">${t.back}</a></p><p style="font-size:.8rem;color:#7a6255">${t.foot}</p></div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
__name(page, "page");
async function sendVerify(env, email, lang, vtok, utok) {
  const t = T[lang];
  if (env.TEST_ONLY_RECIPIENT && email !== env.TEST_ONLY_RECIPIENT) throw new Error("recipient not allowed in test mode");
  const v = `${env.API_BASE}/verify?t=${vtok}`, u = `${env.API_BASE}/unsubscribe?t=${utok}`;
  return env.EMAIL.send({
    from: { email: env.SENDER, name: env.SENDER_NAME },
    to: email,
    subject: t.subj,
    text: `${t.body(v)}

${t.foot}
${t.unsubLine}: ${u}`,
    html: `<p>${esc(t.body("")).replace(/\n/g, "<br>")}</p><p><a href="${v}">${v}</a></p><hr><p style="font-size:12px;color:#777">${t.foot} <a href="${u}">${t.unsubLine}</a></p>`,
    headers: { "List-Unsubscribe": `<${u}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
  });
}
__name(sendVerify, "sendVerify");
async function subscribe(req, env, h) {
  let b;
  try {
    b = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, h);
  }
  const lang = b.lang === "zh" ? "zh" : "en";
  const email = String(b.email || "").trim().toLowerCase().slice(0, 254);
  const wechat = String(b.wechat || "").trim().slice(0, 64);
  if (!email && !wechat) return json({ error: "need_one" }, 400, h);
  if (email && !EMAIL_RE.test(email)) return json({ error: "bad_email" }, 400, h);
  const res = {};
  if (wechat) {
    await env.DB.prepare("INSERT INTO wechat_ids(wechat,lang,created_at) VALUES(?,?,?)").bind(wechat, lang, now()).run();
    res.wechat = "stored";
  }
  if (email) {
    const row = await env.DB.prepare("SELECT status,unsub_token FROM email_subs WHERE email=?").bind(email).first();
    if (row && row.status === "active") res.email = "sent";
    else {
      const vt = tok(), ut = row?.unsub_token || tok();
      await env.DB.prepare(`INSERT INTO email_subs(email,lang,status,verify_token,verify_expires,unsub_token,created_at) VALUES(?,?,'pending',?,?,?,?)
        ON CONFLICT(email) DO UPDATE SET lang=excluded.lang,status='pending',verify_token=excluded.verify_token,verify_expires=excluded.verify_expires`).bind(email, lang, vt, Date.now() + DAY, ut, now()).run();
      try {
        await sendVerify(env, email, lang, vt, ut);
        res.email = "sent";
      } catch (e) {
        console.log("send fail", e.message);
        return json({ ...res, error: "send_failed" }, 502, h);
      }
    }
  }
  return json({ ok: true, ...res }, 200, h);
}
__name(subscribe, "subscribe");
var src_default = {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (url.pathname === "/subscribe" && req.method === "POST") return subscribe(req, env, h);
    const t = url.searchParams.get("t") || "";
    if (url.pathname === "/verify") {
      const r = await env.DB.prepare("SELECT email,lang,verify_expires FROM email_subs WHERE verify_token=?").bind(t).first();
      if (!t || !r || r.verify_expires < Date.now()) return page(r?.lang || "en", T[r?.lang || "en"].bad);
      await env.DB.prepare("UPDATE email_subs SET status='active',verify_token=NULL,verified_at=? WHERE email=?").bind(now(), r.email).run();
      return page(r.lang, T[r.lang].ok);
    }
    if (url.pathname === "/unsubscribe") {
      const r = await env.DB.prepare("SELECT email,lang FROM email_subs WHERE unsub_token=?").bind(t).first();
      if (!t || !r) return page("en", T.en.bad);
      await env.DB.prepare("UPDATE email_subs SET status='unsubscribed',unsubscribed_at=? WHERE email=?").bind(now(), r.email).run();
      return page(r.lang, T[r.lang].unsub);
    }
    return json({ error: "not_found" }, 404, h);
  }
};

// ../../../tmp/wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../tmp/wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-gU8lQ0/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../tmp/wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-gU8lQ0/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
