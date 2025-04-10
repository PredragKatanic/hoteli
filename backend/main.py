from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import users, rooms, reservations, auth, categories, overview
from config import settings
from models import Base
from database import engine
import uvicorn

app = FastAPI(
    title="Hotel Management API",
    description="API for managing hotel rooms, reservations, and users",
    version="1.0.0",
    debug=settings.DEBUG
)

# Create all database tables
Base.metadata.create_all(bind=engine)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(overview.router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    ) 