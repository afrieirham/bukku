import { type Prisma } from "@prisma/client";

export const numFormat = (
  num: number | string | Prisma.Decimal,
  decimal: number,
) => String(Math.abs(Number(num)).toFixed(decimal));
