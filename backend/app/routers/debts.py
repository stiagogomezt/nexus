from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import DebtCreate, DebtResponse
import uuid

router = APIRouter(prefix="/debts", tags=["Debts"])

MOCK_DEBTS: List[dict] = [
    {
        "id": "debt-1",
        "entity": "Banco Falabella",
        "name": "Tarjeta de Crédito CMR",
        "debt_type": "credit_card",
        "initial_balance": 3800000.0,
        "current_balance": 1950000.0,
        "interest_rate_ea": 34.5,
        "minimum_payment": 220000.0,
        "payment_day": 18,
        "term_months": 12,
        "notes": "Prioridad 1 método avalancha"
    },
    {
        "id": "debt-2",
        "entity": "Bancolombia",
        "name": "Crédito de Libre Inversión",
        "debt_type": "loan",
        "initial_balance": 8000000.0,
        "current_balance": 4800000.0,
        "interest_rate_ea": 22.8,
        "minimum_payment": 340000.0,
        "payment_day": 5,
        "term_months": 24,
        "notes": "Cuotas fijas mensuales"
    }
]

@router.get("/", response_model=List[DebtResponse])
def get_debts():
    return MOCK_DEBTS

@router.post("/", response_model=DebtResponse, status_code=201)
def create_debt(debt: DebtCreate):
    new_id = f"debt-{uuid.uuid4().hex[:8]}"
    item = {"id": new_id, **debt.model_dump()}
    MOCK_DEBTS.append(item)
    return item

@router.post("/{debt_id}/pay")
def pay_debt(debt_id: str, amount: float):
    for d in MOCK_DEBTS:
        if d["id"] == debt_id:
            d["current_balance"] = max(0.0, d["current_balance"] - amount)
            return {"message": "Abono a deuda registrado", "current_balance": d["current_balance"]}
    raise HTTPException(status_code=404, detail="Deuda no encontrada")
