import uuid
from datetime import datetime, date
from sqlalchemy import JSON, String, Integer, Date, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class PocProject(Base):
    __tablename__ = "poc_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    region: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    sales: Mapped[str] = mapped_column(String(50), nullable=False)
    pm: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=True)
    poc_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("poc_options.id"), nullable=False)
    impl_method_id: Mapped[int] = mapped_column(Integer, ForeignKey("poc_options.id"), nullable=False)
    status_id: Mapped[int] = mapped_column(Integer, ForeignKey("poc_options.id"), nullable=False)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
