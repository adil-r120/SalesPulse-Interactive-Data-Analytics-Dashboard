"""
SalesPulse AI Chat Module
=========================
Handles the RAG (Retrieval-Augmented Generation) pipeline:
User Query -> Data Context Retrieval -> Prompt Engineering -> Gemini API -> Response
"""
import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import User, ChatMessage, SalesRecord, Goal
from utils.auth import get_current_user
from dotenv import load_dotenv
from conversation_context import conversation_manager

router = APIRouter()

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# --- Configuration ---
MODEL_NAME = "google/gemini-2.0-flash-exp:free" 
ERROR_MESSAGE = "AI is temporarily unavailable. Please try again later."
UNKNOWN_ANSWER_MESSAGE = "I'm not sure about that."

# Simplified System Prompt based on user rules
# Expanded System Prompt with full app awareness
SYSTEM_PROMPT = """You are SalesPulse AI, a smart assistant integrated with the ENTIRE SalesPulse application.

TRAINING RULES:
1. RESPONSE STYLE:
   - Keep answers short, simple, and helpful.
   - Use plain words. Avoid technical terms.
   - Be polite, friendly, and natural.

2. YOUR KNOWLEDGE (CRITICAL):
   - You have REAL-TIME access to:
     * Dashboard Overview (Revenue, Sales, Customers)
     * Detailed Sales Data (Categories, Trends)
     * Active Goals & Progress
     * Recent Sales Transactions
   - ALWAYS use this data to answer questions.
   - If data is 0 or missing, say so. Do NOT guess.

3. APP CAPABILITIES & NAVIGATION (GUIDE THE USER):
   - **Reports & Export**: "I cannot generate files myself, but you can go to the **Reports** page to download PDF or CSV reports."
   - **Stocks**: "I don't track live stocks myself, but the **Stocks** page shows real-time market data for tech giants like Apple, Tesla, and Microsoft."
   - **Goals**: "You can set and track targets in the **Goals** section. I can see your active goals here."

4. BEHAVIOR:
   - Act as if you are PART of the app.
   - If asked "Generate a report", say: "I can't generate files, but head over to the **Reports** section to download one!"
   - If asked "How is Apple stock?", say: "Check the **Stocks** tab for real-time updates on Apple (AAPL)."

5. LANGUAGE:
   - Reply in the SAME language as the user (English or Hindi).
"""

# --- Data Models ---
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    timestamp: str

class ChatHistoryResponse(BaseModel):
    messages: List[dict]

class AIStatusResponse(BaseModel):
    status: str
    model: str
    message: str


# --- Helper Functions ---

def get_sales_context(user_id: str, db: Session) -> str:
    """
    Fetch a summary of the user's sales data to provide context for the AI.
    """
    try:
        # Get total revenue
        total_revenue = db.query(func.sum(SalesRecord.total)).filter(SalesRecord.user_id == user_id).scalar() or 0
        
        # Get count of sales records
        total_transactions = db.query(func.count(SalesRecord.id)).filter(SalesRecord.user_id == user_id).scalar() or 0
        
        # Get unique customers count
        total_customers = db.query(func.count(func.distinct(SalesRecord.customer))).filter(SalesRecord.user_id == user_id).scalar() or 0
        
        # Get top product category
        top_category = db.query(SalesRecord.category, func.sum(SalesRecord.total).label('total'))\
            .filter(SalesRecord.user_id == user_id)\
            .group_by(SalesRecord.category)\
            .order_by(func.sum(SalesRecord.total).desc())\
            .first()
            
        top_cat_str = f"{top_category[0]} (₹{top_category[1]:,.2f})" if top_category else "N/A"
        
        # Get active goals
        active_goals_count = db.query(func.count(Goal.id)).filter(Goal.user_id == user_id, Goal.status == "active").scalar() or 0
        
        # Format with proper currency and thousands separator
        return f"""
        Current Sales Context for User:
        - Total Revenue: ₹{total_revenue:,.2f}
        - Total Sales: {total_transactions:,}
        - Total Customers: {total_customers:,}
        - Top Category: {top_cat_str}
        - Active Goals: {active_goals_count}
        """
    except Exception as e:
        print(f"Error getting context: {e}")
        return "Context unavailable due to error."

def get_goals_context(user_id: str, db: Session) -> str:
    """Fetch active goals context"""
    try:
        goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.status == "active").all()
        if not goals:
            return "No active goals set."
        
        context = "ACTIVE GOALS:\n"
        for goal in goals:
            progress = (goal.current_value / goal.target_value * 100) if goal.target_value > 0 else 0
            context += f"- {goal.title}: {progress:.1f}% ({goal.current_value:,.0f}/{goal.target_value:,.0f})\n"
        return context
    except Exception as e:
        return f"Error fetching goals: {e}"

