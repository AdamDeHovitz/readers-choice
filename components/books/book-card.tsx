import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  publishedYear?: number;
  onClick?: () => void;
  selected?: boolean;
}

export function BookCard({
  title,
  author,
  coverUrl,
  publishedYear,
  onClick,
  selected = false,
}: BookCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? "ring-2 ring-slate-900" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Book Cover */}
          <div className="flex-shrink-0">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={title}
                width={64}
                height={96}
                className="w-16 h-24 object-cover rounded shadow-sm"
              />
            ) : (
              <div className="w-16 h-24 bg-slate-200 rounded flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900 line-clamp-2 mb-1">
              {title}
            </h3>
            <p className="text-sm text-slate-600 mb-1">{author}</p>
            {publishedYear && (
              <p className="text-xs text-slate-500">{publishedYear}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
