from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import IncomeCreate, IncomeResponse
import uuid

router = APIRouter(prefix="/incomes", tags=["Incomes"])

# Initial in-memory / profile-seeded storage for immediate API testing
MOCK_INCOMES: List[dict] = [
    {
        "id": "inc-1",
        "date": "2026-09-15",
        "source": "Shuffler",
        "description": "Pago Quincena 1 - Salario + Recargos Nocturnos",
        "amount": 2150000.0,
        "income_type": "salary",
        "base_salary": 1600000.0,
        "surcharges_amount": 350000.0,
        "extra_hours_amount": 200000.0,
        "account": "Bancolombia Principal",
        "is_recurring": True,
        "notes": "Turno nocturno fin de semana"
    },
    {
        "id": "inc-2",
        "date": "2026-09-20",
        "source": "Pizza Hut",
        "description": "Turnos Quincenales Pizza Hut (38 hrs)",
        "amount": 620000.0,
        "income_type": "hourly_wage",
        "hours_worked": 38.0,
        "hourly_rate": 14000.0,
        "extra_hours_amount": 88000.0,
        "account": "Nequi",
        "is_recurring": False,
        "notes": "Side job - turnos de cierre"
    },
    {
        "id": "inc-3",
        "date": "2026-09-05",
        "source": "Shuffler",
        "description": "Bono Trimestral de Rendimiento",
        "amount": 450000.0,
        "income_type": "bonus",
        "bonus_amount": 450000.0,
        "account": "Bancolombia Principal",
        "is_recurring": False,
        "notes": "Evaluación de precisión operativa"
    }
]

@router.get("/", response_model=List[IncomeResponse])
def get_incomes(source: str = None):
    if source:
        return [i for i in MOCK_INCOMES if source.lower() in i["source"].lower()]
    return MOCK_INCOMES

@router.post("/", response_model=IncomeResponse, status_code=201)
def create_income(income: IncomeCreate):
    new_id = f"inc-{uuid.uuid4().hex[:8]}"
    item = {"id": new_id, **income.model_dump()}
    MOCK_INCOMES.insert(0, item)
    return item

@router.delete("/{income_id}")
def delete_income(income_id: str):
    global MOCK_INCOMES
    initial_len = len(MOCK_INCOMES)
    MOCK_INCOMES = [i for i in MOCK_INCOMES if i["id"] != income_id]
    if len(MOCK_INCOMES) == initial_len:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")
    return {"message": "Ingreso eliminado con éxito"}
