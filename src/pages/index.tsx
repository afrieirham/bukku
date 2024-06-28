import Head from "next/head";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function Home() {
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
      </main>
    </>
  );
}
