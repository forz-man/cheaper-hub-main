"use client";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
export default function AdminReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Reports</h1>
        <p className="text-gray-400">Admin reports coming soon.</p>
      </main>
    </ProtectedRoute>
  );
}
