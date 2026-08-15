import re

class AISafetyGuard:
    # Patterns for prompt injection & jailbreak detection (Multi-lingual & Structured Delimiters)
    INJECTION_PATTERNS = [
        # English instructions override
        r"(?i)\bignore\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b",
        r"(?i)\bdisregard\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b",
        r"(?i)\bsystem\s+prompt\b",
        r"(?i)\breveal\s+(?:your\s+)?instructions\b",
        r"(?i)\bshow\s+(?:me\s+)?(?:your\s+)?system\s+(?:prompt|instruction)\b",
        r"(?i)\bignore\s+(?:safety|rules|guidelines)\b",
        r"(?i)\byou\s+are\s+now\s+(?:a\s+)?(?:developer|unrestricted|jailbroken|dan)\b",
        r"(?i)\bact\s+as\s+(?:an?\s+)?(?:unfiltered|unrestricted|dan|developer)\b",
        r"(?i)\bsecret\s+key\b",
        r"(?i)\bapi\s+key\b",
        r"(?i)\bjwt_secret\b",
        r"(?i)\badmin\s+password\b",
        r"(?i)\bdrop\s+table\b",
        r"(?i)\bselect\s+\*\s+from\s+users\b",
        # Structured delimiter and roleplay tags injection
        r"(?i)---+\s*(?:end|start|begin)\s+(?:of\s+)?system\s+instruction\s*---+",
        r"(?i)<\s*/?\s*(?:system|system_instruction|user_query|context)\s*>",
        r"(?i)\[\s*system\s*\]",
        r"(?i)<<\s*SYS\s*>>",
        r"(?i)<\|im_start\|>",
        # Arabic injection & jailbreak patterns
        r"تجاهل\s+(?:جميع\s+)?التعليمات\s+السابقة",
        r"تجاهل\s+(?:القواعد|شروط\s+الأمان)",
        r"تجاوز\s+(?:القواعد|التعليمات|الأمان)",
        r"اكشف\s+(?:لي\s+)?(?:البرومبت|التعليمات|الأوامر)",
        r"أظهر\s+(?:لي\s+)?البرومبت\s+الرئيسي",
        r"أنت\s+الآن\s+(?:مطور|غير\s+مقيد|ذكاء\s+حر)",
        r"مفتاح\s+(?:السر|الـ\s*API|api\s*key)",
        r"كلمة\s+مرور\s+الأدمن",
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
