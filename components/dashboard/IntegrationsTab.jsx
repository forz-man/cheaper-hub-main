"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, AlertCircle, RefreshCw, Trash2, Plus,
  ChevronRight, ExternalLink, Loader2, X, Eye, EyeOff,
  Clock, Zap,
} from "lucide-react";

// ── Platform definitions ──────────────────────────────────────────────────────

const PLATFORMS = {
  woocommerce: {
    label:   "WooCommerce",
    color:   "#7f54b3",
    logo:    "WC",
    desc:    "Import products from your WooCommerce store via the REST API.",
    docsUrl: "https://woocommerce.com/document/woocommerce-rest-api/",
    fields:  [
      { key: "consumer_key",    label: "Consumer Key",    type: "text",     placeholder: "ck_xxxxxxxxxxxx",         help: "Generate in WooCommerce → Settings → Advanced → REST API" },
      { key: "consumer_secret", label: "Consumer Secret", type: "password", placeholder: "cs_xxxxxxxxxxxx",         help: "Created alongside the Consumer Key" },
    ],
    storeUrlLabel:       "Store URL",
    storeUrlPlaceholder: "https://yourstore.com",
    storeUrlHelp:        "The root URL of your WordPress/WooCommerce site",
  },
  shopify: {
    label:   "Shopify",
    color:   "#96bf48",
    logo:    "SH",
    desc:    "Sync your Shopify catalogue using a private app access token.",
    docsUrl: "https://help.shopify.com/en/manual/apps/app-types/private-apps",
    fields:  [
      { key: "access_token", label: "Access Token", type: "password", placeholder: "shpat_xxxxxxxxxxxx", help: "Create a private app in Shopify → Settings → Apps → Develop apps" },
    ],
    storeUrlLabel:       "Store domain",
    storeUrlPlaceholder: "yourstore.myshopify.com",
    storeUrlHelp:        "Just the domain — no https:// needed",
  },
  wix: {
    label:   "Wix",
    color:   "#1a1a1a",
    logo:    "WX",
    desc:    "Pull products from your Wix store using API keys.",
    docsUrl: "https://dev.wix.com/api/rest/getting-started/api-keys",
    fields:  [
      { key: "api_key",  label: "API Key",  type: "password", placeholder: "IST.xxxxxxxx…", help: "Generate in Wix Dashboard → API Keys" },
      { key: "site_id",  label: "Site ID",  type: "text",     placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", help: "Found in Wix Dashboard → Settings → General Info → Site ID" },
    ],
    storeUrlLabel:       "Wix site URL",
    storeUrlPlaceholder: "https://yourname.wixsite.com/mysite",
    storeUrlHelp:        "Your published Wix site address",
  },
  wordpress: {
    label:   "WordPress",
    color:   "#21759b",
    logo:    "WP",
    desc:    "Connect WordPress (with or without WooCommerce) via Application Passwords.",
    docsUrl: "https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/",
    fields:  [
      { key: "username",     label: "WordPress username",     type: "text",     placeholder: "admin",                  help: "Your WordPress admin username" },
      { key: "app_password", label: "Application Password",   type: "password", placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx", help: "Generate in WP Admin → Users → Profile → Application Passwords" },
    ],
    storeUrlLabel:       "WordPress URL",
    storeUrlPlaceholder: "https://yoursite.com",
    storeUrlHelp:        "Root URL of your WordPress installation",
  },
};

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    connected: { icon: CheckCircle, cls: "text-emerald-700 bg-emerald-50 border-emerald-100", label: "Connected" },
    error:     { icon: AlertCircle, cls: "text-red-700 bg-red-50 border-red-100",             label: "Error"     },
    syncing:   { icon: Loader2,     cls: "text-blue-700 bg-blue-50 border-blue-100",           label: "Syncing"   },
    pending:   { icon: Clock,       cls: "text-gray-500 bg-gray-50 border-gray-200",           label: "Pending"   },
  };
  const { icon: Icon, cls, label } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon size={10} className={status === "syncing" ? "animate-spin" : ""} />
      {label}
    </span>
  );
}

// ── Connect modal ─────────────────────────────────────────────────────────────

