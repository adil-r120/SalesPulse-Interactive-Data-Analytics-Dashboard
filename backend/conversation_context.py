from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json

class ConversationContext:
    """Manages conversation history and context for intelligent responses"""
    
    def __init__(self, max_history: int = 10, session_timeout_minutes: int = 30):
        self.conversations: Dict[str, List[Dict]] = {}
        self.max_history = max_history
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
        self.last_activity: Dict[str, datetime] = {}
    
    def add_message(self, user_id: str, role: str, content: str, metadata: Optional[Dict] = None):
        """Add a message to conversation history"""
        if user_id not in self.conversations:
            self.conversations[user_id] = []
        
        message = {
            "role": role,  # 'user' or 'assistant'
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        self.conversations[user_id].append(message)
        self.last_activity[user_id] = datetime.now()
        
        # Trim history to max_history
        if len(self.conversations[user_id]) > self.max_history * 2:  # *2 for user+assistant pairs
            self.conversations[user_id] = self.conversations[user_id][-self.max_history * 2:]
    
    def get_conversation_history(self, user_id: str, max_messages: Optional[int] = None) -> List[Dict]:
        """Get conversation history for a user"""
        self._check_session_timeout(user_id)
        
        if user_id not in self.conversations:
            return []
        
        history = self.conversations[user_id]
        if max_messages:
            return history[-max_messages:]
        return history
    
    def get_context_summary(self, user_id: str) -> str:
        """Generate a summary of recent conversation context"""
        history = self.get_conversation_history(user_id, max_messages=6)
        
        if not history:
            return ""
        
        summary_parts = []
        for msg in history:
            role = "User" if msg["role"] == "user" else "Assistant"
            content = msg["content"][:100]  # Truncate for summary
            summary_parts.append(f"{role}: {content}...")
        
        return "\n".join(summary_parts)
    
    def format_for_api(self, user_id: str, current_message: str, system_prompt: str) -> List[Dict]:
        """Format conversation history for API request"""
        messages = []
        
        # Add system prompt
        messages.append({
            "role": "system",
            "content": system_prompt
        })
        
        # Add conversation history (last 5 exchanges)
        history = self.get_conversation_history(user_id, max_messages=10)
        for msg in history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": current_message
        })
        
        return messages
    
    def clear_conversation(self, user_id: str):
        """Clear conversation history for a user"""
        if user_id in self.conversations:
            del self.conversations[user_id]
        if user_id in self.last_activity:
            del self.last_activity[user_id]
    
    def _check_session_timeout(self, user_id: str):
        """Check if session has timed out and clear if needed"""
        if user_id in self.last_activity:
            if datetime.now() - self.last_activity[user_id] > self.session_timeout:
                self.clear_conversation(user_id)
    
    def get_conversation_stats(self, user_id: str) -> Dict:
        """Get statistics about the conversation"""
        history = self.get_conversation_history(user_id)
        
        user_messages = [m for m in history if m["role"] == "user"]
        assistant_messages = [m for m in history if m["role"] == "assistant"]
        
        return {
            "total_messages": len(history),
            "user_messages": len(user_messages),
            "assistant_messages": len(assistant_messages),
            "conversation_duration": self._get_duration(history),
            "active": user_id in self.conversations
        }
    
    def _get_duration(self, history: List[Dict]) -> Optional[str]:
        """Calculate conversation duration"""
        if len(history) < 2:
            return None
        
        start_time = datetime.fromisoformat(history[0]["timestamp"])
        end_time = datetime.fromisoformat(history[-1]["timestamp"])
        duration = end_time - start_time
        
        minutes = int(duration.total_seconds() / 60)
        if minutes < 1:
            return "less than a minute"
        elif minutes == 1:
            return "1 minute"
        else:
            return f"{minutes} minutes"


# Global context manager instance
conversation_manager = ConversationContext(max_history=10, session_timeout_minutes=30)
