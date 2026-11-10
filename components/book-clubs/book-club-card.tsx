import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BookClubCardProps {
  id: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  joinedAt: string | null;
}

export function BookClubCard({
  id,
  name,
  description,
  isAdmin,
  joinedAt,
}: BookClubCardProps) {
  const joinDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Link href={`/book-clubs/${id}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">{name}</CardTitle>
            {isAdmin && (
              <span className="bg-cream-200 text-dark-600 font-inria rounded-full px-2 py-1 text-xs font-medium">
                Admin
              </span>
            )}
          </div>
          {description && (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {joinDate && (
            <p className="text-dark-500 text-sm">Joined {joinDate}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
