import { useState } from "react";
import "./app/globals.css";
import Dashboard from "./components/Dashboard";
import EpisodePlayer from "./components/EpisodePlayer";
import FeedManager from "./components/FeedManager";

type TabType = "dashboard" | "episodes" | "feeds";

interface Tab {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

const tabs: Tab[] = [
  {
    id: "dashboard",
    label: "ダッシュボード",
    icon: "📊",
    description: "システム概要と最新情報",
  },
  {
    id: "episodes",
    label: "エピソード",
    icon: "🎧",
    description: "ポッドキャスト再生と管理",
  },
  {
    id: "feeds",
    label: "フィード管理",
    icon: "📡",
    description: "RSSフィードの設定",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);

  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Voice RSS Summary - AI音声ポッドキャスト生成システム</title>
        <meta
          name="description"
          content="RSSフィードから自動生成された音声ポッドキャストをご紹介します。"
        />
      </head>
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                {/* Status and Mobile Menu */}
                <div className="flex items-center space-x-4">
                  {/* System Status */}
                  <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">稼働中</span>
                  </div>

                  {/* Mobile menu button */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="メニューを開く"
                  ></button>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav
            className={`bg-white border-b border-gray-200 ${isMenuOpen ? "block" : "hidden md:block"}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center space-x-3 py-3 px-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900 border-b-2 border-transparent"
                    }`}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                  >
                    <span role="img" aria-hidden="true">
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {activeTab === "dashboard" && <Dashboard />}
              {activeTab === "episodes" && <EpisodePlayer />}
              {activeTab === "feeds" && <FeedManager />}
            </div>
          </main>

          {/* Footer */}
          <footer className="mt-auto bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  © 2025 Voice RSS Summary. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
