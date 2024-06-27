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
  const [price, setPrice] = useState("");

  const sales = api.transaction.getAllSales.useQuery();
  const { data } = api.transaction.getLatestUnitCost.useQuery();
  const { mutate } = api.transaction.createSale.useMutation({
    onSuccess: () => {
      alert("Sale added!");
      setQuantity("");
      setPrice("");
      setLoading(false);
      void ctx.transaction.getAllSales.invalidate();
    },
  });

  const costPerUnit = data
    ? (Number(data.amount) / data.quantity).toFixed(2)
    : 0;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!data) return;

    if (!quantity) {
      alert("Quantity cant be empty");
      setLoading(false);
      return;
    }

    mutate({
      cost: Number(costPerUnit),
      price: Number(price),
      quantity: Number(quantity),
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-screen-lg flex-col space-y-4 pt-16 text-sm"
    >
      <div>
        <Button variant="link" className="px-0" asChild>
          <Link href="/">← back</Link>
        </Button>
      </div>
      <h1 className="font-bold underline">Sales</h1>
      <div>
        <p>Cost Per Unit</p>
        <p>RM{costPerUnit}</p>
      </div>
      <div>
        <p>Quantity</p>
        <Input
          className="max-w-sm"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <div>
        <p>Sale Price</p>
        <Input
          className="max-w-sm"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div>
        <Button disabled={!data} type="submit">
          {loading ? "Loading..." : "Submit"}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Cost Per Unit (RM)</TableHead>
            <TableHead className="text-right">Total Cost (RM)</TableHead>
            <TableHead className="text-right">Sale Per Unit (RM)</TableHead>
            <TableHead className="text-right">Total Amount (RM)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.data?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell>
                {format(new Date(item.createdAt), "dd/MM/yyyy")}
              </TableCell>
              <TableCell align="right">{item.quantity}</TableCell>
              <TableCell align="right">{item.cost.toFixed(2)}</TableCell>
              <TableCell align="right">
                {(item.quantity * item.cost).toFixed(2)}
              </TableCell>
              <TableCell align="right">{item.price.toFixed(2)}</TableCell>
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
