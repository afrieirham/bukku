import { format } from "date-fns";
import { useState } from "react";

import EditIcon from "~/components/icons/EditIcon";
import TrashIcon from "~/components/icons/TrashIcon";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { TableCell, TableRow } from "~/components/ui/table";
import { TransactionType } from "~/constant";
import { api, type RouterOutputs } from "~/utils/api";
import { numFormat } from "~/utils/formatter";

type TransactionItem =
  RouterOutputs["transaction"]["getAllTransactions"][number];

export default function TransactionItem({ item }: { item: TransactionItem }) {
  return (
    <TableRow key={item.id}>
      <TableCell>{item.id}</TableCell>
      <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy")}</TableCell>
      <TableCell className="capitalize">{item.type}</TableCell>
      <TableCell align="right">{numFormat(item.quantity, 0)}</TableCell>
      <TableCell align="right">RM{numFormat(item.cost, 2)}</TableCell>
      <TableCell align="right">RM{numFormat(item.totalCost, 2)}</TableCell>
      <TableCell align="right" className="px-0">
        <EditItemSheet item={item} />
        <DeleteDialog item={item} />
      </TableCell>
    </TableRow>
  );
}

function EditItemSheet({ item }: { item: TransactionItem }) {
  const ctx = api.useContext();

  const initialQuantity = String(Math.abs(Number(item.quantity)));

  const [quantity, setQuantity] = useState(initialQuantity);
  const [cost, setCost] = useState(String(item.cost));

  const update = api.transaction.updateTransaction.useMutation({
    onSuccess: () => {
      void ctx.transaction.getAllTransactions.invalidate();
      void ctx.transaction.getLatestUnitCost.invalidate();
    },
  });

  const onUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (Number(quantity) < 1) {
      alert("Quantity should at least be 1");
      return;
    }

    if (Number(cost) <= 0) {
      alert("Cost should at least be 0.01");
      return;
    }

    update.mutate({
      id: item.id,
      type: item.type,
      cost: Number(cost),
      quantity:
        item.type === TransactionType.Sale
          ? -Number(quantity)
          : Number(quantity),
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <EditIcon />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Update Transaction {item.id}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onUpdate} className="mt-8 space-y-4 text-sm">
          <div className="space-y-2">
            <p>Quantity</p>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p>Cost (RM)</p>
            <Input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              readOnly={item.type === TransactionType.Sale}
              className={
                item.type === TransactionType.Sale
                  ? "bg-gray-100 focus-visible:ring-0"
                  : ""
              }
            />
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="submit">Save changes</Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteDialog({ item }: { item: TransactionItem }) {
  const ctx = api.useContext();

  const remove = api.transaction.deleteTransaction.useMutation({
    onSuccess: () => {
      void ctx.transaction.getAllTransactions.invalidate();
      void ctx.transaction.getLatestUnitCost.invalidate();
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <TrashIcon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            transaction and remove the data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" asChild>
            <AlertDialogAction onClick={() => remove.mutate({ id: item.id })}>
              Delete
            </AlertDialogAction>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
