"use client";

import VirtualMeetWorkspace from "@/features/virtual-meet/pages/VirtualMeetWorkspace";
import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { getAdminToken } from "@/features/admin/adminSession";

export default function AdminVirtualMeetPage() {
  return (
    <VirtualMeetWorkspace
      roleLabel="Super Admin"
      getRequestUrl={getAdminApiRequestUrl}
      getToken={getAdminToken}
    />
  );
}
