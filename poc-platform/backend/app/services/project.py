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


def execute_dashboard_query(db: Session, x_field: str, y_field: str, filters: list[dict], aggregate: bool = False, filter_mode: str = "and") -> list[dict]:
    query = db.query(PocProject).filter(PocProject.is_deleted == False)
    query = apply_project_filters(db, query, filters, filter_mode)

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

    x_col = getattr(PocProject, x_field, None)
    need_option_join = False
    if x_col is None:
        if x_field in ("poc_type", "impl_method", "status"):
            need_option_join = True
            cat_map = {"poc_type": "poc_type", "impl_method": "impl_method", "status": "status"}
            cat = cat_map[x_field]
            id_col = {"poc_type": PocProject.poc_type_id, "impl_method": PocProject.impl_method_id, "status": PocProject.status_id}[x_field]
            query = query.join(PocOption, id_col == PocOption.id).filter(PocOption.category == cat)
            x_col = PocOption.label

    if y_field == "count":
        y_expr = func.count(PocProject.id)
        rows = query.with_entities(x_col, y_expr).group_by(x_col).all()
        return [{"x": str(row[0]), "y": float(row[1]) if row[1] else 0} for row in rows]

    if y_field == "avg_duration":
        # Fetch raw rows and calculate workdays in Python for accurate holiday-aware results
        entities = [PocProject.start_date, PocProject.end_date]
        if need_option_join:
            entities.append(PocOption.label)
        else:
            entities.append(x_col)
        raw = query.with_entities(*entities).all()

        groups = defaultdict(list)
        for row in raw:
            sd, ed, label = row[0], row[1], row[2]
            wd = calculate_workdays(sd, ed)
            groups[str(label)].append(wd)

        return [{"x": label, "y": round(sum(vals) / len(vals), 1)} for label, vals in groups.items()]

    raise ValueError(f"Unknown y_field: {y_field}")
