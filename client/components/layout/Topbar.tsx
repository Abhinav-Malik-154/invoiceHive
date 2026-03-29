"use client";
import { Bell, HelpCircle, Search, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 sticky top-0 z-10 glass-panel flex justify-between items-center px-8 border-b border-slate-100">
      {/* Search */}
      <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full w-96 ring-1 ring-black/[0.04] focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Search className="w-4 h-4 text-outline" />
        <input
          type="text"
          placeholder="Search invoices or clients..."
          className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-on-surface"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white" />
        </button>
        <button className="p-2 text-slate-500 hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low">
          <HelpCircle className="w-5 h-5" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="text-right">
              <p className="text-xs font-bold text-on-background">{user?.name || "Loading..."}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">{user?.plan || "Free"} Plan</p>
            </div>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full primary-gradient flex items-center justify-center text-white text-sm font-bold font-headline border-2 border-white shadow-sm">
                {getInitials(user?.name || "User")}
              </div>
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-elevated border border-surface-container py-1 z-50 animate-fade-in-up">
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/5 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
