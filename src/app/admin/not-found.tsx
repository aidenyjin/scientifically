import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Missing pack, lesson or job inside the admin area (keeps the admin header). */
export default function AdminNotFound() {
  return (
    <Card className="mx-auto mt-8 max-w-md py-12 text-center">
      <p className="font-display text-xl font-semibold">Not found</p>
      <p className="text-ink-soft mt-1">
        That pack, lesson or job doesn&apos;t exist. It may have been deleted.
      </p>
      <Link href="/admin" className={buttonClassName({ className: "mt-5" })}>
        Back to packs
      </Link>
    </Card>
  );
}
