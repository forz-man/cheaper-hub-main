"use client";

import { loginWithGoogle, loginWithApple } from "@/lib/auth";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.93 9.546c-.02-2.017 1.648-2.99 1.723-3.037-0.94-1.373-2.4-1.561-2.917-1.578-1.242-.126-2.43.733-3.061.733-.63 0-1.604-.717-2.639-.697-1.353.02-2.607.787-3.301 1.994-1.41 2.443-.362 6.063 1.012 8.046.672.968 1.473 2.053 2.524 2.013 1.014-.04 1.396-.652 2.621-.652 1.226 0 1.571.652 2.641.63 1.09-.018 1.777-.984 2.445-1.954.773-1.12 1.09-2.21 1.107-2.267-.024-.01-2.12-.813-2.155-3.23ZM12.89 3.348c.557-.676.934-1.613.831-2.548-.804.033-1.779.536-2.355 1.21-.517.598-.97 1.556-.848 2.472.897.069 1.815-.456 2.372-1.134Z" fill="currentColor"/>
    </svg>
  );
}

export default function SocialLoginButtons() {
  const handleGoogle = async () => {
    const { error } = await loginWithGoogle();
    if (error) console.error("Google login error:", error.message);
  };

  const handleApple = async () => {
    const { error } = await loginWithApple();
    if (error) console.error("Apple login error:", error.message);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        onClick={handleGoogle}
        className="flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition"
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <button
        onClick={handleApple}
        className="flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition"
      >
        <AppleIcon />
        Continue with Apple
      </button>
    </div>
  );
}
