import datetime
from database import get_session
from database.schemas import AppConfig
import json

class AICostMonitor:
    # Costs per 1 million tokens (in USD)
    MODEL_RATES = {
        'gemini-2.5-flash-lite': {'input': 0.25, 'output': 1.50},
        'gemini-2.5-flash':      {'input': 0.075, 'output': 0.30}, # Gemini 2.5 Flash is highly optimized and cheap
        'gemini-2.5-pro':        {'input': 2.00, 'output': 12.00},
        'gemini-1.5-flash-lite': {'input': 0.25, 'output': 1.50},
        'gemini-1.5-flash':      {'input': 0.075, 'output': 0.30},
        'gemini-1.5-pro':        {'input': 2.00, 'output': 12.00},
    }
    
    DEFAULT_DAILY_BUDGET = 10.00  # $10.00 daily spend cap

    @classmethod
    def calculate_cost(cls, model_name: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate the USD cost of an API call."""
        rates = cls.MODEL_RATES.get(model_name, cls.MODEL_RATES['gemini-2.5-flash-lite'])
        input_cost = (input_tokens / 1_000_000) * rates['input']
        output_cost = (output_tokens / 1_000_000) * rates['output']
        return round(input_cost + output_cost, 6)

    @classmethod
    def get_daily_spend(cls) -> float:
        """Retrieve total spend for today from the database config table."""
        today_key = f"ai_spend_{datetime.date.today().isoformat()}"
        
        try:
            with get_session() as db:
                config = db.query(AppConfig).filter(AppConfig.key == today_key).first()
                if config:
                    return float(config.value)
                return 0.0
        except Exception:
            return 0.0

    @classmethod
    def record_transaction(cls, model_name: str, input_tokens: int, output_tokens: int) -> float:
        """Add cost of transaction to daily budget and update database."""
        cost = cls.calculate_cost(model_name, input_tokens, output_tokens)
        today_key = f"ai_spend_{datetime.date.today().isoformat()}"
        
        try:
            with get_session() as db:
                config = db.query(AppConfig).filter(AppConfig.key == today_key).first()
                if config:
                    current_spend = float(config.value)
                    config.value = str(current_spend + cost)
                else:
                    config = AppConfig(key=today_key, value=str(cost))
                    db.add(config)
                
                db.commit()
            return cost
        except Exception:
            return cost


    @classmethod
    def is_budget_exceeded(cls, daily_budget_limit: float = None) -> bool:
        """Check if today's spend exceeds the budget limit."""
        if daily_budget_limit is None:
            daily_budget_limit = cls.DEFAULT_DAILY_BUDGET
            
        current_spend = cls.get_daily_spend()
        return current_spend >= daily_budget_limit

    @classmethod
    def get_budget_status(cls, daily_budget_limit: float = None) -> dict:
        """Get a budget usage report."""
        if daily_budget_limit is None:
            daily_budget_limit = cls.DEFAULT_DAILY_BUDGET
            
        spend = cls.get_daily_spend()
        percentage = round((spend / daily_budget_limit) * 100, 2) if daily_budget_limit > 0 else 0
        
        return {
            "date": datetime.date.today().isoformat(),
            "daily_spend": spend,
            "daily_budget_limit": daily_budget_limit,
            "percentage_used": percentage,
            "is_exceeded": spend >= daily_budget_limit,
            "alert_triggered": spend >= (daily_budget_limit * 0.8) # Alert at 80% usage
        }