def get_recent_transactions(user_id: str, db: Session) -> str:
    """Fetch last 5 transactions"""
    try:
        sales = db.query(SalesRecord).filter(SalesRecord.user_id == user_id)\
            .order_by(SalesRecord.date.desc()).limit(5).all()
        
        if not sales:
            return "No recent transactions."
            
        context = "RECENT TRANSACTIONS:\n"
        for sale in sales:
            date_str = sale.date.strftime("%Y-%m-%d")
            context += f"- {date_str}: {sale.product} ({sale.category}) - ₹{sale.total:,.2f}\n"
        return context
    except Exception as e:
        return f"Error fetching transactions: {e}"

def get_detailed_sales_data(user_id: str, db: Session) -> dict:
    """
    Fetch detailed sales analytics for AI responses.
    """
    try:
        # Get total revenue
        total_revenue = db.query(func.sum(SalesRecord.total)).filter(SalesRecord.user_id == user_id).scalar() or 0
        
        # Get category breakdown with percentages
        category_data = db.query(
            SalesRecord.category,
            func.sum(SalesRecord.total).label('revenue'),
            func.count(SalesRecord.id).label('count')
        ).filter(SalesRecord.user_id == user_id)\
         .group_by(SalesRecord.category)\
         .order_by(func.sum(SalesRecord.total).desc())\
         .all()
        
        # Calculate percentages and format
        categories = []
        total_transactions = 0
        for cat in category_data:
            percentage = (cat.revenue / total_revenue * 100) if total_revenue > 0 else 0
            total_transactions += cat.count
            categories.append({
                'name': cat.category,  # Access by attribute name from the query
                'revenue': cat.revenue,
                'count': cat.count,
                'percentage': percentage
            })
        
        # Get average order value
        avg_order = total_revenue / total_transactions if total_transactions > 0 else 0
        
        # Get unique regions
        regions = db.query(func.distinct(SalesRecord.region)).filter(SalesRecord.user_id == user_id).count()
        
        return {
            'total_revenue': total_revenue,
            'categories': categories,
            'avg_order_value': avg_order,
            'regions_count': regions
        }
    except Exception as e:
        print(f"Error getting detailed data: {e}")
        return {
            'total_revenue': 0,
            'categories': [],
            'avg_order_value': 0,
            'regions_count': 0
        }

def get_monthly_sales_trend(user_id: str, db: Session) -> list:
    """
    Fetch last 6 months sales trend for AI charts.
    Returns list of dicts: [{'name': 'Jan', 'value': 1000}, ...]
    """
    try:
        # Get sales from last 12 months roughly
        records = db.query(SalesRecord).filter(
            SalesRecord.user_id == user_id
        ).order_by(SalesRecord.date.asc()).all()
        
        # Aggregate by month in python (simpler than DB-specific SQL for now)
        from collections import defaultdict
        monthly_data = defaultdict(float)
        
        for sale in records:
            month_key = sale.date.strftime("%b") # Jan, Feb, etc.
            # Sort order trick: store dates to sort later if needed, but for simple charts:
            monthly_data[month_key] += sale.total
            
        # If we have no data, return empty list (will use safe defaults in display)
        if not monthly_data:
            return []
            
        # Ensure chronological order (last 6 months)
        # This is a bit tricky without full dates, so let's just take the last 6 keys based on data presence
        # For a truly robust app we'd generate a date range. 
        # Simple approach: Return all gathered months
        
        trend = [{"name": k, "value": v} for k, v in monthly_data.items()]
        
        # If too many points, take last 6
        if len(trend) > 6:
            trend = trend[-6:]
            
        return trend

    except Exception as e:
        print(f"Error fetching trend: {e}")
        return []



# --- Core Logic ---


