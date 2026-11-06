import type { AnkiCardData } from "@/shared/types";

export class CardParseError extends Error {
  status = 422;

  constructor(message: string) {
    super(message);
    this.name = "CardParseError";
  }
}

function parseJsonLoose(content: string): unknown {
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Fall through to the same error as a bare parse failure.
      }
    }
    throw new CardParseError("無法解析 API 回應，請重試");
  }
}

export function parseCards(content: string): AnkiCardData[] {
  const parsed = parseJsonLoose(content);
  if (!Array.isArray(parsed)) {
    throw new CardParseError("API 回應不是卡片陣列，請重試");
  }

  return parsed.map((item) => {
    if (!item || typeof item !== "object") {
      throw new CardParseError("API 回應不是卡片陣列，請重試");
    }
    const card = item as Partial<AnkiCardData>;
    const front = typeof card.front === "string" ? card.front.trim() : "";
    if (!front) throw new CardParseError("API 回應缺少單字，請重試");
    return {
      front,
      back: typeof card.back === "string" ? card.back : "",
      example: typeof card.example === "string" ? card.example : "",
      related: typeof card.related === "string" ? card.related : "",
    };
  });
}
