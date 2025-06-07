import React, { useState, useEffect } from 'react';

interface Feed {
  id: string;
  url: string;
  title?: string;
  description?: string;
  lastUpdated?: string;
  createdAt: string;
  active: boolean;
}

interface Stats {
  totalFeeds: number;
  activeFeeds: number;
  inactiveFeeds: number;
  totalEpisodes: number;
  lastUpdated: string;
  adminPort: number;
  authEnabled: boolean;
}

interface EnvVars {
  [key: string]: string | undefined;
}

function App() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [envVars, setEnvVars] = useState<EnvVars>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feeds' | 'env'>('dashboard');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedsRes, statsRes, envRes] = await Promise.all([
        fetch('/api/admin/feeds'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/env')
      ]);

      if (!feedsRes.ok || !statsRes.ok || !envRes.ok) {
        throw new Error('Failed to load data');
      }

      const [feedsData, statsData, envData] = await Promise.all([
        feedsRes.json(),
        statsRes.json(),
        envRes.json()
      ]);

      setFeeds(feedsData);
      setStats(statsData);
      setEnvVars(envData);
      setError(null);
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    try {
      const res = await fetch('/api/admin/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: newFeedUrl })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setNewFeedUrl('');
        loadData();
      } else {
        setError(data.error || 'フィード追加に失敗しました');
      }
    } catch (err) {
      setError('フィード追加に失敗しました');
      console.error('Error adding feed:', err);
    }
  };

  const deleteFeed = async (feedId: string) => {
    if (!confirm('本当にこのフィードを削除しますか？関連するすべての記事とエピソードも削除されます。')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        loadData();
      } else {
        setError(data.error || 'フィード削除に失敗しました');
      }
    } catch (err) {
      setError('フィード削除に失敗しました');
      console.error('Error deleting feed:', err);
    }
  };

  const toggleFeed = async (feedId: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/feeds/${feedId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        loadData();
      } else {
        setError(data.error || 'フィードステータス変更に失敗しました');
      }
    } catch (err) {
      setError('フィードステータス変更に失敗しました');
      console.error('Error toggling feed:', err);
    }
  };

  const triggerBatch = async () => {
    try {
      const res = await fetch('/api/admin/batch/trigger', {
        method: 'POST'
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
      } else {
        setError(data.error || 'バッチ処理開始に失敗しました');
      }
    } catch (err) {
      setError('バッチ処理開始に失敗しました');
      console.error('Error triggering batch:', err);
    }
  };

  if (loading) {
    return <div className="container"><div className="loading">読み込み中...</div></div>;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>管理者パネル</h1>
        <p className="subtitle">RSS Podcast Manager - 管理者用インターフェース</p>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <div className="card-header">
          <nav style={{ display: 'flex', gap: '16px' }}>
            <button 
              className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              ダッシュボード
            </button>
            <button 
              className={`btn ${activeTab === 'feeds' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('feeds')}
            >
              フィード管理
            </button>
            <button 
              className={`btn ${activeTab === 'env' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('env')}
            >
              環境変数
            </button>
          </nav>
        </div>

        <div className="card-content">
          {activeTab === 'dashboard' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="value">{stats?.totalFeeds || 0}</div>
                  <div className="label">総フィード数</div>
                </div>
                <div className="stat-card">
                  <div className="value">{stats?.activeFeeds || 0}</div>
                  <div className="label">アクティブフィード</div>
                </div>
                <div className="stat-card">
                  <div className="value">{stats?.inactiveFeeds || 0}</div>
                  <div className="label">非アクティブフィード</div>
                </div>
                <div className="stat-card">
                  <div className="value">{stats?.totalEpisodes || 0}</div>
                  <div className="label">総エピソード数</div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <button className="btn btn-success" onClick={triggerBatch}>
                  バッチ処理を手動実行
                </button>
                <button className="btn btn-primary" onClick={loadData} style={{ marginLeft: '8px' }}>
                  データを再読み込み
                </button>
              </div>

              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                <p>管理者パネルポート: {stats?.adminPort}</p>
                <p>認証: {stats?.authEnabled ? '有効' : '無効'}</p>
                <p>最終更新: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString('ja-JP') : '不明'}</p>
              </div>
            </>
          )}

          {activeTab === 'feeds' && (
            <>
              <form onSubmit={addFeed} className="add-feed-form">
                <div className="form-group">
                  <label htmlFor="feedUrl">新しいフィードURL</label>
                  <input
                    id="feedUrl"
                    type="url"
                    className="input"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    placeholder="https://example.com/feed.xml"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success">
                  追加
                </button>
              </form>

              <div style={{ marginTop: '24px' }}>
                <h3>フィード一覧 ({feeds.length}件)</h3>
                {feeds.length === 0 ? (
                  <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
                    フィードが登録されていません
                  </p>
                ) : (
                  <ul className="feeds-list">
                    {feeds.map((feed) => (
                      <li key={feed.id} className="feed-item">
                        <div className="feed-info">
                          <h3>{feed.title || 'タイトル未設定'}</h3>
                          <div className="url">{feed.url}</div>
                          <span className={`status ${feed.active ? 'active' : 'inactive'}`}>
                            {feed.active ? 'アクティブ' : '非アクティブ'}
                          </span>
                        </div>
                        <div className="feed-actions">
                          <button
                            className={`btn ${feed.active ? 'btn-warning' : 'btn-success'}`}
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {activeTab === 'env' && (
            <>
              <h3>環境変数設定</h3>
              <p style={{ marginBottom: '20px', color: '#7f8c8d' }}>
                現在の環境変数設定を表示しています。機密情報は***SET***と表示されます。
              </p>
              
              <ul className="env-list">
                {Object.entries(envVars).map(([key, value]) => (
                  <li key={key} className="env-item">
                    <div className="env-key">{key}</div>
                    <div className="env-value">
                      {value === undefined ? '未設定' : value}
                    </div>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '4px' }}>
                <h4>環境変数の設定方法</h4>
                <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '8px' }}>
                  環境変数を変更するには、.envファイルを編集するか、システムの環境変数を設定してください。
                  変更後はサーバーの再起動が必要です。
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;