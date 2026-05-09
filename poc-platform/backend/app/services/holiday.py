from datetime import date, timedelta
from chinese_calendar import is_workday


def calculate_workdays(start: date, end: date) -> int:
    """Calculate working days between two dates, excluding weekends and Chinese holidays."""
    if start > end:
        return 0
    current = start
    count = 0
    while current <= end:
        if is_workday(current):
            count += 1
        current += timedelta(days=1)
    return count
