import { normalizeDays } from "../funnel";

// Regression coverage for the "daily" marker. The funnel web sends
// days: ["daily"]; normalizeDays used to drop it, producing routines with
// days = '{}' that the app filtered out on every weekday.
describe("normalizeDays", () => {
  it('expands the "daily" marker to all seven days', () => {
    expect(normalizeDays(["daily"])).toEqual(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]);
  });

  it('accepts casing and spacing variants of the daily marker', () => {
    const all = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    expect(normalizeDays(["Daily"])).toEqual(all);
    expect(normalizeDays(["EVERY DAY"])).toEqual(all);
    expect(normalizeDays(["every_day"])).toEqual(all);
  });

  it("never returns an empty list for a daily routine", () => {
    // This is the invariant that broke: an empty array means the routine is
    // invisible in the app on every single day.
    expect(normalizeDays(["daily"]).length).toBe(7);
  });

  it("maps English abbreviations to the stored Spanish ones", () => {
    expect(normalizeDays(["mon", "wed"])).toEqual(["Lun", "Mié"]);
    expect(normalizeDays(["Monday", "Friday"])).toEqual(["Lun", "Vie"]);
    expect(normalizeDays(["sat", "sun"])).toEqual(["Sáb", "Dom"]);
  });

  it("still supports the original contract: Spanish abbreviations and numbers", () => {
    expect(normalizeDays(["Lun", "Mié"])).toEqual(["Lun", "Mié"]);
    expect(normalizeDays([0, 2])).toEqual(["Dom", "Mar"]);
    expect(normalizeDays(["1", "3"])).toEqual(["Lun", "Mié"]);
  });

  it("keeps order and de-duplicates", () => {
    expect(normalizeDays(["Vie", "Lun", "Vie", "vie".toUpperCase()])).toEqual(["Vie", "Lun"]);
  });

  it("returns empty only when the input genuinely carries no day information", () => {
    expect(normalizeDays(undefined)).toEqual([]);
    expect(normalizeDays([])).toEqual([]);
    expect(normalizeDays(["no-es-un-dia"])).toEqual([]);
  });
});