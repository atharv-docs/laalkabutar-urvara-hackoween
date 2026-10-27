import { FarmerShell } from "@/components/farmer/FarmerShell";

export default function FarmerLayout({ children }: LayoutProps<"/farmer">) {
  return <FarmerShell>{children}</FarmerShell>;
}
