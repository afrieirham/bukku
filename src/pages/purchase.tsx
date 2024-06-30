import Link from "next/link";
import React, { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";

function Purchase() {
  const ctx = api.useContext();

  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [position, setPosition] = useState("");

  const { mutate } = api.transaction.createPurchase.useMutation({
    onSuccess: () => {
      alert("Purchase added!");
      setQuantity("");
      setCost("");
      setPosition("");
      setLoading(false);
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
      position: Number(position),
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
        <p>Position</p>
        <ul className="list-inside list-disc text-xs text-gray-500">
          <li>Enter transaction ID to insert after it</li>
          <li>Leave empty for default</li>
          <li>-1 to add to the top</li>
        </ul>
        <Input
          className="max-w-sm"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </div>
      <div>
        <Button type="submit">{loading ? "Loading..." : "Submit"}</Button>
      </div>
    </form>
  );
}

export default Purchase;
