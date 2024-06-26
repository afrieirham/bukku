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
  const [price, setPrice] = useState("");

  const { data } = api.transaction.getAllPurchases.useQuery();
  const { mutate } = api.transaction.createPurchase.useMutation({
    onSuccess: () => {
      alert("Purchase added!");
      setQuantity("");
      setPrice("");
      setLoading(false);
      void ctx.transaction.getAllPurchases.invalidate();
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    if (!price) {
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
        <Button variant="ghost" asChild>
          <Link href="/">← back</Link>
        </Button>
      </div>
      <h1>Purchase</h1>
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
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit">{loading ? "Loading..." : "Submit"}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell align="right">{Number(item.price)}</TableCell>
              <TableCell align="right">{item.quantity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </form>
  );
}

export default Purchase;
