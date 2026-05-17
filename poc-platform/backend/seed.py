"""Seed default data: admin user, roles, and default options."""
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.role import Role, RolePermission
from app.models.poc_option import PocOption
from app.services.auth import hash_password

DEFAULT_ROLES = [
    {
        "name": "超级管理员",
        "description": "系统内置超级管理员，拥有全部权限",
        "is_super": True,
        "permissions": [
            ("project", "view"), ("project", "create"), ("project", "edit"), ("project", "delete"),
            ("dashboard", "view"), ("dashboard", "create"), ("dashboard", "edit"), ("dashboard", "delete"),
            ("sop", "view"), ("sop", "create"), ("sop", "edit"), ("sop", "delete"),
            ("recycle_bin", "view"), ("recycle_bin", "create"), ("recycle_bin", "edit"), ("recycle_bin", "delete"),
            ("settings", "view"), ("settings", "create"), ("settings", "edit"), ("settings", "delete"),
        ],
    },
    {
        "name": "实施工程师",
        "description": "负责项目实施",
        "is_super": False,
        "permissions": [
            ("project", "view"), ("project", "create"), ("project", "edit"),
            ("sop", "view"), ("sop", "create"), ("sop", "edit"),
            ("dashboard", "view"),
        ],
    },
    {
        "name": "普通用户",
        "description": "默认普通用户，仅拥有各模块查看权限",
        "is_super": False,
        "permissions": [
            ("project", "view"), ("dashboard", "view"), ("sop", "view"),
            ("recycle_bin", "view"), ("settings", "view"),
        ],
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 创建默认角色
    for rd in DEFAULT_ROLES:
        if not db.query(Role).filter(Role.name == rd["name"]).first():
            role = Role(name=rd["name"], description=rd["description"], is_super=rd["is_super"])
            db.add(role)
            db.flush()
            for m, a in rd["permissions"]:
                db.add(RolePermission(role_id=role.id, module=m, action=a))

    # 创建管理员用户并绑定超管角色
    super_admin_role = db.query(Role).filter(Role.is_super == True).first()
    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="管理员",
            role="admin",
            role_id=super_admin_role.id if super_admin_role else None,
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
