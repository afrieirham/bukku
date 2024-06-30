import { type Prisma } from "@prisma/client";
import { format } from "date-fns";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api, type RouterOutputs } from "~/utils/api";

const formatter = (num: number | string | Prisma.Decimal, decimal: number) =>
  Number(num) < 0
    ? String(Number(-num).toFixed(decimal))
    : String(Number(num).toFixed(decimal));

export default function Home() {
  const { data } = api.transaction.getAllTransactions.useQuery();
  const current = api.transaction.getLatestUnitCost.useQuery();

  if (!current.data) return;

  return (
    <>
      <Head>
        <title>Bukku</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="mx-auto flex w-full max-w-screen-lg flex-col justify-center pt-16">
        <h1 className="font-bold underline">Pages</h1>
        <ul className="list-inside list-disc">
          <li>
            <Button size="sm" variant="link" className="px-0" asChild>
              <Link href="/purchase">Purchases ↗</Link>
            </Button>
          </li>
          <li>
            <Button size="sm" variant="link" className="px-0" asChild>
              <Link href="/sale">Sales ↗</Link>
            </Button>
          </li>
        </ul>
        <div className="flex w-full space-x-2">
          <div className="bg-card text-card-foreground w-full rounded-xl border shadow">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
              <h3 className="text-sm font-medium tracking-tight">
                Cost Per Unit
              </h3>
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold">
                RM{formatter(current.data.costPerUnit, 2)}
              </div>
            </div>
          </div>
          <div className="bg-card text-card-foreground w-full rounded-xl border shadow">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
              <h3 className="text-sm font-medium tracking-tight">Inventory</h3>
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold">
                {formatter(current.data.totalQuantity, 0)}
              </div>
            </div>
          </div>
        </div>
        <Table className="mt-8">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Price (RM)</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Total Amount (RM)</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((item) => <TransactionRow key={item.id} item={item} />)}
          </TableBody>
        </Table>
      </main>
    </>
  );
}

type TransactionItem =
  RouterOutputs["transaction"]["getAllTransactions"][number];

function TransactionRow({ item }: { item: TransactionItem }) {
  const ctx = api.useContext();

  const [quantity, setQuantity] = useState(String(item.quantity));
  const [cost, setCost] = useState(String(item.cost));

  const update = api.transaction.updateTransaction.useMutation({
    onSuccess: () => {
      void ctx.transaction.getAllTransactions.invalidate();
      void ctx.transaction.getLatestUnitCost.invalidate();
    },
  });
  const remove = api.transaction.deleteTransaction.useMutation({
    onSuccess: () => {
      void ctx.transaction.getAllTransactions.invalidate();
      void ctx.transaction.getLatestUnitCost.invalidate();
    },
  });

  return (
    <TableRow key={item.id}>
      <TableCell>{item.id}</TableCell>
      <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy")}</TableCell>
      <TableCell align="right">{formatter(item.cost, 2)}</TableCell>
      <TableCell align="right">{formatter(item.quantity, 0)}</TableCell>
      <TableCell align="right">{formatter(item.totalCost, 2)}</TableCell>
      <TableCell align="right" className="px-0">
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
            <form
              onSubmit={() =>
                update.mutate({
                  id: item.id,
                  type: item.type,
                  cost: Number(cost),
                  quantity: Number(quantity),
                })
              }
              className="mt-8 space-y-4 text-sm"
            >
              <div className="space-y-2">
                <p>Quantity</p>
                <Input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p>Cost (RM)</p>
                <Input value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="submit">Save changes</Button>
                </SheetClose>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
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
                <AlertDialogAction
                  onClick={() => remove.mutate({ id: item.id })}
                >
                  Delete
                </AlertDialogAction>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="icon icon-tabler icon-tabler-edit h-4 w-4"
      width="44"
      height="44"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" />
      <path d="M16 5l3 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="icon icon-tabler icon-tabler-trash h-4 w-4"
      width="44"
      height="44"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 7l16 0" />
      <path d="M10 11l0 6" />
      <path d="M14 11l0 6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
      <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}
