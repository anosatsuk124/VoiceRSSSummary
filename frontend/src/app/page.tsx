import React from "react";
import FeedList from "../components/FeedList";
import EpisodePlayer from "../components/EpisodePlayer";

export default function Home() {
  return (
    <div className="space-y-8">
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
