import { z } from "zod";
import { TransactionType } from "~/constant";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const recalculateTransaction = async (id: number) => {
  const current = await db.transactions.findFirst({ where: { id } });
  if (!current) {
    return;
  }

  // transaction with no previous
  if (!current.previousId) {
    const totalCost = Number(current.cost) * current.quantity;
    const totalQuantity = current.quantity;
    const totalAsset = totalCost;
    const costPerUnit = totalAsset / totalQuantity;
    return { totalCost, totalQuantity, totalAsset, costPerUnit };
  }

  // transaction with previous
  const previous = await db.transactions.findFirst({
    where: { id: current.previousId },
  });
  if (!previous) {
    return;
  }

  const cost =
    current.type === TransactionType.Sale ? previous.costPerUnit : current.cost;

  const totalCost = Number(cost) * current.quantity;
  const totalQuantity = previous.totalQuantity + current.quantity;
  const totalAsset = Number(previous.totalAsset) + totalCost;
  const costPerUnit = totalAsset / totalQuantity;
  return { cost, totalCost, totalQuantity, totalAsset, costPerUnit };
};

const updatePurchaseWithNewValue = async (
  id: number,
  quantity: number,
  cost: number,
) => {
  const current = await db.transactions.findFirst({
    where: { id: id },
  });

  // not possible but make typescript happy
  if (!current) {
    return null;
  }

  // update transaction with new "input"
  await db.transactions.update({ where: { id }, data: { quantity, cost } });

  // recalculate and update
  const newValue = await recalculateTransaction(id);
  if (!newValue) {
    return;
  }
  return await db.transactions.update({ where: { id }, data: { ...newValue } });
};

const updateSaleWithNewValue = async (id: number, quantity: number) => {
  const current = await db.transactions.findFirst({
    where: { id: id },
  });
  if (!current) {
    return null;
  }
  if (!current.previousId) {
    return null;
  }

  const previous = await db.transactions.findFirst({
    where: { id: current.previousId },
  });
  if (!previous) {
    return null;
  }

  // update transaction with new "input"
  await db.transactions.update({
    where: { id },
    data: { quantity, cost: previous.costPerUnit },
  });

  // recalculate and update
  const newValue = await recalculateTransaction(id);
  if (!newValue) {
    return;
  }
  return await db.transactions.update({ where: { id }, data: { ...newValue } });
};

const updatePointersForDelete = async (id: number) => {
  const current = await db.transactions.findFirst({
    where: { id: id },
  });

  if (!current) {
    return;
  }

  const previousId = current.previousId;
  const nextId = current.nextId;

  let next;

  // delete myself
  await db.transactions.delete({ where: { id: id } });

  // update previous's next
  if (previousId) {
    const previous = await db.transactions.findFirst({
      where: { id: previousId },
    });
    if (!previous) {
      return;
    }

    await db.transactions.update({
      where: { id: previous.id },
      data: {
        nextId: nextId,
      },
    });
  }

  // update next's previous
  if (nextId) {
    next = await db.transactions.findFirst({
      where: { id: nextId },
    });
    if (!next) {
      return;
    }

    await db.transactions.update({
      where: { id: next.id },
      data: {
        previousId: previousId,
      },
    });
  }

  return next;
};

const updatePurchaseOrSale = async (
  id: number,
  quantity: number,
  cost: number,
  type: string,
) => {
  if (type === TransactionType.Purchase) {
    await updatePurchaseWithNewValue(id, quantity, cost);
  } else {
    await updateSaleWithNewValue(id, quantity);
  }
};

const recalculateTransactionFrom = async (initialId: number) => {
  let id = initialId;
  let cur = null;

  while (id) {
    const newValue = await recalculateTransaction(id);
    if (!newValue) {
      return;
    }
    await db.transactions.update({ where: { id }, data: newValue });

    cur = await db.transactions.findFirst({ where: { id } });
    if (!cur) {
      return;
    }

    // start check if has next
    const nextId: number | null = cur.nextId;

    if (!nextId) {
      return;
    }
    // end check if has next

    id = nextId;
  }

  return;
};

