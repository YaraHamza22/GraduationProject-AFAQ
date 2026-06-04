import { Suspense } from "react";
import StudentLivePage from "@/features/student/pages/StudentLivePage";

export default function PublicLiveRoute() {
  return (
    <Suspense fallback={null}>
      <StudentLivePage />
    </Suspense>
  );
}
