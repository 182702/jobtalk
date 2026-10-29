import "server-only";
import { Resend } from "resend";
import { requireEnv } from "@/lib/env";

let client: Resend | null = null;
export function resend() {
  client ??= new Resend(requireEnv("RESEND_API_KEY"));
  return client;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
