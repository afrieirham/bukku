import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
  createPurchase: publicProcedure
    .input(z.object({ price: z.number(), quantity: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.purchases.create({
        data: {
          price: input.price,
          quantity: input.quantity,
        },
      });
    }),
});
