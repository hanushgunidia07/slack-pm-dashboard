import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import uuid
from datetime import datetime

# Download lexicon silently on boot
nltk.download('vader_lexicon', quiet=True)
sia = SentimentIntensityAnalyzer()

# The specific Slack PM Taxonomy
SLACK_FEATURES = [
    "notification", "huddle", "audio", "screen share", 
    "unread", "status", "integration", "github", 
    "google drive", "cpu", "battery", "search", 
    "slow", "offline", "channel", "dm", "gif"
]

def process_review(text: str, source_file: str = "manual_entry"):
    scores = sia.polarity_scores(text)
    
    if scores['compound'] > 0.05:
        label = "positive"
    elif scores['compound'] < -0.05:
        label = "negative"
    else:
        label = "neutral"
        
    found_features = [feat for feat in SLACK_FEATURES if feat in text.lower()]
    
    return {
        "id": str(uuid.uuid4()),
        "source_file": source_file,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "text": text,
        "sentiment": label,
        "features": found_features
    }