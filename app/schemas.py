from pydantic import BaseModel, Field
from typing import Optional, List

class Rent(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = "USD"
    due_day: Optional[int] = None
    late_fee_amount: Optional[float] = None
    late_fee_type: Optional[str] = None  # "percent" | "flat" | None

class Deposit(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = "USD"

class LeaseTerm(BaseModel):
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None

class Renewal(BaseModel):
    notice_start: Optional[str] = None
    notice_end: Optional[str] = None

class Repairs(BaseModel):
    sla_days: Optional[int] = None
    clause_ref: Optional[str] = None
    contact_method: Optional[str] = None

class Landlord(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SourceNote(BaseModel):
    page: int
    quote: str

class LeaseExtract(BaseModel):
    rent: Rent = Rent()
    deposit: Deposit = Deposit()
    lease_term: LeaseTerm = LeaseTerm()
    renewal: Renewal = Renewal()
    repairs: Repairs = Repairs()
    landlord: Landlord = Landlord()
    red_flags: List[str] = Field(default_factory=list)
    source_notes: List[SourceNote] = Field(default_factory=list)

class CreateEventsRequest(BaseModel):
    access_token: str
    calendar_id: str = "primary"
    rent_first_due_iso: Optional[str] = None   # 2025-10-01T09:00:00-04:00
    renewal_start_date: Optional[str] = None   # YYYY-MM-DD
    renewal_end_date: Optional[str] = None     # YYYY-MM-DD

class GmailDraftRequest(BaseModel):
    access_token: str
    to: str
    subject: str
    body: str
