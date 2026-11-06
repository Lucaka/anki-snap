import { describe, expect, it } from "vitest";
import { CardParseError, parseCards } from "../parse-cards";

const card = {
  front: "resist",
  back: "動詞 / 抵抗",
  example: "They resist change.",
  related: "resistant",
};

describe("parseCards", () => {
  it("parses a JSON array", () => {
    expect(parseCards(JSON.stringify([card]))).toEqual([card]);
  });

  it("strips a json fence", () => {
    expect(parseCards("```json\n" + JSON.stringify([card]) + "\n```")).toEqual([card]);
  });

  it("extracts an array wrapped in prose", () => {
    expect(parseCards(`here you go:\n${JSON.stringify([card])}\nthanks`)).toEqual([card]);
  });

  it("returns an empty array when the model found nothing", () => {
    expect(parseCards("[]")).toEqual([]);
  });

  it("rejects an object", () => {
    expect(() => parseCards(JSON.stringify(card))).toThrow(CardParseError);
    expect(() => parseCards(JSON.stringify(card))).toThrow("不是卡片陣列");
  });

  it("rejects a card with no front", () => {
    expect(() => parseCards(JSON.stringify([{ ...card, front: "  " }]))).toThrow("缺少單字");
  });

  it("rejects text that is not JSON", () => {
    expect(() => parseCards("not json")).toThrow("無法解析");
  });
});
