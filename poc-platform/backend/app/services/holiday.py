from datetime import date, timedelta


def calculate_workdays(start: date, end: date) -> int:
    """Calculate working days between two dates, accounting for Chinese holidays and make-up workdays."""
    if start > end:
        return 0
    count = 0
    current = start
    while current <= end:
        if _is_workday(current):
            count += 1
        current += timedelta(days=1)
    return count


def _is_workday(d: date) -> bool:
    """Check if a date is a workday, considering Chinese holidays and make-up workdays.
    Falls back to standard Mon-Fri for years without holiday data."""
    try:
        from chinese_calendar import is_workday
        return is_workday(d)
    except NotImplementedError:
        return d.weekday() < 5
