"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, CreditCard,
  BarChart3, Settings, Zap, Plus,
} from "lucide-react";

const NAV = [
  { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "Clients",    href: "/clients",    icon: Users },
  { label: "Invoices",   href: "/invoices",   icon: FileText },
  { label: "Payments",   href: "/payments",   icon: CreditCard },
  { label: "Analytics",  href: "/analytics",  icon: BarChart3 },
  { label: "Settings",   href: "/settings",   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#0F172A] flex flex-col p-4 z-20">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <p className="text-xl font-bold text-white tracking-tighter font-headline">InvoiceHive</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Premium Finance</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-indigo-600/10 text-indigo-400 font-semibold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="font-headline tracking-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* New invoice CTA */}
      <div className="pt-4 border-t border-slate-800">
        <Link
          href="/invoices/new"
          className="w-full py-2.5 px-4 rounded-xl primary-gradient text-white text-sm font-bold font-headline shadow-xl shadow-indigo-900/40 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>
    </aside>
  );
}
