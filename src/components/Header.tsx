"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const Header: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { href: "/explore", label: "Explore" },
    { href: "/compare", label: "Compare" },
    { href: "/trips", label: "My Trips" },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
              <span className="text-white dark:text-black text-sm font-bold">W</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              Wanderlust
            </span>
          </Link>
          <nav className="hidden md:flex space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {session?.user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                {session.user.name}
              </span>
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session.user.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
