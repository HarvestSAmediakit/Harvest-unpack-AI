export interface AppError {
  message: string;
  reason?: string;
  solution?: string;
  code?: string;
}

export class PodcastError extends Error {
  reason: string;
  solution: string;
  code: string;

  constructor(message: string, reason: string, solution: string, code: string) {
    super(message);
    this.reason = reason;
    this.solution = solution;
    this.code = code;
    this.name = 'PodcastError';
  }
}

export function isAppError(error: any): error is AppError {
  return error && typeof error.message === 'string';
}
