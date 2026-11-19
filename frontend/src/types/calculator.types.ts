// Mirrors the backend API contract (backend/src/types/calculator.types.ts).
// Keep the two in sync when the API changes.

export interface CalculationInput {
  city: string
  /** kWh per year */
  annualConsumption: number
  /** m² */
  roofArea: number
  /** kr per kWh */
  electricityPrice: number
}

export type CalculationField = keyof CalculationInput

export interface MonthlyBreakdown {
  /** 1–12; localize month names from this, not from monthName */
  month: number
  /** Swedish month name from the backend; prefer the i18n month names */
  monthName: string
  productionKwh: number
  consumptionKwh: number
  selfConsumedKwh: number
  surplusKwh: number
}

export type KnownWarningCode = 'ROOF_LIMITED' | 'MISSING_PSH_DATA'

export interface CalculationWarning {
  // `string & {}` keeps autocompletion for known codes while accepting new ones
  code: KnownWarningCode | (string & {})
  /** English fallback text from the backend */
  message: string
  params?: Record<string, unknown>
}

export interface CalculationResult {
  city: string
  panelCount: number
  neededPanelCount: number
  maxPanelsOnRoof: number
  isRoofLimited: boolean
  installedKwp: number
  requiredRoofAreaM2: number
  annualProductionKwh: number
  annualConsumptionKwh: number
  selfConsumedKwh: number
  surplusKwh: number
  coveragePercentage: number
  productionToConsumptionRatio: number
  selfSufficiencyPercentage: number
  installationCostKr: number
  annualSavingsKr: number
  /** null when there are no savings, so the system never pays back */
  paybackYears: number | null
  monthlyBreakdown: MonthlyBreakdown[]
  warnings: CalculationWarning[]
}

/** One entry of a 400 validation response (express-validator) */
export interface FieldValidationError {
  path?: string
  msg: string
}

/** Response envelopes used by the backend */
export interface ApiSuccess<T> {
  status: 'success'
  data: T
}

export interface ApiFail {
  status: 'fail'
  data: FieldValidationError[] | { message: string }
}

export interface ApiErrorBody {
  status: 'error'
  message: string
}
