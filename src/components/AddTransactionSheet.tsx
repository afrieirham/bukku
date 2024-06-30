import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { TransactionType } from "~/constant";

import { Input } from "~/components/ui/input";
import { SheetClose, SheetFooter } from "~/components/ui/sheet";
import { api } from "~/utils/api";

export default function AddTransactionSheet({
  hasTransaction,
}: {
  hasTransaction: boolean;
}) {
  const [type, setType] = useState("");

  return (
    <Sheet onOpenChange={() => setType("")}>
      <SheetTrigger asChild>
        <Button variant="outline">Add Transaction</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Transaction </SheetTitle>
        </SheetHeader>
        <div className="mt-8 space-y-4 text-sm">
          <div className="space-y-2">
            <p>Type</p>
            <Select onValueChange={(value) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransactionType.Purchase}>
                  Purchase
                </SelectItem>
                {hasTransaction && (
                  <SelectItem value={TransactionType.Sale}>Sale</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {type === TransactionType.Purchase && <PurchaseForm />}
          {type === TransactionType.Sale && <SaleForm />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PurchaseForm() {
  const ctx = api.useContext();

  const [loading, setLoading] = useState(false);

  const [cost, setCost] = useState("");
  const [quantity, setQuantity] = useState("");
  const [position, setPosition] = useState("");

  const { mutate } = api.transaction.createPurchase.useMutation({
    onSuccess: () => {
      alert("Purchase added!");
      setQuantity("");
      setCost("");
      setPosition("");
      setLoading(false);
      void ctx.transaction.getAllTransactions.invalidate();
      void ctx.transaction.getLastTransaction.invalidate();
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

    if (Number(quantity) < 1) {
      alert("Quantity should at least be 1");
      setLoading(false);
      return;
    }

    if (Number(cost) <= 0) {
      alert("Cost should at least be 0.01");
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <p>Quantity</p>
        <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div className="space-y-2">
        <p>Cost (RM)</p>
        <Input value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <div className="space-y-2">
        <p>Position</p>
        <ul className="list-inside list-disc text-xs text-gray-500">
          <li>-1 to add to the top</li>
          <li>Enter transaction ID to insert after it</li>
          <li>Leave empty for default</li>
        </ul>
        <Input
          className="max-w-sm"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button type="submit">{loading ? "Saving..." : "Submit"}</Button>
        </SheetClose>
      </SheetFooter>
    </form>
  );
}

function SaleForm() {
  const ctx = api.useContext();

  const [loading, setLoading] = useState(false);

  const [quantity, setQuantity] = useState("");
  const [position, setPosition] = useState("");

  const { mutate } = api.transaction.createSale.useMutation({
    onSuccess: () => {
      alert("Sale added!");
      setQuantity("");
      setPosition("");
      setLoading(false);
      void ctx.transaction.getLastTransaction.invalidate();
      void ctx.transaction.getAllTransactions.invalidate();
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!quantity) {
      alert("Quantity cant be empty");
      setLoading(false);
      return;
    }

    if (Number(quantity) < 1) {
      alert("Quantity should at least be 1");
      setLoading(false);
      return;
    }

    mutate({
      quantity: -Number(quantity),
      position: Number(position),
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <p>Quantity</p>
        <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>

      <div className="space-y-2">
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
      <SheetFooter>
        <SheetClose asChild>
          <Button type="submit">{loading ? "Saving..." : "Submit"}</Button>
        </SheetClose>
      </SheetFooter>
    </form>
  );
}
