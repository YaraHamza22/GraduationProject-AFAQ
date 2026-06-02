"use client";

import AfaqLiveRoomPage from "@/features/virtual-meet/pages/AfaqLiveRoomPage";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

export default function InstructorLiveRoute() {
  const user = getStoredStudentUser();
  const userName = typeof user?.name === "string" && user.name.trim() ? user.name : "Instructor";
  const userId = typeof user?.id === "number" || typeof user?.id === "string" ? user.id : null;

  return (
    <AfaqLiveRoomPage
      backHref="/instructor/virtual-meet"
      backLabel="Back To Virtual Meet"
      userName={userName}
      attendance={{
        getRequestUrl: getStudentApiRequestUrl,
        token: getStudentToken(),
        userId,
      }}
    />
  );
}
