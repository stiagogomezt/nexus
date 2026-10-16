export interface AllocationConfig {
  fixedCommitments: {
    transport: number
    services: number
    internet: number
    icetex: number
    [key: string]: number
  }
  variableNeeds: {
    food: number
    [key: string]: number
  }
}

export interface GoalPriority {
  id: string
  name: string
  target_amount: number
  current_amount: number
  priority: 'alta' | 'media' | 'baja'
  monthly_contribution: number
}

export interface DebtObligation {
  id: string
  name: string
  minimum_payment: number
}

export interface AllocationState {
  totalIncome: number
  alreadyAssigned: number

  // Step 1: Fixed Commitments
  fixedCommitmentsTotal: number
  fixedCommitmentsAssigned: number
  fixedCommitmentsMissing: number

  // Step 2: Variable Needs (Food, etc.)
  variableNeedsTotal: number
  variableNeedsAssigned: number
  variableNeedsMissing: number

  // Step 3: Debts/Financial Obligations (Excluding ICETEX if it's in fixed)
  debtsTotal: number
  debtsAssigned: number
  debtsMissing: number

  // Step 4: Goals
  goalsTotal: number
  goalsAssigned: number
  goalsMissing: number
  goalsAllocation: Array<{
    goalId: string
    goalName: string
    assignedAmount: number
    missingAmount: number
  }>

  // Final
  freeCashFlow: number
  totalMissingForMonth: number
}

export class SmartAllocationEngine {
  /**
   * Distributes an incoming amount against a set of rules and priorities without moving actual funds.
   */
  static distribute(params: {
    incomeAmount: number
    alreadyAssignedInMonth: number
    config: AllocationConfig
    goals: GoalPriority[]
    debts: DebtObligation[]
  }): AllocationState {
    const { incomeAmount, alreadyAssignedInMonth, config, goals, debts } = params

    // 1. Calculate Total Requirements
    const fixedTotal = Object.values(config.fixedCommitments).reduce((sum, val) => sum + val, 0)
    const variableTotal = Object.values(config.variableNeeds).reduce((sum, val) => sum + val, 0)
    const debtsTotal = debts.reduce((sum, d) => sum + d.minimum_payment, 0)
    const goalsTotal = goals.reduce((sum, g) => sum + g.monthly_contribution, 0)

    const totalRequiredMonth = fixedTotal + variableTotal + debtsTotal + goalsTotal

    // 2. Cascade Distribution
    // We assume `alreadyAssignedInMonth` was distributed following the exact same priority cascade previously.
    // To find what's left to fund, we first conceptually "fill" the buckets with `alreadyAssignedInMonth`,
    // then fill the remaining with `incomeAmount`.

    let remainingToDistribute = incomeAmount
    let remainingPriorAssignment = alreadyAssignedInMonth

    // Helper to fill a bucket
    const fillBucket = (required: number) => {
      // First, see how much was already satisfied by prior assignments
      const satisfiedByPrior = Math.min(required, remainingPriorAssignment)
      remainingPriorAssignment -= satisfiedByPrior

      const stillNeeded = required - satisfiedByPrior

      // Now, try to satisfy the remaining need with the new income
      const assignedFromNewIncome = Math.min(stillNeeded, remainingToDistribute)
      remainingToDistribute -= assignedFromNewIncome

      return {
        total: required,
        assigned: assignedFromNewIncome, // ONLY what this new income covers
        missing: stillNeeded - assignedFromNewIncome
      }
    }

    // Step 1: Fixed
    const fixedAlloc = fillBucket(fixedTotal)

    // Step 2: Variable (Food)
    const variableAlloc = fillBucket(variableTotal)

    // Step 3: Debts
    const debtsAlloc = fillBucket(debtsTotal)

    // Step 4: Goals (Distributed by priority: alta -> media -> baja)
    let goalsAssignedFromNew = 0
    let goalsMissingTotal = 0
    const goalsAllocation = []

    // Sort goals: alta first, then media, then baja
    const priorityWeight = { alta: 3, media: 2, baja: 1 }
    const sortedGoals = [...goals].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])

    for (const goal of sortedGoals) {
      const gAlloc = fillBucket(goal.monthly_contribution)
      goalsAssignedFromNew += gAlloc.assigned
      goalsMissingTotal += gAlloc.missing
      goalsAllocation.push({
        goalId: goal.id,
        goalName: goal.name,
        assignedAmount: gAlloc.assigned,
        missingAmount: gAlloc.missing
      })
    }

    // Free cash is whatever is left from the new income after filling all buckets
    const freeCashFlow = remainingToDistribute

    // Total missing is what remains unfunded across all buckets
    const totalMissingForMonth = fixedAlloc.missing + variableAlloc.missing + debtsAlloc.missing + goalsMissingTotal

    return {
      totalIncome: incomeAmount,
      alreadyAssigned: alreadyAssignedInMonth,

      fixedCommitmentsTotal: fixedTotal,
      fixedCommitmentsAssigned: fixedAlloc.assigned,
      fixedCommitmentsMissing: fixedAlloc.missing,

      variableNeedsTotal: variableTotal,
      variableNeedsAssigned: variableAlloc.assigned,
      variableNeedsMissing: variableAlloc.missing,

      debtsTotal,
      debtsAssigned: debtsAlloc.assigned,
      debtsMissing: debtsAlloc.missing,

      goalsTotal,
      goalsAssigned: goalsAssignedFromNew,
      goalsMissing: goalsMissingTotal,
      goalsAllocation,

      freeCashFlow,
      totalMissingForMonth
    }
  }
}
