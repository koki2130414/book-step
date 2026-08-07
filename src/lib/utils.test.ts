import { describe, it, expect } from "vitest";
import { isSafeUrl, toSafeYoutubeEmbedUrl } from "./utils";

describe("isSafeUrl", () => {
  it("空の値は許可する(任意項目のため)", () => {
    expect(isSafeUrl(undefined)).toBe(true);
    expect(isSafeUrl(null)).toBe(true);
    expect(isSafeUrl("")).toBe(true);
  });

  it("http/httpsのURLを許可する", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  it("危険なスキームを拒否する", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("不正な形式のURLを拒否する", () => {
    expect(isSafeUrl("not a url")).toBe(false);
  });
});

describe("toSafeYoutubeEmbedUrl", () => {
  it("watch形式のURLから埋め込みURLを生成する", () => {
    expect(toSafeYoutubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("短縮URL(youtu.be)からも生成できる", () => {
    expect(toSafeYoutubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("YouTube以外のURLはnullを返す(任意のiframe srcを許可しない)", () => {
    expect(toSafeYoutubeEmbedUrl("https://example.com/video")).toBeNull();
  });

  it("未入力はnullを返す", () => {
    expect(toSafeYoutubeEmbedUrl(undefined)).toBeNull();
  });
});