def generate_simulated_response(user_message: str, detailed_data: dict, goals_context: str = "", transactions_context: str = "", trend_data: list = None) -> str:
    """Fallback simulation with ENHANCED capabilities if AI API fails"""
    msg = user_message.lower()
    
    # 1. Goal Logic
    if "goal" in msg or "target" in msg:
        action = ':::ACTION_DATA={"path":"/goals","label":"Manage Goals"}:::'
        if "active" in goals_context.lower() or "active goals" in goals_context.lower():
             return f"Here are your active goals:\n{goals_context.replace('ACTIVE GOALS:', '').strip()}\n\n{action}"
        else:
             return f"You currently have no active goals to show. You can set new targets in the Goals section!\n\n{action}"

    # 2. Revenue & Money Logic
    if "revenue" in msg or "money" in msg or "earning" in msg or "profit" in msg:
        rev = detailed_data.get('total_revenue', 0)
        return f"Your total revenue currently stands at **₹{rev:,.2f}**. This is a great indicator of your business health!"
        
    # 3. Sales & Trends Logic (Chart)
    if "sales" in msg or "orders" in msg or "transaction" in msg or "deal" in msg or "trend" in msg:
        if "trend" in msg or "graph" in msg or "chart" in msg:
            # Use REAL trend data if available, otherwise mock for safety (but should be real now)
            final_trend = trend_data if trend_data else [
                {"name": "Jan", "value": 0}, {"name": "Feb", "value": 0}, {"name": "Mar", "value": 0} 
            ]
            
            chart_data = {
                "title": "Sales Trend (Last 6 Months)",
                "xKey": "name",
                "yKey": "value",
                "data": final_trend
            }
            import json
            
            # Smart Text Summary
            if final_trend:
                last_month = final_trend[-1]
                prev_month = final_trend[-2] if len(final_trend) > 1 else {"value": 0}
                diff = last_month['value'] - prev_month['value']
                trend_text = "up" if diff >= 0 else "down"
                summary = f"Your sales are trending **{trend_text}**. Last month you made ₹{last_month['value']:,.0f}."
            else:
                summary = "Here is your sales trend overview."

            return f"{summary}\n\n:::CHART_DATA={json.dumps(chart_data)}:::"

        if "recent" in msg or "last" in msg:
             if transactions_context and "no recent" not in transactions_context.lower():
                 return f"Here are your latest transactions:\n{transactions_context.replace('RECENT TRANSACTIONS:', '').strip()}"
             else:
                 return "I don't see any recent transactions right now."
        
        # General count
        total_sales = sum(c['count'] for c in detailed_data.get('categories', []))
        return f"You have completed a total of **{total_sales}** sales transactions so far."

    # 4. Reports & Exports Logic
    if "report" in msg or "download" in msg or "pdf" in msg or "csv" in msg or "export" in msg:
        return 'I can\'t generate files directly, but you can head over to the **Reports & Export** page to download comprehensive PDF or CSV reports of your sales data.\n\n:::ACTION_DATA={"path":"/reports","label":"Go to Reports"}:::'

    # 5. Stocks Logic
    if "stock" in msg or "market" in msg or "price" in msg or "share" in msg:
        return 'I don\'t track live market data myself, but check out the **Stocks** tab! It features real-time updates for major tech stocks.\n\n:::ACTION_DATA={"path":"/stocks","label":"View Live Stocks"}:::'
        
    # 6. Customer Logic
    if "customer" in msg or "client" in msg:
        return "Your customer base is growing! You can view detailed customer analytics on the main dashboard.\n\n:::ACTION_DATA={\"path\":\"/\",\"label\":\"Go to Dashboard\"}:::"
        
    # 7. Category/Product Logic
    if "category" in msg or "product" in msg or "item" in msg or "best" in msg or "top" in msg:
        cats = detailed_data.get('categories', [])
        if cats:
            top = cats[0]
            return f"Your top performing category is **{top['name']}**, which has generated **₹{top['revenue']:,.2f}** in revenue."
        return "No category data available yet."

    # 8. Help/Greeting Logic
    if "hi" in msg or "hello" in msg or "help" in msg or "hey" in msg:
        return "Hello! I am SalesPulse AI. I can help you with your revenue stats, sales trends, goals, and more. What would you like to know?"

    # 9. Generic Fallback (Context-Aware)
    return "I'm focusing on your dashboard data right now. You can ask me about your *revenue*, *active goals*, *recent sales*, or check the *Reports* section for more details."

