import { OpenAI, ClientOptions } from "openai";

const clientOptions: ClientOptions = {
  apiKey: import.meta.env["OPENAI_API_KEY"] ?? "",
};
const openai = new OpenAI(clientOptions);

export async function openAI_GenerateScript(item: {
  title: string;
  link: string;
  contentSnippet?: string;
}): Promise<string> {
  const prompt = `
あなたはポッドキャスターです。以下の情報をもとに、リスナー向けにわかりやすい日本語のポッドキャスト原稿を書いてください。

- 記事タイトル: ${item.title}
- 記事リンク: ${item.link}
- 記事概要: ${item.contentSnippet || "なし"}

「今日のニュース記事をご紹介します…」といった導入も含め、約300文字程度でまとめてください。
`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt.trim() }],
    temperature: 0.7,
  });
  const scriptText = response.choices[0].message?.content?.trim() || "";
  return scriptText;
}
