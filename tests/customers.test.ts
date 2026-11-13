import { describe, expect, it } from "vitest";
import { customerKey, emailFor } from "@/lib/customers";

describe("customer memory", () => {
  const list = [
    { name: "Maria Lopez", email: "maria@example.com" },
    { name: "John Miller", email: "" },
  ];
  it("matches names regardless of case and spacing", () => {
    expect(customerKey("  Maria   LOPEZ ")).toBe("maria lopez");
    expect(emailFor(list, "maria lopez")).toBe("maria@example.com");
  });
  it("returns nothing for unknown names or customers without an email", () => {
    expect(emailFor(list, "Dana Smith")).toBe("");
    expect(emailFor(list, "John Miller")).toBe("");
  });
});
