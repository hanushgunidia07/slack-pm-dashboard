import pandas as pd
import re

def clean_slack_data(df: pd.DataFrame, text_column: str = 'review_text') -> pd.DataFrame:
    # Drop empty rows and duplicates
    df = df.dropna(subset=[text_column])
    df = df.drop_duplicates(subset=[text_column], keep='first')
    
    def clean_text(text: str) -> str:
        text = str(text)
        text = re.sub(r"http\S+|www\S+|https\S+", '', text, flags=re.MULTILINE) # Remove URLs
        text = re.sub(r'<.*?>', '', text) # Remove HTML tags
        text = re.sub(r'[^\x00-\x7F]+', ' ', text) # Remove weird unicode
        return " ".join(text.split())

    # Apply cleaning
    df['cleaned_text'] = df[text_column].apply(clean_text)
    
    # Keep only actionable reviews (4 words or more)
    df['word_count'] = df['cleaned_text'].apply(lambda x: len(x.split()))
    df = df[df['word_count'] >= 4]
    
    return df.drop(columns=['word_count'])