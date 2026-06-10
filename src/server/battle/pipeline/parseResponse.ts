export function hasRefusal(message: unknown): message is { refusal: string } {
  return (
    typeof message === "object" &&
    message !== null &&
    "refusal" in message &&
    typeof (message as { refusal?: unknown }).refusal === "string"
  );
}

export function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    return JSON.parse(withoutFence);
  }

  return JSON.parse(trimmed);
}
