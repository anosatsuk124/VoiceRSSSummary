import fs from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import { config } from "./config.js";

interface VoiceStyle {
  styleId: number;
}

// 環境変数からデフォルトの声設定を取得
const defaultVoiceStyle: VoiceStyle = {
  styleId: config.voicevox.styleId,
};

export async function generateTTS(
  itemId: string,
  scriptText: string,
): Promise<string> {
  if (!itemId || itemId.trim() === "") {
    throw new Error("Item ID is required for TTS generation");
  }

  if (!scriptText || scriptText.trim() === "") {
    throw new Error("Script text is required for TTS generation");
  }

  console.log(`TTS生成開始: ${itemId}`);
  const encodedText = encodeURIComponent(scriptText);

  const queryUrl = `${config.voicevox.host}/audio_query?text=${encodedText}&speaker=${defaultVoiceStyle.styleId}`;
  const synthesisUrl = `${config.voicevox.host}/synthesis?speaker=${defaultVoiceStyle.styleId}`;

  try {
    const queryResponse = await fetch(queryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      throw new Error(
        `VOICEVOX audio query failed (${queryResponse.status}): ${errorText}`,
      );
    }

    const audioQuery = await queryResponse.json();

    console.log(`音声合成開始: ${itemId}`);
    const audioResponse = await fetch(synthesisUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(audioQuery),
      signal: AbortSignal.timeout(10000000), // タイムアウトを10分に設定
    });

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error(`音声合成失敗: ${itemId}`);
      throw new Error(
        `VOICEVOX synthesis failed (${audioResponse.status}): ${errorText}`,
      );
    }

    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    // 出力ディレクトリの準備
    const outputDir = config.paths.podcastAudioDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const wavFilePath = path.resolve(outputDir, `${itemId}.wav`);
    const mp3FilePath = path.resolve(outputDir, `${itemId}.mp3`);

    console.log(`WAVファイル保存開始: ${wavFilePath}`);
    fs.writeFileSync(wavFilePath, audioBuffer);
    console.log(`WAVファイル保存完了: ${wavFilePath}`);

    console.log(`MP3変換開始: ${wavFilePath} -> ${mp3FilePath}`);

    const ffmpegCmd = ffmpegPath || "ffmpeg";
    const result = Bun.spawnSync({
      cmd: [
        ffmpegCmd,
        "-i",
        wavFilePath,
        "-codec:a",
        "libmp3lame",
        "-qscale:a",
        "2",
        "-y", // Overwrite output file
        mp3FilePath,
      ],
    });

    if (result.exitCode !== 0) {
      const stderr = result.stderr
        ? new TextDecoder().decode(result.stderr)
        : "Unknown error";
      throw new Error(`FFmpeg conversion failed: ${stderr}`);
    }

    // Wavファイルを削除
    if (fs.existsSync(wavFilePath)) {
      fs.unlinkSync(wavFilePath);
    }

    console.log(`TTS生成完了: ${itemId}`);

    return path.basename(mp3FilePath);
  } catch (error) {
    console.error("Error generating TTS:", error);
    throw new Error(
      `Failed to generate TTS: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
