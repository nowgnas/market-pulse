import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export interface AIProvider {
  name: string;
  isAvailable: () => boolean;
  summarize: (prompt: string) => Promise<string>;
}

const SYSTEM_PROMPT =
  "당신은 한국/미국 증시와 경제 뉴스를 분석하는 전문 금융 에디터입니다. 뉴스 본문 내용을 근거로 심층 분석 포스팅을 작성합니다. 반드시 유효한 JSON 형식으로만 응답하세요.";

const openaiProvider: AIProvider = {
  name: "OpenAI",
  isAvailable: () => !!process.env.OPENAI_API_KEY,
  summarize: async (prompt: string) => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });
    return completion.choices[0]?.message?.content || "";
  },
};

const geminiProvider: AIProvider = {
  name: "Gemini",
  isAvailable: () => !!process.env.GEMINI_API_KEY,
  summarize: async (prompt: string) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 4096 },
    });

    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\n${prompt}`
    );
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : response;
  },
};

const claudeProvider: AIProvider = {
  name: "Claude",
  isAvailable: () => !!process.env.ANTHROPIC_API_KEY,
  summarize: async (prompt: string) => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${SYSTEM_PROMPT}\n\n${prompt}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const response = textBlock && "text" in textBlock ? textBlock.text : "";

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : response;
  },
};

export const aiProviders: AIProvider[] = [
  openaiProvider,
  geminiProvider,
  claudeProvider,
];

export function getAvailableProviders(): AIProvider[] {
  return aiProviders.filter((provider) => provider.isAvailable());
}
