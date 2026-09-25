from fastapi import APIRouter
from app.models.schemas import DashboardSummaryResponse
from app.routers.incomes import MOCK_INCOMES
from app.routers.expenses import MOCK_EXPENSES
from app.routers.debts import MOCK_DEBTS
from app.routers.goals import MOCK_GOALS

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary():
    total_income = sum(i["amount"] for i in MOCK_INCOMES)
    shuffler_inc = sum(i["amount"] for i in MOCK_INCOMES if "shuffler" in i["source"].lower())
    pizzahut_inc = sum(i["amount"] for i in MOCK_INCOMES if "pizza" in i["source"].lower())
    others_inc = total_income - (shuffler_inc + pizzahut_inc)

    total_expenses = sum(e["amount"] for e in MOCK_EXPENSES)
    free_cash = total_income - total_expenses
    total_debt = sum(d["current_balance"] for d in MOCK_DEBTS)

    # Assets mock for consolidated net worth
    total_assets = 20800000.0
    net_worth = total_assets - total_debt

    # Goals calculation
    active_goals = [g for g in MOCK_GOALS if g.get("status") == "active"]
    avg_progress = (
        sum((g["current_amount"] / g["target_amount"] * 100) for g in MOCK_GOALS if g["target_amount"] > 0) / len(MOCK_GOALS)
    ) if MOCK_GOALS else 0.0

    return {
        "total_income_month": total_income,
        "income_by_source": {
            "shuffler": shuffler_inc,
            "pizza_hut": pizzahut_inc,
            "others": others_inc
        },
        "total_expenses_month": total_expenses,
        "free_cash_flow": free_cash,
        "total_debt": total_debt,
        "total_assets": total_assets,
        "total_liabilities": total_debt,
        "net_worth": net_worth,
        "total_savings": 9100000.0,
        "total_invested": 3200000.0,
        "betting_allocated": 350000.0,
        "active_goals_count": len(active_goals),
        "average_goals_progress": round(avg_progress, 1)
    }
