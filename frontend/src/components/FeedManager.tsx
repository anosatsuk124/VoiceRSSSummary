import { useState } from 'react'

function FeedManager() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requesting, setRequesting] = useState(false)

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFeedUrl.trim()) return

    try {
      setRequesting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/feed-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: newFeedUrl.trim(),
          requestMessage: requestMessage.trim() || undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'リクエストの送信に失敗しました')
      }

      setSuccess('フィードリクエストを送信しました。管理者の承認をお待ちください。')
      setNewFeedUrl('')
      setRequestMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div style={{ marginBottom: '30px' }}>
        <h2>新しいフィードをリクエスト</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          追加したいRSSフィードのURLを送信してください。管理者が承認後、フィードが追加されます。
        </p>
        
        <form onSubmit={submitRequest}>
          <div className="form-group">
            <label className="form-label">RSS フィード URL *</label>
            <input
              type="url"
              className="form-input"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">メッセージ（任意）</label>
            <textarea
              className="form-input"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="このフィードについての説明や追加理由があれば記載してください"
              rows={3}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={requesting}
          >
            {requesting ? 'リクエスト送信中...' : 'フィードをリクエスト'}
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '15px' }}>フィードリクエストについて</h3>
        <ul style={{ paddingLeft: '20px', color: '#666' }}>
          <li>送信されたフィードリクエストは管理者が確認します</li>
          <li>適切なRSSフィードと判断された場合、承認されて自動的に追加されます</li>
          <li>承認までにお時間をいただく場合があります</li>
          <li>不適切なフィードや重複フィードは拒否される場合があります</li>
        </ul>
      </div>
    </div>
  )
}

export default FeedManager