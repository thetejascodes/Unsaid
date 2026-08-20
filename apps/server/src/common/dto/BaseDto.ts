import { z, type ZodType } from 'zod'

interface ValidationResult<T> {
  value: T | null
  errors: string[] | null
}

class BaseDto<T> {
  private schema: ZodType<T>

  constructor(schema: ZodType<T>) {
    this.schema = schema
  }

  validate(data: unknown): ValidationResult<T> {
    const result = this.schema.safeParse(data)

    if (!result.success) {
      const errors = result.error.issues.map((issue) => issue.message)
      return { value: null, errors }
    }

    return { value: result.data, errors: null }
  }
}

export default BaseDto;