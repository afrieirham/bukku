import Link from "next/link";
import React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

function Sale() {
  return (
    <main className="mx-auto flex w-full max-w-screen-lg flex-col space-y-4 pt-16 text-sm">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/">← back</Link>
        </Button>
      </div>
      <h1>Sale</h1>
      <div>
        <p>Quantity</p>
        <Input className="max-w-sm" />
      </div>
      <div>
        <p>Price Per Unit</p>
        <p>[auto-calculated]</p>
      </div>
      <div>
        <Button>Submit</Button>
      </div>
    </main>
  );
}

export default Sale;
