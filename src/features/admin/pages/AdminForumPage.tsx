"use client";

import ForumWorkspace from "@/components/forum/ForumWorkspace";
import { getAdminApiEndpoint, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { getAdminToken } from "@/features/admin/adminSession";

export default function AdminForumPage() {
  return (
    <ForumWorkspace
      title="Admin Forum"
      sessionLabel="admin"
      getRequestUrl={getAdminApiRequestUrl}
      getEndpoint={getAdminApiEndpoint}
      getToken={getAdminToken}
      coursePaths={["/super-admin/courses", "/courses"]}
    />
  );
}
