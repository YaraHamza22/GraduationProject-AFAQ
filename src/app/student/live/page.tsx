import { Suspense } from "react";
import StudentLivePage from "@/features/student/pages/StudentLivePage";

export default function StudentLiveRoute() {
  return (
    <Suspense fallback={null}>
      <StudentLivePage />
    </Suspense>
  );
}
