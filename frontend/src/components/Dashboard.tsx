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
        fetch("/api/episodes"),
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
        alert(
          "バッチ処理を開始しました。新しいエピソードの生成には時間がかかる場合があります。",
        );
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総フィード数</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats?.totalFeeds || 0}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-blue-600">
              <span className="text-sm">📡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                アクティブフィード
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats?.activeFeeds || 0}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-green-600">
              <span className="text-sm">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                総エピソード数
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats?.totalEpisodes || 0}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-purple-600">
              <span className="text-sm">🎧</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">最終更新</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {stats?.lastUpdated
                  ? new Date(stats.lastUpdated).toLocaleDateString("ja-JP")
                  : "未取得"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-orange-600">
              <span className="text-sm">🕒</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Batch Execution */}
        <div className="bg-blue-600 rounded-lg shadow p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">手動バッチ実行</h3>
          <p className="text-blue-100 text-sm mb-4">
            新しい記事をすぐにチェックしてポッドキャストを生成します。
          </p>
          <button
            onClick={triggerBatchProcess}
            className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            実行
          </button>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            システム状態
          </h3>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <span className="text-sm font-medium text-green-800">
                  自動バッチ処理
                </span>
                <p className="text-xs text-green-600">6時間間隔で実行中</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <span className="text-sm font-medium text-blue-800">
                  AI音声生成
                </span>
                <p className="text-xs text-blue-600">VOICEVOX連携済み</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Episodes */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              最新エピソード
            </h3>
            <span className="text-sm text-gray-500">
              {recentEpisodes.length} エピソード
            </span>
          </div>
        </div>

        <div className="p-6">
          {recentEpisodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎧</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                まだエピソードがありません
              </h4>
              <p className="text-gray-500">
                フィードを追加してバッチ処理を実行してください。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">🎵</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {episode.title}
                    </h4>

                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>{episode.feed?.title}</span>
                      <span>•</span>
                      <span>
                        {new Date(episode.createdAt).toLocaleDateString(
                          "ja-JP",
                        )}
                      </span>
                    </div>

                    {episode.article && (
                      <a
                        href={episode.article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                      >
                        <span>元記事を読む</span>
                      </a>
                    )}
                  </div>

                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    生成済み
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
