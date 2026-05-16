from sqlalchemy import text


def run_migrations(engine):
    """Add missing soft-delete columns to existing tables (SQLite-safe)."""
    tables = ["poc_projects", "dashboards", "poc_project_logs", "poc_options", "sop_documents", "sop_test_cases", "sop_scripts", "sop_test_case_categories", "roles", "role_permissions", "users"]

    columns_to_add = [
        ("is_deleted", "BOOLEAN DEFAULT 0"),
        ("deleted_at", "DATETIME"),
        ("deleted_by", "VARCHAR(100)"),
    ]

    extra_cols = {
        "dashboards": [("deleted_charts", "JSON DEFAULT '[]'")],
        "sop_test_cases": [("category_id", "VARCHAR(36)")],
        "users": [("role_id", "VARCHAR(36)")],
    }

    with engine.connect() as conn:
        for table in tables:
            # Check table exists first
            row = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
                {"name": table}
            ).first()
            if not row:
                continue  # table doesn't exist yet

            result = conn.execute(text(f"PRAGMA table_info({table})"))
            existing_cols = {col[1] for col in result.fetchall()}

            for col_name, col_type in columns_to_add:
                if col_name not in existing_cols:
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                    ))

            for col_name, col_type in extra_cols.get(table, []):
                if col_name not in existing_cols:
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                    ))
            conn.commit()

        _perform_data_migration(engine)


def _perform_data_migration(engine):
    """Create default roles if they don't exist, and assign role_id to users."""
    import uuid

    with engine.connect() as conn:
        # Check if roles table exists first
        row = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'")
        ).first()
        if not row:
            return

        # Check if roles table has any rows — skip if already migrated
        count = conn.execute(text("SELECT COUNT(*) FROM roles")).scalar()
        if count > 0:
            return

        # Create super admin role
        super_role_id = str(uuid.uuid4())
        conn.execute(text(
            "INSERT INTO roles (id, name, description, is_super, created_at) "
            "VALUES (:id, :name, :desc, 1, datetime('now'))"
        ), {"id": super_role_id, "name": "超级管理员", "desc": "系统内置超级管理员，拥有全部权限"})

        # Create 普通用户 role
        user_role_id = str(uuid.uuid4())
        conn.execute(text(
            "INSERT INTO roles (id, name, description, is_super, created_at) "
            "VALUES (:id, :name, :desc, 0, datetime('now'))"
        ), {"id": user_role_id, "name": "普通用户", "desc": "默认普通用户，仅拥有各模块查看权限"})

        # Grant all 20 permissions to super admin
        modules = ["project", "dashboard", "sop", "recycle_bin", "settings"]
        actions = ["view", "create", "edit", "delete"]
        for m in modules:
            for a in actions:
                conn.execute(text(
                    "INSERT INTO role_permissions (role_id, module, action) VALUES (:rid, :m, :a)"
                ), {"rid": super_role_id, "m": m, "a": a})

        # Grant view-only permissions to 普通用户
        for m in modules:
            conn.execute(text(
                "INSERT INTO role_permissions (role_id, module, action) VALUES (:rid, :m, 'view')"
            ), {"rid": user_role_id, "m": m})

        # Assign existing users: admin → super admin role, user → normal user role
        conn.execute(text(
            "UPDATE users SET role_id = :rid WHERE role = 'admin'"
        ), {"rid": super_role_id})
        conn.execute(text(
            "UPDATE users SET role_id = :rid WHERE role = 'user'"
        ), {"rid": user_role_id})
        conn.commit()
