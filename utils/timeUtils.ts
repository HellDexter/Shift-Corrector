export function parseCzechDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null;
  const trimmedStr = dateTimeStr.trim();

  // Enhanced Regex: DD.MM.YY(YY) HH:MM(:SS) or DD/MM/YY(YY) HH:MM(:SS). 
  // Handles optional seconds, flexible spacing, and both dot and slash separators.
  const czechFormatMatch = trimmedStr.match(
    /^(\d{1,2})\s*[\.\/]\s*(\d{1,2})\s*[\.\/]\s*(\d{2}|\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/
  );

  if (czechFormatMatch) {
    let [, day, month, year, hour, minute, second] = czechFormatMatch.map(Number);
    second = second || 0; // Default to 0 if seconds are not present

    // Handle 2-digit year, assuming 21st century
    if (year < 100) {
      year += 2000;
    }

    // Basic validation of parsed components. Month is 1-based.
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
      const date = new Date(year, month - 1, day, hour, minute, second);
      // Final check for date validity (e.g. rejects Feb 30)
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
      }
    }
  }

  // Fallback: Try JS native Date parsing for ISO formats or other standards.
  // This is useful if the spreadsheet software provides a standard format.
  const nativeParsedDate = new Date(trimmedStr);
  if (!isNaN(nativeParsedDate.getTime())) {
    // Be careful with formats like MM/DD/YYYY which native parser might assume
    // but our Czech format is DD/MM. The regex should catch our format first.
    return nativeParsedDate;
  }

  return null; // Return null if all parsing attempts fail
}

export function formatToCzechDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function formatToISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


export function formatDuration(totalMilliseconds: number): string {
  if (totalMilliseconds < 0) totalMilliseconds = 0;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  return `${String(totalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function calculateTimeInCountry(
  arrivalStr: string,
  departureStr: string
): string {
  const arrivalDate = parseCzechDateTime(arrivalStr);
  const departureDate = parseCzechDateTime(departureStr);

  if (!arrivalDate || !departureDate || arrivalDate.getTime() >= departureDate.getTime()) {
    return "00:00:00";
  }
  
  const totalMilliseconds = departureDate.getTime() - arrivalDate.getTime();
  return formatDuration(totalMilliseconds);
}

const czechDays = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
export function getCzechDayOfWeek(date: Date): string {
  return czechDays[date.getDay()];
}

export function isRangeOverlappingWeekend(startDate: Date, endDate: Date): boolean {
  if (startDate.getTime() >= endDate.getTime()) {
    return false; // Invalid range or single point in time, check only start/end day if needed separately
  }

  let currentDate = new Date(startDate.getTime());

  while (currentDate.getTime() <= endDate.getTime()) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 for Sunday, 6 for Saturday
      return true;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return false;
}