"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={logout}
      className="
        rounded-xl
        bg-red-500
        px-4
        py-2
        text-white
      "
    >
      Logout
    </button>
  );
}