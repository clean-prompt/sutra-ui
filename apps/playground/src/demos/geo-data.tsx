/* Shared demo data for the Geo pages (World Map and Globe). */
import * as React from "react";
import { Avatar } from "@cleanprompt/sutra-ui";
import type { GeoArc, GeoMarker, WorldMapDatum } from "@cleanprompt/sutra-ui/geo";
import { RiGithubFill, RiGoogleFill, RiMailFill, RiServerLine, RiTwitterXFill } from "@cleanprompt/sutra-ui/icons";

export const traffic: WorldMapDatum[] = [
  { code: "US", value: 48210 },
  { code: "IN", value: 31870 },
  { code: "GB", value: 18440 },
  { code: "DE", value: 15320 },
  { code: "BR", value: 12900 },
  { code: "CA", value: 9800 },
  { code: "FR", value: 9120 },
  { code: "JP", value: 8740 },
  { code: "KR", value: 7310 },
  { code: "AU", value: 6020 },
  { code: "MX", value: 5480 },
  { code: "ID", value: 4930 },
  { code: "ES", value: 4410 },
  { code: "NG", value: 3260 },
  { code: "ZA", value: 2780 },
  { code: "SE", value: 2140 },
  { code: "AR", value: 1990 },
  { code: "EG", value: 1530 },
  { code: "PL", value: 1480 },
  { code: "SG", value: 1320 },
  { code: "TR", value: 1210 },
  { code: "VN", value: 980 },
];

export type Source = "google" | "x" | "github" | "email";

export const SOURCES: Record<Source, { label: string; icon: React.ReactNode; color: string }> = {
  google: { label: "Google", icon: <RiGoogleFill />, color: "#4285f4" },
  x: { label: "X", icon: <RiTwitterXFill />, color: "var(--foreground)" },
  github: { label: "GitHub", icon: <RiGithubFill />, color: "#6e40c9" },
  email: { label: "Email", icon: <RiMailFill />, color: "#e8730c" },
};

export interface Visitor {
  id: string;
  name: string;
  city: string;
  /** ISO alpha-2 code. */
  country: string;
  lat: number;
  lng: number;
  source: Source;
  page: string;
}

export const visitors: Visitor[] = [
  { id: "v1", name: "Maya Patel", city: "Mumbai", country: "IN", lat: 19.08, lng: 72.88, source: "google", page: "/pricing" },
  { id: "v2", name: "Jonas Berg", city: "Berlin", country: "DE", lat: 52.52, lng: 13.4, source: "github", page: "/docs/maps" },
  { id: "v3", name: "Lea Martin", city: "Paris", country: "FR", lat: 48.86, lng: 2.35, source: "x", page: "/blog/launch" },
  { id: "v4", name: "Sam Okafor", city: "Lagos", country: "NG", lat: 6.52, lng: 3.38, source: "google", page: "/" },
  { id: "v5", name: "Hana Kim", city: "Seoul", country: "KR", lat: 37.57, lng: 126.98, source: "email", page: "/changelog" },
  { id: "v6", name: "Yuto Sato", city: "Tokyo", country: "JP", lat: 35.68, lng: 139.69, source: "github", page: "/docs" },
  { id: "v7", name: "Ava Chen", city: "San Francisco", country: "US", lat: 37.77, lng: -122.42, source: "x", page: "/pricing" },
  { id: "v8", name: "Noah Smith", city: "New York", country: "US", lat: 40.71, lng: -74.0, source: "google", page: "/signup" },
  { id: "v9", name: "Lucas Silva", city: "São Paulo", country: "BR", lat: -23.55, lng: -46.63, source: "email", page: "/" },
  { id: "v10", name: "Olivia Brown", city: "London", country: "GB", lat: 51.51, lng: -0.13, source: "google", page: "/docs/maps" },
  { id: "v11", name: "Emma Wilson", city: "Amsterdam", country: "NL", lat: 52.37, lng: 4.9, source: "github", page: "/docs" },
  { id: "v12", name: "Arjun Rao", city: "Bengaluru", country: "IN", lat: 12.97, lng: 77.59, source: "x", page: "/pricing" },
  { id: "v13", name: "Chloe Taylor", city: "Sydney", country: "AU", lat: -33.87, lng: 151.21, source: "google", page: "/" },
  { id: "v14", name: "Mateo García", city: "Madrid", country: "ES", lat: 40.42, lng: -3.7, source: "email", page: "/blog" },
  { id: "v15", name: "Ines Costa", city: "Lisbon", country: "PT", lat: 38.72, lng: -9.14, source: "google", page: "/signup" },
  { id: "v16", name: "Ji-woo Park", city: "Busan", country: "KR", lat: 35.18, lng: 129.08, source: "github", page: "/docs/maps" },
  { id: "v17", name: "Diego Ramos", city: "Oakland", country: "US", lat: 37.8, lng: -122.27, source: "google", page: "/pricing" },
  { id: "v18", name: "Priya Nair", city: "San Jose", country: "US", lat: 37.34, lng: -121.89, source: "github", page: "/docs" },
  { id: "v19", name: "Ethan Lee", city: "Palo Alto", country: "US", lat: 37.44, lng: -122.14, source: "x", page: "/changelog" },
  { id: "v20", name: "Zoe Martin", city: "Toronto", country: "CA", lat: 43.65, lng: -79.38, source: "email", page: "/signup" },
];

