import { useState } from 'react'
import EpisodeList from './components/EpisodeList'
import FeedManager from './components/FeedManager'

function App() {
  const [activeTab, setActiveTab] = useState<'episodes' | 'feeds'>('episodes')

  return (
    <div className="container">
      <div className="header">
        <div className="title">Voice RSS Summary</div>
        <div className="subtitle">RSS フィードから自動生成された音声ポッドキャスト</div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'episodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('episodes')}
        >
          エピソード一覧
        </button>
        <button
          className={`tab ${activeTab === 'feeds' ? 'active' : ''}`}
          onClick={() => setActiveTab('feeds')}
        >
          フィードリクエスト
        </button>
      </div>

      <div className="content">
        {activeTab === 'episodes' && <EpisodeList />}
        {activeTab === 'feeds' && <FeedManager />}
      </div>
    </div>
  )
}

export default App