import React from "react";
import { HomeView } from "@/features/home/HomeView";
import { serverCatalog } from "@/lib/serverCatalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [newArrivals, topSelling] = await Promise.all([
    serverCatalog.getProducts("new_arrivals=1&per_page=4"),
    serverCatalog.getProducts("top_selling=1&per_page=4"),
  ]);

  return (
    <HomeView
      initialNewArrivals={newArrivals}
      initialTopSelling={topSelling}
    />
  );
}