export function visitorMarker(v: Visitor): GeoMarker {
  const source = SOURCES[v.source];
  return {
    id: v.id,
    point: { lat: v.lat, lng: v.lng },
    label: `${v.name}, ${v.city}, from ${source.label}`,
    description: `${v.city} · ${v.page}`,
    pulse: true,
    tone: "success",
    render: <Avatar size="sm" name={v.name} ring />,
    badge: (
      <span
        className="flex size-4 items-center justify-center rounded-full bg-background shadow-xs ring-1 ring-border [&_svg]:size-2.5"
        style={{ color: source.color }}
      >
        {source.icon}
      </span>
    ),
  };
}

export const DATACENTER = { lat: 50.11, lng: 8.68 };

export const attacks = [
  { id: "a1", city: "Shenzhen", lat: 22.54, lng: 114.06, count: 1240 },
  { id: "a2", city: "São Paulo", lat: -23.55, lng: -46.63, count: 610 },
  { id: "a3", city: "Moscow", lat: 55.76, lng: 37.62, count: 980 },
  { id: "a4", city: "Ashburn", lat: 39.04, lng: -77.49, count: 420 },
  { id: "a5", city: "Lagos", lat: 6.52, lng: 3.38, count: 260 },
  { id: "a6", city: "Ho Chi Minh City", lat: 10.82, lng: 106.63, count: 530 },
  { id: "a7", city: "Seattle", lat: 47.61, lng: -122.33, count: 180 },
];

export const attackArcs: GeoArc[] = attacks.map((a) => ({
  id: a.id,
  from: { lat: a.lat, lng: a.lng },
  to: DATACENTER,
  tone: "destructive",
  label: `${a.city} to Frankfurt, ${a.count} requests blocked`,
  width: a.count > 900 ? 2 : 1.25,
  animated: true,
}));

export const attackMarkers: GeoMarker[] = [
  ...attacks.map(
    (a): GeoMarker => ({
      id: a.id,
      point: { lat: a.lat, lng: a.lng },
      label: `${a.city}: ${a.count} blocked requests`,
      description: `${a.count} blocked requests`,
      tone: "destructive",
      value: a.count,
    })
  ),
  {
    id: "dc",
    point: DATACENTER,
    label: "Frankfurt datacenter (eu-central)",
    description: "eu-central · healthy",
    color: "primary",
    size: 22,
    icon: <RiServerLine />,
  },
];

