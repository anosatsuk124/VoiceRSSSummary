import fs from "fs";
import path from "path";

// VOICEVOX APIの設定
const VOICEVOX_HOST = "http://localhost:50021";

interface VoiceStyle {
  speakerId: number;
  styleId: number;
}

// 仮の声設定（例: サイドM = 3）
const defaultVoiceStyle: VoiceStyle = {
  speakerId: 3,
  styleId: 2,
};

export async function generateTTS(
  itemId: string,
  scriptText: string,
): Promise<string> {
  // 音声合成クエリの生成
  const queryResponse = await fetch(`${VOICEVOX_HOST}/audio_query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: scriptText,
      speaker: defaultVoiceStyle.speakerId,
    }),
  });

  if (!queryResponse.ok) {
    throw new Error("VOICEVOX 音声合成クエリ生成に失敗しました");
  }

  const audioQuery = await queryResponse.json();

  // 音声合成
  const audioResponse = await fetch(`${VOICEVOX_HOST}/synthesis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_query: audioQuery,
      speaker: defaultVoiceStyle.speakerId,
    }),
  });

  if (!audioResponse.ok) {
    throw new Error("VOICEVOX 音声合成に失敗しました");
  }

  const audioArrayBuffer = await audioResponse.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);

  // 出力ディレクトリの準備
  const outputDir = path.join(__dirname, "../public/podcast_audio");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.resolve(outputDir, `${itemId}.mp3`);
  fs.writeFileSync(filePath, audioBuffer);

  return filePath;
}
