import Link from "next/link";
import React, { useState } from "react";
import { format } from "date-fns";

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

function Sale() {
  const ctx = api.useContext();

  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");

  const sales = api.transaction.getAllSales.useQuery();
  const { data } = api.transaction.getLatestUnitCost.useQuery();
  const { mutate } = api.transaction.createSale.useMutation({
    onSuccess: () => {
      alert("Sale added!");
      setQuantity("");
      setLoading(false);
      void ctx.transaction.getAllSales.invalidate();
    },
  });

  if (!data) return;

  const pricePerUnit = (Number(data.amount) / data.quantity).toFixed(2);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!quantity) {
      alert("Quantity cant be empty");
      setLoading(false);
      return;
    }

    mutate({
      price: Number(pricePerUnit),
      quantity: Number(quantity),
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-screen-lg flex-col space-y-4 pt-16 text-sm"
    >
      <div>
        <Button variant="ghost" asChild>
          <Link href="/">← back</Link>
        </Button>
      </div>
      <h1>Sale</h1>
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
        <p>RM{pricePerUnit}</p>
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
            <TableHead className="text-right">Total Cost (RM)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.data?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell>
                {format(new Date(item.createdAt), "dd/MM/yyyy")}
              </TableCell>
              <TableCell align="right">{item.price.toFixed(2)}</TableCell>
              <TableCell align="right">{item.quantity}</TableCell>
              <TableCell align="right">
                {(item.quantity * item.price).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </form>
  );
}

export default Sale;
