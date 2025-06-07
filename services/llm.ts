import { OpenAI, ClientOptions } from "openai";
import { config, validateConfig } from "./config.js";

// Validate config on module load
validateConfig();

const clientOptions: ClientOptions = {
  apiKey: config.openai.apiKey,
  baseURL: config.openai.endpoint,
};
const openai = new OpenAI(clientOptions);

export async function openAI_ClassifyFeed(title: string): Promise<string> {
  if (!title || title.trim() === "") {
    throw new Error("Feed title is required for classification");
  }

  const prompt = `
以下のRSSフィードのタイトルを見て、適切なトピックカテゴリに分類してください。

フィードタイトル: ${title}

以下のカテゴリから1つを選択してください:
- テクノロジー
- ビジネス
- エンターテインメント
- スポーツ
- 科学
- 健康
- 政治
- 環境
- 教育
- その他

分類結果を上記カテゴリのいずれか1つだけ返してください。
`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.modelName,
      messages: [{ role: "user", content: prompt.trim() }],
      temperature: 0.3,
    });

    const category = response.choices[0]?.message?.content?.trim();
    if (!category) {
      console.warn("OpenAI returned empty category, using default");
      return "その他";
    }

    return category;
  } catch (error) {
    console.error("Error classifying feed:", error);
    throw new Error(
      `Failed to classify feed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function openAI_GeneratePodcastContent(
  title: string,
  items: Array<{ title: string; link: string }>,
): Promise<string> {
  if (!title || title.trim() === "") {
    throw new Error("Feed title is required for podcast content generation");
  }

  if (!items || items.length === 0) {
    throw new Error(
      "At least one news item is required for podcast content generation",
    );
  }

  // Validate items
  const validItems = items.filter((item) => item.title && item.link);
  if (validItems.length === 0) {
    throw new Error("No valid news items found (title and link required)");
  }

  const prompt = `
あなたはプロのポッドキャスタです。以下に示すフィードタイトルに基づき、そのトピックに関する詳細なポッドキャスト原稿を作成してください。

フィードタイトル: ${title}

関連するニュース記事:
${validItems.map((item, i) => `${i + 1}. ${item.title} - ${item.link}`).join("\n")}

以下の要件を満たしてください:
1. もし英単語が含まれている場合は、すべてカタカナに変換してください (例: "Google" → "グーグル")
2. もし英語の文が含まれている場合は、すべて日本語に翻訳してください
3. 各ニュース記事の内容を要約し、関連性を説明してください
4. 視聴者にとっての価値や興味ポイントを解説してください
5. 約1000文字〜1500文字程度の長さにしてください
6. 自然な日本語の口語表現を使ってください
7. トピック全体のまとめで締めくくってください

この構成でポッドキャスト原稿を書いてください。
`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.modelName,
      messages: [{ role: "user", content: prompt.trim() }],
      temperature: 0.7,
    });

    const scriptText = response.choices[0]?.message?.content?.trim();
    if (!scriptText) {
      throw new Error("OpenAI returned empty podcast content");
    }

    return scriptText;
  } catch (error) {
    console.error("Error generating podcast content:", error);
    throw new Error(
      `Failed to generate podcast content: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
