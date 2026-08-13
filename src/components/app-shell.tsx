"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  Bot,
  Building2,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/auth";
import { navItems } from "@/lib/navigation";

const iconMap = {
  LayoutDashboard,
  FileText,
  AlertCircle,
  Building2,
  Database,
  Bot,
} as const;

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden md:flex w-64 flex-col bg-[hsl(222_47%_11%)] text-white fixed inset-y-0 left-0 z-50">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Controle de fiscal e</p>
            <p className="text-xs font-bold leading-tight">contabil parceiros</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const active =
              pathname === item.path ||
              (item.path !== "/" && pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="mb-2 flex items-center gap-2 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-white px-4 md:px-6">
          <span className="font-semibold text-sm text-slate-700 md:hidden">
            romprofcont
          </span>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
