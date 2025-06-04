import { OpenAI, ClientOptions } from "openai";

const clientOptions: ClientOptions = {
  apiKey: import.meta.env["OPENAI_API_KEY"],
  baseURL: import.meta.env["OPENAI_API_ENDPOINT"],
};
const openai = new OpenAI(clientOptions);

export async function openAI_ClassifyFeed(title: string): Promise<string> {
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
  const response = await openai.chat.completions.create({
    model: import.meta.env["OPENAI_MODEL_NAME"] ?? "gpt-4o-mini",
    messages: [{ role: "user", content: prompt.trim() }],
    temperature: 0.3,
  });
  const category = response.choices[0]!.message?.content?.trim() || "その他";
  return category;
}

export async function openAI_GeneratePodcastContent(
  title: string,
  items: Array<{ title: string; link: string }>
): Promise<string> {
  const prompt = `
あなたはプロのポッドキャスタです。以下に示すフィードタイトルに基づき、そのトピックに関する詳細なポッドキャスト原稿を作成してください。

フィードタイトル: ${title}

関連するニュース記事:
${items.map((item, i) => `${i + 1}. ${item.title} - ${item.link}`).join("\n")}

以下の要件を満たしてください:
1. トピックの簡単なイントロダクションから始めてください
2. 各ニュース記事の内容を要約し、関連性を説明してください
3. 視聴者にとっての価値や興味ポイントを解説してください
4. 約1000文字〜1500文字程度の長さにしてください
5. 自然な日本語の口語表現を使ってください
6. トピック全体のまとめで締めくくってください

この構成でポッドキャスト原稿を書いてください。
`;
  const response = await openai.chat.completions.create({
    model: import.meta.env["OPENAI_MODEL_NAME"] ?? "gpt-4o-mini",
    messages: [{ role: "user", content: prompt.trim() }],
    temperature: 0.7,
  });
  const scriptText = response.choices[0]!.message?.content?.trim() || "";
  return scriptText;
}
