"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, Trash2, Loader2, CheckCircle2,
  AlertTriangle, ExternalLink, X, ChevronRight, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Platform definitions ───────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "woocommerce",
    name: "WooCommerce",
    color: "#7f54b3",
    tagline: "WordPress e-commerce plugin",
    storeUrlLabel: "Store URL",
    storeUrlPlaceholder: "https://yourstore.com",
    fields: [
      { name: "consumer_key",    label: "Consumer Key",    placeholder: "ck_...",  type: "text"     },
      { name: "consumer_secret", label: "Consumer Secret", placeholder: "cs_...",  type: "password" },
    ],
    helpText: "WooCommerce → Settings → Advanced → REST API",
    helpUrl:  "https://woo.com/document/woocommerce-rest-api/",
  },
  {
    id: "shopify",
    name: "Shopify",
    color: "#96bf48",
    tagline: "Leading hosted storefront",
    storeUrlLabel: "Store domain",
    storeUrlPlaceholder: "yourstore.myshopify.com",
    fields: [
      { name: "access_token", label: "Admin API Access Token", placeholder: "shpat_...", type: "password" },
    ],
    helpText: "Shopify Admin → Apps → Develop apps → Create a private app",
    helpUrl:  "https://help.shopify.com/en/manual/apps/app-types/private-apps",
  },
  {
    id: "wix",
    name: "Wix",
    color: "#1a1a1a",
    tagline: "Wix Stores",
    storeUrlLabel: null,
    fields: [
      { name: "api_key", label: "API Key",  placeholder: "Your Wix API key",  type: "password" },
      { name: "site_id", label: "Site ID",  placeholder: "Your Wix site ID",  type: "text"     },
    ],
    helpText: "Wix Developer Center → API Keys",
    helpUrl:  "https://dev.wix.com/docs/rest/articles/getting-started/api-keys",
  },
  {
    id: "wordpress",
    name: "WordPress",
    color: "#21759b",
    tagline: "WooCommerce or custom CPTs",
    storeUrlLabel: "Site URL",
    storeUrlPlaceholder: "https://yoursite.com",
    fields: [
      { name: "username",     label: "WP Username",             placeholder: "admin",           type: "text"     },
      { name: "app_password", label: "Application Password",    placeholder: "xxxx xxxx xxxx",  type: "password" },
    ],
    helpText: "Users → Profile → Application Passwords (WP 5.6+)",
    helpUrl:  "https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/",
    note: "Has WooCommerce? Add its REST API keys too for richer product data.",
    extraFields: [
      { name: "consumer_key",    label: "WooCommerce Consumer Key (optional)",    placeholder: "ck_...", type: "text"     },
      { name: "consumer_secret", label: "WooCommerce Consumer Secret (optional)", placeholder: "cs_...", type: "password" },
    ],
  },
  {
    id: "etsy",
    name: "Etsy",
    color: "#f56400",
    tagline: "Handmade & vintage marketplace",
    storeUrlLabel: null,
    fields: [
      { name: "api_key", label: "API Key (keystring)", placeholder: "Your Etsy API key", type: "password" },
      { name: "shop_id", label: "Shop Name or ID",     placeholder: "MyShopName or 12345678", type: "text" },
    ],
    helpText: "Create an app at etsy.com/developers to get your keystring",
    helpUrl:  "https://www.etsy.com/developers/register",
  },
  {
    id: "squarespace",
    name: "Squarespace",
    color: "#111111",
    tagline: "All-in-one website builder",
    storeUrlLabel: "Site URL",
    storeUrlPlaceholder: "https://yoursite.squarespace.com",
    fields: [
      { name: "api_key", label: "Commerce API Key", placeholder: "Your Squarespace API key", type: "password" },
    ],
    helpText: "Settings → Advanced → API Keys → Generate Key (enable Store Catalog)",
    helpUrl:  "https://developers.squarespace.com/commerce-apis/authentication-and-rate-limits",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    color: "#34313f",
    tagline: "Enterprise e-commerce platform",
    storeUrlLabel: null,
    fields: [
      { name: "store_hash",   label: "Store Hash",    placeholder: "abc123xyz",           type: "text"     },
      { name: "client_id",    label: "Client ID",     placeholder: "Your API client ID",  type: "text"     },
      { name: "access_token", label: "Access Token",  placeholder: "Your access token",   type: "password" },
    ],
    helpText: "Advanced Settings → API Accounts → Create API account",
    helpUrl:  "https://developer.bigcommerce.com/docs/rest-management/authentication/api-accounts",
  },
  {
    id: "prestashop",
    name: "PrestaShop",
    color: "#df0067",
    tagline: "Open-source e-commerce",
    storeUrlLabel: "Store URL",
    storeUrlPlaceholder: "https://yourstore.com",
    fields: [
      { name: "api_key", label: "Webservice Key", placeholder: "Your PrestaShop key", type: "password" },
    ],
    helpText: "Advanced Parameters → Webservice → Add new key",
    helpUrl:  "https://devdocs.prestashop-project.org/8/webservice/tutorials/creating-access/",
  },
  {
    id: "magento2",
    name: "Magento 2",
    color: "#f26322",
    tagline: "Adobe Commerce platform",
    storeUrlLabel: "Store URL",
    storeUrlPlaceholder: "https://yourstore.com",
    fields: [
      { name: "access_token", label: "Admin Access Token", placeholder: "Your integration token", type: "password" },
    ],
    helpText: "System → Integrations → Add integration → grant Catalog resources",
    helpUrl:  "https://developer.adobe.com/commerce/webapi/rest/tutorials/prerequisite-tasks/",
  },
  {
    id: "ecwid",
    name: "Ecwid",
    color: "#0076ff",
    tagline: "E-commerce for any website",
    storeUrlLabel: "Your website URL (optional)",
    storeUrlPlaceholder: "https://yourwebsite.com",
    fields: [
      { name: "store_id",     label: "Store ID",      placeholder: "12345678",          type: "text"     },
      { name: "secret_token", label: "Secret Token",  placeholder: "Your secret token", type: "password" },
    ],
    helpText: "Ecwid Control Panel → Apps → Legacy API keys",
    helpUrl:  "https://support.ecwid.com/hc/en-us/articles/207808285-Ecwid-REST-API-introduction",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

const stagger = {
  hidden:   { opacity: 0 },
  visible:  { opacity: 1, transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(ts) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntegrationsTab({ onAddProduct }) {
  const [connections, setConnections]         = useState([]);
  const [loading, setLoading]                 = useState(true);

  // Connect modal state
  const [modal, setModal]                     = useState(null); // platform object or null
  const [storeUrl, setStoreUrl]               = useState("");
  const [creds, setCreds]                     = useState({});
  const [showExtra, setShowExtra]             = useState(false);
  const [connectStep, setConnectStep]         = useState("idle"); // idle | connecting | syncing | done | error
  const [connectError, setConnectError]       = useState(null);
  const [syncResult, setSyncResult]           = useState(null); // { imported, total }

  // Per-connection sync state
  const [syncing, setSyncing]                 = useState({}); // { [connectionId]: bool }
  const [syncErrors, setSyncErrors]           = useState({}); // { [connectionId]: string }
  const [syncResults, setSyncResults]         = useState({}); // { [connectionId]: { imported, total } }

  // Disconnect
  const [disconnecting, setDisconnecting]     = useState({}); // { [connectionId]: bool }

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) setConnections(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  // ── Open connect modal ───────────────────────────────────────────────────────
  const openModal = (platform) => {
    setModal(platform);
    setStoreUrl("");
    setCreds({});
    setShowExtra(false);
    setConnectStep("idle");
    setConnectError(null);
    setSyncResult(null);
  };

  const closeModal = () => {
    if (connectStep === "connecting" || connectStep === "syncing") return;
    setModal(null);
  };

  // ── Save & connect ───────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!modal) return;
    setConnectStep("connecting");
    setConnectError(null);

    // Auto-generate store_url for platforms that don't have one
    let resolvedUrl = storeUrl.trim();
    if (!modal.storeUrlLabel) {
      if (modal.id === "etsy")        resolvedUrl = `https://www.etsy.com/shop/${creds.shop_id || "shop"}`;
      else if (modal.id === "wix")    resolvedUrl = "https://manage.wix.com";
      else if (modal.id === "bigcommerce") resolvedUrl = `https://${creds.store_hash || "store"}.mybigcommerce.com`;
      else if (modal.id === "ecwid")  resolvedUrl = `https://app.ecwid.com/store/${creds.store_id || "store"}`;
      else                            resolvedUrl = `https://api.${modal.id}.com`;
    }

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: modal.id, store_url: resolvedUrl, credentials: creds }),
      });
      const data = await res.json();
      if (!res.ok) { setConnectStep("error"); setConnectError(data.message || "Failed to connect"); return; }

      // Connection saved — now sync
      setConnectStep("syncing");
      const syncRes = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: data.id }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) { setConnectStep("error"); setConnectError(syncData.message || "Connected but sync failed"); return; }

      setSyncResult({ imported: syncData.imported, total: syncData.total });
      setConnectStep("done");
      await loadConnections();
    } catch (e) {
      setConnectStep("error");
      setConnectError(e.message || "Network error");
    }
  };

  // ── Sync an existing connection ──────────────────────────────────────────────
  const handleSync = async (conn) => {
    setSyncing(prev => ({ ...prev, [conn.id]: true }));
    setSyncErrors(prev => { const n = { ...prev }; delete n[conn.id]; return n; });
    setSyncResults(prev => { const n = { ...prev }; delete n[conn.id]; return n; });

    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: conn.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncErrors(prev => ({ ...prev, [conn.id]: data.message || "Sync failed" }));
      } else {
        setSyncResults(prev => ({ ...prev, [conn.id]: { imported: data.imported, total: data.total } }));
        await loadConnections();
      }
    } catch (e) {
      setSyncErrors(prev => ({ ...prev, [conn.id]: e.message || "Network error" }));
    } finally {
      setSyncing(prev => { const n = { ...prev }; delete n[conn.id]; return n; });
    }
  };

  // ── Disconnect ───────────────────────────────────────────────────────────────
  const handleDisconnect = async (conn) => {
    if (!confirm(`Disconnect ${conn.platform}? This won't remove already-synced products.`)) return;
    setDisconnecting(prev => ({ ...prev, [conn.id]: true }));
    try {
      await fetch(`/api/integrations/${conn.id}`, { method: "DELETE" });
      setConnections(prev => prev.filter(c => c.id !== conn.id));
    } finally {
      setDisconnecting(prev => { const n = { ...prev }; delete n[conn.id]; return n; });
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const connFor = (platformId) => connections.find(c => c.platform === platformId);

  return (
    <div>
      <p className="text-sm text-gray-400 mb-6">
        Connect your existing store to automatically import and sync your products to Cheaper.
      </p>

      {/* Platform grid */}
      <motion.div
        variants={stagger} initial="hidden" animate="visible"
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        {PLATFORMS.map((platform) => {
          const conn = connFor(platform.id);
          const isSyncing     = conn && syncing[conn.id];
          const syncErr       = conn && syncErrors[conn.id];
          const syncRes       = conn && syncResults[conn.id];
          const isDisconnecting = conn && disconnecting[conn.id];

          return (
            <motion.div key={platform.id} variants={fadeUp}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md hover:shadow-black/5 transition-all duration-300 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-black text-sm leading-tight">{platform.name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{platform.tagline}</div>
                  </div>
                </div>
                {conn ? (
                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      conn.status === "error" ? "bg-red-500" :
                      conn.status === "syncing" || isSyncing ? "bg-amber-400 animate-pulse" :
                      "bg-emerald-500"
                    }`} />
                    <span className={`text-[10px] font-medium ${
                      conn.status === "error" ? "text-red-600" :
                      conn.status === "syncing" || isSyncing ? "text-amber-600" :
                      "text-emerald-600"
                    }`}>
                      {isSyncing ? "Syncing…" : conn.status === "error" ? "Error" : conn.status === "syncing" ? "Syncing…" : "Connected"}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Connected details */}
              {conn && (
                <div className="text-[11px] text-gray-400 space-y-0.5">
                  {conn.product_count > 0 && (
                    <div><span className="font-semibold text-black">{conn.product_count}</span> products synced</div>
                  )}
                  {conn.last_synced_at && (
                    <div>Last synced {relativeTime(conn.last_synced_at)}</div>
                  )}
                  {conn.store_url && !conn.store_url.includes("manage.wix") && !conn.store_url.includes("mybigcommerce") && !conn.store_url.includes("app.ecwid") && !conn.store_url.includes("etsy.com/shop") && (
                    <a href={conn.store_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-400 hover:text-black transition-colors">
                      <ExternalLink size={10} />{conn.store_url.replace(/^https?:\/\//, "").slice(0, 30)}
                    </a>
                  )}
                </div>
              )}

              {/* Sync result */}
              {syncRes && (
                <div className="text-[11px] bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 text-emerald-700">
                  ✓ Synced {syncRes.imported} of {syncRes.total} products
                </div>
              )}
              {syncErr && (
                <div className="text-[11px] bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 text-red-700">
                  {syncErr}
                </div>
              )}

              {/* Actions */}
              {conn ? (
                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    onClick={() => handleSync(conn)}
                    disabled={isSyncing || isDisconnecting}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-black text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                  >
                    {isSyncing
                      ? <><Loader2 size={12} className="animate-spin" /> Syncing…</>
                      : <><RefreshCw size={12} /> Sync now</>
                    }
                  </button>
                  <button
                    onClick={() => handleDisconnect(conn)}
                    disabled={isSyncing || isDisconnecting}
                    className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Disconnect"
                  >
                    {isDisconnecting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openModal(platform)}
                  className="mt-auto pt-1 w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-black text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <Plus size={12} /> Connect
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Manual upload card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Upload size={18} className="text-gray-400" />
          </div>
          <div>
            <div className="font-semibold text-black text-sm">Manual upload</div>
            <div className="text-xs text-gray-400 mt-0.5">Don&apos;t have an integrated store? Add products directly.</div>
          </div>
        </div>
        <button
          onClick={onAddProduct}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} /> Add single product
        </button>
      </div>

      {/* ── Connect modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: modal.color }}>
                    {modal.name[0]}
                  </div>
                  <h2 className="font-bold text-black text-base">Connect {modal.name}</h2>
                </div>
                <button onClick={closeModal} disabled={connectStep === "connecting" || connectStep === "syncing"}
                  className="text-gray-400 hover:text-black transition-colors disabled:opacity-40">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">

                {/* Done state */}
                {connectStep === "done" ? (
                  <div className="flex flex-col items-center py-6 gap-3">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 size={28} className="text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-black">{modal.name} connected!</p>
                      {syncResult && (
                        <p className="text-sm text-gray-500 mt-1">
                          Imported <span className="font-semibold text-black">{syncResult.imported}</span> of <span className="font-semibold text-black">{syncResult.total}</span> products
                        </p>
                      )}
                    </div>
                    <button onClick={() => setModal(null)}
                      className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors mt-2">
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Help text */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-3 flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-500">{modal.helpText}</p>
                      <a href={modal.helpUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-black hover:underline flex items-center gap-0.5 flex-shrink-0">
                        Guide <ChevronRight size={11} />
                      </a>
                    </div>

                    {/* Note (WordPress) */}
                    {modal.note && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 text-xs text-amber-700">
                        {modal.note}
                      </div>
                    )}

                    {/* Error */}
                    {(connectStep === "error" && connectError) && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                        <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{connectError}</p>
                      </div>
                    )}

                    {/* Store URL field */}
                    {modal.storeUrlLabel && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                          {modal.storeUrlLabel} <span className="text-red-400">*</span>
                        </label>
                        <input
                          value={storeUrl}
                          onChange={(e) => setStoreUrl(e.target.value)}
                          placeholder={modal.storeUrlPlaceholder}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                          disabled={connectStep === "connecting" || connectStep === "syncing"}
                        />
                      </div>
                    )}

                    {/* Credential fields */}
                    {modal.fields.map((field) => (
                      <div key={field.name}>
                        <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                          {field.label} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type={field.type}
                          value={creds[field.name] || ""}
                          onChange={(e) => setCreds(prev => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={field.placeholder}
                          autoComplete="off"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                          disabled={connectStep === "connecting" || connectStep === "syncing"}
                        />
                      </div>
                    ))}

                    {/* Extra fields (e.g. WooCommerce keys on WP) */}
                    {modal.extraFields && (
                      <>
                        <button
                          onClick={() => setShowExtra(v => !v)}
                          className="text-xs font-semibold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                        >
                          <ChevronRight size={12} className={`transition-transform ${showExtra ? "rotate-90" : ""}`} />
                          {showExtra ? "Hide" : "Add"} WooCommerce keys (optional)
                        </button>
                        {showExtra && modal.extraFields.map((field) => (
                          <div key={field.name}>
                            <label className="text-xs font-semibold text-gray-500 block mb-1.5">{field.label}</label>
                            <input
                              type={field.type}
                              value={creds[field.name] || ""}
                              onChange={(e) => setCreds(prev => ({ ...prev, [field.name]: e.target.value }))}
                              placeholder={field.placeholder}
                              autoComplete="off"
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black"
                              disabled={connectStep === "connecting" || connectStep === "syncing"}
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Footer buttons */}
              {connectStep !== "done" && (
                <div className="flex gap-3 p-5 border-t border-gray-200 flex-shrink-0">
                  <button
                    onClick={closeModal}
                    disabled={connectStep === "connecting" || connectStep === "syncing"}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-400 transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={
                      connectStep === "connecting" ||
                      connectStep === "syncing" ||
                      (modal.storeUrlLabel && !storeUrl.trim()) ||
                      modal.fields.some(f => !creds[f.name]?.trim())
                    }
                    className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {connectStep === "connecting" ? (
                      <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                    ) : connectStep === "syncing" ? (
                      <><Loader2 size={14} className="animate-spin" /> Syncing products…</>
                    ) : (
                      "Save & connect"
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