def generate_ai_response(user_message: str, user_id: str, db: Session) -> str:
    """
    Generates a response using Google Gemini API via OpenRouter,
    INJECTING real database context so the AI can answer data questions.
    Includes error logging and model fallback.
    """
    # 1. Fetch Real Data from Database (Do this first for simulation)
    try:
        sales_context = get_sales_context(user_id, db)
        detailed_data = get_detailed_sales_data(user_id, db)
        goals_context = get_goals_context(user_id, db)
        transactions_context = get_recent_transactions(user_id, db)
        trend_data = get_monthly_sales_trend(user_id, db)
    except:
        sales_context = ""
        detailed_data = {}
        goals_context = ""
        transactions_context = ""
        trend_data = []

    if not OPENROUTER_API_KEY:
        return generate_simulated_response(user_message, detailed_data, goals_context, transactions_context, trend_data)

    try:
        # 2. Format Data for the AI
        data_context_prompt = f"""
--------------------------------------------------
REAL-TIME SALES DATA:
{sales_context}

{goals_context}

{transactions_context}

DETAILED CATEGORY BREAKDOWN:
"""
        for cat in detailed_data.get('categories', [])[:5]:
            data_context_prompt += f"- {cat['name']}: ₹{cat['revenue']:,.2f} ({cat['percentage']:.1f}%)\n"
            
        data_context_prompt += f"""
ADDITIONAL STATS:
- Avg Order Value: ₹{detailed_data.get('avg_order_value', 0):,.2f}
- Active Regions: {detailed_data.get('regions_count', 0)}
--------------------------------------------------
User Question: {user_message}
"""

        # 3. Combine with System Prompt
        full_system_prompt = SYSTEM_PROMPT + "\n\n" + data_context_prompt

        # 4. Prepare messages
        messages = conversation_manager.format_for_api(
            user_id=user_id,
            current_message=user_message,
            system_prompt=full_system_prompt
        )

        # 5. Model Strategy (Primary + Fallback)
        models_to_try = [
            MODEL_NAME, # google/gemini-2.0-flash-exp:free (Primary)
            "google/gemini-2.0-flash-thinking-exp:free", # Backup Gemini
            "google/gemini-exp-1206:free", # Fallback Gemini
            "meta-llama/llama-3-8b-instruct:free", # Fallback Llama
            "microsoft/phi-3-medium-128k-instruct:free", # Fallback Microsoft
            "huggingfaceh4/zephyr-7b-beta:free", # Fallback Zephyr
        ]

        for model in models_to_try:
            try:
                response = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "HTTP-Referer": "https://salespulse.dev",
                        "X-Title": "SalesPulse AI",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.5,
                        "max_tokens": 300,
                        "top_p": 0.9,
                    },
                    timeout=20 # Increased timeout
                )

                if response.status_code == 200:
                    data = response.json()
                    if 'choices' in data and len(data['choices']) > 0:
                        ai_text = data['choices'][0]['message']['content'].strip()
                        
                        # Update memory
                        conversation_manager.add_message(user_id, "user", user_message)
                        conversation_manager.add_message(user_id, "assistant", ai_text)
                        
                        return ai_text
                
                # If we get here, this model failed (non-200 or empty choices), try next
                print(f"Model {model} failed with status {response.status_code}")
                
            except Exception as req_err:
                print(f"Request error for {model}: {req_err}")
                continue # Try next model

        # If all models fail, use SIMULATION instead of Error
        print("All AI models failed, using simulation.")
        return generate_simulated_response(user_message, detailed_data, goals_context, transactions_context, trend_data)

    except Exception as e:
        # Log critical error to file for debugging
        print(f"Generation Error: {e}")
        return generate_simulated_response(user_message, detailed_data, goals_context, transactions_context, trend_data)


# --- Routes ---

@router.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Generate Response (Now passing DB)
        ai_response = generate_ai_response(request.message, current_user.id, db)
        
        # Save to Database ONLY if it's a valid response (not an error)
        if ai_response != ERROR_MESSAGE:
            chat_message = ChatMessage(
                user_id=current_user.id,
                message=request.message,
                response=ai_response,
                created_at=datetime.utcnow()
            )
            db.add(chat_message)
            db.commit()
        
        return ChatResponse(
            response=ai_response,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        print(f"Route Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat history from DB"""
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.user_id == current_user.id
        ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
        
        # Reverse to show chronological order
        return ChatHistoryResponse(
            messages=[
                {
                    "id": str(msg.id),
                    "message": msg.message,
                    "response": msg.response,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@router.delete("/api/chat/history")
async def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear history from DB and Memory"""
    try:
        # DB Clear
        db.query(ChatMessage).filter(
             ChatMessage.user_id == current_user.id
        ).delete()
        db.commit()
        
        # Memory Clear
        conversation_manager.clear_conversation(current_user.id)
        
        return {"message": "Chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing history: {e}")


@router.get("/api/chat/status", response_model=AIStatusResponse)
async def get_chat_status():
    """Check AI Status"""
    if not OPENROUTER_API_KEY:
        return AIStatusResponse(status="connected", model="simulated", message="SalesPulse AI (Simulation Mode)")
    return AIStatusResponse(status="connected", model="basic-ai", message="SalesPulse AI Ready")

