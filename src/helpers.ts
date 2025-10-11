export function isDefined<T>(val: T | undefined | null): val is T {
  return val !== undefined && val !== null;
}
export function isNotDefined<T>(
  val: T | undefined | null
): val is undefined | null {
  return !isDefined(val);
}
export function isUndefinedOrNull(val: unknown): val is undefined | null {
  return val === undefined || val === null;
}
export function isEmptyString(val: unknown): val is "" {
  return typeof val === "string" && val.trim().length === 0;
}

export function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

export function isString(val: unknown): val is string {
  return typeof val === "string";
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
