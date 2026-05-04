import { AppError, PodcastError } from '../types';

export function parseError(err: any): AppError {
  if (err instanceof PodcastError || (err && err.name === 'PodcastError')) {
    return {
      message: err.message,
      reason: err.reason,
      solution: err.solution,
      code: err.code
    };
  }

  const errorMessage = typeof err === 'string' ? err : (err?.message ? (typeof err.message === 'string' ? err.message : JSON.stringify(err.message)) : JSON.stringify(err));
  const errLower = errorMessage.toLowerCase();

  // API Quota / Billing
  if (
    errLower.includes("quota exceeded") ||
    errLower.includes("exceeded your current quota") ||
    errLower.includes("billing details") ||
    errLower.includes("quota limit") ||
    errLower.includes("resource_exhausted")
  ) {
    return {
      message: "API Quota Exceeded",
      reason: "You have exceeded your current API quota or your billing limits. This happens when you hit the daily free limit or your credit balance is empty.",
      solution: "Please check your plan and billing details at the provider's console (Google Cloud Console, OpenAI Dashboard, or Anthropic Console) or switch to a different model in the settings.",
      code: "QUOTA_EXCEEDED"
    };
  }

  // Rate Limiting
  if (
    errLower.includes("429") ||
    errLower.includes("too many requests") ||
    errLower.includes("rate limit") ||
    err?.status === 429 ||
    err?.code === 429
  ) {
    return {
      message: "Rate Limit Exceeded",
      reason: "The AI service is currently receiving too many requests or you are sending requests too quickly.",
      solution: "Please wait about 60 seconds and try again. If it persists, check if you have multiple instances of the app running.",
      code: "RATE_LIMIT"
    };
  }

  // Authentication / Permissions
  if (
    errLower.includes("api key") ||
    errLower.includes("api_key_invalid") ||
    errLower.includes("unauthorized") ||
    errLower.includes("permission denied") ||
    errLower.includes("403") ||
    errLower.includes("401") ||
    err?.status === 403 ||
    err?.status === 401
  ) {
    return {
      message: "Authorization Failed",
      reason: "There was a problem with your API key or permissions. The key might be invalid, expired, or doesn't have access to the specific model.",
      solution: "Go to Settings and verify that your API keys are correct and up to date for the models you've selected.",
      code: "AUTH_FAILED"
    };
  }

  // PDF / Extraction Issues
  if (errLower.includes("pdf") || errLower.includes("extraction") || errLower.includes("extract")) {
    return {
      message: "Text Extraction Failed",
      reason: "We couldn't read the text from the file you provided. It might be a scanned image PDF without OCR, protected, or in an unsupported format.",
      solution: "Try copying and pasting the text manually into the 'Pasted Text' tab, or try a different file.",
      code: "EXTRACTION_FAILED"
    };
  }

  // JSON Parsing (AI Hallucinated bad format)
  if (
    errLower.includes("json") ||
    errLower.includes("parse error") ||
    errLower.includes("unexpected token") ||
    errLower.includes("expected")
  ) {
    return {
      message: "AI Format Error",
      reason: "The AI model produced a response that we couldn't understand. This is like a 'stutter' in the AI's logic.",
      solution: "Try clicking the generate button again. If it keeps happening, try switching to a more capable model like GPT-4o in the settings.",
      code: "PARSE_FAILED"
    };
  }

  // Network Issues
  if (errLower.includes("fetch") || errLower.includes("network") || errLower.includes("connection")) {
    return {
      message: "Network Error",
      reason: "We're having trouble connecting to the AI services. This might be due to your internet connection or a temporary service outage.",
      solution: "Check your internet connection and try again in a few moments.",
      code: "NETWORK_ERROR"
    };
  }

  // Safety / Blocked Content
  if (errLower.includes("safety") || errLower.includes("blocked") || errLower.includes("candidate_was_blocked")) {
    return {
      message: "Content Blocked",
      reason: "The AI model's safety filters blocked the response. This can happen if the article contains sensitive topics, violence, or controversial material.",
      solution: "Try with a different article or a more neutral phrasing of the topic.",
      code: "SAFETY_BLOCKED"
    };
  }

  // Overloaded / Server Errors
  if (errLower.includes("overloaded") || errLower.includes("high demand") || errLower.includes("service_unavailable") || err?.status === 503 || err?.status === 500) {
    return {
      message: "Server Overloaded",
      reason: "The AI provider's servers are currently under extremely high demand and cannot fulfill the request right now.",
      solution: "Please wait a minute and try again, or switch to a different AI model in Settings.",
      code: "SERVER_OVERLOAD"
    };
  }

  // Default
  return {
    message: "App Failure",
    reason: errorMessage,
    solution: "We encountered an unexpected problem. Please try again, or try providing a smaller amount of text.",
    code: "UNKNOWN"
  };
}
