import api from "./api";
import type { AdminUser } from "@/types";

export const adminService = {
  getUsers: (search?: string) =>
    api.get("/admin-users/", {
      params: search ? { search } : undefined,
    }),

  updateUserRoles: (id: number, roleIds: number[]) =>
    api.patch(`/admin-users/${id}/`, { role_ids: roleIds }),
};

export const normalizeAdminUsers = (data: unknown): AdminUser[] => {
  if (Array.isArray(data)) {
    return data as AdminUser[];
  }

  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: AdminUser[] }).results;
  }

  return [];
};
