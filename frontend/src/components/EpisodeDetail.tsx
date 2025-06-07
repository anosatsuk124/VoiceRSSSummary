import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

interface Episode {
  id: string
  title: string
  description: string
  pubDate: string
  audioUrl: string
  audioLength: string
  guid: string
  link: string
}

function EpisodeDetail() {
  const { episodeId } = useParams<{ episodeId: string }>()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEpisode()
  }, [episodeId])

  const fetchEpisode = async () => {
    if (!episodeId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/episode/${episodeId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'エピソードの取得に失敗しました')
      }
      const data = await response.json()
      setEpisode(data.episode)
    } catch (err) {
      console.error('Episode fetch error:', err)
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

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes)
    if (isNaN(size)) return ''
    
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let fileSize = size

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
          公開日: {formatDate(episode.pubDate)}
        </div>
      </div>

      <div className="content">
        <div style={{ marginBottom: '30px' }}>
          <audio
            controls
            className="audio-player"
            src={episode.audioUrl}
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
          {episode.link && (
            <a 
              href={episode.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              元記事を見る
            </a>
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
            <div style={{ marginBottom: '10px' }}>
              <strong>ファイルサイズ:</strong> {formatFileSize(episode.audioLength)}
            </div>
            {episode.guid && (
              <div style={{ marginBottom: '10px' }}>
                <strong>エピソードID:</strong> {episode.guid}
              </div>
            )}
            <div>
              <strong>音声URL:</strong> 
              <a href={episode.audioUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
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