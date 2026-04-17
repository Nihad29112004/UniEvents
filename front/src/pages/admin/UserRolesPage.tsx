import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Search, Loader2 } from "lucide-react";
import type { AxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { adminService, normalizeAdminUsers } from "@/services/adminService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AdminUser, Role } from "@/types";

const sameRoleSet = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  const aa = [...a].sort((x, y) => x - y);
  const bb = [...b].sort((x, y) => x - y);
  return aa.every((value, index) => value === bb[index]);
};

const UserRolesPage = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [draftRoleIds, setDraftRoleIds] = useState<Record<number, number[]>>({});

  const isAdmin = Boolean(currentUser?.is_staff);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await authService.getRoles();
      return (res.data.results || res.data) as Role[];
    },
    enabled: isAdmin,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const res = await adminService.getUsers(search.trim() || undefined);
      return normalizeAdminUsers(res.data);
    },
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: number; roleIds: number[] }) =>
      adminService.updateUserRoles(userId, roleIds),
    onSuccess: (_, variables) => {
      toast.success("User roles updated");
      setDraftRoleIds((prev) => {
        const next = { ...prev };
        delete next[variables.userId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      toast.error(err.response?.data?.detail || "Failed to update roles");
    },
  });

  const roleIdsByUser = useMemo(() => {
    const roleMap: Record<number, number[]> = {};
    for (const user of users) {
      roleMap[user.id] = user.roles.map((role) => role.id);
    }
    return roleMap;
  }, [users]);

  const getCurrentRoleIds = (user: AdminUser) => draftRoleIds[user.id] ?? roleIdsByUser[user.id] ?? [];

  const toggleRole = (user: AdminUser, roleId: number) => {
    const existing = getCurrentRoleIds(user);
    const updated = existing.includes(roleId)
      ? existing.filter((id) => id !== roleId)
      : [...existing, roleId];

    setDraftRoleIds((prev) => ({
      ...prev,
      [user.id]: updated,
    }));
  };

  const handleSave = (user: AdminUser) => {
    const selectedRoleIds = getCurrentRoleIds(user);
    updateMutation.mutate({ userId: user.id, roleIds: selectedRoleIds });
  };

  if (!isAdmin) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Admin Only</CardTitle>
          </CardHeader>
          <CardContent>
            You do not have permission to manage user roles.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">User Role Management</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email"
            />
          </div>
        </CardContent>
      </Card>

      {(rolesLoading || usersLoading) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading role management data...
        </div>
      )}

      {!rolesLoading && !usersLoading && users.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">No users found.</CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {users.map((user) => {
          const currentRoleIds = getCurrentRoleIds(user);
          const originalRoleIds = roleIdsByUser[user.id] ?? [];
          const changed = !sameRoleSet(currentRoleIds, originalRoleIds);
          const savingThisUser = updateMutation.isPending && updateMutation.variables?.userId === user.id;

          return (
            <Card key={user.id}>
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">{user.username}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{user.email}</Badge>
                  {user.is_staff && <Badge>Staff</Badge>}
                  {user.is_superuser && <Badge variant="secondary">Superuser</Badge>}
                  {!user.is_active && <Badge variant="destructive">Inactive</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={currentRoleIds.includes(role.id)}
                        onCheckedChange={() => toggleRole(user, role.id)}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>

                <div>
                  <Button
                    onClick={() => handleSave(user)}
                    disabled={!changed || savingThisUser}
                  >
                    {savingThisUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Roles
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UserRolesPage;
