import React, { useEffect, useState } from "react";

interface Episode {
  id: string;
  title: string;
  pubDate: string;
  audioPath: string;
  sourceLink: string;
}

export default function EpisodeList() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    fetch("/api/episodes")
      .then((res) => res.json())
      .then((data) => setEpisodes(data));
  }, []);

  return (
    <div>
      <h2>エピソード一覧</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>
              タイトル
            </th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>
              公開日時
            </th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>
              プレビュー
            </th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((ep) => (
            <tr key={ep.id}>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                {ep.title}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                {new Date(ep.pubDate).toLocaleString("ja-JP")}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <audio controls preload="none">
                  <source
                    src={`/podcast_audio/${ep.id}.mp3`}
                    type="audio/mpeg"
                  />
                  お使いのブラウザは audio タグに対応していません。
                </audio>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
