import { useEffect, useState } from "react";

interface Episode {
  id: string;
  title: string;
  pubDate: string;
  audioPath: string;
  sourceLink: string;
}

export default function EpisodePlayer() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    try {
      const response = await fetch("/api/episodes");
      if (!response.ok) {
        throw new Error("エピソードの取得に失敗しました");
      }
      const data = await response.json();
      setEpisodes(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  };

  const handlePlay = (episode: Episode) => {
    setSelectedEpisode(episode);
    setAudioUrl(`/podcast_audio/${episode.id}.mp3`);
    setIsPlaying(true);
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-500">エラー: {error}</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">最近のエピソード</h3>
      <div className="space-y-2">
        {episodes.map((episode) => (
          <div
            key={episode.id}
            className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
          >
            <span>{episode.title}</span>
            <button
              onClick={() => handlePlay(episode)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              再生
            </button>
          </div>
        ))}
      </div>

      {selectedEpisode && (
        <div className="mt-6">
          <h4 className="text-md font-semibold mb-2">
            再生中: {selectedEpisode.title}
          </h4>
          {audioUrl ? (
            <audio
              src={audioUrl}
              controls
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div>音声ファイルを読み込み中...</div>
          )}
        </div>
      )}
    </div>
  );
}
