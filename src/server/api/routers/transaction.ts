import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
  createPurchase: publicProcedure
    .input(z.object({ price: z.number(), quantity: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // get latest balance record
      const [latestBalance] = await ctx.db.balance.findMany({ take: -1 });

      const amount = input.price * input.quantity;

      // add new balance record
      if (!latestBalance) {
        await ctx.db.balance.create({
          data: {
            amount: amount,
            quantity: input.quantity,
          },
        });
      } else {
        await ctx.db.balance.create({
          data: {
            amount: Number(latestBalance.amount) + amount,
            quantity: latestBalance.quantity + input.quantity,
          },
        });
      }

      // add purchase record
      return await ctx.db.purchases.create({
        data: {
          price: input.price,
          quantity: input.quantity,
        },
      });
    }),

  getLatestUnitCost: publicProcedure.query(async ({ ctx }) => {
    // get latest balance record
    const [latestBalance] = await ctx.db.balance.findMany({ take: -1 });
    return latestBalance;
  }),

  createSale: publicProcedure
    .input(z.object({ cost: z.number(), quantity: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // get latest balance record
      const [latestBalance] = await ctx.db.balance.findMany({ take: -1 });

      const amount = input.cost * input.quantity;

      if (!latestBalance) {
        // assuming this is not possible
      } else {
        await ctx.db.balance.create({
          data: {
            amount: Number(latestBalance.amount) - amount,
            quantity: latestBalance.quantity - input.quantity,
          },
        });
      }

      // add sale record
      return await ctx.db.sales.create({
        data: {
          cost: input.cost,
          price: input.cost * input.quantity,
          quantity: input.quantity,
        },
      });
    }),

  getAllPurchases: publicProcedure.query(async ({ ctx }) => {
    return (await ctx.db.purchases.findMany({})).map((item) => ({
      ...item,
      price: Number(item.price),
    }));
  }),
  getAllSales: publicProcedure.query(async ({ ctx }) => {
    return (await ctx.db.sales.findMany({})).map((item) => ({
      ...item,
      price: Number(item.price),
      cost: Number(item.cost),
    }));
  }),
  getAllBalances: publicProcedure.query(async ({ ctx }) => {
    return (await ctx.db.balance.findMany({})).map((item) => ({
      ...item,
      amount: Number(item.amount),
    }));
  }),
});
