import Link from "next/link";
import React, { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";

function Sale() {
  const ctx = api.useContext();

  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [position, setPosition] = useState("");

  const { data } = api.transaction.getLatestUnitCost.useQuery();
  const { mutate } = api.transaction.createSale.useMutation({
    onSuccess: () => {
      alert("Sale added!");
      setQuantity("");
      setPosition("");
      setLoading(false);
      void ctx.transaction.getLatestUnitCost.invalidate();
      void ctx.transaction.getAllSales.invalidate();
    },
  });

  const costPerUnit = Number(data?.costPerUnit);
  const availableQuantity = Number(data?.totalQuantity);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!data) return;

    if (!quantity) {
      alert("Quantity cant be empty");
      setLoading(false);
      return;
    }

    mutate({
      quantity: -Number(quantity),
      position: Number(position),
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
        <p>Available Quantity</p>
        <p>{availableQuantity}</p>
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
        <p>Position</p>
        <ul className="list-inside list-disc text-xs text-gray-500">
          <li>Enter transaction ID to insert after it</li>
          <li>Leave empty for default</li>
        </ul>
        <Input
          className="max-w-sm"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </div>
      <div>
        <Button disabled={!data} type="submit">
          {loading ? "Loading..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}

export default Sale;
