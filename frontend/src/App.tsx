import { Routes, Route, Link, useLocation } from 'react-router-dom'
import EpisodeList from './components/EpisodeList'
import FeedManager from './components/FeedManager'
import FeedList from './components/FeedList'
import FeedDetail from './components/FeedDetail'
import EpisodeDetail from './components/EpisodeDetail'

function App() {
  const location = useLocation()
  const isMainPage = ['/', '/feeds', '/feed-requests'].includes(location.pathname)

  return (
    <div className="container">
      {isMainPage && (
        <>
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
              フィード一覧
            </Link>
            <Link
              to="/feed-requests"
              className={`tab ${location.pathname === '/feed-requests' ? 'active' : ''}`}
            >
              フィードリクエスト
            </Link>
          </div>
        </>
      )}

      <div className="content">
        <Routes>
          <Route path="/" element={<EpisodeList />} />
          <Route path="/feeds" element={<FeedList />} />
          <Route path="/feed-requests" element={<FeedManager />} />
          <Route path="/episode/:episodeId" element={<EpisodeDetail />} />
          <Route path="/feeds/:feedId" element={<FeedDetail />} />
        </Routes>
      </div>
    </div>
  )
}

export default App