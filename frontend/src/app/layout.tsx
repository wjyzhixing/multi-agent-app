import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "智能体助手",
  description: "智能对话助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-neutral-50`}>
        <Sidebar />
        <main className="min-h-screen lg:ml-60">
          {children}
        </main>
      </body>
    </html>
  );
}
