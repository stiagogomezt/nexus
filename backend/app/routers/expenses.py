from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import ExpenseCreate, ExpenseResponse
import uuid

router = APIRouter(prefix="/expenses", tags=["Expenses"])

MOCK_EXPENSES: List[dict] = [
    {
        "id": "exp-1",
        "date": "2026-09-02",
        "description": "Arriendo Apartamento",
        "category": "vivienda",
        "amount": 1100000.0,
        "payment_method": "transfer",
        "is_recurring": True,
        "is_essential": True,
        "account": "Bancolombia Principal",
        "notes": None
    },
    {
        "id": "exp-2",
        "date": "2026-09-07",
        "description": "Mercado Mensual Éxito",
        "category": "alimentacion",
        "amount": 480000.0,
        "payment_method": "debit",
        "is_recurring": True,
        "is_essential": True,
        "account": "Bancolombia Principal",
        "notes": None
    },
    {
        "id": "exp-3",
        "date": "2026-09-10",
        "description": "Servicios Públicos",
        "category": "servicios",
        "amount": 210000.0,
        "payment_method": "transfer",
        "is_recurring": True,
        "is_essential": True,
        "account": "Bancolombia Principal",
        "notes": None
    }
]

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(category: str = None):
    if category and category != "all":
        return [e for e in MOCK_EXPENSES if e["category"] == category]
    return MOCK_EXPENSES

@router.post("/", response_model=ExpenseResponse, status_code=201)
def create_expense(expense: ExpenseCreate):
    new_id = f"exp-{uuid.uuid4().hex[:8]}"
    item = {"id": new_id, **expense.model_dump()}
    MOCK_EXPENSES.insert(0, item)
    return item

@router.delete("/{expense_id}")
def delete_expense(expense_id: str):
    global MOCK_EXPENSES
    initial_len = len(MOCK_EXPENSES)
    MOCK_EXPENSES = [e for e in MOCK_EXPENSES if e["id"] != expense_id]
    if len(MOCK_EXPENSES) == initial_len:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return {"message": "Gasto eliminado con éxito"}
