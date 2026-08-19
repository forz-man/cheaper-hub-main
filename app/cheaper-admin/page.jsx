import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <main className="min-h-screen bg-black p-8 pt-24 text-white">
        <h1 className="text-3xl font-bold">
          Cheaper Admin
        </h1>
      </main>
    </ProtectedRoute>
  );
}