import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays,
  subDays,
  isBefore,
  isAfter,
  isSameMonth,
  format
} from 'date-fns';

/**
 * Calculates monthly period dates adjusted for complete weeks.
 * 
 * Logic: When a week starts in one month and ends in another,
 * the extra days are merged into the previous month.
 * 
 * Example: If December ends on a Wednesday (Dec 31),
 * then Dec 29-31 (Sunday-Wednesday) belong to December.
 * If January starts on a Thursday (Jan 1), 
 * then Jan 1-4 (Thursday-Saturday) also belong to December.
 * January would start from the next Sunday (Jan 5).
 */
export function getAdjustedMonthlyPeriod(date: Date = new Date()) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  // Find the first Sunday of the month or the month start if it's a Sunday
  let adjustedStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  
  // If the week starts before the month, use the actual month start
  // The "extra days" from the broken week at the start belong to the previous month
  if (isBefore(adjustedStart, monthStart)) {
    // Start from the next Sunday
    adjustedStart = startOfWeek(addDays(monthStart, 7), { weekStartsOn: 0 });
  }
  
  // Special case: if the month starts on a Sunday, use that day
  if (monthStart.getDay() === 0) {
    adjustedStart = monthStart;
  }
  
  // Find the last Saturday of the month or include days until the week ends
  // If the week extends into the next month, keep the extended end; otherwise use monthEnd.
  const adjustedEnd = isAfter(endOfWeek(monthEnd, { weekStartsOn: 0 }), monthEnd)
    ? endOfWeek(monthEnd, { weekStartsOn: 0 })
    : monthEnd;
  
  return {
    start: adjustedStart,
    end: adjustedEnd,
    originalMonthStart: monthStart,
    originalMonthEnd: monthEnd,
    formattedStart: format(adjustedStart, 'yyyy-MM-dd'),
    formattedEnd: format(adjustedEnd, 'yyyy-MM-dd'),
    label: `${format(adjustedStart, 'dd/MM')} - ${format(adjustedEnd, 'dd/MM/yyyy')}`,
  };
}

/**
 * Gets the adjusted period for a specific month by index (0 = current, 1 = previous, etc.)
 */
export function getAdjustedMonthlyPeriodByOffset(monthsBack: number = 0) {
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() - monthsBack);
  return getAdjustedMonthlyPeriod(targetDate);
}

/**
 * Checks if a date falls within an adjusted monthly period
 */
export function isDateInAdjustedPeriod(date: Date, period: ReturnType<typeof getAdjustedMonthlyPeriod>) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  return !isBefore(dateOnly, period.start) && !isAfter(dateOnly, period.end);
}

/**
 * Returns period label for display
 */
export function getPeriodDisplayLabel(period: 'week' | 'month', date: Date = new Date()) {
  if (period === 'week') {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
    return `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
  } else {
    const adjusted = getAdjustedMonthlyPeriod(date);
    return adjusted.label;
  }
}
