"""Seed default data: admin user and default options."""
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.poc_option import PocOption
from app.services.auth import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="管理员",
            role="admin",
        ))

    defaults = [
        ("poc_type", "实施型", 1),
        ("poc_type", "试用型", 2),
        ("impl_method", "SaaS", 1),
        ("impl_method", "本地化部署", 2),
        ("impl_method", "便携设备", 3),
        ("status", "未开始", 1),
        ("status", "准备中", 2),
        ("status", "进行中", 3),
        ("status", "已完成", 4),
        ("status", "搁置", 5),
    ]
    for cat, label, order in defaults:
        if not db.query(PocOption).filter(PocOption.category == cat, PocOption.label == label).first():
            db.add(PocOption(category=cat, label=label, is_default=True, sort_order=order))

    db.commit()
    db.close()
    print("Seed data created successfully.")


if __name__ == "__main__":
    seed()
