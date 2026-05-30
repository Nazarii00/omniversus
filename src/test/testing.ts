import assert from "node:assert/strict";

type TestBody = () => void | Promise<void>;

type RegisteredTest = {
  name: string;
  run: TestBody;
};

const suiteNames: string[] = [];
const registeredTests: RegisteredTest[] = [];

export function describe(name: string, body: () => void) {
  suiteNames.push(name);

  try {
    body();
  } finally {
    suiteNames.pop();
  }
}

export function test(name: string, run: TestBody) {
  registeredTests.push({
    name: [...suiteNames, name].join(" > "),
    run,
  });
}

export function getRegisteredTests() {
  return registeredTests;
}

export function clearRegisteredTests() {
  suiteNames.length = 0;
  registeredTests.length = 0;
}

function hasLength(value: unknown): value is { length: number } {
  return (
    typeof value === "string" ||
    Array.isArray(value) ||
    (typeof value === "object" &&
      value !== null &&
      "length" in value &&
      typeof (value as { length?: unknown }).length === "number")
  );
}

function containsValue(actual: unknown, expected: unknown): boolean {
  if (typeof actual === "string" && typeof expected === "string") {
    return actual.includes(expected);
  }

  if (Array.isArray(actual)) {
    return actual.includes(expected);
  }

  return false;
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      assert.equal(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepEqual(actual, expected);
    },
    toStrictEqual(expected: unknown) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeTruthy() {
      assert.ok(actual);
    },
    toBeFalsy() {
      assert.ok(!actual);
    },
    toBeNull() {
      assert.equal(actual, null);
    },
    toContain(expected: unknown) {
      assert.ok(
        containsValue(actual, expected),
        `Expected ${String(actual)} to contain ${String(expected)}`,
      );
    },
    toHaveLength(expectedLength: number) {
      assert.ok(hasLength(actual), "Expected value to have a length property");
      assert.equal(actual.length, expectedLength);
    },
    toBeLessThanOrEqual(expected: number) {
      assert.equal(typeof actual, "number");
      assert.ok((actual as number) <= expected);
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.equal(typeof actual, "number");
      assert.ok((actual as number) >= expected);
    },
  };
}
