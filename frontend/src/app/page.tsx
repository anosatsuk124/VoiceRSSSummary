import { useState } from "react";
import FeedManager from "../components/FeedManager";
import EpisodePlayer from "../components/EpisodePlayer";
import Dashboard from "../components/Dashboard";

export const metadata = {
  title: "Voice RSS Summary",
  description: "RSSフィードから自動生成された音声ポッドキャストをご紹介します。",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'episodes' | 'feeds'>('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0 3 3 0 00-6 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Voice RSS Summary</h1>
                <p className="text-sm text-gray-600">AI音声ポッドキャスト自動生成システム</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>システム稼働中</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
              { id: 'episodes', label: 'エピソード', icon: '🎧' },
              { id: 'feeds', label: 'フィード管理', icon: '📡' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <span role="img" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'episodes' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span role="img" aria-hidden="true" className="text-lg">🎧</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">エピソード管理</h2>
              </div>
              <EpisodePlayer />
            </div>
          )}
          {activeTab === 'feeds' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span role="img" aria-hidden="true" className="text-lg">📡</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">フィード管理</h2>
              </div>
              <FeedManager />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2025 Voice RSS Summary. AI技術により最新のニュースを音声でお届けします。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}