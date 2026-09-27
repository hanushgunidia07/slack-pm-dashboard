import os
import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from dotenv import load_dotenv

from data_processor import clean_slack_data
from ml_engine import process_review

load_dotenv()

app = FastAPI(title="Slack PM Sentiment API")

# Enable CORS for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup with fallback for offline/local testing
MONGO_URI = os.getenv("MONGO_URI", "")
use_mongo = False

if MONGO_URI and "mongodb+srv" in MONGO_URI:
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        db = client.slack_db
        collection = db.reviews
        # Quick check connection
        client.admin.command('ping')
        use_mongo = True
        print("Connected successfully to MongoDB Atlas!")
    except Exception as e:
        print(f"MongoDB Connection failed: {e}. Falling back to in-memory store.")

# Fallback in-memory list if MongoDB isn't active
memory_db = []

class SingleReviewInput(BaseModel):
    text: str

@app.post("/api/analyze")
async def analyze_single(input_data: SingleReviewInput):
    """Analyzes a single review submitted via text input."""
    result = process_review(input_data.text, source_file="manual_entry")
    
    if use_mongo:
        collection.insert_one(result.copy())
    else:
        memory_db.append(result)
        
    return {"status": "success", "data": result}

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Processes a CSV upload through the Pandas ETL pipeline and ML Engine."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    # Auto-detect the text column (e.g., 'review_text', 'review', 'text', 'comment')
    text_col = None
    possible_cols = ['review_text', 'text', 'review', 'comments', 'comment', 'content']
    for col in df.columns:
        if col.lower() in possible_cols:
            text_col = col
            break
    
    if not text_col:
        # Default to the first text column if no standard name is matched
        text_col = df.select_dtypes(include=['object']).columns[0]

    # 1. Run through ETL Pipeline (data_processor.py)
    cleaned_df = clean_slack_data(df, text_column=text_col)

    # 2. Run through ML Engine (ml_engine.py)
    processed_records = []
    for raw_text in cleaned_df['cleaned_text']:
        record = process_review(raw_text, source_file=file.filename)
        processed_records.append(record)

    # 3. Save records
    if processed_records:
        if use_mongo:
            # Make copies to prevent MongoDB _id mutations
            db_records = [r.copy() for r in processed_records]
            collection.insert_many(db_records)
        else:
            memory_db.extend(processed_records)

    return {
        "status": "success",
        "filename": file.filename,
        "rows_raw": len(df),
        "rows_cleaned": len(cleaned_df),
        "inserted_count": len(processed_records)
    }

@app.get("/api/reviews")
async def get_all_reviews():
    """Fetches all stored reviews for the React Dashboard."""
    if use_mongo:
        reviews = list(collection.find({}, {"_id": 0}))
        reviews.reverse()
        return {"reviews": reviews}
    else:
        reversed_mem = list(reversed(memory_db))
        return {"reviews": reversed_mem}

@app.delete("/api/reviews/clear")
async def clear_database():
    """Clears all dataset records."""
    if use_mongo:
        collection.delete_many({})
    else:
        memory_db.clear()
    return {"status": "success", "message": "All reviews cleared"}