"use client";

import React from "react";
import "./globals.css";

export const metadata = {
  title: "ポッドキャスト管理画面",
  description: "RSSフィードから自動生成されたポッドキャストを管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="container">
          <header className="py-4 border-b">
            <h1 className="text-2xl font-bold">ポッドキャスト管理画面</h1>
          </header>
          <main className="py-6">{children}</main>
          <footer className="py-4 border-t text-center text-gray-500">
            <p>© 2025 Podcast Generator</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
