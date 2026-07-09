import { Inter, Hanken_Grotesk } from "next/font/google";
import MaterialSymbols from "@/components/MaterialSymbols";
import Providers from "./providers";
import { NavbarWrapper, FooterWrapper } from "@/components/ConditionalLayout";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Cheaper — Find Better Prices. Buy Smarter. Grow Faster.",
  description:
    "Compare products, suppliers, and wholesale offers from thousands of trusted businesses in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${hanken.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <MaterialSymbols />
        <Providers>
          <NavbarWrapper />
          {children}
        </Providers>
        <FooterWrapper />
      </body>
    </html>
  );
}
