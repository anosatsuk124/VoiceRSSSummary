import React from "react";
import FeedList from "../components/FeedList";
import EpisodeList from "../components/EpisodeList";

export default function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>ポッドキャスト自動生成サービス 管理画面</h1>
      <FeedList />
      <hr style={{ margin: "20px 0" }} />
      <EpisodeList />
    </div>
  );
}
