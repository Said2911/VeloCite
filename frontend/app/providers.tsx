"use client";

import WakeNotice from "@/components/WakeNotice";
import { AuthProvider } from "@/lib/auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <WakeNotice />
    </AuthProvider>
  );
}
