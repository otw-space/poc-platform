# PoC 项目管理平台 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack PoC project management platform with custom dashboard builder, multi-user auth, and Chinese holiday-aware duration calculation.

**Architecture:** FastAPI backend serving REST API at /api/* and React SPA static files at /*. SQLite database with SQLAlchemy ORM. JWT authentication. Dashboard builder stores config as JSON, backend executes aggregation queries.

**Tech Stack:** FastAPI (Python 3.11+), SQLAlchemy 2.0, SQLite, React 18, TypeScript, Ant Design 5, @ant-design/charts, Vite

---

## File Structure (all files created in this plan)

```
poc-platform/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── poc_option.py
│   │   │   ├── poc_project.py
│   │   │   └── dashboard.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── poc_option.py
│   │   │   ├── poc_project.py
│   │   │   └── dashboard.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── options.py
│   │   │   ├── dashboards.py
│   │   │   └── users.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── project.py
│   │   │   ├── dashboard.py
│   │   │   └── holiday.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── auth.py
│   ├── requirements.txt
│   └── seed.py
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   ├── options.ts
│   │   │   ├── dashboards.ts
│   │   │   └── users.ts
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── ChartCard.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── DashboardList.tsx
│   │   │   ├── DashboardView.tsx
│   │   │   ├── DashboardBuilder.tsx
│   │   │   └── Settings.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
└── README.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `poc-platform/backend/requirements.txt`
- Create: `poc-platform/backend/app/__init__.py`
- Create: `poc-platform/frontend/package.json`
- Create: `poc-platform/frontend/index.html`
- Create: `poc-platform/frontend/vite.config.ts`
- Create: `poc-platform/frontend/tsconfig.json`
- Create: `poc-platform/frontend/tsconfig.node.json`

- [ ] **Step 1: Create backend requirements.txt**

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
alembic==1.13.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-multipart==0.0.12
chinesecalendar==1.9.1
```

- [ ] **Step 2: Create backend __init__.py**

```python
# backend/app/__init__.py
```

- [ ] **Step 3: Create frontend package.json**

```json
{
  "name": "poc-platform-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "antd": "^5.21.0",
    "@ant-design/icons": "^5.4.0",
    "@ant-design/charts": "^2.2.0",
    "dayjs": "^1.11.13",
    "axios": "^1.7.7"
  },
  "devDependencies": {
    "@types/react": "^18.3.8",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "~5.5.4",
    "vite": "^5.4.6"
  }
}
```

- [ ] **Step 4: Create frontend index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PoC 项目管理平台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 6: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 8: Install dependencies**

```bash
cd poc-platform/backend && pip install -r requirements.txt
cd poc-platform/frontend && npm install
```

- [ ] **Step 9: Commit**

```bash
git add poc-platform/
git commit -m "feat: scaffold backend and frontend projects"
```

---

### Task 2: Backend Configuration & Database Setup

**Files:**
- Create: `poc-platform/backend/app/config.py`
- Create: `poc-platform/backend/app/database.py`

- [ ] **Step 1: Create config.py**

```python
import os


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./poc.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
```

- [ ] **Step 2: Create database.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/backend/app/config.py poc-platform/backend/app/database.py
git commit -m "feat: add backend config and database setup"
```

---

### Task 3: Backend Models

**Files:**
- Create: `poc-platform/backend/app/models/__init__.py`
- Create: `poc-platform/backend/app/models/user.py`
- Create: `poc-platform/backend/app/models/poc_option.py`
- Create: `poc-platform/backend/app/models/poc_project.py`
- Create: `poc-platform/backend/app/models/dashboard.py`

- [ ] **Step 1: Create models/__init__.py**

```python
from .user import User
from .poc_option import PocOption
from .poc_project import PocProject
from .dashboard import Dashboard
```

- [ ] **Step 2: Create models/user.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[str] = mapped_column(SAEnum("admin", "user", name="user_role"), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 3: Create models/poc_option.py**

```python
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class PocOption(Base):
    __tablename__ = "poc_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(
        SAEnum("poc_type", "impl_method", "status", name="option_category"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: Create models/poc_project.py**

```python
import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Date, Text, DateTime, ForeignKey
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
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 5: Create models/dashboard.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 6: Commit**

```bash
git add poc-platform/backend/app/models/
git commit -m "feat: add SQLAlchemy models for users, options, projects, dashboards"
```

---

### Task 4: Backend Pydantic Schemas

**Files:**
- Create: `poc-platform/backend/app/schemas/__init__.py`
- Create: `poc-platform/backend/app/schemas/user.py`
- Create: `poc-platform/backend/app/schemas/poc_option.py`
- Create: `poc-platform/backend/app/schemas/poc_project.py`
- Create: `poc-platform/backend/app/schemas/dashboard.py`

- [ ] **Step 1: Create schemas/__init__.py**

```python
```

- [ ] **Step 2: Create schemas/user.py**

```python
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role: str = "user"


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordReset(BaseModel):
    new_password: str
```

- [ ] **Step 3: Create schemas/poc_option.py**

```python
from pydantic import BaseModel


class PocOptionCreate(BaseModel):
    category: str
    label: str
    sort_order: int = 0


class PocOptionUpdate(BaseModel):
    label: str | None = None
    sort_order: int | None = None


class PocOptionOut(BaseModel):
    id: int
    category: str
    label: str
    is_default: bool
    sort_order: int

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create schemas/poc_project.py**

```python
from datetime import date, datetime
from pydantic import BaseModel


class PocProjectCreate(BaseModel):
    name: str
    region: str
    city: str
    sales: str
    pm: str
    start_date: date
    end_date: date
    poc_type_id: int
    impl_method_id: int
    status_id: int
    result: str | None = None


class PocProjectUpdate(BaseModel):
    name: str | None = None
    region: str | None = None
    city: str | None = None
    sales: str | None = None
    pm: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    poc_type_id: int | None = None
    impl_method_id: int | None = None
    status_id: int | None = None
    result: str | None = None


class PocProjectOut(BaseModel):
    id: str
    name: str
    region: str
    city: str
    sales: str
    pm: str
    start_date: date
    end_date: date
    duration_days: int | None
    poc_type_id: int
    impl_method_id: int
    status_id: int
    result: str | None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PocProjectListOut(BaseModel):
    items: list[PocProjectOut]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 5: Create schemas/dashboard.py**

```python
from datetime import datetime
from pydantic import BaseModel


class ChartConfig(BaseModel):
    id: str
    type: str
    title: str
    x_field: str
    y_field: str
    group_field: str | None = None
    w: int = 6
    h: int = 400


class FilterConfig(BaseModel):
    field: str
    op: str
    value: str | list[str]


class DashboardConfig(BaseModel):
    filters: list[FilterConfig] = []
    charts: list[ChartConfig] = []


class DashboardCreate(BaseModel):
    name: str
    config: DashboardConfig
    is_public: bool = False


class DashboardUpdate(BaseModel):
    name: str | None = None
    config: DashboardConfig | None = None
    is_public: bool | None = None


class DashboardOut(BaseModel):
    id: str
    name: str
    user_id: str
    config: dict
    is_public: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardQueryRequest(BaseModel):
    filters: list[FilterConfig] = []
    x_field: str
    y_field: str
    group_field: str | None = None
```

- [ ] **Step 6: Commit**

```bash
git add poc-platform/backend/app/schemas/
git commit -m "feat: add Pydantic schemas for all entities"
```

---

### Task 5: Backend Holiday Calculation Service

**Files:**
- Create: `poc-platform/backend/app/services/__init__.py`
- Create: `poc-platform/backend/app/services/holiday.py`

- [ ] **Step 1: Create services/__init__.py**

```python
```

- [ ] **Step 2: Create services/holiday.py**

```python
from datetime import date, timedelta
from chinese_calendar import is_holiday, is_workday


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
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/backend/app/services/
git commit -m "feat: add holiday and workday calculation service"
```

---

### Task 6: Backend Auth Service & Middleware

**Files:**
- Create: `poc-platform/backend/app/services/auth.py`
- Create: `poc-platform/backend/app/middleware/__init__.py`
- Create: `poc-platform/backend/app/middleware/auth.py`

- [ ] **Step 1: Create services/auth.py**

```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from ..database import get_db
from ..models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
```

- [ ] **Step 2: Create middleware/__init__.py**

```python
```

- [ ] **Step 3: Create middleware/auth.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from ..config import SECRET_KEY, ALGORITHM
from ..database import get_db
from ..models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
```

- [ ] **Step 4: Commit**

```bash
git add poc-platform/backend/app/services/auth.py poc-platform/backend/app/middleware/
git commit -m "feat: add auth service and JWT middleware"
```

---

### Task 7: Backend Auth Router

**Files:**
- Create: `poc-platform/backend/app/routers/__init__.py`
- Create: `poc-platform/backend/app/routers/auth.py`

- [ ] **Step 1: Create routers/__init__.py**

```python
```

- [ ] **Step 2: Create routers/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.user import UserLogin, Token, UserCreate, UserOut
from ..services.auth import authenticate_user, create_access_token, hash_password, get_user_by_username
from ..middleware.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.id)
    return Token(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/backend/app/routers/
git commit -m "feat: add auth router with login, me, register endpoints"
```

---

### Task 8: Backend Options Router

**Files:**
- Create: `poc-platform/backend/app/routers/options.py`

- [ ] **Step 1: Create routers/options.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_option import PocOption
from ..schemas.poc_option import PocOptionCreate, PocOptionUpdate, PocOptionOut
from ..middleware.auth import require_admin

router = APIRouter(prefix="/api/options", tags=["options"])


@router.get("/{category}", response_model=list[PocOptionOut])
def list_options(category: str, db: Session = Depends(get_db)):
    return (
        db.query(PocOption)
        .filter(PocOption.category == category)
        .order_by(PocOption.sort_order)
        .all()
    )


@router.post("/", response_model=PocOptionOut)
def create_option(data: PocOptionCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    option = PocOption(**data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return PocOptionOut.model_validate(option)


@router.put("/{option_id}", response_model=PocOptionOut)
def update_option(option_id: int, data: PocOptionUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    option = db.query(PocOption).filter(PocOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    if data.label is not None:
        option.label = data.label
    if data.sort_order is not None:
        option.sort_order = data.sort_order
    db.commit()
    db.refresh(option)
    return PocOptionOut.model_validate(option)


@router.delete("/{option_id}")
def delete_option(option_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    option = db.query(PocOption).filter(PocOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    if option.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default option")
    db.delete(option)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/backend/app/routers/options.py
git commit -m "feat: add options CRUD router"
```

---

### Task 9: Backend Projects Router

**Files:**
- Create: `poc-platform/backend/app/services/project.py`
- Create: `poc-platform/backend/app/routers/projects.py`

- [ ] **Step 1: Create services/project.py**

```python
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.poc_project import PocProject
from ..models.poc_option import PocOption
from ..schemas.poc_project import PocProjectCreate


def apply_project_filters(query, filters: list[dict]):
    op_map = {
        "eq": lambda col, val: col == val,
        "neq": lambda col, val: col != val,
        "in": lambda col, val: col.in_(val),
        "gte": lambda col, val: col >= val,
        "lte": lambda col, val: col <= val,
        "like": lambda col, val: col.like(f"%{val}%"),
    }
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
            query = query.filter(PocProject.poc_type_id.in_([r[0] for r in opt_ids]))
        elif field == "impl_method":
            opt_ids = (
                db.query(PocOption.id)
                .filter(PocOption.category == "impl_method", PocOption.label.in_(value if isinstance(value, list) else [value]))
                .all()
            )
            query = query.filter(PocProject.impl_method_id.in_([r[0] for r in opt_ids]))
        elif field == "status":
            opt_ids = (
                db.query(PocOption.id)
                .filter(PocOption.category == "status", PocOption.label.in_(value if isinstance(value, list) else [value]))
                .all()
            )
            query = query.filter(PocProject.status_id.in_([r[0] for r in opt_ids]))
        elif hasattr(PocProject, field) and op in op_map:
            col = getattr(PocProject, field)
            query = query.filter(op_map[op](col, value))
    return query


def execute_dashboard_query(db: Session, x_field: str, y_field: str, filters: list[dict]) -> list[dict]:
    query = db.query(PocProject)
    query = apply_project_filters(query, filters)

    x_col = getattr(PocProject, x_field, None)
    if x_col is None:
        # Handle option lookups
        if x_field in ("poc_type", "impl_method", "status"):
            cat_map = {"poc_type": "poc_type", "impl_method": "impl_method", "status": "status"}
            cat = cat_map[x_field]
            id_col = {"poc_type": PocProject.poc_type_id, "impl_method": PocProject.impl_method_id, "status": PocProject.status_id}[x_field]
            query = query.join(PocOption, id_col == PocOption.id).filter(PocOption.category == cat)
            x_col = PocOption.label

    if y_field == "count":
        y_expr = func.count(PocProject.id)
    elif y_field == "avg_duration":
        y_expr = func.avg(PocProject.duration_days)
    else:
        raise ValueError(f"Unknown y_field: {y_field}")

    rows = query.with_entities(x_col, y_expr).group_by(x_col).all()
    return [{"x": str(row[0]), "y": float(row[1]) if row[1] else 0} for row in rows]
```

- [ ] **Step 2: Create routers/projects.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_project import PocProject
from ..schemas.poc_project import PocProjectCreate, PocProjectUpdate, PocProjectOut, PocProjectListOut
from ..services.holiday import calculate_workdays
from ..services.project import execute_dashboard_query
from ..middleware.auth import get_current_user
from ..schemas.dashboard import DashboardQueryRequest
from ..models.user import User

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=PocProjectListOut)
def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    name: str | None = None,
    region: str | None = None,
    city: str | None = None,
    sales: str | None = None,
    status_id: int | None = None,
    poc_type_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PocProject)
    if current_user.role != "admin":
        query = query.filter(PocProject.created_by == current_user.id)
    if name:
        query = query.filter(PocProject.name.like(f"%{name}%"))
    if region:
        query = query.filter(PocProject.region == region)
    if city:
        query = query.filter(PocProject.city == city)
    if sales:
        query = query.filter(PocProject.sales == sales)
    if status_id:
        query = query.filter(PocProject.status_id == status_id)
    if poc_type_id:
        query = query.filter(PocProject.poc_type_id == poc_type_id)

    total = query.count()
    items = query.order_by(PocProject.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PocProjectListOut(
        items=[PocProjectOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}", response_model=PocProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return PocProjectOut.model_validate(project)


@router.post("/", response_model=PocProjectOut, status_code=201)
def create_project(data: PocProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    duration = calculate_workdays(data.start_date, data.end_date)
    project = PocProject(**data.model_dump(), duration_days=duration, created_by=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return PocProjectOut.model_validate(project)


@router.put("/{project_id}", response_model=PocProjectOut)
def update_project(project_id: str, data: PocProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    if "start_date" in update_data or "end_date" in update_data:
        project.duration_days = calculate_workdays(project.start_date, project.end_date)

    db.commit()
    db.refresh(project)
    return PocProjectOut.model_validate(project)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"ok": True}


@router.post("/query")
def query_data(data: DashboardQueryRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    results = execute_dashboard_query(db, data.x_field, data.y_field, [f.model_dump() for f in data.filters])
    return {"data": results}
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/backend/app/services/project.py poc-platform/backend/app/routers/projects.py
git commit -m "feat: add projects CRUD router with dashboard query endpoint"
```

---

### Task 10: Backend Dashboards Router

**Files:**
- Create: `poc-platform/backend/app/routers/dashboards.py`

- [ ] **Step 1: Create routers/dashboards.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.dashboard import Dashboard
from ..models.user import User
from ..schemas.dashboard import DashboardCreate, DashboardUpdate, DashboardOut
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


@router.get("/", response_model=list[DashboardOut])
def list_dashboards(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Dashboard)
        .filter((Dashboard.user_id == current_user.id) | (Dashboard.is_public == True))
        .order_by(Dashboard.updated_at.desc())
        .all()
    )


@router.get("/{dashboard_id}", response_model=DashboardOut)
def get_dashboard(dashboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id and not dashboard.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    return DashboardOut.model_validate(dashboard)


@router.post("/", response_model=DashboardOut, status_code=201)
def create_dashboard(data: DashboardCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = Dashboard(
        name=data.name,
        config=data.config.model_dump(),
        user_id=current_user.id,
        is_public=data.is_public,
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    return DashboardOut.model_validate(dashboard)


@router.put("/{dashboard_id}", response_model=DashboardOut)
def update_dashboard(dashboard_id: str, data: DashboardUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = data.model_dump(exclude_unset=True)
    if "config" in update_data and update_data["config"] is not None:
        update_data["config"] = update_data["config"].model_dump()
    for key, value in update_data.items():
        setattr(dashboard, key, value)
    db.commit()
    db.refresh(dashboard)
    return DashboardOut.model_validate(dashboard)


@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(dashboard)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/backend/app/routers/dashboards.py
git commit -m "feat: add dashboards CRUD router"
```

---

### Task 11: Backend Users Router & Seed Data

**Files:**
- Create: `poc-platform/backend/app/routers/users.py`
- Create: `poc-platform/backend/seed.py`
- Modify: `poc-platform/backend/app/main.py`

- [ ] **Step 1: Create routers/users.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserOut, PasswordReset
from ..services.auth import hash_password, get_user_by_username
from ..middleware.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.put("/{user_id}/password")
def reset_password(user_id: str, data: PasswordReset, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.put("/{user_id}/toggle-active")
def toggle_active(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"ok": True, "is_active": user.is_active}
```

- [ ] **Step 2: Create seed.py**

```python
"""Seed default data: admin user and default options."""
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.poc_option import PocOption
from app.services.auth import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Admin user
    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="管理员",
            role="admin",
        ))

    # Default options
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
```

- [ ] **Step 3: Create main.py**

```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base
from .routers import auth, projects, options, dashboards, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="PoC Management Platform", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(options.router)
app.include_router(dashboards.router)
app.include_router(users.router)

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
```

- [ ] **Step 4: Run seed and verify**

```bash
cd poc-platform/backend && python seed.py
# Expected: "Seed data created successfully."
cd poc-platform/backend && uvicorn app.main:app --port 8000 &
sleep 2
curl http://localhost:8000/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'
# Expected: {"access_token":"...","token_type":"bearer","user":{...}}
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add poc-platform/backend/app/routers/users.py poc-platform/backend/seed.py poc-platform/backend/app/main.py
git commit -m "feat: add users router, seed data, and FastAPI main entry point"
```

---

### Task 12: Frontend API Client & Auth Context

**Files:**
- Create: `poc-platform/frontend/src/api/client.ts`
- Create: `poc-platform/frontend/src/api/auth.ts`
- Create: `poc-platform/frontend/src/api/options.ts`
- Create: `poc-platform/frontend/src/api/projects.ts`
- Create: `poc-platform/frontend/src/api/dashboards.ts`
- Create: `poc-platform/frontend/src/api/users.ts`
- Create: `poc-platform/frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Create api/client.ts**

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
```

- [ ] **Step 2: Create api/auth.ts**

```typescript
import client from './client';

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export function login(username: string, password: string) {
  return client.post<LoginResponse>('/auth/login', { username, password });
}

export function getMe() {
  return client.get<User>('/auth/me');
}
```

- [ ] **Step 3: Create api/options.ts**

```typescript
import client from './client';

export interface PocOption {
  id: number;
  category: string;
  label: string;
  is_default: boolean;
  sort_order: number;
}

export function getOptions(category: string) {
  return client.get<PocOption[]>(`/options/${category}`);
}

export function createOption(data: { category: string; label: string }) {
  return client.post<PocOption>('/options/', data);
}

export function updateOption(id: number, data: { label?: string; sort_order?: number }) {
  return client.put<PocOption>(`/options/${id}`, data);
}

export function deleteOption(id: number) {
  return client.delete(`/options/${id}`);
}
```

- [ ] **Step 4: Create api/projects.ts**

```typescript
import client from './client';

export interface PocProject {
  id: string;
  name: string;
  region: string;
  city: string;
  sales: string;
  pm: string;
  start_date: string;
  end_date: string;
  duration_days: number | null;
  poc_type_id: number;
  impl_method_id: number;
  status_id: number;
  result: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: PocProject[];
  total: number;
  page: number;
  page_size: number;
}

export function getProjects(params: Record<string, any>) {
  return client.get<ProjectListResponse>('/projects/', { params });
}

export function getProject(id: string) {
  return client.get<PocProject>(`/projects/${id}`);
}

export function createProject(data: any) {
  return client.post<PocProject>('/projects/', data);
}

export function updateProject(id: string, data: any) {
  return client.put<PocProject>(`/projects/${id}`, data);
}

export function deleteProject(id: string) {
  return client.delete(`/projects/${id}`);
}

export function queryProjectData(data: any) {
  return client.post<{ data: { x: string; y: number }[] }>('/projects/query', data);
}
```

- [ ] **Step 5: Create api/dashboards.ts**

```typescript
import client from './client';

export interface Dashboard {
  id: string;
  name: string;
  user_id: string;
  config: DashboardConfig;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardConfig {
  filters: { field: string; op: string; value: any }[];
  charts: ChartConfig[];
}

export interface ChartConfig {
  id: string;
  type: string;
  title: string;
  x_field: string;
  y_field: string;
  group_field?: string | null;
  w: number;
  h: number;
}

export function getDashboards() {
  return client.get<Dashboard[]>('/dashboards/');
}

export function getDashboard(id: string) {
  return client.get<Dashboard>(`/dashboards/${id}`);
}

export function createDashboard(data: Partial<Dashboard>) {
  return client.post<Dashboard>('/dashboards/', data);
}

export function updateDashboard(id: string, data: Partial<Dashboard>) {
  return client.put<Dashboard>(`/dashboards/${id}`, data);
}

export function deleteDashboard(id: string) {
  return client.delete(`/dashboards/${id}`);
}
```

- [ ] **Step 6: Create api/users.ts**

```typescript
import client from './client';
import type { User } from './auth';

export function getUsers() {
  return client.get<User[]>('/users/');
}

export function createUser(data: { username: string; password: string; display_name: string; role: string }) {
  return client.post<User>('/users/', data);
}

export function resetPassword(userId: string, newPassword: string) {
  return client.put(`/users/${userId}/password`, { new_password: newPassword });
}

export function toggleActive(userId: string) {
  return client.put(`/users/${userId}/toggle-active`);
}
```

- [ ] **Step 7: Create context/AuthContext.tsx**

```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getMe, type User } from '../api/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  setUser: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 8: Commit**

```bash
git add poc-platform/frontend/src/api/ poc-platform/frontend/src/context/
git commit -m "feat: add frontend API client and auth context"
```

---

### Task 13: Frontend Entry Points & Layout

**Files:**
- Create: `poc-platform/frontend/src/main.tsx`
- Create: `poc-platform/frontend/src/App.tsx`
- Create: `poc-platform/frontend/src/components/Layout.tsx`

- [ ] **Step 1: Create main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './context/AuthContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Create App.tsx**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ProjectList from './pages/ProjectList';
import ProjectForm from './pages/ProjectForm';
import ProjectDetail from './pages/ProjectDetail';
import DashboardList from './pages/DashboardList';
import DashboardView from './pages/DashboardView';
import DashboardBuilder from './pages/DashboardBuilder';
import Settings from './pages/Settings';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/projects" />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/new" element={<ProjectForm />} />
        <Route path="projects/:id/edit" element={<ProjectForm />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="dashboards" element={<DashboardList />} />
        <Route path="dashboards/new" element={<DashboardBuilder />} />
        <Route path="dashboards/:id" element={<DashboardView />} />
        <Route
          path="settings"
          element={
            <PrivateRoute adminOnly>
              <Settings />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 3: Create components/Layout.tsx**

```typescript
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, theme } from 'antd';
import {
  ProjectOutlined,
  DashboardOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Content } = AntLayout;

export default function Layout() {
  const { user, setUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const menuItems = [
    { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
    { key: '/dashboards', icon: <DashboardOutlined />, label: '数据仪表盘' },
    ...(isAdmin ? [{ key: '/settings', icon: <SettingOutlined />, label: '系统设置' }] : []),
  ];

  const selectedKey = '/' + location.pathname.split('/')[1];

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginRight: 40, whiteSpace: 'nowrap' }}>PoC 管理平台</div>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, border: 'none' }}
        />
        <span style={{ marginRight: 16 }}>{user?.display_name}</span>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
      </Header>
      <Content style={{ padding: 24, background: token.colorBgLayout }}>
        <Outlet />
      </Content>
    </AntLayout>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add poc-platform/frontend/src/main.tsx poc-platform/frontend/src/App.tsx poc-platform/frontend/src/components/Layout.tsx
git commit -m "feat: add frontend entry points, routing, and layout"
```

---

### Task 14: Frontend Login Page

**Files:**
- Create: `poc-platform/frontend/src/pages/Login.tsx`

- [ ] **Step 1: Create Login.tsx**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values.username, values.password);
      localStorage.setItem('token', res.data.access_token);
      setUser(res.data.user);
      message.success('登录成功');
      navigate('/');
    } catch {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          PoC 项目管理平台
        </Typography.Title>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/pages/Login.tsx
git commit -m "feat: add login page"
```

---

### Task 15: Frontend Project List Page

**Files:**
- Create: `poc-platform/frontend/src/pages/ProjectList.tsx`

- [ ] **Step 1: Create ProjectList.tsx**

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Card } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { getProjects, deleteProject, type PocProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default',
  '准备中': 'blue',
  '进行中': 'processing',
  '已完成': 'success',
  '搁置': 'warning',
};

export default function ProjectList() {
  const [projects, setProjects] = useState<PocProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    getOptions('status').then((r) => setStatusOptions(r.data));
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
  }, []);

  const fetchProjects = () => {
    setLoading(true);
    getProjects({ page, page_size: 20, ...filters })
      .then((r) => {
        setProjects(r.data.items);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, [page, filters]);

  const getOptionLabel = (options: PocOption[], id: number) =>
    options.find((o) => o.id === id)?.label || '';

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    message.success('删除成功');
    fetchProjects();
  };

  const columns = [
    { title: '项目名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '区域', dataIndex: 'region', key: 'region', width: 80 },
    { title: '城市', dataIndex: 'city', key: 'city', width: 80 },
    { title: '销售', dataIndex: 'sales', key: 'sales', width: 80 },
    { title: '项目经理', dataIndex: 'pm', key: 'pm', width: 80 },
    { title: '开始', dataIndex: 'start_date', key: 'start_date', width: 100 },
    { title: '完成', dataIndex: 'end_date', key: 'end_date', width: 100 },
    {
      title: '工期', dataIndex: 'duration_days', key: 'duration_days', width: 70,
      render: (v: number | null) => v ? `${v}天` : '-',
    },
    {
      title: 'PoC类型', dataIndex: 'poc_type_id', key: 'poc_type_id', width: 90,
      render: (v: number) => <Tag>{getOptionLabel(typeOptions, v)}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status_id', key: 'status_id', width: 90,
      render: (v: number) => {
        const label = getOptionLabel(statusOptions, v);
        return <Tag color={STATUS_COLORS[label]}>{label}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_: any, record: PocProject) => (
        <Space>
          <a onClick={() => navigate(`/projects/${record.id}`)}>查看</a>
          <a onClick={() => navigate(`/projects/${record.id}/edit`)}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="项目名称"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 180 }}
          onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value || undefined }))}
        />
        <Input placeholder="区域" allowClear style={{ width: 120 }} onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value || undefined }))} />
        <Input placeholder="城市" allowClear style={{ width: 120 }} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined }))} />
        <Input placeholder="销售" allowClear style={{ width: 120 }} onChange={(e) => setFilters((f) => ({ ...f, sales: e.target.value || undefined }))} />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 120 }}
          options={statusOptions.map((o) => ({ label: o.label, value: o.id }))}
          onChange={(v) => setFilters((f) => ({ ...f, status_id: v || undefined }))}
        />
        <Select
          placeholder="PoC类型"
          allowClear
          style={{ width: 120 }}
          options={typeOptions.map((o) => ({ label: o.label, value: o.id }))}
          onChange={(v) => setFilters((f) => ({ ...f, poc_type_id: v || undefined }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>
          新建项目
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={projects}
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/pages/ProjectList.tsx
git commit -m "feat: add project list page with filters and pagination"
```

---

### Task 16: Frontend Project Form & Detail Pages

**Files:**
- Create: `poc-platform/frontend/src/pages/ProjectForm.tsx`
- Create: `poc-platform/frontend/src/pages/ProjectDetail.tsx`

- [ ] **Step 1: Create ProjectForm.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, DatePicker, Select, Button, message, InputNumber } from 'antd';
import { createProject, updateProject, getProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import dayjs from 'dayjs';

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);

  useEffect(() => {
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
    getOptions('impl_method').then((r) => setImplOptions(r.data));
    getOptions('status').then((r) => setStatusOptions(r.data));
  }, []);

  useEffect(() => {
    if (isEdit) {
      getProject(id!).then((r) => {
        form.setFieldsValue({
          ...r.data,
          start_date: dayjs(r.data.start_date),
          end_date: dayjs(r.data.end_date),
        });
      });
    }
  }, [id]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = {
        ...values,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
      };
      if (isEdit) {
        await updateProject(id!, data);
        message.success('更新成功');
      } else {
        await createProject(data);
        message.success('创建成功');
      }
      navigate('/projects');
    } catch {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={isEdit ? '编辑项目' : '新建项目'} style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="region" label="区域" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Form.Item>
        <Form.Item style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="sales" label="销售" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="pm" label="项目经理" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Form.Item>
        <Form.Item style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="start_date" label="开始日期" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="end_date" label="完成日期" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form.Item>
        <Form.Item style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="poc_type_id" label="PoC类型" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select options={typeOptions.map((o) => ({ label: o.label, value: o.id }))} />
          </Form.Item>
          <Form.Item name="impl_method_id" label="实施方式" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select options={implOptions.map((o) => ({ label: o.label, value: o.id }))} />
          </Form.Item>
          <Form.Item name="status_id" label="状态" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select options={statusOptions.map((o) => ({ label: o.label, value: o.id }))} />
          </Form.Item>
        </Form.Item>
        <Form.Item name="result" label="PoC结果">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/projects')}>取消</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
```

- [ ] **Step 2: Create ProjectDetail.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Popconfirm, message, Spin } from 'antd';
import { getProject, deleteProject, type PocProject } from '../api/projects';
import { getOptions, type PocOption } from '../api/options';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  '未开始': 'default', '准备中': 'blue', '进行中': 'processing', '已完成': 'success', '搁置': 'warning',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<PocProject | null>(null);
  const [typeOptions, setTypeOptions] = useState<PocOption[]>([]);
  const [implOptions, setImplOptions] = useState<PocOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<PocOption[]>([]);

  useEffect(() => {
    getOptions('poc_type').then((r) => setTypeOptions(r.data));
    getOptions('impl_method').then((r) => setImplOptions(r.data));
    getOptions('status').then((r) => setStatusOptions(r.data));
    getProject(id!).then((r) => setProject(r.data));
  }, [id]);

  const getLabel = (opts: PocOption[], id: number) => opts.find((o) => o.id === id)?.label || '';

  const handleDelete = async () => {
    await deleteProject(id!);
    message.success('已删除');
    navigate('/projects');
  };

  if (!project) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const statusLabel = getLabel(statusOptions, project.status_id);

  return (
    <Card
      title={project.name}
      extra={
        <Space>
          <Button onClick={() => navigate(`/projects/${id}/edit`)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={handleDelete}>
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      }
      style={{ maxWidth: 800, margin: '0 auto' }}
    >
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="区域">{project.region}</Descriptions.Item>
        <Descriptions.Item label="城市">{project.city}</Descriptions.Item>
        <Descriptions.Item label="销售">{project.sales}</Descriptions.Item>
        <Descriptions.Item label="项目经理">{project.pm}</Descriptions.Item>
        <Descriptions.Item label="开始日期">{project.start_date}</Descriptions.Item>
        <Descriptions.Item label="完成日期">{project.end_date}</Descriptions.Item>
        <Descriptions.Item label="工期">{project.duration_days ? `${project.duration_days} 工作日` : '-'}</Descriptions.Item>
        <Descriptions.Item label="PoC类型">
          <Tag>{getLabel(typeOptions, project.poc_type_id)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="实施方式">
          <Tag>{getLabel(implOptions, project.impl_method_id)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={STATUS_COLORS[statusLabel]}>{statusLabel}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{dayjs(project.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{dayjs(project.updated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
      </Descriptions>
      {project.result && (
        <div style={{ marginTop: 24 }}>
          <h4>PoC结果</h4>
          <p style={{ whiteSpace: 'pre-wrap' }}>{project.result}</p>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/pages/ProjectForm.tsx poc-platform/frontend/src/pages/ProjectDetail.tsx
git commit -m "feat: add project form and detail pages"
```

---

### Task 17: Frontend Dashboard List Page

**Files:**
- Create: `poc-platform/frontend/src/pages/DashboardList.tsx`

- [ ] **Step 1: Create DashboardList.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getDashboards, deleteDashboard, type Dashboard } from '../api/dashboards';
import dayjs from 'dayjs';

export default function DashboardList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetch = () => {
    setLoading(true);
    getDashboards()
      .then((r) => setDashboards(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id: string) => {
    await deleteDashboard(id);
    message.success('删除成功');
    fetch();
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '可见性', dataIndex: 'is_public', key: 'is_public',
      render: (v: boolean) => v ? <Tag color="blue">公开</Tag> : <Tag>私有</Tag>,
    },
    {
      title: '图表数', key: 'chart_count',
      render: (_: any, r: Dashboard) => r.config?.charts?.length || 0,
    },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, r: Dashboard) => (
        <Space>
          <a onClick={() => navigate(`/dashboards/${r.id}`)}>查看</a>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="数据仪表盘"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dashboards/new')}>新建仪表盘</Button>}
    >
      <Table rowKey="id" columns={columns} dataSource={dashboards} loading={loading} />
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/pages/DashboardList.tsx
git commit -m "feat: add dashboard list page"
```

---

### Task 18: Frontend Dashboard Builder Page

**Files:**
- Create: `poc-platform/frontend/src/pages/DashboardBuilder.tsx`

- [ ] **Step 1: Create DashboardBuilder.tsx**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Select, Button, Switch, Space, message, Row, Col, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createDashboard, type ChartConfig } from '../api/dashboards';
import { queryProjectData } from '../api/projects';

const CHART_TYPES = [
  { label: '柱状图', value: 'column' },
  { label: '条形图', value: 'bar' },
  { label: '饼图', value: 'pie' },
  { label: '折线图', value: 'line' },
  { label: '组合图', value: 'dual-axes' },
];

const DIMENSION_FIELDS = [
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
  { label: 'PoC类型', value: 'poc_type' },
  { label: '实施方式', value: 'impl_method' },
  { label: '状态', value: 'status' },
];

const METRIC_FIELDS = [
  { label: '项目数量', value: 'count' },
  { label: '平均工期', value: 'avg_duration' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function DashboardBuilder() {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const addChart = () => {
    setCharts((prev) => [
      ...prev,
      { id: generateId(), type: 'column', title: '', x_field: 'region', y_field: 'count', w: 6, h: 400 },
    ]);
  };

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChart = (id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.error('请输入仪表盘名称');
      return;
    }
    if (charts.length === 0) {
      message.error('请至少添加一个图表');
      return;
    }
    setSaving(true);
    try {
      await createDashboard({
        name,
        is_public: isPublic,
        config: { filters: [], charts },
      });
      message.success('保存成功');
      navigate('/dashboards');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="新建仪表盘" style={{ maxWidth: 900, margin: '0 auto' }}>
      <Space style={{ marginBottom: 24 }}>
        <Input placeholder="仪表盘名称" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 240 }} />
        <Space>
          <Switch checked={isPublic} onChange={setIsPublic} />
          <span>公开</span>
        </Space>
      </Space>

      {charts.map((chart, idx) => (
        <Card
          key={chart.id}
          size="small"
          title={`图表 ${idx + 1}: ${chart.title || '(未命名)'}`}
          extra={<Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeChart(chart.id)} />}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="标题" style={{ marginBottom: 8 }}>
                <Input value={chart.title} onChange={(e) => updateChart(chart.id, { title: e.target.value })} placeholder="图表标题" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="图表类型" style={{ marginBottom: 8 }}>
                <Select value={chart.type} onChange={(v) => updateChart(chart.id, { type: v })} options={CHART_TYPES} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="X轴维度" style={{ marginBottom: 8 }}>
                <Select value={chart.x_field} onChange={(v) => updateChart(chart.id, { x_field: v })} options={DIMENSION_FIELDS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Y轴指标" style={{ marginBottom: 8 }}>
                <Select value={chart.y_field} onChange={(v) => updateChart(chart.id, { y_field: v })} options={METRIC_FIELDS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ))}

      <Divider />
      <Space>
        <Button icon={<PlusOutlined />} onClick={addChart}>添加图表</Button>
        <Button type="primary" onClick={handleSave} loading={saving}>保存仪表盘</Button>
        <Button onClick={() => navigate('/dashboards')}>取消</Button>
      </Space>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/pages/DashboardBuilder.tsx
git commit -m "feat: add dashboard builder page"
```

---

### Task 19: Frontend Dashboard View & ChartCard Component

**Files:**
- Create: `poc-platform/frontend/src/components/ChartCard.tsx`
- Create: `poc-platform/frontend/src/pages/DashboardView.tsx`

- [ ] **Step 1: Create ChartCard.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Card, Spin, Empty } from 'antd';
import { Column, Bar, Pie, Line, DualAxes } from '@ant-design/charts';
import { queryProjectData } from '../api/projects';
import type { ChartConfig } from '../api/dashboards';

export default function ChartCard({ config }: { config: ChartConfig }) {
  const [data, setData] = useState<{ x: string; y: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    queryProjectData({
      filters: [],
      x_field: config.x_field,
      y_field: config.y_field,
    })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [config.x_field, config.y_field]);

  const commonConfig = {
    data,
    xField: 'x',
    yField: 'y',
    height: config.h || 400,
    autoFit: true,
    legend: { position: 'top' as const },
    label: {
      style: { fill: '#666', fontSize: 12 },
    },
  };

  const renderChart = () => {
    if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
    if (data.length === 0) return <Empty description="暂无数据" />;

    switch (config.type) {
      case 'column':
        return <Column {...commonConfig} />;
      case 'bar':
        return <Bar {...commonConfig} />;
      case 'pie':
        return <Pie {...commonConfig} angleField="y" colorField="x" radius={0.8} />;
      case 'line':
        return <Line {...commonConfig} />;
      case 'dual-axes':
        return <DualAxes {...commonConfig} geometryOptions={[{ geometry: 'column' }, { geometry: 'line' }]} />;
      default:
        return <Column {...commonConfig} />;
    }
  };

  return (
    <Card title={config.title || '未命名图表'} style={{ height: '100%' }}>
      {renderChart()}
    </Card>
  );
}
```

- [ ] **Step 2: Create DashboardView.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Space, Spin, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getDashboard, type Dashboard } from '../api/dashboards';
import ChartCard from '../components/ChartCard';

export default function DashboardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    getDashboard(id!).then((r) => setDashboard(r.data));
  }, [id]);

  if (!dashboard) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const charts = dashboard.config?.charts || [];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <h2 style={{ margin: 0 }}>{dashboard.name}</h2>
          {dashboard.is_public && <Tag color="blue">公开</Tag>}
        </Space>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/dashboards/new?edit=${id}`)}>编辑</Button>
      </div>

      <Row gutter={[16, 16]}>
        {charts.map((chart) => (
          <Col key={chart.id} span={chart.w || 12}>
            <ChartCard config={chart} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/components/ChartCard.tsx poc-platform/frontend/src/pages/DashboardView.tsx
git commit -m "feat: add dashboard view page with chart rendering"
```

---

### Task 20: Frontend Settings Page (Options + Users)

**Files:**
- Create: `poc-platform/frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Create Settings.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Card, Tabs, Table, Button, Input, Space, Popconfirm, message, Modal, Select, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getOptions, createOption, updateOption, deleteOption, type PocOption } from '../api/options';
import { getUsers, createUser, resetPassword, toggleActive, type User } from '../api/users';
import type { User as AuthUser } from '../api/auth';

const CATEGORIES = [
  { key: 'poc_type', label: 'PoC类型' },
  { key: 'impl_method', label: '实施方式' },
  { key: 'status', label: '状态' },
];

export default function Settings() {
  return (
    <Card title="系统设置">
      <Tabs
        items={[
          { key: 'options', label: '下拉选项管理', children: <OptionsManager /> },
          { key: 'users', label: '用户管理', children: <UsersManager /> },
        ]}
      />
    </Card>
  );
}

function OptionsManager() {
  const [activeCat, setActiveCat] = useState('poc_type');
  const [options, setOptions] = useState<PocOption[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const fetch = () => {
    getOptions(activeCat).then((r) => setOptions(r.data));
  };

  useEffect(() => { fetch(); }, [activeCat]);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    await createOption({ category: activeCat, label: newLabel.trim() });
    setNewLabel('');
    fetch();
  };

  const handleUpdate = async (id: number) => {
    await updateOption(id, { label: editingLabel });
    setEditingId(null);
    fetch();
  };

  const handleDelete = async (id: number) => {
    await deleteOption(id);
    fetch();
  };

  return (
    <div>
      <Tabs
        activeKey={activeCat}
        onChange={setActiveCat}
        items={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        style={{ marginBottom: 16 }}
      />
      <Table
        rowKey="id"
        dataSource={options}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'label', key: 'label',
            render: (v: string, r: PocOption) => {
              if (editingId === r.id) {
                return <Input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} style={{ width: 150 }} />;
              }
              return <span>{v} {r.is_default && <Tag style={{ marginLeft: 8 }}>默认</Tag>}</span>;
            },
          },
          { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
          {
            title: '操作', key: 'actions', width: 200,
            render: (_: any, r: PocOption) => {
              if (editingId === r.id) {
                return (
                  <Space>
                    <a onClick={() => handleUpdate(r.id)}>保存</a>
                    <a onClick={() => setEditingId(null)}>取消</a>
                  </Space>
                );
              }
              return (
                <Space>
                  <a onClick={() => { setEditingId(r.id); setEditingLabel(r.label); }}>编辑</a>
                  {!r.is_default && (
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
                      <a style={{ color: '#ff4d4f' }}>删除</a>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]}
      />
      <Space style={{ marginTop: 16 }}>
        <Input placeholder="新增选项" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={{ width: 150 }} />
        <Button icon={<PlusOutlined />} onClick={handleCreate}>新增</Button>
      </Space>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'user' });

  const fetch = () => getUsers().then((r) => setUsers(r.data));
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    await createUser(form);
    setModalOpen(false);
    message.success('创建成功');
    setForm({ username: '', password: '', display_name: '', role: 'user' });
    fetch();
  };

  const handleResetPwd = async (userId: string) => {
    await resetPassword(userId, '123456');
    message.success('密码已重置为 123456');
  };

  const handleToggle = async (userId: string) => {
    await toggleActive(userId);
    fetch();
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name' },
    {
      title: '角色', dataIndex: 'role', key: 'role',
      render: (v: string) => <Tag color={v === 'admin' ? 'blue' : 'default'}>{v === 'admin' ? '管理员' : '普通用户'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active',
      render: (v: boolean) => v ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, r: User) => (
        <Space>
          <a onClick={() => handleResetPwd(r.id)}>重置密码</a>
          <a onClick={() => handleToggle(r.id)}>{r.is_active ? '禁用' : '启用'}</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ marginBottom: 16 }}>
        新建用户
      </Button>
      <Table rowKey="id" columns={columns} dataSource={users} pagination={false} />
      <Modal title="新建用户" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="用户名" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input.Password placeholder="密码" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input placeholder="显示名" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={[{ label: '普通用户', value: 'user' }, { label: '管理员', value: 'admin' }]} style={{ width: '100%' }} />
        </Space>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/pages/Settings.tsx
git commit -m "feat: add settings page with options and user management"
```

---

### Task 21: Integration — Build Frontend & Serve from Backend

**Files:**
- Create: `poc-platform/README.md`

- [ ] **Step 1: Build frontend**

```bash
cd poc-platform/frontend && npm run build
# Verify dist/ exists
ls poc-platform/frontend/dist/
```

- [ ] **Step 2: Start backend and verify full integration**

```bash
cd poc-platform/backend && python seed.py
cd poc-platform/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 2

# Test API
curl -s http://localhost:8000/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | head -c 100
# Expected: {"access_token":"...

# Test SPA serving
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/
# Expected: 200

# Test options API
TOKEN=$(curl -s http://localhost:8000/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s http://localhost:8000/api/options/poc_type -H "Authorization: Bearer $TOKEN" | head -c 200
# Expected: [{"id":1,...

kill %1
```

- [ ] **Step 3: Create README.md**

```markdown
# PoC 项目管理平台

## 快速启动

### 1. 安装依赖
```bash
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

### 2. 初始化数据库
```bash
cd backend && python seed.py
```

### 3. 构建前端
```bash
cd frontend && npm run build
```

### 4. 启动服务
```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000

默认管理员: admin / admin123
```

- [ ] **Step 4: Commit**

```bash
git add poc-platform/README.md
git commit -m "docs: add README with setup and run instructions"
```

---

### Task 22: Frontend Build — run tsc type check

- [ ] **Step 1: Run TypeScript type check**

```bash
cd poc-platform/frontend && npx tsc --noEmit
```

Expected: No errors. If errors exist, fix type mismatches:
- Ensure `PocOption` is imported in all pages that use it
- Ensure `User` type is used consistently in Settings.tsx (avoid name collision with imported `User` from auth)
- Import `message` from antd where used

- [ ] **Step 2: Build and verify**

```bash
cd poc-platform/frontend && npm run build
# Expected: Build succeeds, produces dist/
```

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: type check fixes for frontend build"
```
