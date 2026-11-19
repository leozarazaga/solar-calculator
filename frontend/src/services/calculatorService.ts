import axios from 'axios'
import type {
  ApiErrorBody,
  ApiFail,
  ApiSuccess,
  CalculationInput,
  CalculationResult,
  FieldValidationError,
} from '../types/calculator.types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Every failed API call is turned into an ApiError. `message` is English and meant
 * for developers/logging; the UI shows localized text based on the flags instead.
 */
export class ApiError extends Error {
  /** HTTP status, when the backend responded */
  readonly status?: number
  /** Per-field validation errors from a 400 `fail` response */
  readonly fieldErrors?: FieldValidationError[]
  /** True when no response arrived (backend offline, CORS, timeout) */
  readonly isNetworkError: boolean
  /** True when the request was cancelled (e.g. component unmounted) */
  readonly isCanceled: boolean

  constructor(
    message: string,
    options: {
      status?: number
      fieldErrors?: FieldValidationError[]
      isNetworkError?: boolean
      isCanceled?: boolean
    } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.fieldErrors = options.fieldErrors
    this.isNetworkError = options.isNetworkError ?? false
    this.isCanceled = options.isCanceled ?? false
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (!axios.isAxiosError<ApiFail | ApiErrorBody>(error)) {
    return new ApiError(error instanceof Error ? error.message : 'Unexpected error')
  }

  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
    return new ApiError('Request was cancelled', { isCanceled: true })
  }

  const response = error.response
  if (!response) {
    // No response: backend down, network/CORS failure or timeout
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    return new ApiError(timedOut ? 'Request timed out' : 'Backend could not be reached', {
      isNetworkError: true,
    })
  }

  const body = response.data
  if (body?.status === 'fail') {
    if (Array.isArray(body.data)) {
      return new ApiError('Validation failed', { status: response.status, fieldErrors: body.data })
    }
    return new ApiError(body.data?.message ?? 'Request failed', { status: response.status })
  }
  if (body?.status === 'error') {
    return new ApiError(body.message, { status: response.status })
  }
  return new ApiError(error.message, { status: response.status })
}

export async function fetchCities(signal?: AbortSignal): Promise<string[]> {
  try {
    const response = await api.get<ApiSuccess<string[]>>('/cities', { signal })
    return response.data.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function calculateQuote(
  input: CalculationInput,
  signal?: AbortSignal,
): Promise<CalculationResult> {
  try {
    const response = await api.post<ApiSuccess<CalculationResult>>('/calculate', input, { signal })
    return response.data.data
  } catch (error) {
    throw toApiError(error)
  }
}
