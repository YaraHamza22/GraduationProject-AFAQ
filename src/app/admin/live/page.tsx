"use client";

import { Suspense } from "react";
import AfaqLiveRoomPage from "@/features/virtual-meet/pages/AfaqLiveRoomPage";
import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { getAdminToken, getStoredAdminUser } from "@/features/admin/adminSession";

export default function AdminLiveRoute() {
  const user = getStoredAdminUser();
  const userName = typeof user?.name === "string" && user.name.trim() ? user.name : "Super Admin";
  const userId = typeof user?.id === "number" || typeof user?.id === "string" ? user.id : null;

  return (
    <Suspense fallback={null}>
      <AfaqLiveRoomPage
        backHref="/admin/virtual-meet"
        backLabel="Back To Virtual Meet"
        userName={userName}
        attendance={{
          getRequestUrl: getAdminApiRequestUrl,
          token: getAdminToken(),
          userId,
        }}
      />
    </Suspense>
  );
}
