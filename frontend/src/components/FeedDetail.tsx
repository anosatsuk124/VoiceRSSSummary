import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

interface Feed {
  id: string
  url: string
  title?: string
  description?: string
  lastUpdated?: string
  createdAt: string
  active: boolean
}

interface EpisodeWithFeedInfo {
  id: string
  title: string
  description?: string
  audioPath: string
  duration?: number
  fileSize?: number
  createdAt: string
  articleId: string
  articleTitle: string
  articleLink: string
  articlePubDate: string
  feedId: string
  feedTitle?: string
  feedUrl: string
}

function FeedDetail() {
  const { feedId } = useParams<{ feedId: string }>()
  const [feed, setFeed] = useState<Feed | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeWithFeedInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)

  useEffect(() => {
    if (feedId) {
      fetchFeedAndEpisodes()
    }
  }, [feedId])

  const fetchFeedAndEpisodes = async () => {
    try {
      setLoading(true)
      
      // Fetch feed info and episodes in parallel
      const [feedResponse, episodesResponse] = await Promise.all([
        fetch(`/api/feeds/${feedId}`),
        fetch(`/api/feeds/${feedId}/episodes`)
      ])

      if (!feedResponse.ok) {
        const errorData = await feedResponse.json()
        throw new Error(errorData.error || 'フィード情報の取得に失敗しました')
      }

      if (!episodesResponse.ok) {
        const errorData = await episodesResponse.json()
        throw new Error(errorData.error || 'エピソードの取得に失敗しました')
      }

      const feedData = await feedResponse.json()
      const episodesData = await episodesResponse.json()

      setFeed(feedData.feed)
      setEpisodes(episodesData.episodes || [])
    } catch (err) {
      console.error('Feed detail fetch error:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let fileSize = bytes

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024
      unitIndex++
    }

    return `${fileSize.toFixed(1)} ${units[unitIndex]}`
  }

  const playAudio = (audioPath: string) => {
    if (currentAudio) {
      const currentPlayer = document.getElementById(currentAudio) as HTMLAudioElement
      if (currentPlayer) {
        currentPlayer.pause()
        currentPlayer.currentTime = 0
      }
    }
    setCurrentAudio(audioPath)
  }

  const shareEpisode = (episode: EpisodeWithFeedInfo) => {
    const shareUrl = `${window.location.origin}/episode/${episode.id}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('エピソードリンクをクリップボードにコピーしました')
    }).catch(() => {
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('エピソードリンクをクリップボードにコピーしました')
    })
  }

  if (loading) {
    return <div className="loading">読み込み中...</div>
  }

  if (error) {
    return (
      <div className="error">
        {error}
        <Link to="/feeds" className="btn btn-secondary" style={{ marginTop: '20px', display: 'block' }}>
          フィード一覧に戻る
        </Link>
      </div>
    )
  }

  if (!feed) {
    return (
      <div className="error">
        フィードが見つかりません
        <Link to="/feeds" className="btn btn-secondary" style={{ marginTop: '20px', display: 'block' }}>
          フィード一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/feeds" className="btn btn-secondary">
          ← フィード一覧に戻る
        </Link>
      </div>

      <div className="feed-header" style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '10px' }}>
          {feed.title || feed.url}
        </h1>
        <div style={{ color: '#666', marginBottom: '10px' }}>
          <a href={feed.url} target="_blank" rel="noopener noreferrer">
            {feed.url}
          </a>
        </div>
        {feed.description && (
          <div style={{ marginBottom: '15px', color: '#333' }}>
            {feed.description}
          </div>
        )}
        <div style={{ fontSize: '14px', color: '#666' }}>
          作成日: {formatDate(feed.createdAt)}
          {feed.lastUpdated && ` | 最終更新: ${formatDate(feed.lastUpdated)}`}
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>エピソード一覧 ({episodes.length}件)</h2>
        <button className="btn btn-secondary" onClick={fetchFeedAndEpisodes}>
          更新
        </button>
      </div>

      {episodes.length === 0 ? (
        <div className="empty-state">
          <p>このフィードにはまだエピソードがありません</p>
          <p>管理者にバッチ処理の実行を依頼してください</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>タイトル</th>
              <th style={{ width: '25%' }}>説明</th>
              <th style={{ width: '15%' }}>作成日</th>
              <th style={{ width: '25%' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {episodes.map((episode) => (
              <tr key={episode.id}>
                <td>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>
                      <Link 
                        to={`/episode/${episode.id}`}
                        style={{ textDecoration: 'none', color: '#007bff' }}
                      >
                        {episode.title}
                      </Link>
                    </strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    元記事: <strong>{episode.articleTitle}</strong>
                  </div>
                  {episode.articleLink && (
                    <a 
                      href={episode.articleLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#666' }}
                    >
                      元記事を見る
                    </a>
                  )}
                </td>
                <td>
                  <div style={{ 
                    fontSize: '14px', 
                    maxWidth: '200px', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {episode.description || 'No description'}
                  </div>
                  {episode.fileSize && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {formatFileSize(episode.fileSize)}
                    </div>
                  )}
                </td>
                <td>{formatDate(episode.createdAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => playAudio(episode.audioPath)}
                      >
                        再生
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => shareEpisode(episode)}
                      >
                        共有
                      </button>
                    </div>
                    {currentAudio === episode.audioPath && (
                      <div>
                        <audio
                          id={episode.audioPath}
                          controls
                          className="audio-player"
                          src={episode.audioPath}
                          onEnded={() => setCurrentAudio(null)}
                        />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default FeedDetail