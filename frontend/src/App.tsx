import { Routes, Route, Link, useLocation } from 'react-router-dom'
import EpisodeList from './components/EpisodeList'
import FeedManager from './components/FeedManager'
import EpisodeDetail from './components/EpisodeDetail'

function App() {
  const location = useLocation()
  const isEpisodeDetail = location.pathname.startsWith('/episode/')

  if (isEpisodeDetail) {
    return (
      <Routes>
        <Route path="/episode/:episodeId" element={<EpisodeDetail />} />
      </Routes>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">Voice RSS Summary</div>
        <div className="subtitle">RSS フィードから自動生成された音声ポッドキャスト</div>
      </div>

      <div className="tabs">
        <Link
          to="/"
          className={`tab ${location.pathname === '/' ? 'active' : ''}`}
        >
          エピソード一覧
        </Link>
        <Link
          to="/feeds"
          className={`tab ${location.pathname === '/feeds' ? 'active' : ''}`}
        >
          フィードリクエスト
        </Link>
      </div>

      <div className="content">
        <Routes>
          <Route path="/" element={<EpisodeList />} />
          <Route path="/feeds" element={<FeedManager />} />
        </Routes>
      </div>
    </div>
  )
}

export default App