import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
  createPurchase: publicProcedure
    .input(z.object({ price: z.number(), quantity: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // get latest balance record
      const [latestBalance] = await ctx.db.balance.findMany({ take: -1 });

      // add new balance record
      const amount = input.price * input.quantity;

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
            amount: latestBalance.amount + amount,
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
});
