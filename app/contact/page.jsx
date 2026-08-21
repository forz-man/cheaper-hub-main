"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail, MessageSquare, MapPin, Phone, Send, CheckCircle2,
  Loader2, Megaphone, HelpCircle, Briefcase, ShieldCheck,
} from "lucide-react";

const TOPICS = [
  { id: "support", label: "Order support", icon: HelpCircle },
  { id: "selling", label: "Selling on Cheaper", icon: Briefcase },
  { id: "press", label: "Press & partnerships", icon: Megaphone },
  { id: "trust", label: "Trust & safety", icon: ShieldCheck },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [topic, setTopic] = useState("support");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name) {
      setErrorMsg("Please enter your name.");
      setStatus("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    if (!message || message.length < 5) {
      setErrorMsg("Please enter a message with at least 5 characters.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      const topicLabel = TOPICS.find((t) => t.id === topic)?.label;
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject: form.subject.trim() || topicLabel,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send message.");

      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="mb-10 text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex p-3 bg-black rounded-2xl mb-4">
            <MessageSquare size={22} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-3">Get in touch</h1>
          <p className="text-gray-400 text-sm">
            Questions about an order, selling on Cheaper, or anything else — we usually reply within one business day.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4 hover:border-black hover:shadow-lg transition-all">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <Mail size={18} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-semibold text-black mb-0.5">Email us</p>
                <a href="mailto:support@cheaper.com" className="text-xs text-gray-400 hover:text-black transition-colors">
                  support@cheaper.com
                </a>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4 hover:border-black hover:shadow-lg transition-all">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <Phone size={18} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-semibold text-black mb-0.5">Call us</p>
                <a href="tel:+12012943738" className="block text-xs text-gray-400 hover:text-black transition-colors">
                  +1 201 294 3738
                </a>
                <p className="text-xs text-gray-400 mt-0.5">Mon–Fri, 9am–6pm ET</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4 hover:border-black hover:shadow-lg transition-all">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <MapPin size={18} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-semibold text-black mb-0.5">Marketplace HQ</p>
                <p className="text-xs text-gray-400">Remote-first — sellers &amp; buyers everywhere</p>
              </div>
            </div>

            <div className="bg-black rounded-2xl p-5 mt-2">
              <p className="text-sm font-semibold text-white mb-1.5">What&apos;s this about?</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTopic(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      topic === t.id
                        ? "bg-white text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <t.icon size={12} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {status === "sent" ? (
              <motion.div
                className="flex flex-col items-center justify-center text-center py-16"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="p-4 bg-black rounded-full mb-4">
                  <CheckCircle2 size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Message sent</h3>
                <p className="text-sm text-gray-400 max-w-sm mb-6">
                  Thanks for reaching out — we&apos;ll get back to you by email soon.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="text-sm font-semibold text-black border border-gray-200 px-5 py-2.5 rounded-xl hover:border-black transition-colors"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      disabled={status === "sending"}
                      required
                      placeholder="Jane Doe"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black placeholder:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={status === "sending"}
                      required
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black placeholder:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Subject (optional)</label>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    disabled={status === "sending"}
                    placeholder={TOPICS.find((t) => t.id === topic)?.label}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black placeholder:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    disabled={status === "sending"}
                    required
                    rows={6}
                    placeholder="How can we help?"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-black placeholder:text-gray-300 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {status === "error" && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full bg-black text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Send message
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
