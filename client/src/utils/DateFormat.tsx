export const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const dateStr = date.toLocaleDateString('en-US', options);
  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });

  return `${dateStr} (${dayStr})`;
};

export const removeTimeZone = (date: string | Date): string => {
  if (typeof date === 'string') {
    return removeTimeZoneFromString(date);
  } else if (date instanceof Date) {
    return removeTimeZoneFromDate(date);
  }

  return '';
}

const removeTimeZoneFromString = (date: string): string => {
  return date.split('T')[0];
}

const removeTimeZoneFromDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
}