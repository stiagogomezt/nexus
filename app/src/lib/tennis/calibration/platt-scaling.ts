/**
 * NEXUS TENNIS PREDICTIVE LAB — Calibración de Probabilidades (Platt Scaling)
 * 
 * Ajusta una sigmoide logística sobre los logits o probabilidades no calibradas
 * de un conjunto de validación para minimizar el Brier Score y el ECE.
 * 
 * P(y=1 | z) = 1 / (1 + exp(A * z + B))
 */

export interface CalibrationResult {
  rawProbability: number
  calibratedProbability: number
  aParam: number
  bParam: number
}

export class PlattCalibrator {
  private a = 1.0 // Pendiente
  private b = 0.0 // Sesgo
  private isFitted = false

  constructor(a = 1.0, b = 0.0) {
    this.a = a
    this.b = b
  }

  /**
   * Ajusta los parámetros A y B sobre un conjunto de validación independiente
   * usando descenso de gradiente para minimizar Log Loss.
   */
  public fit(rawProbabilities: number[], trueLabels: number[], epochs = 200, lr = 0.05): void {
    if (rawProbabilities.length === 0) return

    // Convertir probabilidades a logits: logit = ln(p / (1 - p))
    const logits = rawProbabilities.map((p) => {
      const clamped = Math.max(0.001, Math.min(0.999, p))
      return Math.log(clamped / (1 - clamped))
    })

    const n = logits.length
    // Para calibración de probabilidades continuas, suavizamos mínimamente los extremos
    const targets = trueLabels.map((y) => (y === 1 ? 0.99 : 0.01))

    let curA = 1.0 // Standard logistic parameterization: 1 / (1 + exp(-(a * z + b)))
    let curB = 0.0

    for (let epoch = 0; epoch < epochs; epoch++) {
      let gradA = 0
      let gradB = 0

      for (let i = 0; i < n; i++) {
        const z = logits[i]
        const u = Math.max(-20, Math.min(20, curA * z + curB))
        const p = 1 / (1 + Math.exp(-u))
        const diff = p - targets[i]

        gradA += diff * z
        gradB += diff
      }

      curA -= lr * (gradA / n)
      curB -= lr * (gradB / n)
    }

    // Comprobación de integridad: la calibración debe preservar o mejorar el Brier score
    const rawBrier = rawProbabilities.reduce((sum, p, i) => sum + Math.pow(p - trueLabels[i], 2), 0) / n
    const calBrier = rawProbabilities.reduce((sum, p, i) => {
      const u = Math.max(-20, Math.min(20, curA * logits[i] + curB))
      const calP = 1 / (1 + Math.exp(-u))
      return sum + Math.pow(calP - trueLabels[i], 2)
    }, 0) / n

    if (calBrier <= rawBrier) {
      this.a = curA
      this.b = curB
      this.isFitted = true
    } else {
      // Retener identidad para preservar la calibración existente
      this.a = 1.0
      this.b = 0.0
      this.isFitted = false
    }
  }

  /**
   * Aplica la calibración a una probabilidad cruda
   */
  public calibrate(rawProb: number): number {
    const clamped = Math.max(0.001, Math.min(0.999, rawProb))
    const logit = Math.log(clamped / (1 - clamped))

    const u = Math.max(-20, Math.min(20, this.a * logit + this.b))
    const calibrated = 1 / (1 + Math.exp(-u))
    return Math.max(0.01, Math.min(0.99, Math.round(calibrated * 1000) / 1000))
  }

  public getParams(): { a: number; b: number; isFitted: boolean } {
    return { a: this.a, b: this.b, isFitted: this.isFitted }
  }
}