const defaultCreatePurchase = async (cost: number, quantity: number) => {
  const totalCost = cost * quantity;

  // get latest transaction record
  const previous = await getLastTransaction();

  // first transaction
  if (!previous) {
    return await db.transactions.create({
      data: {
        type: TransactionType.Purchase,
        quantity: quantity,
        cost: cost,
        totalCost: totalCost,

        totalQuantity: quantity,
        totalAsset: totalCost,
        costPerUnit: totalCost / quantity,

        previousId: null,
      },
    });
  }

  const totalQuantity = previous.totalQuantity + quantity;
  const totalAsset = Number(previous.totalAsset) + totalCost;

  // add new purchase
  const newPurchase = await db.transactions.create({
    data: {
      type: TransactionType.Purchase,
      quantity: quantity,
      cost: cost,
      totalCost: totalCost,

      totalQuantity,
      totalAsset: totalAsset,
      costPerUnit: totalAsset / totalQuantity,

      previousId: previous.id,
    },
  });

  // update previous's next
  await db.transactions.update({
    where: { id: previous.id },
    data: { nextId: newPurchase.id },
  });

  return newPurchase;
};

const getLastTransaction = async () => {
  return await db.transactions.findFirst({ where: { nextId: null } });
};

const defaultCreateSale = async (quantity: number) => {
  // get latest transaction record
  const previous = await getLastTransaction();
  if (!previous) {
    return;
  }

  const totalCost = Number(previous.costPerUnit) * quantity;
  const totalQuantity = previous.totalQuantity + quantity;
  const totalAsset = Number(previous.totalAsset) + totalCost;
  const costPerUnit = totalQuantity === 0 ? 0 : totalAsset / totalQuantity;

  const newSale = await db.transactions.create({
    data: {
      type: TransactionType.Sale,
      quantity: quantity,
      cost: previous.costPerUnit,
      totalCost: totalCost,

      totalQuantity: totalQuantity,
      totalAsset: totalAsset,
      costPerUnit: costPerUnit,

      previousId: previous.id,
    },
  });

  // update previous's next
  await db.transactions.update({
    where: { id: previous.id },
    data: { nextId: newSale.id },
  });

  return newSale;
};

