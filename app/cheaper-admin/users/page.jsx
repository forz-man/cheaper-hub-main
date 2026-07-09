"use client";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
export default function AdminUsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Users</h1>
        <p className="text-gray-400">User management coming soon.</p>
      </main>
    </ProtectedRoute>
  );
}
