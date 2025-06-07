import fs from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import { config } from "./config.js";

/**
 * Split text into natural chunks for TTS processing
 * Aims for approximately 50 characters per chunk, breaking at natural points
 */
function splitTextIntoChunks(text: string, maxLength: number = 50): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = "";

  // Split by sentences first (Japanese periods and line breaks)
  const sentences = text.split(/([。！？\n])/);
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (!sentence) continue;
    
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // If single sentence is too long, split further
      if (sentence.length > maxLength) {
        const subChunks = splitLongSentence(sentence, maxLength);
        chunks.push(...subChunks);
        currentChunk = "";
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Split a long sentence at natural break points (commas, particles, etc.)
 */
function splitLongSentence(sentence: string, maxLength: number): string[] {
  if (sentence.length <= maxLength) {
    return [sentence];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by commas and common Japanese particles
  const parts = sentence.split(/([、，,]|[はがでをにと])/);
  
  for (const part of parts) {
    if (currentChunk.length + part.length <= maxLength) {
      currentChunk += part;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = part;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If still too long, force split by character limit
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > maxLength) {
      for (let i = 0; i < chunk.length; i += maxLength) {
        finalChunks.push(chunk.slice(i, i + maxLength));
      }
    } else {
      finalChunks.push(chunk);
    }
  }
  
  return finalChunks.filter(chunk => chunk.length > 0);
}

interface VoiceStyle {
  styleId: number;
}

// 環境変数からデフォルトの声設定を取得
const defaultVoiceStyle: VoiceStyle = {
  styleId: config.voicevox.styleId,
};

/**
 * Generate audio for a single text chunk
 */
async function generateAudioForChunk(
  chunkText: string,
  chunkIndex: number,
  itemId: string,
): Promise<string> {
  const encodedText = encodeURIComponent(chunkText);
  const queryUrl = `${config.voicevox.host}/audio_query?text=${encodedText}&speaker=${defaultVoiceStyle.styleId}`;
  const synthesisUrl = `${config.voicevox.host}/synthesis?speaker=${defaultVoiceStyle.styleId}`;

  console.log(`チャンク${chunkIndex + 1}の音声クエリ開始: ${itemId} (${chunkText.length}文字)`);

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
      `VOICEVOX audio query failed for chunk ${chunkIndex + 1} (${queryResponse.status}): ${errorText}`,
    );
  }

  const audioQuery = await queryResponse.json();

  console.log(`チャンク${chunkIndex + 1}の音声合成開始: ${itemId}`);
  const audioResponse = await fetch(synthesisUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(audioQuery),
    signal: AbortSignal.timeout(300000), // 5分のタイムアウト (チャンクごと)
  });

  if (!audioResponse.ok) {
    const errorText = await audioResponse.text();
    throw new Error(
      `VOICEVOX synthesis failed for chunk ${chunkIndex + 1} (${audioResponse.status}): ${errorText}`,
    );
  }

  const audioArrayBuffer = await audioResponse.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);

  // 出力ディレクトリの準備
  const outputDir = config.paths.podcastAudioDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const chunkWavPath = path.resolve(outputDir, `${itemId}_chunk_${chunkIndex}.wav`);
  fs.writeFileSync(chunkWavPath, audioBuffer);
  
  console.log(`チャンク${chunkIndex + 1}のWAVファイル保存完了: ${chunkWavPath}`);
  
  return chunkWavPath;
}

/**
 * Concatenate multiple WAV files into a single MP3 file
 */
async function concatenateAudioFiles(
  wavFiles: string[],
  outputMp3Path: string,
): Promise<void> {
  const ffmpegCmd = ffmpegPath || "ffmpeg";
  
  // Create a temporary file list for FFmpeg concat
  const tempDir = config.paths.podcastAudioDir;
  const listFilePath = path.resolve(tempDir, `concat_list_${Date.now()}.txt`);
  
  try {
    // Write file list in FFmpeg concat format
    const fileList = wavFiles.map(file => `file '${path.resolve(file)}'`).join('\n');
    fs.writeFileSync(listFilePath, fileList);

    console.log(`音声ファイル結合開始: ${wavFiles.length}個のファイルを結合 -> ${outputMp3Path}`);

    const result = Bun.spawnSync([
      ffmpegCmd,
      "-f", "concat",
      "-safe", "0",
      "-i", listFilePath,
      "-codec:a", "libmp3lame",
      "-qscale:a", "2",
      "-y", // Overwrite output file
      outputMp3Path,
    ]);

    if (result.exitCode !== 0) {
      const stderr = result.stderr
        ? new TextDecoder().decode(result.stderr)
        : "Unknown error";
      throw new Error(`FFmpeg concatenation failed: ${stderr}`);
    }

    console.log(`音声ファイル結合完了: ${outputMp3Path}`);
  } finally {
    // Clean up temporary files
    if (fs.existsSync(listFilePath)) {
      fs.unlinkSync(listFilePath);
    }
    
    // Clean up individual WAV files
    for (const wavFile of wavFiles) {
      if (fs.existsSync(wavFile)) {
        fs.unlinkSync(wavFile);
      }
    }
  }
}

