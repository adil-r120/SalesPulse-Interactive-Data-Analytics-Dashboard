import google.generativeai as genai
import requests
import os
from typing import Dict, List, Optional
from dotenv import load_dotenv
from textblob import TextBlob
import json

load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class AIInsightsGenerator:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro') if GEMINI_API_KEY else None
    
    def get_google_news(self, query: str, num_results: int = 5) -> List[Dict]:
        """Fetch news articles from Google News API"""
        try:
            if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
                return []
            
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': GOOGLE_API_KEY,
                'cx': GOOGLE_CSE_ID,
                'q': f"{query} business news",
                'num': num_results,
                'sort': 'date'
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            articles = []
            
            for item in data.get('items', []):
                articles.append({
                    'title': item.get('title', ''),
                    'snippet': item.get('snippet', ''),
                    'link': item.get('link', ''),
                    'published': item.get('pagemap', {}).get('metatags', [{}])[0].get('article:published_time', '')
                })
            
            return articles
            
        except Exception as e:
            print(f"Error fetching Google News: {e}")
            return []
    
    def analyze_sentiment(self, text: str) -> str:
        """Analyze sentiment of text using TextBlob"""
        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            
            if polarity > 0.1:
                return "positive"
            elif polarity < -0.1:
                return "negative"
            else:
                return "neutral"
        except:
            return "neutral"
    
    def generate_insight(self, query: str, sales_data: Optional[Dict] = None) -> Dict:
        """Generate AI-powered business insight"""
        try:
            # Get relevant news
            news_articles = self.get_google_news(query)
            
            # Prepare context
            context = f"Query: {query}\n"
            
            if sales_data:
                context += f"Sales Data: {json.dumps(sales_data, indent=2)}\n"
            
            if news_articles:
                context += "Recent News:\n"
                for article in news_articles[:3]:
                    context += f"- {article['title']}: {article['snippet']}\n"
            
            # Generate insight using Gemini
            if self.model:
                prompt = f"""
                As a business analyst, analyze the following information and provide a concise, actionable insight:
                
                {context}
                
                Please provide:
                1. A brief analysis of the current situation
                2. Key trends or patterns identified
                3. Actionable recommendations
                
                Keep the response under 200 words and focus on business value.
                """
                
                response = self.model.generate_content(prompt)
                insight = response.text
            else:
                # Fallback insight generation
                insight = f"Based on the query '{query}', here are some key insights: Market trends show positive growth in the current quarter. Consider focusing on high-performing categories and expanding successful regional strategies."
            
            # Analyze sentiment
            sentiment = self.analyze_sentiment(insight)
            
            return {
                "query": query,
                "insight": insight,
                "sentiment": sentiment,
                "source": "ai_analysis",
                "news_articles": news_articles[:3] if news_articles else []
            }
            
        except Exception as e:
            print(f"Error generating insight: {e}")
            return {
                "query": query,
                "insight": f"Unable to generate insight for '{query}' at this time. Please try again later.",
                "sentiment": "neutral",
                "source": "error",
                "news_articles": []
            }
    
    def chat_response(self, message: str, sales_data: Optional[Dict] = None, chat_history: Optional[List] = None) -> str:
        """Generate chat response using AI"""
        try:
            if not self.model:
                return "I'm sorry, AI features are not available at the moment. Please check your API configuration."
            
            # Prepare context
            context = f"User message: {message}\n"
            
            if sales_data:
                context += f"Current sales data: {json.dumps(sales_data, indent=2)}\n"
            
            if chat_history:
                context += "Recent conversation:\n"
                for msg in chat_history[-3:]:  # Last 3 messages
                    context += f"- {msg}\n"
            
            prompt = f"""
            You are SalesPulse AI, a helpful business analytics assistant. Respond to the user's question about sales, business insights, or data analysis.
            
            {context}
            
            Guidelines:
            - Be concise and helpful
            - Focus on business insights and actionable advice
            - If asked about data, provide analysis based on available information
            - If you don't have specific data, provide general business advice
            - Keep responses under 150 words
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating chat response: {e}")
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later."

# Global instance
ai_insights = AIInsightsGenerator()
