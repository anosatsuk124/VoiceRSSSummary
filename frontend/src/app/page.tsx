import { useState } from "react";
import FeedManager from "../components/FeedManager";
import EpisodePlayer from "../components/EpisodePlayer";
import Dashboard from "../components/Dashboard";
import React from "react";

export const metadata = {
  title: "Voice RSS Summary",
  description:
    "RSSフィードから自動生成された音声ポッドキャストをご紹介します。",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "episodes" | "feeds"
  >("dashboard");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-effect border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Voice RSS Summary
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  AI音声ポッドキャスト自動生成システム
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-3 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                <span className="text-sm font-semibold text-green-700">
                  システム稼働中
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="glass-effect border-b border-white/20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2">
            {[
              { id: "dashboard", label: "ダッシュボード", icon: "📊" },
              { id: "episodes", label: "エピソード", icon: "🎧" },
              { id: "feeds", label: "フィード管理", icon: "📡" },
            ].map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center space-x-3 py-4 px-6 font-semibold text-sm rounded-t-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.id
                    ? "bg-white text-slate-800 shadow-lg border-b-2 border-transparent"
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                <span
                  className="text-lg animate-fadeIn"
                  role="img"
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                <span className="animate-slideIn">{tab.label}</span>
                {activeTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full"
                    style={{ background: "var(--gradient-primary)" }}
                  ></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {activeTab === "dashboard" && (
            <div className="animate-fadeIn">
              <Dashboard />
            </div>
          )}
          {activeTab === "episodes" && (
            <div className="glass-effect rounded-3xl shadow-2xl p-8 border border-white/20 animate-fadeIn">
              <div className="flex items-center space-x-4 mb-8">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                  }}
                >
                  <span role="img" aria-hidden="true" className="text-2xl">
                    🎧
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    エピソード管理
                  </h2>
                  <p className="text-slate-600 text-sm">
                    ポッドキャストエピソードの再生と管理
                  </p>
                </div>
              </div>
              <EpisodePlayer />
            </div>
          )}
          {activeTab === "feeds" && (
            <div className="glass-effect rounded-3xl shadow-2xl p-8 border border-white/20 animate-fadeIn">
              <div className="flex items-center space-x-4 mb-8">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  }}
                >
                  <span role="img" aria-hidden="true" className="text-2xl">
                    📡
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    フィード管理
                  </h2>
                  <p className="text-slate-600 text-sm">
                    RSSフィードの追加と管理
                  </p>
                </div>
              </div>
              <FeedManager />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 relative">
        <div className="glass-effect border-t border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--gradient-primary)" }}
                ></div>
                <span className="text-lg font-bold gradient-text">
                  Voice RSS Summary
                </span>
              </div>
              <p className="text-slate-600 text-sm font-medium max-w-2xl mx-auto leading-relaxed">
                AI技術により最新のニュースを音声でお届けします。
                <br />
                自動化されたポッドキャスト生成で、いつでもどこでも情報をキャッチアップ。
              </p>
              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-slate-500 text-xs">
                  © 2025 Voice RSS Summary. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
