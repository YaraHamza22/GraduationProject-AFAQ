import { Suspense } from "react";
import VirtualMeetOAuthCallbackPage from "@/features/virtual-meet/pages/VirtualMeetOAuthCallbackPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VirtualMeetOAuthCallbackPage />
    </Suspense>
  );
}
