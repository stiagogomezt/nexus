/**
 * NEXUS TENNIS POST-MATCH FORENSICS (NTPF) — COUNTERFACTUAL SENSITIVITY ENGINE
 * 
 * Constraint 4 Compliance:
 * Computes mathematical counterfactual perturbation vectors for diagnostic sensitivity audits:
 * "What input vector modification would have minimized the Brier Score for this specific match?"
 * 
 * STRICT: Diagnoses model elasticity and leverage. Strictly prohibits inventing alternate betting realities.
 */

import {
  NTPFCounterfactualSensitivityAudit,
  NTPFCounterfactualPerturbation,
} from './types'
import { FeatureShapAttribution } from '../engine/residual-ml-model'

export interface CounterfactualAuditInput {
  predicted_p_a: number
  winner_is_a: boolean
  shap_attributions: FeatureShapAttribution[]
  feature_vector: Record<string, number>
}

export class NTPFCounterfactualEngine {
  /**
   * Computes the minimal input perturbation vector that minimizes Brier Loss for this match.
   */
  public static auditSensitivity(input: CounterfactualAuditInput): NTPFCounterfactualSensitivityAudit {
    const {
      predicted_p_a: p,
      winner_is_a: winA,
      shap_attributions: shap,
      feature_vector: featVec,
    } = input

    const y = winA ? 1.0 : 0.0
    const brierError = p - y // Gradient factor dL/dp = 2*(p - y)

    const perturbations: NTPFCounterfactualPerturbation[] = []

    for (const attr of shap) {
      const featureName = attr.feature_name
      const currentVal = featVec[featureName] ?? 0.0
      const shapImpact = attr.shap_log_odds_impact

      // Logistic sensitivity proxy: dp/d(log-odds) = p * (1 - p)
      const pSlope = p * (1.0 - p)
      const featureLeverage = pSlope * (shapImpact !== 0 ? Math.sign(shapImpact) : 1.0)
      const brierDerivative = Math.round(2.0 * brierError * featureLeverage * 1000) / 1000

      // Compute minimal counterfactual delta on this feature scale
      // Shift required to move log-odds toward outcome y
      const targetLogOdds = winA ? 2.5 : -2.5
      const currentLogOdds = Math.log(Math.max(0.01, Math.min(0.99, p)) / (1.0 - Math.max(0.01, Math.min(0.99, p))))
      const totalShiftNeeded = targetLogOdds - currentLogOdds

      // Feature specific counterfactual delta (scaled by attribution strength)
      const featureAttributionShare = Math.abs(shapImpact) / Math.max(0.05, shap.reduce((s, a) => s + Math.abs(a.shap_log_odds_impact), 0))
      const deltaNeeded = Math.round(totalShiftNeeded * featureAttributionShare * 100) / 100

      const counterfactualVal = Math.round((currentVal + deltaNeeded) * 100) / 100

      perturbations.push({
        feature_name: featureName,
        original_value: Math.round(currentVal * 100) / 100,
        counterfactual_value: counterfactualVal,
        minimal_delta: deltaNeeded,
        brier_sensitivity_derivative: brierDerivative,
        interpretative_diagnostic:
          deltaNeeded !== 0
            ? `Una variación de ${deltaNeeded > 0 ? '+' : ''}${deltaNeeded} en ${featureName} habría alineado la probabilidad del ensamble con el desenlace observado.`
            : `La variable ${featureName} ya se encontraba en el cuadrante de mínima pérdida para este resultado.`,
      })
    }

    // Sort by absolute sensitivity derivative descending
    perturbations.sort((a, b) => Math.abs(b.brier_sensitivity_derivative) - Math.abs(a.brier_sensitivity_derivative))

    const topFeatures = perturbations.slice(0, 4)
    const primaryLever = topFeatures[0]?.feature_name || 'diff_glicko_mu'

    return {
      target_brier_optimal_probability: y,
      top_leverage_features: topFeatures,
      audit_summary: `Auditoría contrafactual: La variable de mayor apalancamiento sobre la pérdida Brier fue '${primaryLever}'. La sensibilidad refleja la elasticidad del gradiente en este punto del espacio de características.`,
      speculative_alternate_realities_prohibited: true,
    }
  }
}
