"use client";

import VirtualMeetWorkspace from "@/features/virtual-meet/pages/VirtualMeetWorkspace";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

export default function InstructorVirtualMeetPage() {
  return (
    <VirtualMeetWorkspace
      roleLabel="Instructor"
      getRequestUrl={getStudentApiRequestUrl}
      getToken={getStudentToken}
    />
  );
}
