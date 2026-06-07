"use client";

import { Suspense } from "react";
import AfaqLiveRoomPage from "@/features/virtual-meet/pages/AfaqLiveRoomPage";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

export default function StudentLiveRoomRoute() {
  const user = getStoredStudentUser();
  const userName = typeof user?.name === "string" && user.name.trim() ? user.name : "Student";
  const userId = typeof user?.id === "number" || typeof user?.id === "string" ? user.id : null;

  return (
    <Suspense fallback={null}>
      <AfaqLiveRoomPage
        backHref="/student/live"
        backLabel="Back To Sessions"
        userName={userName}
        attendance={{
          getRequestUrl: getStudentApiRequestUrl,
          token: getStudentToken(),
          userId,
        }}
      />
    </Suspense>
  );
}
