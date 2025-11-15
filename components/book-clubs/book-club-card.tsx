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
  joinedAt: string;
}

export function BookClubCard({
  id,
  name,
  description,
  isAdmin,
  joinedAt,
}: BookClubCardProps) {
  const joinDate = new Date(joinedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/book-clubs/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">{name}</CardTitle>
            {isAdmin && (
              <span className="text-xs bg-cream-200 text-dark-600 px-2 py-1 rounded-full font-medium font-inria">
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
          <p className="text-sm text-dark-500">Joined {joinDate}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
