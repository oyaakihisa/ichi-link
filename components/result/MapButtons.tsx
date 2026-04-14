"use client";

import { MapUrls } from "@/lib/types";
import { useCallback } from "react";

interface MapButtonsProps {
  mapUrls: MapUrls;
}

interface MapService {
  key: keyof MapUrls;
  name: string;
  color: string;
  hoverColor: string;
}

const mapServices: MapService[] = [
  {
    key: "googleMaps",
    name: "Google Maps",
    color: "bg-blue-600",
    hoverColor: "hover:bg-blue-700",
  },
  {
    key: "yahooMap",
    name: "Yahoo!地図",
    color: "bg-red-600",
    hoverColor: "hover:bg-red-700",
  },
  {
    key: "appleMaps",
    name: "Apple Maps",
    color: "bg-gray-800",
    hoverColor: "hover:bg-gray-900",
  },
  {
    key: "gsiMap",
    name: "地理院地図",
    color: "bg-green-600",
    hoverColor: "hover:bg-green-700",
  },
];

export function MapButtons({ mapUrls }: MapButtonsProps) {
  const handleClick = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">地図で確認</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {mapServices.map((service) => (
          <button
            key={service.key}
            onClick={() => handleClick(mapUrls[service.key])}
            className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${service.color} ${service.hoverColor}`}
          >
            {service.name}
          </button>
        ))}
      </div>
    </div>
  );
}
