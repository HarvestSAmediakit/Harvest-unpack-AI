/**
 * Helper function to execute AI API calls with exponential backoff retry logic.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      
      const errorMessage = err?.message?.toLowerCase() || "";
      const isRateLimit =
        errorMessage.includes("429") ||
        err?.status === 429 ||
        err?.code === 429 ||
        errorMessage.includes("resource_exhausted") ||
        errorMessage.includes("high demand");

      const isQuotaError = 
        errorMessage.includes("quota exceeded") || 
        errorMessage.includes("exceeded your current quota");

      const isPermissionDenied =
        errorMessage.includes("403") ||
        err?.status === 403 ||
        err?.code === 403;

      const isParseError = errorMessage.includes("json") || err?.name === 'SyntaxError';

      if (isQuotaError) {
        throw new Error(`API Quota Exceeded: ${err?.message || 'Please check your plan and billing details.'}`);
      } else if ((isRateLimit || isParseError || errorMessage.includes("fetch")) && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(
          `AI Error (${err?.message}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      } else if (isPermissionDenied) {
        console.error(
          "Permission denied. Please check your API key and project permissions.",
        );
        throw new Error(
          "Permission denied. Please check your API key and project permissions.",
        );
      }
      throw err;
    }
  }
  throw lastError;
}
