import fs from "fs";
import path from "path";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const polly = new PollyClient({ region: "ap-northeast-1" });

export async function generateTTS(
  itemId: string,
  scriptText: string,
): Promise<string> {
  const params = {
    OutputFormat: "mp3",
    Text: scriptText,
    VoiceId: "Mizuki",
    LanguageCode: "ja-JP",
  };
  const command = new SynthesizeSpeechCommand(params);
  const response = await polly.send(command);

  if (!response.AudioStream) {
    throw new Error("TTSのAudioStreamが空です");
  }

  const outputDir = path.join(__dirname, "../static/podcast_audio");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePath = path.resolve(outputDir, `${itemId}.mp3`);

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.AudioStream as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
