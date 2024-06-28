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

export const transactionRouter = createTRPCRouter({
  createPurchase: publicProcedure
    .input(z.object({ cost: z.number(), quantity: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // get latest transaction record
      const [lastTrx] = await ctx.db.transactions.findMany({ take: -1 });

      const totalCost = input.cost * input.quantity;

      // first transaction
      if (!lastTrx) {
        return await ctx.db.transactions.create({
          data: {
            type: "purchase",
            quantity: input.quantity,
            cost: input.cost,

            totalQuantity: input.quantity,
            totalAsset: totalCost.toFixed(2),
            costPerUnit: (totalCost / input.quantity).toFixed(2),

            previousId: null,
          },
        });
      }

      const totalQuantity = lastTrx.totalQuantity + input.quantity;
      const totalAsset = Number(lastTrx.totalAsset) + totalCost;

      // add new purchase
      const newPurchase = await ctx.db.transactions.create({
        data: {
          type: "purchase",
          quantity: input.quantity,
          cost: input.cost,

          totalQuantity,
          totalAsset: totalAsset.toFixed(2),
          costPerUnit: (totalAsset / totalQuantity).toFixed(2),

          previousId: lastTrx.id,
        },
      });

      // update previous's next
      await ctx.db.transactions.update({
        where: { id: lastTrx.id },
        data: { nextId: newPurchase.id },
      });

      return newPurchase;
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
      const [lastTrx] = await ctx.db.transactions.findMany({ take: -1 });

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
    // get latest balance record
    const [lastTrx] = await ctx.db.transactions.findMany({ take: -1 });

    return lastTrx;
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
