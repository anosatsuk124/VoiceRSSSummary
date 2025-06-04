import fs from "fs";
import path from "path";

// VOICEVOX APIの設定
const VOICEVOX_HOST = import.meta.env["VOICEVOX_HOST"];
const VOICEVOX_STYLE_ID = parseInt(import.meta.env["VOICEVOX_STYLE_ID"] ?? "0");

interface VoiceStyle {
  styleId: number;
}

// 環境変数からデフォルトの声設定を取得
const defaultVoiceStyle: VoiceStyle = {
  styleId: VOICEVOX_STYLE_ID,
};

export async function generateTTS(
  itemId: string,
  scriptText: string,
): Promise<string> {
  const encodedText = encodeURIComponent(scriptText);

  const queryUrl = `${VOICEVOX_HOST}/audio_query?text=${encodedText}&speaker=${defaultVoiceStyle.styleId}`;
  const synthesisUrl = `${VOICEVOX_HOST}/synthesis?speaker=${defaultVoiceStyle.styleId}`;

  const queryResponse = await fetch(queryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!queryResponse.ok) {
    throw new Error("VOICEVOX 音声合成クエリ生成に失敗しました");
  }

  const audioQuery = await queryResponse.json();

  const audioResponse = await fetch(synthesisUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(audioQuery),
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

  const filePath = path.resolve(outputDir, itemId); // Use the provided filename directly
  fs.writeFileSync(filePath, audioBuffer);

  return filePath;
}
