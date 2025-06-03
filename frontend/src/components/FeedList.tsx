import React, { useEffect, useState } from "react";

export default function FeedList() {
  const [feeds, setFeeds] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    fetch("/api/feeds")
      .then((res) => res.json())
      .then((data) => setFeeds(data));
  }, []);

  const addFeed = async () => {
    if (!newUrl) return;
    await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedUrl: newUrl }),
    });
    setNewUrl("");
    const updated = await fetch("/api/feeds").then((res) => res.json());
    setFeeds(updated);
  };

  return (
    <div>
      <h2>RSSフィード管理</h2>
      <ul>
        {feeds.map((url) => (
          <li key={url}>{url}</li>
        ))}
      </ul>
      <input
        type="text"
        placeholder="RSSフィードURLを入力"
        value={newUrl}
        onChange={(e) => setNewUrl(e.target.value)}
        style={{ width: "300px" }}
      />
      <button onClick={addFeed} style={{ marginLeft: "8px" }}>
        追加
      </button>
    </div>
  );
}
