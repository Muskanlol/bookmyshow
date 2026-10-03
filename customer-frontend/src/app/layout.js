import { Poppins } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "BookMyShow",
  description: "Book movie tickets in your city.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.className} h-full antialiased`}>
      <body className="min-h-full bg-[#f5f5f5] text-ink">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
