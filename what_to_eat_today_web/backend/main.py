"""FastAPI application entry point with lifespan and CORS middleware."""

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
    print("Application startup complete")
    yield
    # Shutdown
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


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
