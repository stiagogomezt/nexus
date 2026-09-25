from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

# --- INCOMES SCHEMAS ---
class IncomeBase(BaseModel):
    date: date
    source: str = Field(..., description="e.g. 'Shuffler', 'Pizza Hut', or custom source")
    description: str
    amount: float = Field(..., ge=0)
    income_type: str = "salary" # salary, hourly_wage, bonus, surcharge, extra_hours, other
    base_salary: Optional[float] = 0.0
    bonus_amount: Optional[float] = 0.0
    surcharges_amount: Optional[float] = 0.0
    extra_hours_amount: Optional[float] = 0.0
    other_payments_amount: Optional[float] = 0.0
    hours_worked: Optional[float] = 0.0
    hourly_rate: Optional[float] = 0.0
    account: Optional[str] = "Bancolombia"
    is_recurring: bool = False
    notes: Optional[str] = None

class IncomeCreate(IncomeBase):
    pass

class IncomeResponse(IncomeBase):
    id: str

# --- EXPENSES SCHEMAS ---
class ExpenseBase(BaseModel):
    date: date
    description: str
    category: str # vivienda, alimentacion, transporte, etc.
    amount: float = Field(..., ge=0)
    account: Optional[str] = "Bancolombia"
    payment_method: str = "debit" # debit, credit, cash, transfer
    is_recurring: bool = False
    is_essential: bool = False
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str

# --- GOALS SCHEMAS ---
class GoalBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    target_date: Optional[date] = None
    monthly_contribution: Optional[float] = 0.0
    priority: str = "alta" # alta, media, baja
    category: str = "ahorro"
    status: str = "active"

class GoalCreate(GoalBase):
    pass

class GoalResponse(GoalBase):
    id: str
    progress_percentage: float = 0.0
    remaining_amount: float = 0.0

# --- DEBTS SCHEMAS ---
class DebtBase(BaseModel):
    entity: str
    name: str
    debt_type: str = "credit_card"
    initial_balance: float = Field(..., ge=0)
    current_balance: float = Field(..., ge=0)
    interest_rate_ea: float = Field(default=0.0, ge=0)
    minimum_payment: float = Field(default=0.0, ge=0)
    payment_day: Optional[int] = 15
    term_months: Optional[int] = 0
    notes: Optional[str] = None

class DebtCreate(DebtBase):
    pass

class DebtResponse(DebtBase):
    id: str

# --- ASSETS & NET WORTH SCHEMAS ---
class AssetBase(BaseModel):
    name: str
    category: str # bank_accounts, savings, investments, cdt, vehicles, real_estate, etc.
    current_value: float = Field(..., ge=0)
    notes: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetResponse(AssetBase):
    id: str

# --- DASHBOARD SUMMARY ---
class IncomeBreakdown(BaseModel):
    shuffler: float
    pizza_hut: float
    others: float

class DashboardSummaryResponse(BaseModel):
    total_income_month: float
    income_by_source: IncomeBreakdown
    total_expenses_month: float
    free_cash_flow: float
    total_debt: float
    total_assets: float
    total_liabilities: float
    net_worth: float
    total_savings: float
    total_invested: float
    betting_allocated: float
    active_goals_count: int
    average_goals_progress: float
