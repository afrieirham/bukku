import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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

      return await ctx.db.transactions.create({
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

        return await ctx.db.transactions.create({
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

  // getAllBalances: publicProcedure.query(async ({ ctx }) => {
  //   return (await ctx.db.balance.findMany({})).map((item) => ({
  //     ...item,
  //     amount: Number(item.amount),
  //   }));
  // }),
});
