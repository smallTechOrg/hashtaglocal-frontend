import { calculateDaysActive } from "@/utils/FormatDate";

describe("calculateDaysActive", () => {
  it("returns days correctly", () => {
    const days = calculateDaysActive("2025-12-26T00:00:00");
    expect(days).toMatch(/\d+ days/);
  });

  it("returns empty string for invalid date", () => {
    expect(calculateDaysActive("")).toBe("");
  });
});
