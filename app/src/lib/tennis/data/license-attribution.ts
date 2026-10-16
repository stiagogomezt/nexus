/**
 * NEXUS TENNIS PREDICTIVE LAB — Licencias, Atribución y Provenance
 * 
 * Cumplimiento estricto de licencias de datos abiertos deportivos.
 * Attribution: Jeff Sackmann / Tennis Abstract (CC BY-NC-SA 4.0)
 */

export interface DatasetLicenseInfo {
  dataset_name: string
  author: string
  license: string
  license_url: string
  attribution_statement: string
  commercial_use_permitted: boolean
  provenance_id: string
  last_audited: string
}

export const TENNIS_DATASET_ATTRIBUTION: DatasetLicenseInfo = {
  dataset_name: 'Tennis Abstract / Jeff Sackmann ATP & WTA Match Data',
  author: 'Jeff Sackmann',
  license: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)',
  license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  attribution_statement:
    'Match records, historical outcomes, and player demographics adapted from Jeff Sackmann / Tennis Abstract under CC BY-NC-SA 4.0. Strictly for non-commercial quantitative analysis and research simulation within NEXUS Finance.',
  commercial_use_permitted: false,
  provenance_id: 'provenance_sackmann_atp_wta_v2026',
  last_audited: '2026-10-02',
}

export function getAttributionFooter(): string {
  return `${TENNIS_DATASET_ATTRIBUTION.dataset_name} © ${TENNIS_DATASET_ATTRIBUTION.author}. Licenciado bajo ${TENNIS_DATASET_ATTRIBUTION.license}. Uso no comercial en entorno de investigación cuantitativa.`
}
