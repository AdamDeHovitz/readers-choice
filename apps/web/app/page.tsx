import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDaysIcon, TrophyIcon, VoteIcon } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: CalendarDaysIcon,
    title: "Plan meetings",
    body: "Themes, dates and deadlines in one place.",
  },
  {
    icon: VoteIcon,
    title: "Vote together",
    body: "Nominate books, then pick with approval or ranked-choice votes.",
  },
  {
    icon: TrophyIcon,
    title: "Rank your year",
    body: "See how the club's favorites stack up.",
  },
];

export default async function Home() {
  // Signed-in readers go straight to their clubs, like an installed app.
  if (await auth()) redirect("/dashboard");

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-6">
      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="text-primary text-sm font-bold tracking-widest uppercase">
          Book club, sorted
        </p>
        <h1 className="font-display text-foreground mt-3 text-5xl leading-[1.05]">
          Readers&apos; Choice
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Pick your next read together, vote on it fairly, and remember the ones
          you loved.
        </p>

        <ul className="mt-10 space-y-5">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex gap-4">
              <div className="bg-sage-200 text-sage-800 flex size-11 shrink-0 items-center justify-center rounded-xl">
                <feature.icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-foreground font-bold">{feature.title}</p>
                <p className="text-muted-foreground text-sm">{feature.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 pb-8">
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="ghost" className="w-full">
          <Link href="/browse">Browse book clubs</Link>
        </Button>
        <p className="text-center text-sm">
          <Link href="/privacy" className="text-muted-foreground underline">
            Privacy policy
          </Link>
        </p>
      </div>
    </main>
  );
}
