from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api.endpoints import difficulty as difficulty_router
from app.api.endpoints import practice as practice_router

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="PrismJoey Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(difficulty_router.router, prefix="/api/v1/difficulty", tags=["difficulty"])
app.include_router(practice_router.router, prefix="/api/v1/practice", tags=["practice"])

@app.get("/")
async def root():
    return {"message": "PrismJoey Backend"}
