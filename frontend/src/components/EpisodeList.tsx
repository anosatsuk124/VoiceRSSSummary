import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

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

function EpisodeList() {
  const [episodes, setEpisodes] = useState<EpisodeWithFeedInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)
  const [useDatabase, setUseDatabase] = useState(false)

  useEffect(() => {
    fetchEpisodes()
  }, [useDatabase])

  const fetchEpisodes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (useDatabase) {
        // Try to fetch from database first
        const response = await fetch('/api/episodes-with-feed-info')
        if (!response.ok) {
          throw new Error('データベースからの取得に失敗しました')
        }
        const data = await response.json()
        const dbEpisodes = data.episodes || []
        
        if (dbEpisodes.length === 0) {
          // Database is empty, fallback to XML
          console.log('Database is empty, falling back to XML parsing...')
          setUseDatabase(false)
          return
        }
        
        setEpisodes(dbEpisodes)
      } else {
        // Use XML parsing as primary source
        const response = await fetch('/api/episodes-from-xml')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'エピソードの取得に失敗しました')
        }
        const data = await response.json()
        console.log('Fetched episodes from XML:', data)
        
        // Convert XML episodes to EpisodeWithFeedInfo format
        const xmlEpisodes = data.episodes || []
        const convertedEpisodes: EpisodeWithFeedInfo[] = xmlEpisodes.map((episode: Episode) => ({
          id: episode.id,
          title: episode.title,
          description: episode.description,
          audioPath: episode.audioUrl,
          createdAt: episode.pubDate,
          articleId: episode.guid,
          articleTitle: episode.title,
          articleLink: episode.link,
          articlePubDate: episode.pubDate,
          feedId: '',
          feedTitle: 'RSS Feed',
          feedUrl: ''
        }))
        setEpisodes(convertedEpisodes)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
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
    return <div className="loading">読み込み中...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (episodes.length === 0) {
    return (
      <div className="empty-state">
        <p>エピソードがありません</p>
        <p>フィードリクエストでRSSフィードをリクエストするか、管理者にバッチ処理の実行を依頼してください</p>
        <button 
          className="btn btn-secondary" 
          onClick={fetchEpisodes}
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
        <h2>エピソード一覧 ({episodes.length}件)</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            データソース: {useDatabase ? 'データベース' : 'XML'}
          </span>
          <button className="btn btn-secondary" onClick={fetchEpisodes}>
            更新
          </button>
        </div>
      </div>

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
                {episode.feedTitle && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    フィード: <Link to={`/feeds/${episode.feedId}`} style={{ color: '#007bff' }}>{episode.feedTitle}</Link>
                  </div>
                )}
                {episode.articleTitle && episode.articleTitle !== episode.title && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    元記事: <strong>{episode.articleTitle}</strong>
                  </div>
                )}
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
    </div>
  )
}

export default EpisodeList