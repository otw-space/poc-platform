from sqlalchemy.orm import Session
from ..models.operation_log import OperationLog
from ..models.user import User


def log_operation(
    db: Session,
    user: User,
    action: str,
    target_type: str,
    target_name: str,
    details: str | None = None,
):
    """Write an operation audit log entry."""
    entry = OperationLog(
        user_id=user.id,
        username=user.display_name or user.username,
        action=action,
        target_type=target_type,
        target_name=target_name,
        details=details,
    )
    db.add(entry)
    db.commit()
