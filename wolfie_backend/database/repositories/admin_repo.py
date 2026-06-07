from database.repositories.base import BaseRepository
from database.schemas import SupportTicket, RefundRequest, FraudFlag, SupportLog
from datetime import datetime, timezone

UTC = timezone.utc

class SupportTicketRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(session, SupportTicket)

    def find_by_status(self, status: str, limit: int = 50, offset: int = 0):
        return self.session.query(SupportTicket).filter_by(status=status).offset(offset).limit(limit).all()

    def find_by_user(self, user_id: str, limit: int = 50, offset: int = 0):
        return self.session.query(SupportTicket).filter_by(user_id=user_id).offset(offset).limit(limit).all()

class RefundRequestRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(session, RefundRequest)
        
    def find_pending(self, limit: int = 50, offset: int = 0):
        return self.session.query(RefundRequest).filter_by(status="pending").offset(offset).limit(limit).all()

class FraudFlagRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(session, FraudFlag)

    def find_open(self, limit: int = 50, offset: int = 0):
        return self.session.query(FraudFlag).filter_by(status="open").offset(offset).limit(limit).all()

class SupportLogRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(session, SupportLog)
