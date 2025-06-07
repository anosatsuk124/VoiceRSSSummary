import { useState, useEffect } from 'react'

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

function EpisodeList() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)

  useEffect(() => {
    fetchEpisodes()
  }, [])

  const fetchEpisodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/episodes-from-xml')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'エピソードの取得に失敗しました')
      }
      const data = await response.json()
      console.log('Fetched episodes from XML:', data)
      setEpisodes(data.episodes || [])
    } catch (err) {
      console.error('Episode fetch error:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const playAudio = (audioUrl: string) => {
    if (currentAudio) {
      const currentPlayer = document.getElementById(currentAudio) as HTMLAudioElement
      if (currentPlayer) {
        currentPlayer.pause()
        currentPlayer.currentTime = 0
      }
    }
    setCurrentAudio(audioUrl)
  }

  const shareEpisode = (episode: Episode) => {
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
        <button className="btn btn-secondary" onClick={fetchEpisodes}>
          更新
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '35%' }}>タイトル</th>
            <th style={{ width: '25%' }}>説明</th>
            <th style={{ width: '15%' }}>公開日</th>
            <th style={{ width: '25%' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((episode) => (
            <tr key={episode.id}>
              <td>
                <div style={{ marginBottom: '8px' }}>
                  <strong>{episode.title}</strong>
                </div>
                {episode.link && (
                  <a 
                    href={episode.link} 
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
              </td>
              <td>{formatDate(episode.pubDate)}</td>
              <td>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-primary"
                      onClick={() => playAudio(episode.audioUrl)}
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
                  {currentAudio === episode.audioUrl && (
                    <div>
                      <audio
                        id={episode.audioUrl}
                        controls
                        className="audio-player"
                        src={episode.audioUrl}
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