export const transactionRouter = createTRPCRouter({
  createPurchase: publicProcedure
    .input(
      z.object({
        cost: z.number(),
        quantity: z.number(),
        position: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const totalCost = input.cost * input.quantity;

      // insert to top
      if (input.position === -1) {
        const head = await db.transactions.findFirst({
          where: { previousId: null },
        });

        if (!head) {
          return await defaultCreatePurchase(input.cost, input.quantity);
        }

        // create and update my next to head id
        const newPurchase = await db.transactions.create({
          data: {
            type: TransactionType.Purchase,
            quantity: input.quantity,
            cost: input.cost,
            totalCost: totalCost,

            totalQuantity: input.quantity,
            totalAsset: totalCost,
            costPerUnit: totalCost / input.quantity,

            nextId: head.id,
          },
        });
        // update top prev to my id
        await db.transactions.update({
          where: { id: head.id },
          data: { previousId: newPurchase.id },
        });

        return recalculateTransactionFrom(head.id);
      }

      if (input.position > 0) {
        // check if position is tail
        const newPrevious = await db.transactions.findFirst({
          where: { id: input.position },
        });

        if (!newPrevious) {
          return;
        }

        if (!newPrevious.nextId) {
          return await defaultCreatePurchase(input.cost, input.quantity);
        }

        // connect to list
        // 1. update my previous to previous id
        // 2. update my next to previous's next
        const newPurchasePrevious = newPrevious.id;
        const newPurchaseNext = newPrevious.nextId;

        // clear pointers
        // 1. clear previous's next pointer
        await db.transactions.update({
          where: { id: newPrevious.id },
          data: {
            nextId: null,
          },
        });
        // 2. clear next's previous pointer
        await db.transactions.update({
          where: { id: newPrevious.nextId },
          data: {
            previousId: null,
          },
        });

        const totalQuantity = newPrevious.totalQuantity + input.quantity;
        const totalAsset = Number(newPrevious.totalAsset) + totalCost;

        const newPurchase = await db.transactions.create({
          data: {
            type: TransactionType.Purchase,
            quantity: input.quantity,
            cost: input.cost,
            totalCost: totalCost,

            totalQuantity: totalQuantity,
            totalAsset: totalAsset,
            costPerUnit: totalAsset / totalQuantity,

            previousId: newPurchasePrevious,
            nextId: newPurchaseNext,
          },
        });

        // update previous and next pointer
        // 1. previous's next = my id
        await db.transactions.update({
          where: { id: newPrevious.id },
          data: {
            nextId: newPurchase.id,
          },
        });

        // 2. next's previous = my id
        await db.transactions.update({
          where: { id: newPrevious.nextId },
          data: {
            previousId: newPurchase.id,
          },
        });

        await recalculateTransactionFrom(newPurchase.id);
        return;
      }

      return await defaultCreatePurchase(input.cost, input.quantity);
    }),

  createSale: publicProcedure
    .input(z.object({ quantity: z.number(), position: z.number() }))
    .mutation(async ({ input }) => {
      if (input.position > 0) {
        // check if position is tail
        const newPrevious = await db.transactions.findFirst({
          where: { id: input.position },
        });
        if (!newPrevious) {
          return;
        }

        if (!newPrevious.nextId) {
          return await defaultCreateSale(input.quantity);
        }

        // connect to list
        // 1. update my previous to previous id
        // 2. update my next to previous's next
        const newSalePrevious = newPrevious.id;
        const newSaleNext = newPrevious.nextId;

        // clear pointers
        // 1. clear previous's next pointer
        await db.transactions.update({
          where: { id: newPrevious.id },
          data: {
            nextId: null,
          },
        });
        // 2. clear next's previous pointer
        await db.transactions.update({
          where: { id: newPrevious.nextId },
          data: {
            previousId: null,
          },
        });

        const previousCostPerUnit = Number(newPrevious.costPerUnit);
        const totalCost = previousCostPerUnit * input.quantity;
        const totalQuantity = newPrevious.totalQuantity + input.quantity;
        const totalAsset = Number(newPrevious.totalAsset) + totalCost;

        const newSale = await db.transactions.create({
          data: {
            type: TransactionType.Sale,
            quantity: input.quantity,
            cost: previousCostPerUnit,
            totalCost: totalCost,

            totalQuantity: totalQuantity,
            totalAsset: totalAsset,
            costPerUnit: totalAsset / totalQuantity,

            previousId: newSalePrevious,
            nextId: newSaleNext,
          },
        });

        // update previous and next pointer
        // 1. previous's next = my id
        await db.transactions.update({
          where: { id: newPrevious.id },
          data: {
            nextId: newSale.id,
          },
        });

        // 2. next's previous = my id
        await db.transactions.update({
          where: { id: newPrevious.nextId },
          data: {
            previousId: newSale.id,
          },
        });

        return await recalculateTransactionFrom(newSale.id);
      }

      return await defaultCreateSale(input.quantity);
    }),

  updateTransaction: publicProcedure
    .input(
      z.object({
        id: z.number(),
        quantity: z.number(),
        cost: z.number(),
        type: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await updatePurchaseOrSale(
        input.id,
        input.quantity,
        input.cost,
        input.type,
      );
      return recalculateTransactionFrom(input.id);
    }),

  deleteTransaction: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const next = await updatePointersForDelete(input.id);

      if (!next) {
        return;
      }

      return await recalculateTransactionFrom(next.id);
    }),

  getLatestUnitCost: publicProcedure.query(async ({}) => {
    return getLastTransaction();
  }),

  getAllTransactions: publicProcedure.query(async ({}) => {
    const transactions = await db.transactions.findMany({});

    const sorted: typeof transactions = [];

    const head = transactions.find((trx) => !trx.previousId);
    if (!head) {
      return sorted;
    }
    sorted.push(head);

    if (!head.nextId) {
      return sorted;
    }

    let nextId = head.nextId;
    let next;

    while (nextId) {
      next = transactions.find((trx) => trx.id === nextId);
      if (!next) {
        return sorted;
      }
      sorted.push(next);

      if (!next.nextId) {
        return sorted;
      }
      nextId = next.nextId;
    }

    return sorted;
  }),
});
