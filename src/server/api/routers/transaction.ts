import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { type dbType } from "~/server/db";

const updatePurchase = async (
  db: dbType,
  id: number,
  quantity: number,
  cost: number,
) => {
  const currentTransaction = await db.transactions.findFirst({
    where: { id: id },
  });

  // not possible but make typescript happy
  if (!currentTransaction) {
    return null;
  }

  const currentAsset = quantity * cost;
  let newTotalQuantity;
  let newTotalAsset;

  if (currentTransaction.previousId) {
    // transaction with previous
    const prevTransaction = await db.transactions.findFirst({
      where: { id: currentTransaction.previousId },
    });

    // not possible but make typescript happy
    if (!prevTransaction) {
      return null;
    }

    newTotalQuantity = prevTransaction.totalQuantity + quantity;
    newTotalAsset = Number(prevTransaction.totalAsset) + currentAsset;
  } else {
    // first transaction
    newTotalQuantity = quantity;
    newTotalAsset = currentAsset;
  }

  return await db.transactions.update({
    where: { id: id },
    data: {
      quantity: quantity,
      cost: cost,
      totalQuantity: newTotalQuantity,
      totalAsset: newTotalAsset,
      costPerUnit: newTotalAsset / newTotalQuantity,
    },
  });
};

const updateSale = async (db: dbType, id: number, quantity: number) => {
  const currentTransaction = await db.transactions.findFirst({
    where: { id: id },
  });

  // not possible but make typescript happy
  if (!currentTransaction) {
    return null;
  }

  // not possible but make typescript happy
  if (!currentTransaction.previousId) {
    return null;
  }

  const prevTransaction = await db.transactions.findFirst({
    where: { id: currentTransaction.previousId },
  });

  // not possible but make typescript happy
  if (!prevTransaction) {
    return null;
  }

  const currentAsset = Number(currentTransaction.cost) * quantity;
  const newTotalQuantity = prevTransaction.totalQuantity - quantity;
  const newTotalAsset = Number(prevTransaction.totalAsset) - currentAsset;

  return await db.transactions.update({
    where: { id: id },
    data: {
      quantity: quantity,

      cost: prevTransaction.costPerUnit,
      totalQuantity: newTotalQuantity,
      totalAsset: newTotalAsset,
      costPerUnit:
        newTotalQuantity === 0 ? 0 : newTotalAsset / newTotalQuantity,
    },
  });
};

