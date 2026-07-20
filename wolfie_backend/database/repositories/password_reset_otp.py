from database.repositories.base import BaseRepository
from database.schemas import PasswordResetOTP

class PasswordResetOTPRepository(BaseRepository[PasswordResetOTP]):
    model = PasswordResetOTP
