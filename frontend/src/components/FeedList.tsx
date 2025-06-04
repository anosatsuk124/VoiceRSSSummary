import { useEffect, useState } from "react";

interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
}

export default function FeedList() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const response = await fetch("/api/feeds");
      if (!response.ok) {
        throw new Error("フィードの取得に失敗しました");
      }
      const data = await response.json();
      setFeeds(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-500">エラー: {error}</div>;

  return (
    <div className="space-y-4">
      {feeds.map((feed) => (
        <div
          key={feed.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-medium">{feed.title}</h3>
          <p className="text-sm text-gray-500">{feed.pubDate}</p>
          {feed.contentSnippet && (
            <p className="mt-2 text-gray-700">{feed.contentSnippet}</p>
          )}
          <a
            href={feed.link}
            className="mt-3 inline-block text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            オリジナル記事へ
          </a>
        </div>
      ))}
    </div>
  );
}