function ConnectModal({ platformKey, onClose, onConnected }) {
  const platform = PLATFORMS[platformKey];
  const [storeUrl,    setStoreUrl]    = useState("");
  const [creds,       setCreds]       = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const toggleShow = key =>
    setShowSecrets(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ platform: platformKey, store_url: storeUrl, credentials: creds }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Connection failed"); setLoading(false); return; }
      onConnected(data);
      onClose();
    } catch (e) {
      setError("Network error — please try again");
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div className="h-1" style={{ backgroundColor: platform.color }} />

        <div className="p-6">
          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center shadow-md"
                style={{ backgroundColor: platform.color }}>
                {platform.logo}
              </div>
              <div>
                <div className="font-bold text-black text-sm">Connect {platform.label}</div>
                <a href={platform.docsUrl} target="_blank" rel="noreferrer"
                  className="text-[10px] text-gray-400 hover:text-black flex items-center gap-0.5 transition-colors">
                  View setup guide <ExternalLink size={9} className="ml-0.5" />
                </a>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-gray-300 hover:text-black transition-colors rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-5 leading-relaxed">{platform.desc}</p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Store URL */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                {platform.storeUrlLabel} <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={e => setStoreUrl(e.target.value)}
                placeholder={platform.storeUrlPlaceholder}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all text-black placeholder:text-gray-300"
              />
              <p className="text-[10px] text-gray-400 mt-1">{platform.storeUrlHelp}</p>
            </div>

            {/* Credential fields */}
            {platform.fields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  {f.label} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={f.type === "password" && !showSecrets[f.key] ? "password" : "text"}
                    value={creds[f.key] || ""}
                    onChange={e => setCreds(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all text-black placeholder:text-gray-300 pr-10"
                  />
                  {f.type === "password" && (
                    <button type="button" onClick={() => toggleShow(f.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                      {showSecrets[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{f.help}</p>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Testing connection…</> : <>Connect {platform.label} <ChevronRight size={14} /></>}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Connected store card ──────────────────────────────────────────────────────

function StoreCard({ conn, onDisconnect, onSync }) {
  const platform = PLATFORMS[conn.platform];
  const isSyncing = conn.status === "syncing";

  return (
    <motion.div variants={fadeUp}
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: platform?.color ?? "#555" }}>
            {platform?.logo ?? conn.platform[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black text-sm truncate">{platform?.label ?? conn.platform}</div>
            <div className="text-[11px] text-gray-400 truncate max-w-[200px]">{conn.store_url}</div>
          </div>
        </div>
        <StatusBadge status={conn.status} />
      </div>

      {conn.status === "error" && conn.error_message && (
        <div className="mb-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-[11px] text-red-700">
          {conn.error_message}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-4">
        {conn.product_count > 0 && (
          <span className="flex items-center gap-1">
            <Zap size={10} className="text-gray-300" />
            {conn.product_count} products synced
          </span>
        )}
        {conn.last_synced_at && (
          <>
            {conn.product_count > 0 && <span>·</span>}
            <span>Last sync {new Date(conn.last_synced_at).toLocaleDateString()}</span>
          </>
        )}
        {!conn.last_synced_at && !conn.product_count && (
          <span>Never synced</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onSync(conn)}
          disabled={isSyncing}
          className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing…" : "Sync products"}
        </button>
        <button
          onClick={() => onDisconnect(conn)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 border border-gray-200 px-4 py-2 rounded-xl hover:border-red-200 hover:text-red-600 transition-all"
        >
          <Trash2 size={12} />
          Disconnect
        </button>
      </div>
    </motion.div>
  );
}

// ── Add platform card ─────────────────────────────────────────────────────────

function AddPlatformCard({ platformKey, onConnect, alreadyConnected }) {
  const platform = PLATFORMS[platformKey];
  return (
    <motion.div variants={fadeUp}
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center shadow-sm"
            style={{ backgroundColor: platform.color }}>
            {platform.logo}
          </div>
          <div>
            <div className="font-semibold text-black text-sm">{platform.label}</div>
            {alreadyConnected && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">Connected</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onConnect(platformKey)}
          className="text-xs font-semibold px-4 py-2 rounded-xl border transition-all duration-200 bg-black text-white border-black hover:bg-gray-800 flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus size={12} /> Connect
        </button>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{platform.desc}</p>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IntegrationsTab({ openAddProduct }) {
  const [connections, setConnections] = useState([]);
  const [loadingConns, setLoadingConns] = useState(true);
  const [connectModal, setConnectModal] = useState(null); // platformKey | null
  const [syncResult,   setSyncResult]   = useState(null); // { id, message }
  const [disconnecting, setDisconnecting] = useState(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setConnections(d); })
      .catch(() => {})
      .finally(() => setLoadingConns(false));
  }, []);

  const handleConnected = newConn => {
    setConnections(prev => {
      const exists = prev.find(c => c.id === newConn.id);
      return exists ? prev.map(c => c.id === newConn.id ? newConn : c) : [newConn, ...prev];
    });
    setSyncResult({ id: newConn.id, message: "✓ Store connected. Click \u201cSync products\u201d to import your catalogue." });
    setTimeout(() => setSyncResult(null), 6000);
  };

  const handleSync = async conn => {
    setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, status: "syncing" } : c));
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ connection_id: conn.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, status: "error", error_message: data.message } : c));
        setSyncResult({ id: conn.id, message: `Sync failed: ${data.message}`, error: true });
      } else {
        setConnections(prev => prev.map(c => c.id === conn.id
          ? { ...c, status: "connected", product_count: data.total, last_synced_at: new Date().toISOString(), error_message: null }
          : c));
        setSyncResult({ id: conn.id, message: `✓ Synced ${data.total} products successfully.` });
        setTimeout(() => setSyncResult(null), 5000);
      }
    } catch {
      setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, status: "error", error_message: "Network error" } : c));
    }
  };

  const handleDisconnect = async conn => {
    if (!confirm(`Disconnect ${PLATFORMS[conn.platform]?.label ?? conn.platform}? This won't delete synced products.`)) return;
    setDisconnecting(conn.id);
    try {
      await fetch(`/api/integrations/${conn.id}`, { method: "DELETE" });
      setConnections(prev => prev.filter(c => c.id !== conn.id));
    } catch { /* ignore */ }
    setDisconnecting(null);
  };

  const connectedPlatforms = new Set(connections.map(c => c.platform));
  const unconnectedPlatforms = Object.keys(PLATFORMS).filter(k => !connectedPlatforms.has(k));

  return (
    <>
      {/* Connected stores */}
      {loadingConns ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading connections…
        </div>
      ) : connections.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Connected stores</h3>
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid sm:grid-cols-2 gap-4">
            {connections.map(conn => (
              <StoreCard
                key={conn.id}
                conn={conn}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            ))}
          </motion.div>

          {/* Sync result toast */}
          <AnimatePresence>
            {syncResult && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border ${
                  syncResult.error
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                {syncResult.error ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
                {syncResult.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Available platforms to connect */}
      {unconnectedPlatforms.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {connections.length > 0 ? "Add another store" : "Connect your store"}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Link your existing store to automatically import and sync your product catalogue.
          </p>
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid sm:grid-cols-2 gap-4">
            {unconnectedPlatforms.map(k => (
              <AddPlatformCard
                key={k}
                platformKey={k}
                alreadyConnected={connectedPlatforms.has(k)}
                onConnect={setConnectModal}
              />
            ))}
          </motion.div>
        </div>
      )}

      {/* Manual upload */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Plus size={18} className="text-gray-400" />
          </div>
          <div>
            <div className="font-semibold text-black text-sm">Manual upload</div>
            <div className="text-xs text-gray-400 mt-0.5">Don't have an integrated store? Add products one by one or import via CSV.</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openAddProduct}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-800 transition-all"
          >
            <Plus size={14} /> Add single product
          </button>
          <button className="flex items-center gap-2 bg-white text-black border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-gray-400 transition-all">
            Import CSV
          </button>
        </div>
      </div>

      {/* Connect modal */}
      <AnimatePresence>
        {connectModal && (
          <ConnectModal
            platformKey={connectModal}
            onClose={() => setConnectModal(null)}
            onConnected={handleConnected}
          />
        )}
      </AnimatePresence>
    </>
  );
}
