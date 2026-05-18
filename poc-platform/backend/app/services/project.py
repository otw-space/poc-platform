from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from ..models.poc_project import PocProject
from ..models.poc_option import PocOption
from .holiday import calculate_workdays


def apply_project_filters(db: Session, query, filters: list[dict], filter_mode: str = "and"):
    op_map = {
        "eq": lambda col, val: col == val,
        "neq": lambda col, val: col != val,
        "in": lambda col, val: col.in_(val),
        "gte": lambda col, val: col >= val,
        "lte": lambda col, val: col <= val,
        "like": lambda col, val: col.like(f"%{val}%"),
    }
    clauses = []
    for f in filters:
        field = f["field"]
        op = f["op"]
        value = f["value"]
        if field == "poc_type":
            opt_ids = (
                db.query(PocOption.id)
                .filter(PocOption.category == "poc_type", PocOption.label.in_(value if isinstance(value, list) else [value]))
                .all()
            )
            clauses.append(PocProject.poc_type_id.in_([r[0] for r in opt_ids]))
        elif field == "impl_method":
            opt_ids = (
                db.query(PocOption.id)
                .filter(PocOption.category == "impl_method", PocOption.label.in_(value if isinstance(value, list) else [value]))
                .all()
            )
            clauses.append(PocProject.impl_method_id.in_([r[0] for r in opt_ids]))
        elif field == "status":
            opt_ids = (
                db.query(PocOption.id)
                .filter(PocOption.category == "status", PocOption.label.in_(value if isinstance(value, list) else [value]))
                .all()
            )
            clauses.append(PocProject.status_id.in_([r[0] for r in opt_ids]))
        elif hasattr(PocProject, field) and op in op_map:
            col = getattr(PocProject, field)
            clauses.append(op_map[op](col, value))

    if clauses:
        if filter_mode == "or":
            query = query.filter(or_(*clauses))
        else:
            for c in clauses:
                query = query.filter(c)
    return query


def execute_dashboard_query(db: Session, x_field: str, y_field: str, filters: list[dict], aggregate: bool = False, filter_mode: str = "and", group_field: str | None = None) -> list[dict]:
    query = db.query(PocProject).filter(PocProject.is_deleted == False)
    query = apply_project_filters(db, query, filters, filter_mode)

    # Resolve a field to a column (handles option label joins)
    def resolve_field(field):
        col = getattr(PocProject, field, None)
        if col is not None:
            return col, False
        if field in ("poc_type", "impl_method", "status"):
            cat_map = {"poc_type": "poc_type", "impl_method": "impl_method", "status": "status"}
            id_col = {"poc_type": PocProject.poc_type_id, "impl_method": PocProject.impl_method_id, "status": PocProject.status_id}[field]
            return PocOption.label, True, cat_map[field], id_col
        return None, False

    # Aggregate mode: return a single total value, no GROUP BY
    if aggregate:
        if y_field == "count":
            total = query.count()
            return [{"x": "total", "y": float(total)}]
        if y_field == "avg_duration":
            rows = query.with_entities(PocProject.start_date, PocProject.end_date).all()
            if not rows:
                return [{"x": "average", "y": 0.0}]
            durations = [calculate_workdays(sd, ed) for sd, ed in rows]
            return [{"x": "average", "y": round(sum(durations) / len(durations), 1)}]
        raise ValueError(f"Unknown y_field: {y_field}")

    def join_option(field):
        """Join PocOption for label-based fields; returns (column, needs_join_flag)."""
        col = getattr(PocProject, field, None)
        if col is not None:
            return col, False
        if field in ("poc_type", "impl_method", "status"):
            cat_map = {"poc_type": "poc_type", "impl_method": "impl_method", "status": "status"}
            id_col = {"poc_type": PocProject.poc_type_id, "impl_method": PocProject.impl_method_id, "status": PocProject.status_id}[field]
            return PocOption.label, True, cat_map[field], id_col
        return None, False

    x_resolved = join_option(x_field)
    if x_resolved[0] is None:
        raise ValueError(f"Unknown x_field: {x_field}")
    x_col = x_resolved[0]
    need_join = x_resolved[1]
    if need_join:
        cat = x_resolved[2]
        id_col = x_resolved[3]
        query = query.join(PocOption, id_col == PocOption.id).filter(PocOption.category == cat)

    # Resolve group_field (secondary dimension) if provided
    g_col = None
    if group_field:
        g_resolved = join_option(group_field)
        if g_resolved[0] is None:
            raise ValueError(f"Unknown group_field: {group_field}")
        g_col = g_resolved[0]
        if g_resolved[1]:
            g_cat = g_resolved[2]
            g_id_col = g_resolved[3]
            # Need a second join with alias
            from sqlalchemy.orm import aliased
            OptAlias = aliased(PocOption)
            query = query.join(OptAlias, g_id_col == OptAlias.id).filter(OptAlias.category == g_cat)
            g_col = OptAlias.label

    if y_field == "count":
        y_expr = func.count(PocProject.id)
        if g_col:
            entities = [x_col, g_col, y_expr]
            group_by = [x_col, g_col]
            rows = query.with_entities(*entities).group_by(*group_by).all()
            return [{"x": str(r[0]), "series": str(r[1]), "y": float(r[2]) if r[2] else 0} for r in rows]
        else:
            rows = query.with_entities(x_col, y_expr).group_by(x_col).all()
            return [{"x": str(r[0]), "y": float(r[1]) if r[1] else 0} for r in rows]

    if y_field == "avg_duration":
        entities = [PocProject.start_date, PocProject.end_date]
        entities.append(x_col)
        idx_x = 2
        if g_col:
            entities.append(g_col)
            idx_x = 2
        raw = query.with_entities(*entities).all()
        if g_col:
            groups = defaultdict(list)
            for row in raw:
                sd, ed, xv, sv = row[0], row[1], str(row[2]), str(row[3])
                groups[(xv, sv)].append(calculate_workdays(sd, ed))
            return [{"x": xv, "series": sv, "y": round(sum(vals) / len(vals), 1)} for (xv, sv), vals in groups.items()]
        else:
            groups = defaultdict(list)
            for row in raw:
                sd, ed, xv = row[0], row[1], str(row[2])
                groups[xv].append(calculate_workdays(sd, ed))
            return [{"x": xv, "y": round(sum(vals) / len(vals), 1)} for xv, vals in groups.items()]

    raise ValueError(f"Unknown y_field: {y_field}")
