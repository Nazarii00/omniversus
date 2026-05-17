export type EnumObject = Record<string, string>;

export function enumValues(enumObject: EnumObject): string[] {
  return Object.values(enumObject);
}