/**
 * Generate TTS without adding to retry queue on failure
 * Used for retry queue processing to avoid infinite loops
 */
export async function generateTTSWithoutQueue(
  itemId: string,
  scriptText: string,
  retryCount: number = 0,
): Promise<string> {
  if (!itemId || itemId.trim() === "") {
    throw new Error("Item ID is required for TTS generation");
  }

  if (!scriptText || scriptText.trim() === "") {
    throw new Error("Script text is required for TTS generation");
  }

  console.log(`TTS生成開始: ${itemId} (試行回数: ${retryCount + 1}, ${scriptText.length}文字)`);

  // Split text into chunks
  const chunks = splitTextIntoChunks(scriptText.trim());
  console.log(`テキストを${chunks.length}個のチャンクに分割: ${itemId}`);
  
  if (chunks.length === 0) {
    throw new Error("No valid text chunks generated");
  }

  const outputDir = config.paths.podcastAudioDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const mp3FilePath = path.resolve(outputDir, `${itemId}.mp3`);
  const generatedWavFiles: string[] = [];

  try {
    // Generate audio for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      console.log(`チャンク${i + 1}/${chunks.length}処理中: "${chunk.substring(0, 30)}${chunk.length > 30 ? '...' : ''}"`);
      
      const wavPath = await generateAudioForChunk(chunk, i, itemId);
      generatedWavFiles.push(wavPath);
    }

    // Concatenate all audio files
    if (generatedWavFiles.length === 1) {
      // Single chunk - just convert to MP3
      const ffmpegCmd = ffmpegPath || "ffmpeg";
      const firstWavFile = generatedWavFiles[0];
      if (!firstWavFile) {
        throw new Error("No WAV files generated");
      }
      
      const result = Bun.spawnSync([
        ffmpegCmd,
        "-i", firstWavFile,
        "-codec:a", "libmp3lame",
        "-qscale:a", "2",
        "-y",
        mp3FilePath,
      ]);

      if (result.exitCode !== 0) {
        const stderr = result.stderr
          ? new TextDecoder().decode(result.stderr)
          : "Unknown error";
        throw new Error(`FFmpeg conversion failed: ${stderr}`);
      }
      
      // Clean up WAV file
      fs.unlinkSync(firstWavFile);
    } else {
      // Multiple chunks - concatenate them
      await concatenateAudioFiles(generatedWavFiles, mp3FilePath);
    }

    console.log(`TTS生成完了: ${itemId} (${chunks.length}チャンク)`);
    return path.basename(mp3FilePath);

  } catch (error) {
    // Clean up any generated files on error
    for (const wavFile of generatedWavFiles) {
      if (fs.existsSync(wavFile)) {
        fs.unlinkSync(wavFile);
      }
    }
    
    throw error;
  }
}

export async function generateTTS(
  itemId: string,
  scriptText: string,
  retryCount: number = 0,
): Promise<string> {
  const maxRetries = 2;
  
  try {
    return await generateTTSWithoutQueue(itemId, scriptText, retryCount);
  } catch (error) {
    console.error(`TTS生成エラー: ${itemId} (試行回数: ${retryCount + 1})`, error);
    
    if (retryCount < maxRetries) {
      // Add to queue for retry only on initial failure
      const { addToQueue } = await import("../services/database.js");
      await addToQueue(itemId, scriptText, retryCount);
      throw new Error(`TTS generation failed, added to retry queue: ${error}`);
    } else {
      throw new Error(`TTS generation failed after ${maxRetries + 1} attempts: ${error}`);
    }
  }
}
