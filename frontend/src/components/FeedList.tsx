import { useEffect, useState } from "react";

interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  source?: {
    title?: string;
    url?: string;
  };
  category?: string;
}

interface FeedListProps {
  searchTerm?: string;
  categoryFilter?: string;
}

export default function FeedList({ searchTerm = "", categoryFilter = "" }: FeedListProps = {}) {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const filteredAndSortedFeeds = feeds
    .filter(feed => {
      const matchesSearch = !searchTerm || 
        feed.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feed.contentSnippet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feed.source?.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || feed.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      
      if (sortBy === 'date') {
        return (new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime()) * multiplier;
      } else {
        return a.title.localeCompare(b.title) * multiplier;
      }
    });

  const handleSort = (field: 'date' | 'title') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-effect rounded-3xl p-6 border border-white/20 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-200 rounded-lg w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded-lg w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded-lg w-full"></div>
                <div className="h-4 bg-slate-200 rounded-lg w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-effect rounded-3xl p-8 border border-red-200 bg-red-50">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
⚠️
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-800">エラーが発生しました</h3>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchFeeds}
              className="mt-3 btn-primary text-sm"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="glass-effect rounded-2xl p-4 border border-white/20">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-semibold text-slate-700">並び替え:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSort('date')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                sortBy === 'date'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span>日時</span>
              {sortBy === 'date' && (
                <span>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
            <button
              onClick={() => handleSort('title')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                sortBy === 'title'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span>タイトル</span>
              {sortBy === 'title' && (
                <span>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          </div>
          <div className="text-sm text-slate-500 ml-auto">
            {filteredAndSortedFeeds.length} / {feeds.length} 件表示中
          </div>
        </div>
      </div>

      {/* Feed Cards */}
      {filteredAndSortedFeeds.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)'}}>
            <span role="img" aria-hidden="true" className="text-4xl">📰</span>
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            {searchTerm || categoryFilter ? '検索結果がありません' : 'フィードがありません'}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {searchTerm || categoryFilter 
              ? '別のキーワードやカテゴリで検索してみてください' 
              : 'RSSフィードを追加してバッチ処理を実行してください'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedFeeds.map((feed, index) => (
            <article
              key={feed.id}
              className="group glass-effect rounded-3xl border border-white/20 hover:border-white/40 hover:shadow-2xl transition-all duration-300 overflow-hidden"
              style={{
                animationDelay: `${index * 0.05}s`
              }}
            >
              <div className="p-6">
                <div className="flex items-start space-x-5">
                  {/* Article Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{background: 'var(--gradient-primary)'}}>
                      <span role="img" aria-hidden="true" className="text-2xl">📰</span>
                    </div>
                  </div>
                  
                  {/* Article Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800 line-clamp-2 group-hover:text-slate-900 transition-colors duration-200">
                          {feed.title}
                        </h3>
                        
                        {/* Meta Info */}
                        <div className="flex items-center space-x-3 mt-2 text-sm text-slate-600">
                          {feed.source?.title && (
                            <span className="font-medium">{feed.source.title}</span>
                          )}
                          <span className="text-slate-400">•</span>
                          <span>{formatDate(feed.pubDate)}</span>
                        </div>
                      </div>
                      
                      {/* Category Badge */}
                      {feed.category && (
                        <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {feed.category}
                        </span>
                      )}
                    </div>
                    
                    {/* Content Snippet */}
                    {feed.contentSnippet && (
                      <p className="text-slate-600 leading-relaxed line-clamp-3 mb-4">
                        {feed.contentSnippet}
                      </p>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <a
                        href={feed.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        元記事を読む →
                      </a>
                      
                      <div className="text-xs text-slate-400">
                        #{index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
