import { useEffect, useState } from "react";

interface Stats {
  totalFeeds: number;
  activeFeeds: number;
  totalEpisodes: number;
  lastUpdated: string;
}

interface RecentEpisode {
  id: string;
  title: string;
  createdAt: string;
  article: {
    title: string;
    link: string;
  };
  feed: {
    title: string;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEpisodes, setRecentEpisodes] = useState<RecentEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats and recent episodes in parallel
      const [statsResponse, episodesResponse] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/episodes")
      ]);

      if (!statsResponse.ok || !episodesResponse.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const statsData = await statsResponse.json();
      const episodesData = await episodesResponse.json();

      setStats(statsData);
      setRecentEpisodes(episodesData.slice(0, 5)); // Show latest 5 episodes
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  };

  const triggerBatchProcess = async () => {
    try {
      const response = await fetch("/api/batch/trigger", { method: "POST" });
      if (response.ok) {
        alert("バッチ処理を開始しました。新しいエピソードの生成には時間がかかる場合があります。");
      } else {
        alert("バッチ処理の開始に失敗しました。");
      }
    } catch (error) {
      alert("エラーが発生しました。");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラー</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span role="img" aria-hidden="true" className="text-lg">📡</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総フィード数</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalFeeds || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span role="img" aria-hidden="true" className="text-lg">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">アクティブフィード</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.activeFeeds || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span role="img" aria-hidden="true" className="text-lg">🎧</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総エピソード数</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalEpisodes || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span role="img" aria-hidden="true" className="text-lg">🕒</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">最終更新</p>
              <p className="text-sm font-semibold text-gray-900">
                {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString('ja-JP') : '未取得'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">手動バッチ実行</h3>
              <p className="text-blue-100 text-sm mt-1">
                新しい記事をすぐにチェックしてポッドキャストを生成
              </p>
            </div>
            <button
              onClick={triggerBatchProcess}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              aria-label="バッチ処理を手動実行"
            >
              実行
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">システム状態</h3>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">自動バッチ処理 (6時間間隔)</span>
              </div>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Episodes */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">最新エピソード</h3>
          <span className="text-sm text-gray-500">{recentEpisodes.length} エピソード</span>
        </div>
        
        {recentEpisodes.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span role="img" aria-hidden="true" className="text-2xl">🎧</span>
            </div>
            <p className="text-gray-500">まだエピソードがありません</p>
            <p className="text-sm text-gray-400 mt-1">フィードを追加してバッチ処理を実行してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="flex items-start space-x-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                  <span role="img" aria-hidden="true">🎵</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {episode.title}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {episode.feed?.title} • {new Date(episode.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                  {episode.article && (
                    <a
                      href={episode.article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                    >
                      元記事を見る →
                    </a>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    生成済み
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}