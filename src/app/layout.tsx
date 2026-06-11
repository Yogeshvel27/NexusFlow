import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "../styles.css";

export const metadata: Metadata = {
  title: "NEXUSFLOW",
  description: "Enterprise Project Lifecycle Management for PMOs, Project Managers, Finance and Executives.",
  openGraph: {
    title: "NEXUSFLOW — Project Lifecycle Platform",
    description: "A premium enterprise PLMS combining workflow, resources, risk, billing and analytics.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

// NexusFlow Obsidian + Copper Gold appearance for all Clerk modals
const clerkAppearance = {
  variables: {
    colorPrimary: "#C67C4E",
    colorBackground: "#111111",
    colorInputBackground: "#1a1a1a",
    colorInputText: "#f5f4f2",
    colorText: "#f5f4f2",
    colorTextSecondary: "#a8a29e",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorNeutral: "#2a2a2a",
    borderRadius: "0.75rem",
    fontFamily: "Inter, sans-serif",
  },
  elements: {
    modalContent: {
      boxShadow: "0 25px 60px rgba(0,0,0,0.60), 0 0 0 1px rgba(198,124,78,0.15)",
      borderRadius: "1rem",
    },
    card: {
      boxShadow: "none",
      background: "#111111",
      border: "1px solid rgba(198,124,78,0.12)",
    },
    navbar: {
      background: "#0d0d0d",
      borderRight: "1px solid rgba(198,124,78,0.12)",
    },
    navbarButton: {
      color: "#a8a29e",
      fontWeight: "500",
      borderRadius: "0.5rem",
    },
    navbarButtonActive: {
      background: "rgba(198,124,78,0.15)",
      color: "#D4A373",
      fontWeight: "600",
    },
    headerTitle: {
      color: "#f5f4f2",
      fontWeight: "700",
    },
    headerSubtitle: {
      color: "#a8a29e",
    },
    profileSectionTitle: {
      color: "#a8a29e",
      fontWeight: "500",
      fontSize: "12px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.06em",
    },
    profileSectionTitleText: {
      color: "#a8a29e",
    },
    profileSectionContent: {
      color: "#f5f4f2",
    },
    organizationPreviewMainIdentifier: {
      color: "#f5f4f2",
      fontWeight: "600",
    },
    organizationPreviewSecondaryIdentifier: {
      color: "#a8a29e",
    },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #d4a373 0%, #C67C4E 100%)",
      color: "#ffffff",
      fontWeight: "600",
      boxShadow: "0 4px 12px rgba(198,124,78,0.30)",
    },
    formButtonReset: {
      color: "#C67C4E",
    },
    formFieldInput: {
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: "0.625rem",
      color: "#f5f4f2",
      background: "#1a1a1a",
    },
    formFieldLabel: {
      color: "#d4cfca",
      fontWeight: "500",
    },
    formFieldAction: { color: "#C67C4E" },
    profileSectionPrimaryButton: {
      color: "#C67C4E",
      fontWeight: "500",
    },
    badge: {
      background: "rgba(198,124,78,0.10)",
      color: "#D4A373",
      border: "1px solid rgba(198,124,78,0.20)",
    },
    tableHead: {
      color: "#a8a29e",
      fontWeight: "600",
      fontSize: "12px",
    },
    userPreviewMainIdentifier: {
      color: "#f5f4f2",
      fontWeight: "500",
    },
    userPreviewSecondaryIdentifier: {
      color: "#a8a29e",
    },
    dividerLine: { background: "rgba(255,255,255,0.08)" },
    footer: { display: "none" },
    footerAction: { display: "none" },

    // Navbar (left sidebar) spacing
    navbarButtons: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "8px",
    },

    // Tab list - remove background container
    tabListContainer: {
      background: "transparent",
      backgroundColor: "transparent",
      boxShadow: "none",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    tabButton: {
      background: "transparent",
      backgroundColor: "transparent",
    },

    // Invite members inline form row layout
    formFieldRow: {
      width: "100%",
    },
    emailsInputContainer: {
      width: "100%",
    },
  },

  // Note: CSS overrides are managed globally inside src/styles.css to guarantee they apply to portals and dropdown dialogs.
};

import { WorkspaceProvider } from "@/context/WorkspaceContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
          <Toaster position="top-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
