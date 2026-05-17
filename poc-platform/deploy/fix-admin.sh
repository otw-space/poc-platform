#!/usr/bin/env bash
# 一键修复 admin 权限：创建超管角色并绑定
# 用法：先 rsync 到服务器，然后在服务器上执行
#   rsync fix-admin.sh root@IP:/opt/poc-platform/
#   ssh root@IP "cd /opt/poc-platform && bash fix-admin.sh"

docker exec -i poc-platform python3 << 'PYEOF'
from app.database import SessionLocal
from app.models.role import Role, RolePermission
from app.models.user import User

db = SessionLocal()

# 如果超管角色不存在才创建
r = db.query(Role).filter(Role.is_super == True).first()
if not r:
    r = Role(name="超级管理员", description="系统内置超管", is_super=True)
    db.add(r)
    db.flush()
    for m in ["project", "dashboard", "sop", "recycle_bin", "settings"]:
        for a in ["view", "create", "edit", "delete"]:
            db.add(RolePermission(role_id=r.id, module=m, action=a))

# 绑定 admin
u = db.query(User).filter(User.username == "admin").first()
u.role_id = r.id

db.commit()
print("Done - admin now has super admin role")
PYEOF
