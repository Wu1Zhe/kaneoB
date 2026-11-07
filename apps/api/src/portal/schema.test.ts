import { describe, it, expect } from "vite-plus/test";
import { validPortalUrl } from "./schema";
describe("portal URLs", () => {
  it("supports internal HTTP and HTTPS without accepting executable or credential URLs", () => {
    for (const url of [
      "http://localhost:8080",
      "http://10.1.2.3/oa",
      "https://example.test/wiki",
    ])
      expect(validPortalUrl(url)).toBe(true);
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "file:///etc/passwd",
      "https://user:secret@example.test",
      "not a URL",
    ])
      expect(validPortalUrl(url)).toBe(false);
  });
});
