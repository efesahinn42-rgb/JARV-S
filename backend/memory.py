import json
import os
import uuid
from datetime import datetime
from pathlib import Path

class MemoryManager:
    def __init__(self, db_path="./memory_db"):
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)
        self.memory_file = self.db_path / "conversations.json"
        
        # Initialize memory file if not exists
        if not self.memory_file.exists():
            self._save_memory([])
    
    def _load_memory(self):
        """Load conversations from JSON file."""
        try:
            with open(self.memory_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _save_memory(self, memory):
        """Save conversations to JSON file."""
        with open(self.memory_file, 'w', encoding='utf-8') as f:
            json.dump(memory, f, ensure_ascii=False, indent=2)
    
    def get_relevant_context(self, query: str, n_results: int = 3) -> str:
        """
        Get relevant context based on keyword matching.
        Simpler approach without embeddings for compatibility.
        """
        memory = self._load_memory()
        
        # Simple keyword-based matching
        query_words = query.lower().split()
        scored_conversations = []
        
        for conv in memory:
            score = 0
            conv_text = (conv.get('user_input', '') + ' ' + conv.get('ai_response', '')).lower()
            
            for word in query_words:
                if word in conv_text:
                    score += 1
            
            if score > 0:
                scored_conversations.append((score, conv))
        
        # Sort by score and get top results
        scored_conversations.sort(key=lambda x: x[0], reverse=True)
        
        context_parts = []
        for score, conv in scored_conversations[:n_results]:
            context_parts.append(f"User: {conv.get('user_input', '')}\nJarvis: {conv.get('ai_response', '')}")
        
        return "\n\n".join(context_parts)
    
    def save_interaction(self, user_input: str, ai_response: str):
        """Save user-AI interaction to memory."""
        memory = self._load_memory()
        
        interaction = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "user_input": user_input,
            "ai_response": ai_response
        }
        
        memory.append(interaction)
        
        # Keep only last 100 conversations to prevent file from growing too large
        if len(memory) > 100:
            memory = memory[-100:]
        
        self._save_memory(memory)
        print(f"Memory Saved: {user_input[:50]}...")
    
    def get_memory_stats(self):
        """Get memory statistics."""
        memory = self._load_memory()
        return {
            "total_memories": len(memory),
            "status": "active",
            "db_path": str(self.db_path)
        }
    
    def clear_memory(self):
        """Clear all memories."""
        self._save_memory([])
        print("Memory cleared.")
    
    def search_memory(self, query: str) -> list:
        """Search memory for specific query."""
        memory = self._load_memory()
        results = []
        
        query_lower = query.lower()
        for conv in memory:
            if query_lower in conv.get('user_input', '').lower() or \
               query_lower in conv.get('ai_response', '').lower():
                results.append(conv)
        
        return results
