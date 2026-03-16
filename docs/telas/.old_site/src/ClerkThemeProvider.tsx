// src/ClerkThemeProvider.tsx
import React from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark, shadcn } from "@clerk/themes";
import { useTheme } from "next-themes";

const clerkPubKey = import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY;

const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorTextOnPrimaryBackground: "hsl(var(--primary-foreground))",
    colorBackground: "hsl(var(--background))",
    colorText: "hsl(var(--foreground))",
    colorTextSecondary: "hsl(var(--muted-foreground))",
    colorInputBackground: "hsl(var(--card))",
    colorInputText: "hsl(var(--foreground))",
    colorDanger: "hsl(var(--destructive))",
    borderRadius: "var(--radius)",
  },
  elements: {
    card: "bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm text-foreground",
    navbar: "bg-transparent",
    navbarButton: "text-foreground",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    formFieldLabel: "text-foreground",
    formFieldInput:
      "bg-background/60 text-foreground border-border focus-visible:ring-ring focus-visible:ring-offset-0",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring focus-visible:ring-offset-0",
    formButtonSecondary:
      "bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-ring focus-visible:ring-offset-0",
    footerActionLink: "text-primary hover:text-primary/80",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",

    userProfileRoot: "w-full max-w-full overflow-hidden",
    userProfileCard: "w-full max-w-full bg-transparent border-0 shadow-none rounded-none",
    userProfileNavbar: "bg-transparent border-b border-border/50 max-w-full overflow-x-auto",
    userProfilePage: "bg-transparent",
  },
} as const;

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={{
        ...clerkAppearance,
        theme: resolvedTheme === "dark" ? dark : shadcn,
      }}
    >
      {children}
    </ClerkProvider>
  );
}