import { format } from "date-fns";
import Link from "next/link";
import React, { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/utils/api";

function Purchase() {
  const ctx = api.useContext();

  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");

  const { data } = api.transaction.getAllPurchases.useQuery();
  const { mutate } = api.transaction.createPurchase.useMutation({
    onSuccess: () => {
      alert("Purchase added!");
      setQuantity("");
      setCost("");
      setLoading(false);
      void ctx.transaction.getAllPurchases.invalidate();
    },
  });

  const update = api.transaction.updateTransaction.useMutation({
    onSuccess: () => {
      void ctx.transaction.getAllPurchases.invalidate();
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    if (!cost) {
      alert("Price cant be empty");
      setLoading(false);
      return;
    }

    if (!quantity) {
      alert("Quantity cant be empty");
      setLoading(false);
      return;
    }

    mutate({
      cost: Number(cost),
      quantity: Number(quantity),
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-screen-lg flex-col space-y-4 pt-16 text-sm"
    >
      <div>
        <Button size="sm" variant="link" className="px-0" asChild>
          <Link href="/">← back</Link>
        </Button>
      </div>
      <h1 className="font-bold underline">Purchases</h1>
      <div>
        <p>Quantity</p>
        <Input
          className="max-w-sm"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <div>
        <p>Price Per Unit</p>
        <Input
          className="max-w-sm"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit">{loading ? "Loading..." : "Submit"}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Price (RM)</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Total Amount (RM)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>{" "}
              <TableCell>
                {format(new Date(item.createdAt), "dd/MM/yyyy")}
              </TableCell>
              <TableCell align="right">{item.cost.toFixed(2)}</TableCell>
              <TableCell align="right">{item.quantity}</TableCell>
              <TableCell align="right">
                {(item.quantity * item.cost).toFixed(2)}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  onClick={() => {
                    const quantity = Number(prompt("qty"));
                    update.mutate({
                      id: item.id,
                      quantity,
                      type: "purchase",
                    });
                  }}
                >
                  Update
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </form>
  );
}

export default Purchase;
