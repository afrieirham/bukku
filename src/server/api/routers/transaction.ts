import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
  createPurchase: publicProcedure
    .input(z.object({ cost: z.number(), quantity: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // get latest balance record
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
            totalAsset: totalCost,
            costPerUnit: totalCost / input.quantity,

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
          totalAsset,
          costPerUnit: totalAsset / totalQuantity,

          previousId: lastTrx.id,
        },
      });
    }),

  // getLatestUnitCost: publicProcedure.query(async ({ ctx }) => {
  //   // get latest balance record
  //   const [latestBalance] = await ctx.db.balance.findMany({ take: -1 });
  //   return latestBalance;
  // }),

  // createSale: publicProcedure
  //   .input(
  //     z.object({
  //       cost: z.number(),
  //       quantity: z.number(),
  //       price: z.number(),
  //     }),
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     // get latest balance record
  //     const [latestBalance] = await ctx.db.balance.findMany({ take: -1 });

  //     const amount = input.cost * input.quantity;

  //     if (!latestBalance) {
  //       // assuming this is not possible
  //     } else {
  //       await ctx.db.balance.create({
  //         data: {
  //           amount: Number(latestBalance.amount) - amount,
  //           quantity: latestBalance.quantity - input.quantity,
  //         },
  //       });
  //     }

  //     // add sale record
  //     return await ctx.db.sales.create({
  //       data: {
  //         cost: input.cost,
  //         price: input.price,
  //         quantity: input.quantity,
  //       },
  //     });
  //   }),

  // getAllPurchases: publicProcedure.query(async ({ ctx }) => {
  //   return (await ctx.db.purchases.findMany({})).map((item) => ({
  //     ...item,
  //     price: Number(item.price),
  //   }));
  // }),

  // getAllSales: publicProcedure.query(async ({ ctx }) => {
  //   return (await ctx.db.sales.findMany({})).map((item) => ({
  //     ...item,
  //     cost: Number(item.cost),
  //     price: Number(item.price),
  //   }));
  // }),

  // getAllBalances: publicProcedure.query(async ({ ctx }) => {
  //   return (await ctx.db.balance.findMany({})).map((item) => ({
  //     ...item,
  //     amount: Number(item.amount),
  //   }));
  // }),
});
