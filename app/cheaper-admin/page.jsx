import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold">
          Cheaper Admin
        </h1>
      </main>
    </ProtectedRoute>
  );
}