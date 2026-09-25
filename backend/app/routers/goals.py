from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import GoalCreate, GoalResponse
import uuid

router = APIRouter(prefix="/goals", tags=["Goals"])

MOCK_GOALS: List[dict] = [
    {
        "id": "goal-1",
        "name": "Fondo de Emergencia (6 Meses)",
        "description": "Colchón financiero de seguridad",
        "target_amount": 12000000.0,
        "current_amount": 4500000.0,
        "target_date": "2027-04-30",
        "monthly_contribution": 600000.0,
        "priority": "alta",
        "category": "emergencia",
        "status": "active"
    },
    {
        "id": "goal-2",
        "name": "Meta Patrimonio Inicial",
        "description": "Consolidación patrimonial libre de deudas",
        "target_amount": 47000000.0,
        "current_amount": 10000000.0,
        "target_date": "2028-12-31",
        "monthly_contribution": 1000000.0,
        "priority": "alta",
        "category": "patrimonio",
        "status": "active"
    }
]

@router.get("/", response_model=List[GoalResponse])
def get_goals():
    results = []
    for g in MOCK_GOALS:
        target = g["target_amount"]
        curr = g["current_amount"]
        pct = (curr / target * 100) if target > 0 else 0
        rem = max(0.0, target - curr)
        results.append({
            **g,
            "progress_percentage": round(pct, 1),
            "remaining_amount": rem
        })
    return results

@router.post("/", response_model=GoalResponse, status_code=201)
def create_goal(goal: GoalCreate):
    new_id = f"goal-{uuid.uuid4().hex[:8]}"
    item = {"id": new_id, **goal.model_dump()}
    MOCK_GOALS.append(item)
    pct = (item["current_amount"] / item["target_amount"] * 100) if item["target_amount"] > 0 else 0
    rem = max(0.0, item["target_amount"] - item["current_amount"])
    return {**item, "progress_percentage": round(pct, 1), "remaining_amount": rem}

@router.post("/{goal_id}/contribute")
def contribute_to_goal(goal_id: str, amount: float):
    for g in MOCK_GOALS:
        if g["id"] == goal_id:
            g["current_amount"] = min(g["target_amount"], g["current_amount"] + amount)
            if g["current_amount"] >= g["target_amount"]:
                g["status"] = "completed"
            return {"message": "Aporte registrado exitosamente", "current_amount": g["current_amount"]}
    raise HTTPException(status_code=404, detail="Meta no encontrada")
