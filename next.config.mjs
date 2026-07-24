/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["*.spock.replit.dev", "*.replit.dev", "*.janeway.replit.dev", "*.kirk.replit.dev", "*.picard.replit.dev", "*.riker.replit.dev", "*.worf.replit.dev", "127.0.0.1", "localhost", "localhost:5000"],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
