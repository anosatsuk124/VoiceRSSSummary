import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface Feed {
  id: string
  url: string
  title?: string
  description?: string
  lastUpdated?: string
  createdAt: string
  active: boolean
}

function FeedList() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFeeds()
  }, [])

  const fetchFeeds = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/feeds')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'フィードの取得に失敗しました')
      }
      const data = await response.json()
      setFeeds(data.feeds || [])
    } catch (err) {
      console.error('Feed fetch error:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  if (loading) {
    return <div className="loading">読み込み中...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (feeds.length === 0) {
    return (
      <div className="empty-state">
        <p>アクティブなフィードがありません</p>
        <p>フィードリクエストでRSSフィードをリクエストするか、管理者にフィード追加を依頼してください</p>
        <button 
          className="btn btn-secondary" 
          onClick={fetchFeeds}
          style={{ marginTop: '10px' }}
        >
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>フィード一覧 ({feeds.length}件)</h2>
        <button className="btn btn-secondary" onClick={fetchFeeds}>
          更新
        </button>
      </div>

      <div className="feed-grid">
        {feeds.map((feed) => (
          <div key={feed.id} className="feed-card">
            <div className="feed-card-header">
              <h3 className="feed-title">
                <Link to={`/feeds/${feed.id}`} className="feed-link">
                  {feed.title || feed.url}
                </Link>
              </h3>
              <div className="feed-url">
                <a href={feed.url} target="_blank" rel="noopener noreferrer">
                  {feed.url}
                </a>
              </div>
            </div>
            
            {feed.description && (
              <div className="feed-description">
                {feed.description}
              </div>
            )}
            
            <div className="feed-meta">
              <div>作成日: {formatDate(feed.createdAt)}</div>
              {feed.lastUpdated && (
                <div>最終更新: {formatDate(feed.lastUpdated)}</div>
              )}
            </div>

            <div className="feed-actions">
              <Link to={`/feeds/${feed.id}`} className="btn btn-primary">
                エピソード一覧を見る
              </Link>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .feed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .feed-card {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .feed-card-header {
          margin-bottom: 15px;
        }

        .feed-title {
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .feed-link {
          text-decoration: none;
          color: #007bff;
        }

        .feed-link:hover {
          text-decoration: underline;
        }

        .feed-url {
          font-size: 12px;
          color: #666;
          word-break: break-all;
        }

        .feed-url a {
          color: #666;
          text-decoration: none;
        }

        .feed-url a:hover {
          color: #007bff;
        }

        .feed-description {
          margin-bottom: 15px;
          color: #333;
          line-height: 1.5;
        }

        .feed-meta {
          margin-bottom: 15px;
          font-size: 12px;
          color: #666;
        }

        .feed-meta div {
          margin-bottom: 4px;
        }

        .feed-actions {
          text-align: right;
        }
      `}</style>
    </div>
  )
}

export default FeedList