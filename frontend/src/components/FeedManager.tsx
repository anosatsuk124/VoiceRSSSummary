import { useEffect, useState } from "react";

interface Feed {
  id: string;
  url: string;
  title?: string;
  description?: string;
  lastUpdated?: string;
  createdAt: string;
  active: boolean;
}

export default function FeedManager() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [addingFeed, setAddingFeed] = useState(false);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/feeds");
      if (!response.ok) {
        throw new Error("フィードの取得に失敗しました");
      }
      const data = await response.json();
      setFeeds(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFeedUrl.trim()) {
      alert("フィードURLを入力してください");
      return;
    }

    if (!newFeedUrl.startsWith("http")) {
      alert("有効なURLを入力してください");
      return;
    }

    try {
      setAddingFeed(true);
      const response = await fetch("/api/feeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedUrl: newFeedUrl }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.result === "EXISTS") {
          alert("このフィードは既に登録されています");
        } else {
          alert("フィードが正常に追加されました");
          setNewFeedUrl("");
          fetchFeeds(); // Refresh the list
        }
      } else {
        alert(result.error || "フィードの追加に失敗しました");
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setAddingFeed(false);
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

  return (
    <div className="space-y-6">
      {/* Add New Feed Form */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          新しいフィードを追加
        </h3>
        <form onSubmit={addFeed} className="space-y-4">
          <div>
            <label
              htmlFor="feedUrl"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              RSS フィード URL
            </label>
            <div className="flex space-x-3">
              <input
                type="url"
                id="feedUrl"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={addingFeed}
                aria-describedby="feedUrl-help"
              />
              <button
                type="submit"
                disabled={addingFeed || !newFeedUrl.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {addingFeed ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>追加中...</span>
                  </div>
                ) : (
                  "追加"
                )}
              </button>
            </div>
            <p id="feedUrl-help" className="text-xs text-gray-500 mt-2">
              RSS または Atom フィードの URL を入力してください
            </p>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feeds List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            登録済みフィード
          </h3>
          <span className="text-sm text-gray-500">{feeds.length} フィード</span>
        </div>

        {feeds.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span role="img" aria-hidden="true" className="text-2xl">
                📡
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              フィードがありません
            </h3>
            <p className="text-gray-500">
              上のフォームから RSS フィードを追加してください
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${feed.active ? "bg-green-400" : "bg-gray-400"}`}
                      ></div>
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {feed.title || "タイトル未取得"}
                      </h4>
                    </div>

                    {feed.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {feed.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500">
                          URL:
                        </span>
                        <a
                          href={feed.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-xs"
                          title={feed.url}
                        >
                          {feed.url}
                        </a>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                          追加日:{" "}
                          {new Date(feed.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                        {feed.lastUpdated && (
                          <span>
                            最終更新:{" "}
                            {new Date(feed.lastUpdated).toLocaleDateString(
                              "ja-JP",
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        feed.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {feed.active ? "アクティブ" : "無効"}
                    </span>

                    {/* Future: Add edit/delete buttons here */}
                    <button
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="設定"
                      aria-label={`${feed.title || feed.url}の設定`}
                    ></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
