"""FastAPI application entry point with lifespan and CORS middleware."""

import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    # Startup
    from database import Base, engine
    from seed import seed_data

    Base.metadata.create_all(bind=engine)
    seed_data()
    app.state.http_client = httpx.AsyncClient(timeout=30.0)

    # Start canteen flow refresh background task
    from canteen_flow_service import start_refresh_loop

    app.state.flow_task = asyncio.create_task(
        start_refresh_loop(app.state.http_client)
    )
    print("Canteen flow refresh task started")

    print("Application startup complete")
    yield
    # Shutdown
    app.state.flow_task.cancel()
    try:
        await app.state.flow_task
    except asyncio.CancelledError:
        pass
    print("Canteen flow refresh task stopped")

    await app.state.http_client.aclose()
    print("Application shutdown complete")


app = FastAPI(title="\u4eca\u5929\u5403\u4ec0\u4e48 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
from routes.canteens import router as canteens_router
from routes.dishes import router as dishes_router
from routes.suggestion import router as suggestion_router
from routes.search import router as search_router
from routes.ai import router as ai_router

app.include_router(canteens_router)
app.include_router(dishes_router)
app.include_router(suggestion_router)
app.include_router(search_router)
app.include_router(ai_router)


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
