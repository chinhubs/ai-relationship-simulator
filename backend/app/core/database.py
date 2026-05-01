from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

engine = create_async_engine(settings.database_url, echo=settings.debug)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe migrations for existing DBs — ignore errors if column already exists
        for stmt in [
            "ALTER TABLE characters ADD COLUMN gender TEXT DEFAULT 'unspecified'",
            "ALTER TABLE characters ADD COLUMN relationship_status TEXT DEFAULT 'single'",
            "ALTER TABLE characters ADD COLUMN partner_id INTEGER REFERENCES characters(id)",
        ]:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass
