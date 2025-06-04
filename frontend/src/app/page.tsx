import React from "react";
import FeedList from "../components/FeedList";
import EpisodePlayer from "../components/EpisodePlayer";

export const metadata = {
  title: "Voice RSS Summary",
  description: "RSSフィードから自動生成された音声ポッドキャストをご紹介します。",
};

export default function Home() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Voice RSS Summary</h1>
        <p className="mb-6">RSSフィードから自動生成された音声ポッドキャストを再生・管理できます。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">フィード一覧</h2>
        <FeedList />
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">エピソードプレイヤー</h2>
        <EpisodePlayer />
      </section>
    </div>
  );
}
