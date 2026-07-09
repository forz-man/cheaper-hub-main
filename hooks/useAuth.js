"use client";

// Thin wrapper so all existing imports (hooks/useAuth) keep working.
// Auth state lives in AuthProvider — no per-component getUser() calls.
import { useAuth as _useAuth } from "@/lib/auth-context";

export default function useAuth() {
  return _useAuth();
}
