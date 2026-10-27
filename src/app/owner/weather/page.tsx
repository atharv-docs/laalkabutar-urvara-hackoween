import type { Metadata } from "next";
import { WeatherView } from "@/components/owner/WeatherView";

export const metadata: Metadata = { title: "Weather & Sensors" };

export default function WeatherPage() {
  return <WeatherView />;
}
