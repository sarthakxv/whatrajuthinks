import Link from "next/link";
import { Header, Icon } from "@/components/ui";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="narrow prose" id="main">
        <span className="eyebrow">A slight wrong turn</span>
        <h1>This page went quiet.</h1>
        <p>
          There isn’t a page at this address. Your conversations are waiting in
          your workspace.
        </p>
        <Link className="btn btn-primary" href="/account">
          Your reports <Icon name="arrow" />
        </Link>
      </main>
    </>
  );
}
