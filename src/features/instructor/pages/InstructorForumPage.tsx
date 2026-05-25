"use client";

import ForumWorkspace from "@/components/forum/ForumWorkspace";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

export default function InstructorForumPage() {
  return (
    <ForumWorkspace
      title="Instructor Forum"
      sessionLabel="instructor"
      getRequestUrl={getStudentApiRequestUrl}
      getEndpoint={getStudentApiEndpoint}
      getToken={getStudentToken}
      coursePaths={["/my-courses", "/courses", "/super-admin/courses"]}
    />
  );
}
