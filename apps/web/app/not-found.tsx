import type { Metadata } from "next";
import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="pt-safe pb-safe flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        className="bg-card w-full max-w-md"
        icon={<SearchXIcon />}
        title="Page not found"
        description="This link doesn't point to a club or meeting. Check the address, or head back to your clubs."
        action={
          <Button asChild>
            <Link href="/dashboard">My clubs</Link>
          </Button>
        }
      />
    </main>
  );
}
