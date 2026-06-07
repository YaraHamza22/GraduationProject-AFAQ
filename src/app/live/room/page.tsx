"use client";

import { Suspense } from "react";
import AfaqLiveRoomPage from "@/features/virtual-meet/pages/AfaqLiveRoomPage";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

export default function PublicLiveRoomRoute() {
  const user = getStoredStudentUser();
  const userName = typeof user?.name === "string" && user.name.trim() ? user.name : "Guest";
  const userId = typeof user?.id === "number" || typeof user?.id === "string" ? user.id : null;
  const token = getStudentToken();

  return (
    <Suspense fallback={null}>
      <AfaqLiveRoomPage
        backHref="/live"
        backLabel="Back"
        userName={userName}
        attendance={
          token && userId != null
            ? { getRequestUrl: getStudentApiRequestUrl, token, userId }
            : null
        }
      />
    </Suspense>
  );
}
