import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Readers' Choice stores, who sees it, and how to delete it.",
};

const CONTACT = "readerschoice@dehovitz.com";
const UPDATED = "November 11, 2026";

/**
 * Public (no sign-in), linked from the home and login pages. Google's OAuth
 * consent screen and the App Store both point here. Keep it true: when the
 * app starts storing or sharing something new, update this page with it.
 */
export default function PrivacyPage() {
  return (
    <main className="pt-safe pb-safe mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-primary text-sm font-bold">
        Readers&apos; Choice
      </Link>
      <h1 className="font-display text-foreground mt-3 text-4xl">
        Privacy policy
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">Updated {UPDATED}</p>

      <div className="text-foreground [&_h2]:font-display mt-8 space-y-8 [&_h2]:text-2xl [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <section>
          <p>
            Readers&apos; Choice is a small app for running book clubs: planning
            meetings, nominating and voting on books, and ranking the
            year&apos;s reads. It&apos;s available on the web at
            readers-choice.vercel.app, and soon as a mobile app. This page
            explains what it stores about you, who can see it, and how to have
            it deleted. There are no ads, no analytics or tracking, and your
            information is never sold.
          </p>
        </section>

        <section>
          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Your account:</strong> your name and email address. If you
              sign in with Google, also your Google account ID and profile
              picture. If you sign in with a password, a one-way hash of it
              (never the password itself).
            </li>
            <li>
              <strong>Your club activity:</strong> the clubs you belong to and
              your role in them, the books you nominate and any notes you add,
              the themes you suggest and upvote, your votes and ballot rankings,
              and your year rankings.
            </li>
            <li>
              <strong>Settings you choose:</strong> the public libraries you
              pick for checking book availability, and the private link for
              subscribing to a club&apos;s calendar.
            </li>
            <li>
              <strong>Sign-in sessions:</strong> on the web, a session cookie.
              In the mobile app, a sign-in token stored on your device, plus a
              record of the session (the device name, when it started and when
              it was last used) so it can be signed out.
            </li>
            <li>
              <strong>Abuse protection:</strong> to limit repeated sign-in and
              sign-up attempts, short-lived counters keyed by a one-way hash of
              your IP address or email address.
            </li>
          </ul>
        </section>

        <section>
          <h2>Who can see it</h2>
          <ul>
            <li>
              <strong>Members of your clubs</strong> see your name, picture and
              email address, and your activity in that club: nominations, notes,
              themes, votes and rankings, as the club&apos;s pages show them.
            </li>
            <li>
              <strong>Anyone</strong> can see a club&apos;s name, description
              and number of members, so people can find a club to join.
              Members&apos; names, pictures and email addresses are only shown
              to fellow members.
            </li>
            <li>
              <strong>Anyone with your calendar link</strong> can see that
              club&apos;s meeting schedule. You can reset the link at any time.
            </li>
          </ul>
        </section>

        <section>
          <h2>Services we use</h2>
          <p>
            These services process data on our behalf, or receive only what a
            lookup needs:
          </p>
          <ul>
            <li>
              <strong>Vercel</strong> hosts the app, and{" "}
              <strong>Supabase</strong> hosts its database. Your data is stored
              with them.
            </li>
            <li>
              <strong>Google</strong>, if you choose to sign in with Google. We
              receive your name, email address and profile picture from Google,
              and nothing else.
            </li>
            <li>
              <strong>Open Library</strong> and <strong>Google Books</strong>{" "}
              receive book searches and titles to find books, covers and
              descriptions. <strong>OverDrive (Libby)</strong> receives a
              library and a book title to check availability. These lookups
              contain no information about you, and never your library card.
            </li>
          </ul>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            The website uses a cookie only to keep you signed in. There are no
            advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2>Keeping and deleting your data</h2>
          <p>
            We keep your account and club activity while your account exists. To
            delete your account and everything tied to it, email{" "}
            <a className="text-primary underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>{" "}
            from the address you signed up with, and we&apos;ll delete it within
            30 days. You can leave a club at any time from its Members page, and
            we can delete a whole club on request. Abuse-protection counters
            hold only one-way hashes, never a readable IP or email address.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            Readers&apos; Choice isn&apos;t meant for children under 13, and we
            don&apos;t knowingly collect their information.
          </p>
        </section>

        <section>
          <h2>Changes and contact</h2>
          <p>
            If this policy changes, we&apos;ll update this page and its date.
            Questions or requests:{" "}
            <a className="text-primary underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