const updatePointersForDelete = async (db: dbType, id: number) => {
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

const updateTransaction = async (
  db: dbType,
  initialId: number,
  initialQuantity: number,
  initialCost: number,
  initialType: string,
) => {
  let id: number | null = initialId;
  let quantity = initialQuantity;
  let cost = initialCost;
  let type: string | null = initialType;

  let cur = null;

  while (id) {
    if (type === "purchase") {
      await updatePurchase(db, id, quantity, cost);
    } else {
      await updateSale(db, id, quantity);
    }

    cur = await db.transactions.findFirst({ where: { id } });
    if (!cur) {
      return;
    }

    // start check if has next
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const nextId: number | null = cur.nextId;

    if (!nextId) {
      return;
    }
    // end check if has next

    // start get next quantity
    const next = await db.transactions.findFirst({
      where: { id: nextId },
    });

    if (!next) {
      return;
    }

    if (!next.quantity) {
      return;
    }
    // end get next quantity

    id = nextId;
    quantity = next.quantity;
    cost = Number(next.cost);
    type = next.type;
  }

  return;
};

const defaultInsert = async (db: dbType, cost: number, quantity: number) => {
  const totalCost = cost * quantity;

  // get latest transaction record
  const lastTrx = await getLastTransaction(db);

  // first transaction
  if (!lastTrx) {
    return await db.transactions.create({
      data: {
        type: "purchase",
        quantity: quantity,
        cost: cost,

        totalQuantity: quantity,
        totalAsset: totalCost.toFixed(2),
        costPerUnit: (totalCost / quantity).toFixed(2),

        previousId: null,
      },
    });
  }

  const totalQuantity = lastTrx.totalQuantity + quantity;
  const totalAsset = Number(lastTrx.totalAsset) + totalCost;

  // add new purchase
  const newPurchase = await db.transactions.create({
    data: {
      type: "purchase",
      quantity: quantity,
      cost: cost,

      totalQuantity,
      totalAsset: totalAsset.toFixed(2),
      costPerUnit: (totalAsset / totalQuantity).toFixed(2),

      previousId: lastTrx.id,
    },
  });

  // update previous's next
  await db.transactions.update({
    where: { id: lastTrx.id },
    data: { nextId: newPurchase.id },
  });

  return newPurchase;
};

const getLastTransaction = async (db: dbType) => {
  return await db.transactions.findFirst({ where: { nextId: null } });
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
    .mutation(async ({ ctx, input }) => {
      const totalCost = input.cost * input.quantity;

      // insert to top
      if (input.position === -1) {
        const head = await ctx.db.transactions.findFirst({
          where: { previousId: null },
        });
        if (!head) {
          return await defaultInsert(ctx.db, input.cost, input.quantity);
        }

        // create and update my next to head id
        const newPurchase = await ctx.db.transactions.create({
          data: {
            type: "purchase",
            quantity: input.quantity,
            cost: input.cost,

            totalQuantity: input.quantity,
            totalAsset: totalCost.toFixed(2),
            costPerUnit: (totalCost / input.quantity).toFixed(2),

            nextId: head.id,
          },
        });
        // update top prev to my id
        await ctx.db.transactions.update({
          where: { id: head.id },
          data: { previousId: newPurchase.id },
        });

        return updateTransaction(
          ctx.db,
          head.id,
          head.quantity,
          Number(head.cost),
          head.type,
        );
      }

      if (input.position > 0) {
        // check if position is tail
        const newPrevious = await ctx.db.transactions.findFirst({
          where: { id: input.position },
        });

        if (!newPrevious) {
          return;
        }

        if (!newPrevious.nextId) {
          return await defaultInsert(ctx.db, input.cost, input.quantity);
        }

        // connect to list
        // 1. update my previous to previous id
        // 2. update my next to previous's next
        const newPurchasePrevious = newPrevious.id;
        const newPurchaseNext = newPrevious.nextId;

        // clear pointers
        // 1. clear previous's next pointer
        await ctx.db.transactions.update({
          where: { id: newPrevious.id },
          data: {
            nextId: null,
          },
        });
        // 2. clear next's previous pointer
        await ctx.db.transactions.update({
          where: { id: newPrevious.nextId },
          data: {
            previousId: null,
          },
        });

        const totalQuantity = newPrevious.totalQuantity + input.quantity;
        const totalAsset = Number(newPrevious.totalAsset) + totalCost;

        const newPurchase = await ctx.db.transactions.create({
          data: {
            type: "purchase",
            quantity: input.quantity,
            cost: input.cost,

            totalQuantity,
            totalAsset,
            costPerUnit: totalAsset / totalQuantity,

            previousId: newPurchasePrevious,
            nextId: newPurchaseNext,
          },
        });

        // update previous and next pointer
        // 1. previous's next = my id
        await ctx.db.transactions.update({
          where: { id: newPrevious.id },
          data: {
            nextId: newPurchase.id,
          },
        });

        // 2. next's previous = my id
        await ctx.db.transactions.update({
          where: { id: newPrevious.nextId },
          data: {
            previousId: newPurchase.id,
          },
        });

        await updateTransaction(
          ctx.db,
          newPurchase.id,
          newPurchase.quantity,
          Number(newPurchase.cost),
          newPurchase.type,
        );
        return;
      }

      return await defaultInsert(ctx.db, input.cost, input.quantity);
    }),

  getAllPurchases: publicProcedure.query(async ({ ctx }) => {
    return (
      await ctx.db.transactions.findMany({ where: { type: "purchase" } })
    ).map((item) => ({
      ...item,
      cost: Number(item.cost),
      totalAsset: Number(item.totalAsset),
      costPerUnit: Number(item.costPerUnit),
    }));
  }),

  createSale: publicProcedure
    .input(z.object({ cost: z.number(), quantity: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // get latest transaction record
      const lastTrx = await getLastTransaction(ctx.db);

      if (!lastTrx) {
        // not possible
      } else {
        const totalCost = input.cost * input.quantity;

        const totalQuantity = lastTrx.totalQuantity - input.quantity;
        const totalAsset = Number(lastTrx.totalAsset) - totalCost;

        const newSale = await ctx.db.transactions.create({
          data: {
            type: "sale",
            quantity: input.quantity,
            cost: input.cost,

            totalQuantity,
            totalAsset: totalAsset.toFixed(2),
            costPerUnit:
              totalQuantity === 0 ? 0 : (totalAsset / totalQuantity).toFixed(2),

            previousId: lastTrx.id,
          },
        });

        // update previous's next
        await ctx.db.transactions.update({
          where: { id: lastTrx.id },
          data: { nextId: newSale.id },
        });

        return newSale;
      }
    }),

  getLatestUnitCost: publicProcedure.query(async ({ ctx }) => {
    return getLastTransaction(ctx.db);
  }),

  getAllSales: publicProcedure.query(async ({ ctx }) => {
    return (
      await ctx.db.transactions.findMany({ where: { type: "sale" } })
    ).map((item) => ({
      ...item,
      cost: Number(item.cost),
      totalAsset: Number(item.totalAsset),
      costPerUnit: Number(item.costPerUnit),
    }));
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
    .mutation(async ({ ctx, input }) => {
      return updateTransaction(
        ctx.db,
        input.id,
        input.quantity,
        input.cost,
        input.type,
      );
    }),

  deletePurchase: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const next = await updatePointersForDelete(ctx.db, input.id);

      if (!next) {
        return;
      }

      return await updateTransaction(
        ctx.db,
        next.id,
        next.quantity,
        Number(next.cost),
        next.type,
      );
    }),
});
