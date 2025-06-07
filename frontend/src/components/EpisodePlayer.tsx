import { useEffect, useState, useRef } from "react";

interface Episode {
  id: string;
  title: string;
  description?: string;
  audioPath: string;
  duration?: number;
  fileSize?: number;
  createdAt: string;
  article: {
    id: string;
    title: string;
    link: string;
    description?: string;
    pubDate: string;
  };
  feed: {
    id: string;
    title?: string;
    url: string;
  };
}

export default function EpisodePlayer() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchEpisodes();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [selectedEpisode]);

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
    if (selectedEpisode?.id === episode.id) {
      // Toggle play/pause for the same episode
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      // Play new episode
      setSelectedEpisode(episode);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = parseFloat(e.target.value);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "不明";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const filteredEpisodes = episodes.filter(
    (episode) =>
      episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      episode.article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      episode.feed.title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラー</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="エピソードを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Audio Player */}
      {selectedEpisode && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white">
              <span role="img" aria-hidden="true" className="text-xl">
                🎵
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {selectedEpisode.title}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedEpisode.feed.title}
              </p>
            </div>
            <button
              onClick={() => handlePlay(selectedEpisode)}
              className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition-shadow duration-200"
              aria-label={isPlaying ? "一時停止" : "再生"}
            ></button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              aria-label="再生位置"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Episode Info */}
          <div className="mt-4 space-y-2 text-sm">
            {selectedEpisode.description && (
              <p className="text-gray-700">{selectedEpisode.description}</p>
            )}
            <div className="flex items-center space-x-4 text-gray-500">
              <span>
                🗓️{" "}
                {new Date(selectedEpisode.createdAt).toLocaleDateString(
                  "ja-JP",
                )}
              </span>
              <span>💾 {formatFileSize(selectedEpisode.fileSize)}</span>
              {selectedEpisode.article.link && (
                <a
                  href={selectedEpisode.article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  📄 元記事
                </a>
              )}
            </div>
          </div>

          <audio
            ref={audioRef}
            src={`/podcast_audio/${selectedEpisode.audioPath}`}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Episodes List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            エピソード一覧
          </h3>
          <span className="text-sm text-gray-500">
            {filteredEpisodes.length} エピソード
          </span>
        </div>

        {filteredEpisodes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span role="img" aria-hidden="true" className="text-2xl">
                🎧
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "検索結果がありません" : "エピソードがありません"}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "別のキーワードで検索してみてください"
                : "フィードを追加してバッチ処理を実行してください"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEpisodes.map((episode) => (
              <div
                key={episode.id}
                className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                  selectedEpisode?.id === episode.id
                    ? "border-purple-300 bg-purple-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
                onClick={() => handlePlay(episode)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePlay(episode);
                  }
                }}
                aria-label={`エピソード: ${episode.title}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-medium text-gray-900 mb-1 line-clamp-2">
                      {episode.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                      {episode.feed.title}
                    </p>
                    {episode.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {episode.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        📅{" "}
                        {new Date(episode.createdAt).toLocaleDateString(
                          "ja-JP",
                        )}
                      </span>
                      <span>💾 {formatFileSize(episode.fileSize)}</span>
                      {episode.article.link && (
                        <a
                          href={episode.article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📄 元記事
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
