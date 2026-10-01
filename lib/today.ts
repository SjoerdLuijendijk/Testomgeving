/** Today's date in the Netherlands as YYYY-MM-DD (the Swedish locale formats dates that way). */
export function todayInNetherlands(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(now);
}
