from fastapi import FastAPI
from app.api.endpoints import difficulty as difficulty_router
from app.api.endpoints import practice as practice_router

app = FastAPI(title="PrismJoey Backend")

app.include_router(difficulty_router.router, prefix="/api/v1/difficulty", tags=["difficulty"])
app.include_router(practice_router.router, prefix="/api/v1/practice", tags=["practice"])

@app.get("/")
async def root():
    return {"message": "PrismJoey Backend"}
