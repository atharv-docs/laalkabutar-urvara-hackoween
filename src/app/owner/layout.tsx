import { OwnerShell } from "@/components/owner/OwnerShell";

export default function OwnerLayout({ children }: LayoutProps<"/owner">) {
  return <OwnerShell>{children}</OwnerShell>;
}
