import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'


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

function EpisodeDetail() {
  const { episodeId } = useParams<{ episodeId: string }>()
  const [episode, setEpisode] = useState<EpisodeWithFeedInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useDatabase, setUseDatabase] = useState(true)

  useEffect(() => {
    fetchEpisode()
  }, [episodeId, useDatabase])

  const fetchEpisode = async () => {
    if (!episodeId) return

    try {
      setLoading(true)
      
      if (useDatabase) {
        // Try to fetch from database with source info first
        const response = await fetch(`/api/episode-with-source/${episodeId}`)
        if (!response.ok) {
          throw new Error('データベースからの取得に失敗しました')
        }
        const data = await response.json()
        setEpisode(data.episode)
      } else {
        // Fallback to XML parsing (existing functionality)
        const response = await fetch(`/api/episode/${episodeId}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'エピソードの取得に失敗しました')
        }
        const data = await response.json()
        const xmlEpisode = data.episode
        
        // Convert XML episode to EpisodeWithFeedInfo format
        const convertedEpisode: EpisodeWithFeedInfo = {
          id: xmlEpisode.id,
          title: xmlEpisode.title,
          description: xmlEpisode.description,
          audioPath: xmlEpisode.audioUrl,
          createdAt: xmlEpisode.pubDate,
          articleId: xmlEpisode.guid,
          articleTitle: xmlEpisode.title,
          articleLink: xmlEpisode.link,
          articlePubDate: xmlEpisode.pubDate,
          feedId: '',
          feedTitle: 'RSS Feed',
          feedUrl: ''
        }
        setEpisode(convertedEpisode)
      }
    } catch (err) {
      console.error('Episode fetch error:', err)
      if (useDatabase) {
        // Fallback to XML if database fails
        console.log('Falling back to XML parsing...')
        setUseDatabase(false)
        return
      }
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const shareEpisode = () => {
    const shareUrl = window.location.href
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('エピソードリンクをクリップボードにコピーしました')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('エピソードリンクをクリップボードにコピーしました')
    })
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

  if (loading) {
    return (
      <div className="container">
        <div className="loading">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '20px' }}>
          エピソード一覧に戻る
        </Link>
      </div>
    )
  }

  if (!episode) {
    return (
      <div className="container">
        <div className="error">エピソードが見つかりません</div>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '20px' }}>
          エピソード一覧に戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <Link to="/" className="btn btn-secondary" style={{ marginBottom: '20px' }}>
          ← エピソード一覧に戻る
        </Link>
        <div className="title" style={{ fontSize: '28px', marginBottom: '10px' }}>
          {episode.title}
        </div>
        <div className="subtitle" style={{ color: '#666', marginBottom: '20px' }}>
          作成日: {formatDate(episode.createdAt)}
        </div>
      </div>

      <div className="content">
        <div style={{ marginBottom: '30px' }}>
          <audio
            controls
            className="audio-player"
            src={episode.audioPath}
            style={{ width: '100%', height: '60px' }}
          >
            お使いのブラウザは音声の再生に対応していません。
          </audio>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
          <button 
            className="btn btn-primary"
            onClick={shareEpisode}
          >
            このエピソードを共有
          </button>
          {episode.articleLink && (
            <a 
              href={episode.articleLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              元記事を見る
            </a>
          )}
          {episode.feedId && (
            <Link 
              to={`/feeds/${episode.feedId}`}
              className="btn btn-secondary"
            >
              このフィードの他のエピソード
            </Link>
          )}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>エピソード情報</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {episode.feedTitle && (
              <div style={{ marginBottom: '10px' }}>
                <strong>ソースフィード:</strong> 
                <Link to={`/feeds/${episode.feedId}`} style={{ marginLeft: '5px', color: '#007bff' }}>
                  {episode.feedTitle}
                </Link>
              </div>
            )}
            {episode.feedUrl && (
              <div style={{ marginBottom: '10px' }}>
                <strong>フィードURL:</strong> 
                <a href={episode.feedUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
                  {episode.feedUrl}
                </a>
              </div>
            )}
            {episode.articleTitle && episode.articleTitle !== episode.title && (
              <div style={{ marginBottom: '10px' }}>
                <strong>元記事タイトル:</strong> {episode.articleTitle}
              </div>
            )}
            {episode.articlePubDate && (
              <div style={{ marginBottom: '10px' }}>
                <strong>記事公開日:</strong> {formatDate(episode.articlePubDate)}
              </div>
            )}
            {episode.fileSize && (
              <div style={{ marginBottom: '10px' }}>
                <strong>ファイルサイズ:</strong> {formatFileSize(episode.fileSize)}
              </div>
            )}
            {episode.duration && (
              <div style={{ marginBottom: '10px' }}>
                <strong>再生時間:</strong> {Math.floor(episode.duration / 60)}分{episode.duration % 60}秒
              </div>
            )}
            <div>
              <strong>音声URL:</strong> 
              <a href={episode.audioPath} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
                直接ダウンロード
              </a>
            </div>
          </div>
        </div>

        {episode.description && (
          <div>
            <h3 style={{ marginBottom: '15px' }}>エピソード詳細</h3>
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              lineHeight: '1.6'
            }}>
              {episode.description}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EpisodeDetail