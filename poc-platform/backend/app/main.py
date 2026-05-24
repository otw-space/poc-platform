import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base
from .routers import auth, projects, options, dashboards, users, logs, audit_logs, sops, recycle_bin, roles, diagrams
from .migration import run_migrations


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations(engine)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="PoC Management Platform", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(options.router)
app.include_router(dashboards.router)
app.include_router(users.router)
app.include_router(logs.router)
app.include_router(audit_logs.router)
app.include_router(recycle_bin.router)
app.include_router(sops.router)
app.include_router(diagrams.router)
app.include_router(roles.router)

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
