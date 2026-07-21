import re

class AISafetyGuard:
    # Patterns for prompt injection detection
    INJECTION_PATTERNS = [
        r"(?i)\bignore\s+(?:all\s+)?previous\s+instructions\b",
        r"(?i)\bsystem\s+prompt\b",
        r"(?i)\breveal\s+(?:your\s+)?instructions\b",
        r"(?i)\bignore\s+safety\b",
        r"(?i)\byou\s+are\s+now\s+a\s+developer\b",
        r"(?i)\bignore\s+rules\b",
        r"(?i)\bsecret\s+key\b",
        r"(?i)\bapi\s+key\b"
    ]
    
    # Patterns for scrubbing sensitive data
    CREDIT_CARD_PATTERN = r"\b(?:\d[ -]*?){13,16}\b"
    EMAIL_PATTERN = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    PHONE_PATTERN = r"\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b"
    PASSWORD_PATTERN = r"(?i)(password|passwd|passphrase|secret_key)\s*[:=]\s*[^\s]+"

    @classmethod
    def detect_prompt_injection(cls, message: str) -> bool:
        """Scan input message for common prompt injection patterns."""
        if not message:
            return False
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, message):
                return True
        return False

    @classmethod
    def scrub_pii(cls, text: str) -> str:
        """Mask emails, phone numbers, and credit card numbers from AI responses."""
        if not text:
            return ""
            
        # Scrub Credit Cards
        text = re.sub(cls.CREDIT_CARD_PATTERN, "[CARD REDACTED]", text)
        
        # Scrub Emails
        text = re.sub(cls.EMAIL_PATTERN, "[EMAIL REDACTED]", text)
        
        # Scrub Phone numbers (exclude simple numbers <= 6 digits to prevent false positives with order IDs or prices)
        # We only scrub numbers that resemble standard 10-digit formats
        text = re.sub(cls.PHONE_PATTERN, "[PHONE REDACTED]", text)
        
        # Scrub password leaks
        text = re.sub(cls.PASSWORD_PATTERN, r"\1: [PASSWORD REDACTED]", text)
        
        return text

    @classmethod
    def validate_response(cls, response_text: str) -> str:
        """Perform post-processing validation on the AI response text."""
        # 1. Scrub any sensitive info
        clean_text = cls.scrub_pii(response_text)
        
        # 2. Block direct instruction output leaks
        if "wolfie support" in clean_text.lower() and "system prompt" in clean_text.lower():
            return "I apologize, but I cannot share my configuration details. How can I assist you with your orders or delivery today?"
            
        return clean_text
