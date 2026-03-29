// lib/utils.ts

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge tailwind classes safely
 * avoids duplicate/conflicting styles
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency consistently
 * Example: ₹12,500.00
 */
export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format ISO date → 28 Mar 2026
 */
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format relative time
 * example: 2 days ago
 */
export function formatRelative(date: string | Date) {
  const now = new Date().getTime();
  const d = new Date(date).getTime();

  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;

  return `${Math.floor(diff / 86400)} days ago`;
}