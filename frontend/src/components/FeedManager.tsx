import { useState, useEffect } from 'react'

interface Feed {
  id: string
  url: string
  title?: string
  description?: string
  active: boolean
  lastUpdated?: string
}

function FeedManager() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchFeeds()
  }, [])

  const fetchFeeds = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/feeds')
      if (!response.ok) throw new Error('フィードの取得に失敗しました')
      const data = await response.json()
      setFeeds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFeedUrl.trim()) return

    try {
      setAdding(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: newFeedUrl.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'フィードの追加に失敗しました')
      }

      setSuccess('フィードを追加しました')
      setNewFeedUrl('')
      await fetchFeeds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setAdding(false)
    }
  }

  const deleteFeed = async (feedId: string) => {
    if (!confirm('このフィードを削除しますか？関連するエピソードも削除されます。')) {
      return
    }

    try {
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'フィードの削除に失敗しました')
      }

      setSuccess('フィードを削除しました')
      await fetchFeeds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const toggleFeed = async (feedId: string, active: boolean) => {
    try {
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/feeds/${feedId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'フィードの状態変更に失敗しました')
      }

      setSuccess(`フィードを${active ? '有効' : '無効'}にしました`)
      await fetchFeeds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未更新'
    return new Date(dateString).toLocaleString('ja-JP')
  }

  if (loading) {
    return <div className="loading">読み込み中...</div>
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div style={{ marginBottom: '30px' }}>
        <h2>新しいフィードを追加</h2>
        <form onSubmit={addFeed}>
          <div className="form-group">
            <label className="form-label">RSS フィード URL</label>
            <input
              type="url"
              className="form-input"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={adding}
          >
            {adding ? '追加中...' : 'フィードを追加'}
          </button>
        </form>
      </div>

      <div>
        <h2>登録済みフィード ({feeds.length}件)</h2>
        
        {feeds.length === 0 ? (
          <div className="empty-state">
            <p>登録されているフィードがありません</p>
          </div>
        ) : (
          <div>
            {feeds.map((feed) => (
              <div key={feed.id} className="feed-item">
                <div className="feed-info">
                  <div className="feed-title">
                    {feed.title || 'タイトル不明'}
                    {!feed.active && (
                      <span style={{ 
                        marginLeft: '8px', 
                        padding: '2px 6px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        fontSize: '12px', 
                        borderRadius: '3px' 
                      }}>
                        無効
                      </span>
                    )}
                  </div>
                  <div className="feed-url">{feed.url}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    最終更新: {formatDate(feed.lastUpdated)}
                  </div>
                </div>
                <div className="feed-actions">
                  <button
                    className={`btn ${feed.active ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggleFeed(feed.id, !feed.active)}
                  >
                    {feed.active ? '無効化' : '有効化'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteFeed(feed.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FeedManager