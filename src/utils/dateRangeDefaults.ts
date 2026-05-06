export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  const firstDayOfMonth = `${year}-${month}-01`;
  const lastDayOfMonth = `${year}-${month}-${lastDay}`;
  return { start: firstDayOfMonth, end: lastDayOfMonth };
}
