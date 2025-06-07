import { useState, useEffect } from 'react'

interface Episode {
  id: string
  title: string
  audioPath: string
  createdAt: string
  article?: {
    link: string
  }
  feed?: {
    title: string
  }
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
      const response = await fetch('/api/episodes')
      if (!response.ok) throw new Error('エピソードの取得に失敗しました')
      const data = await response.json()
      setEpisodes(data)
    } catch (err) {
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
        <p>フィード管理でRSSフィードを追加してください</p>
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
            <th style={{ width: '40%' }}>タイトル</th>
            <th style={{ width: '20%' }}>フィード</th>
            <th style={{ width: '20%' }}>作成日時</th>
            <th style={{ width: '20%' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((episode) => (
            <tr key={episode.id}>
              <td>
                <div style={{ marginBottom: '8px' }}>
                  <strong>{episode.title}</strong>
                </div>
                {episode.article?.link && (
                  <a 
                    href={episode.article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#666' }}
                  >
                    元記事を見る
                  </a>
                )}
              </td>
              <td>{episode.feed?.title || '不明'}</td>
              <td>{formatDate(episode.createdAt)}</td>
              <td>
                <button 
                  className="btn btn-primary"
                  onClick={() => playAudio(episode.audioPath)}
                  style={{ marginBottom: '8px' }}
                >
                  再生
                </button>
                {currentAudio === episode.audioPath && (
                  <div>
                    <audio
                      id={episode.audioPath}
                      controls
                      className="audio-player"
                      src={`/podcast_audio/${episode.audioPath}`}
                      onEnded={() => setCurrentAudio(null)}
                    />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EpisodeList