import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

// 화면에 그대로 보여줄 수 있는 오류
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ code: err.code, message: err.message })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ code: 'INVALID_INPUT', message: '입력값을 확인해 주세요.', issues: err.issues })
    return
  }
  console.error(err)
  res.status(500).json({ code: 'INTERNAL', message: '서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' })
}
