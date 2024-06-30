import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";

import { TransactionType } from "~/constant";
import { appRouter } from "~/server/api/root";
import { createInnerTRPCContext } from "~/server/api/trpc";
import { db } from "~/server/db";

const ctx = createInnerTRPCContext({});
const caller = appRouter.createCaller(ctx);

const reset = async () => {
  await db.transactions.deleteMany({});
  await db.$executeRawUnsafe(
    "UPDATE sqlite_sequence SET seq=0 WHERE name='Transactions';",
  );
};

beforeEach(reset);
afterEach(reset);

describe("create transaction", () => {
  test("purchase position -1", async () => {
    await caller.transaction.createPurchase({
      cost: 1.5,
      quantity: 10,
      position: 0,
    });
    await caller.transaction.createPurchase({
      cost: 2,
      quantity: 150,
      position: -1,
    });

    await expectTransactionToBe({
      type: TransactionType.Purchase,
      quantity: 10,
      cost: "1.50",

      totalQuantity: 160,
      totalAsset: "315.00",
      totalCostPerUnit: "1.97",

      totalTransaction: 2,
    });
  });

  test("purchase position null", async () => {
    const first = await caller.transaction.createPurchase({
      cost: 2,
      quantity: 150,
      position: 0,
    });
    if (!first) return expect(true).toBe(false);

    await expectTransactionToBe({
      type: TransactionType.Purchase,
      quantity: 150,
      cost: "2.00",

      totalQuantity: 150,
      totalAsset: "300.00",
      totalCostPerUnit: "2.00",

      totalTransaction: 1,
    });
  });

  test("sale position null", async () => {
    await caller.transaction.createPurchase({
      cost: 2,
      quantity: 150,
      position: 0,
    });
    await caller.transaction.createPurchase({
      cost: 1.5,
      quantity: 10,
      position: 0,
    });

    const sale = await caller.transaction.createSale({
      quantity: -5,
      position: 0,
    });
    if (!sale) return expect(true).toBe(false);

    await expectTransactionToBe({
      type: TransactionType.Sale,
      quantity: -5,
      cost: "1.97",

      totalQuantity: 155,
      totalAsset: "305.16",
      totalCostPerUnit: "1.97",

      totalTransaction: 3,
    });
  });
});

describe("delete transaction", () => {
  test("purchase", async () => {
    const purchase = await caller.transaction.createPurchase({
      cost: 2,
      quantity: 150,
      position: 0,
    });
    if (!purchase) return expect(true).toBe(false);

    await caller.transaction.deleteTransaction({ id: purchase.id });

    const transaction = await caller.transaction.getAllTransactions();
    expect(transaction.length).toBe(0);
  });

  test("sale", async () => {
    const purchase = await caller.transaction.createPurchase({
      cost: 2,
      quantity: 150,
      position: 0,
    });
    if (!purchase) return expect(true).toBe(false);

    const sale = await caller.transaction.createSale({
      quantity: -5,
      position: 0,
    });
    if (!sale) return expect(true).toBe(false);

    await caller.transaction.deleteTransaction({ id: sale.id });

    const transaction = await caller.transaction.getAllTransactions();
    expect(transaction.length).toBe(1);
  });
});

const expectTransactionToBe = async ({
  type,
  quantity,
  cost,

  totalQuantity,
  totalAsset,
  totalCostPerUnit,

  totalTransaction,
}: {
  type: string;
  quantity: number;
  cost: string;

  totalQuantity: number;
  totalAsset: string;
  totalCostPerUnit: string;

  totalTransaction: number;
}) => {
  const transactions = await caller.transaction.getAllTransactions();
  const last = await caller.transaction.getLastTransaction();
  if (!last) {
    return;
  }
  expect(last.type).toEqual(type);
  expect(last.quantity).toEqual(quantity);
  expect(last.cost.toFixed(2)).toEqual(cost);

  expect(last.totalQuantity).toEqual(totalQuantity);
  expect(last.totalAsset.toFixed(2)).toEqual(totalAsset);
  expect(last.costPerUnit.toFixed(2)).toEqual(totalCostPerUnit);

  expect(transactions.length).toEqual(totalTransaction);
};
