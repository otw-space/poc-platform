from datetime import date, timedelta


def calculate_workdays(start: date, end: date) -> int:
    """Calculate working days between two dates, excluding weekends and Chinese holidays."""
    if start > end:
        return 0
    current = start
    count = 0
    while current <= end:
        if current.weekday() < 5:  # Mon-Fri
            if not _is_chinese_holiday(current):
                count += 1
        current += timedelta(days=1)
    return count


def _is_chinese_holiday(d: date) -> bool:
    """Check if date is a Chinese public holiday. Falls back gracefully for years without data."""
    try:
        from chinese_calendar import is_holiday
        return is_holiday(d)
    except NotImplementedError:
        return False
