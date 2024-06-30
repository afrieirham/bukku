import { describe, expect, test, afterEach } from "@jest/globals";

import { createInnerTRPCContext } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { db } from "~/server/db";

const ctx = createInnerTRPCContext({});
const caller = appRouter.createCaller(ctx);

afterEach(async () => {
  await db.transactions.deleteMany({});
  await db.$executeRawUnsafe(
    "UPDATE sqlite_sequence SET seq=0 WHERE name='Transactions';",
  );
});

describe("transactions", () => {
  test("empty transaction", async () => {
    const transactions = await caller.transaction.getAllTransactions();
    expect(transactions).toEqual([]);
  });

  test("testing add random order, delete, update", async () => {
    // add correct purchase 150 2
    const first = await caller.transaction.createPurchase({
      cost: 2,
      quantity: 150,
      position: 0,
    });
    if (!first) return;

    await expectRecordToBe({
      totalTransaction: 1,
      totalQuantity: 150,
      totalAsset: "300.00",
      totalCostPerUnit: "2.00",
    });

    // add wrong sale position
    const wrongPosition = await caller.transaction.createSale({
      quantity: -5,
      position: 0,
    });
    if (!wrongPosition) return;

    await expectRecordToBe({
      totalTransaction: 2,
      totalQuantity: 145,
      totalAsset: "290.00",
      totalCostPerUnit: "2.00",
    });

    // add correct purchase 10 1.5
    await caller.transaction.createPurchase({
      cost: 1.5,
      quantity: 10,
      position: 0,
    });

    await expectRecordToBe({
      totalTransaction: 3,
      totalQuantity: 155,
      totalAsset: "305.00",
      totalCostPerUnit: "1.97",
    });

    // delete wrongPosition sale
    await caller.transaction.deleteTransaction({ id: wrongPosition.id });

    await expectRecordToBe({
      totalTransaction: 2,
      totalQuantity: 160,
      totalAsset: "315.00",
      totalCostPerUnit: "1.97",
    });

    // add wrong sale 10
    const wrongQuantity = await caller.transaction.createSale({
      quantity: -10,
      position: 0,
    });
    if (!wrongQuantity) return;

    await expectRecordToBe({
      totalTransaction: 3,
      totalQuantity: 150,
      totalAsset: "295.31",
      totalCostPerUnit: "1.97",
    });

    // update wrong sale to 5
    await caller.transaction.updateTransaction({
      id: wrongQuantity.id,
      quantity: -5,
      cost: Number(wrongQuantity.cost),
      type: wrongQuantity.type,
    });

    await expectRecordToBe({
      totalTransaction: 3,
      totalQuantity: 155,
      totalAsset: "305.16",
      totalCostPerUnit: "1.97",
    });
  });
});

const expectRecordToBe = async ({
  totalTransaction,
  totalQuantity,
  totalAsset,
  totalCostPerUnit,
}: {
  totalTransaction: number;
  totalQuantity: number;
  totalAsset: string;
  totalCostPerUnit: string;
}) => {
  const transactions = await caller.transaction.getAllTransactions();
  const last = await caller.transaction.getLatestUnitCost();
  if (!last) {
    return;
  }
  expect(transactions.length).toEqual(totalTransaction);
  expect(last.totalQuantity).toEqual(totalQuantity);
  expect(last.totalAsset.toFixed(2)).toEqual(totalAsset);
  expect(last.costPerUnit.toFixed(2)).toEqual(totalCostPerUnit);
};
