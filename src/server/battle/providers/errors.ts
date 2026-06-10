import type { BattleProvider } from "./types";

export function providerErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return null;
}

export function providerErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

export function providerErrorMessage(
  error: unknown,
  provider: BattleProvider,
): string {
  const status = providerErrorStatus(error);
  const detail = providerErrorDetail(error);
  const providerLabel = provider.label;

  if (provider.isStructuredOutputSchemaError(error)) {
    return detail
      ? `${providerLabel} rejected the structured output schema: ${detail}`
      : `${providerLabel} rejected the structured output schema.`;
  }

  if (status === 400) {
    return detail
      ? `${providerLabel} rejected the battle generation request: ${detail}`
      : `${providerLabel} rejected the battle generation request.`;
  }

  if (status === 429) {
    return detail
      ? `${providerLabel} rate limit or quota was hit: ${detail}`
      : `${providerLabel} rate limit or quota was hit. Wait a bit, then retry with the same fighters.`;
  }

  if (status && status >= 500) {
    return `${providerLabel} provider is temporarily unavailable. Retry the battle request shortly.`;
  }

  if (error instanceof Error) return error.message;
  return `${providerLabel} provider request failed`;
}
