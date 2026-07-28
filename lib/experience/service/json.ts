import { Prisma } from "@/generated/prisma/client";

export function asRequiredInputJson(
  value: Prisma.JsonValue | unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

export function asNullableInputJson(
  value: Prisma.JsonValue | unknown | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null || value === undefined) {
    return Prisma.DbNull;
  }
  return value as Prisma.InputJsonValue;
}
