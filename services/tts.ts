import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

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
  console.log(`TTS生成開始: ${itemId}`);
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

  console.log(`音声合成開始: ${itemId}`);
  const audioResponse = await fetch(synthesisUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(audioQuery),
  });

  if (!audioResponse.ok) {
    console.error(`音声合成失敗: ${itemId}`);
    throw new Error("VOICEVOX 音声合成に失敗しました");
  }

  const audioArrayBuffer = await audioResponse.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);

  // 出力ディレクトリの準備
  const outputDir = path.join(__dirname, "../public/podcast_audio");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const wavFilePath = path.resolve(outputDir, `${itemId}.wav`);
  const mp3FilePath = path.resolve(outputDir, `${itemId}.mp3`);

  console.log(`WAVファイル保存開始: ${wavFilePath}`);
  fs.writeFileSync(wavFilePath, audioBuffer);
  console.log(`WAVファイル保存完了: ${wavFilePath}`);

  console.log(`MP3変換開始: ${wavFilePath} -> ${mp3FilePath}`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(wavFilePath)
      .audioCodec("libmp3lame")
      .format("mp3")
      .on("end", () => {
        console.log(`MP3変換完了: ${mp3FilePath}`);
        fs.unlinkSync(wavFilePath); // WAVファイルを削除
        resolve();
      })
      .on("error", (err) => {
        console.error(`MP3変換エラー: ${err.message}`);
        reject(err);
      })
      .save(mp3FilePath);
  });

  return path.basename(mp3FilePath);
}
