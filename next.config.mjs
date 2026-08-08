/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["*.spock.replit.dev", "*.replit.dev", "*.janeway.replit.dev", "*.kirk.replit.dev", "*.picard.replit.dev", "*.riker.replit.dev", "*.worf.replit.dev", "127.0.0.1", "localhost", "localhost:3000", "127.0.0.1:3000", "localhost:5000", "localhost:5001", "127.0.0.1:5001", "*.localtunnel.me", "*.trycloudflare.com", "*.serveo.net", "*.serveousercontent.com", "*.pinggy.net", "*.pinggy-free.link", "*.lhr.life", "*.localhost.run", "*.lhr.rocks"],
  devIndicators: {
    appIsrStatus: false,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
  },
};

export default nextConfig;
