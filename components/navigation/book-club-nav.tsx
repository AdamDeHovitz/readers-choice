"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  HomeIcon,
  BarChart3Icon,
  FileTextIcon,
  CalendarIcon,
  UsersIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";

interface BookClubNavProps {
  bookClubId: string;
  bookClubName: string;
  userName: string;
}

export function BookClubNav({
  bookClubId,
  bookClubName,
  userName,
}: BookClubNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;
  const isParentActive = (paths: string[]) => paths.some((p) => pathname === p);

  const navItems = [
    {
      name: "Home",
      href: `/book-clubs/${bookClubId}`,
      icon: HomeIcon,
    },
    {
      name: "Schedule",
      href: `/book-clubs/${bookClubId}/schedule`,
      icon: CalendarIcon,
    },
    {
      name: "Statistics",
      icon: BarChart3Icon,
      children: [
        {
          name: "Personal Rankings",
          href: `/book-clubs/${bookClubId}/rankings`,
        },
        {
          name: "Global Rankings",
          href: `/book-clubs/${bookClubId}/global-rankings`,
        },
      ],
    },
    {
      name: "Themes",
      href: `/book-clubs/${bookClubId}/themes`,
      icon: FileTextIcon,
    },
    {
      name: "Members",
      href: `/book-clubs/${bookClubId}/members`,
      icon: UsersIcon,
    },
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-gold-600 border-b border-gold-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Site Title & Book Club Name */}
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-lg font-bold font-inria text-dark-900 hover:text-dark-600 transition-colors"
              >
                Readers&apos; Choice
              </Link>
              <span className="text-dark-900/30 hidden sm:block">|</span>
              <h2 className="text-base font-medium font-inria text-dark-900 hidden sm:block">
                {bookClubName}
              </h2>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.name} className="relative group">
                    <button
                      className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium font-inria transition-colors ${
                        isParentActive(
                          item.children.map((child) => child.href)
                        )
                          ? "bg-dark-900/10 text-dark-900"
                          : "text-dark-900 hover:bg-dark-900/5"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                      <ChevronDownIcon className="h-3 w-3" />
                    </button>
                    <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gold-600/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-4 py-2 text-sm font-inria first:rounded-t-lg last:rounded-b-lg ${
                            isActive(child.href)
                              ? "bg-gold-100 text-dark-900 font-semibold"
                              : "text-dark-600 hover:bg-cream-100"
                          }`}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href!}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium font-inria transition-colors ${
                      isActive(item.href!)
                        ? "bg-dark-900/10 text-dark-900"
                        : "text-dark-900 hover:bg-dark-900/5"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              )}
            </div>

            {/* Right: User Info */}
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm text-dark-900 font-inria">
                {userName}
              </span>
              <SignOutButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-dark-900 hover:bg-dark-900/5"
            >
              {mobileMenuOpen ? (
                <XIcon className="h-6 w-6" />
              ) : (
                <MenuIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gold-700 bg-gold-600">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.name}>
                    <button
                      onClick={() => setStatisticsOpen(!statisticsOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium font-inria text-dark-900 hover:bg-dark-900/5"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform ${
                          statisticsOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {statisticsOpen && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block px-3 py-2 rounded-md text-sm font-inria ${
                              isActive(child.href)
                                ? "bg-dark-900/10 text-dark-900 font-semibold"
                                : "text-dark-900 hover:bg-dark-900/5"
                            }`}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href!}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium font-inria ${
                      isActive(item.href!)
                        ? "bg-dark-900/10 text-dark-900"
                        : "text-dark-900 hover:bg-dark-900/5"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              )}

              {/* Mobile User Info */}
              <div className="pt-3 mt-3 border-t border-gold-700">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-dark-900 font-inria">
                    {userName}
                  </span>
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
