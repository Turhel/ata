import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { apiFetch } from "@/lib/apiClient";
import { readCache, writeCache } from "@/lib/cache";

interface TeamWithDetails {
  adminId: string;
  adminClerkUserId?: string | null;
  adminAvatarUrl?: string | null;
  adminName: string;
  adminEmail: string;
  assistants: {
    id: string;
    clerkUserId?: string | null;
    avatarUrl?: string | null;
    name: string;
    email: string;
    assignmentId: string;
  }[];
}

export function useTeamAssignments() {
  const { user, getToken } = useAuth();
  const { isAdmin, isMaster } = useUserRole();
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [unassignedAssistants, setUnassignedAssistants] = useState<{
    id: string;
    clerkUserId?: string | null;
    avatarUrl?: string | null;
    name: string;
    email: string;
  }[]>([]);
  const [availableAdmins, setAvailableAdmins] = useState<{
    id: string;
    clerkUserId?: string | null;
    avatarUrl?: string | null;
    name: string;
    isMaster?: boolean;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = useMemo(() => `team-assignments:v2:${user?.id ?? "anon"}`, [user?.id]);
  const didHydrateRef = useRef(false);

  const fetchTeamData = useCallback(async (force = false) => {
    if (!user) {
      setTeams([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cached = !force ? readCache<{
        teams: TeamWithDetails[];
        unassignedAssistants: { id: string; clerkUserId?: string | null; avatarUrl?: string | null; name: string; email: string }[];
        availableAdmins: { id: string; clerkUserId?: string | null; avatarUrl?: string | null; name: string; isMaster?: boolean }[];
      }>(cacheKey, 180_000) : null;
      if (cached) {
        setTeams(cached.teams);
        setUnassignedAssistants(cached.unassignedAssistants);
        setAvailableAdmins(cached.availableAdmins);
        didHydrateRef.current = true;
        setIsLoading(false);
        return;
      }

      const res = await apiFetch<{
        ok: true;
        teams: TeamWithDetails[];
        unassignedAssistants: { id: string; clerkUserId?: string | null; avatarUrl?: string | null; name: string; email: string }[];
        availableAdmins: { id: string; clerkUserId?: string | null; avatarUrl?: string | null; name: string; isMaster?: boolean }[];
      }>({ getToken }, "/api/team-assignments");

      setTeams(res.teams || []);
      setUnassignedAssistants(res.unassignedAssistants || []);
      setAvailableAdmins(res.availableAdmins || []);
      writeCache(cacheKey, {
        teams: res.teams || [],
        unassignedAssistants: res.unassignedAssistants || [],
        availableAdmins: res.availableAdmins || [],
      });
      didHydrateRef.current = true;
    } catch (err) {
      console.error("Error fetching team data:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, cacheKey]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  useEffect(() => {
    if (!user) return;
    if (!didHydrateRef.current) return;
    writeCache(cacheKey, { teams, unassignedAssistants, availableAdmins });
  }, [availableAdmins, cacheKey, teams, unassignedAssistants, user]);

  const assignAssistant = async (adminId: string, assistantId: string) => {
    if (!user) throw new Error("User not authenticated");

    const res = await apiFetch<{
      ok: true;
      assignment: { id: string; admin_id: string; assistant_id: string };
      assistant: { id: string; clerkUserId?: string | null; avatarUrl?: string | null; name: string; email: string };
    }>(
      { getToken },
      "/api/team-assignments",
      {
        method: "POST",
        body: JSON.stringify({ admin_id: adminId, assistant_id: assistantId }),
      }
    );

    const assistantClerkUserId = res.assistant.clerkUserId ?? null;
    const assistantAvatarUrl = res.assistant.avatarUrl ?? null;

    setTeams((prev) =>
      prev.map((team) => {
        if (team.adminId !== adminId) return team;
        if (team.assistants.some((a) => a.id === assistantId)) return team;
        return {
          ...team,
          assistants: [
            ...team.assistants,
            {
              id: assistantId,
              clerkUserId: assistantClerkUserId,
              avatarUrl: assistantAvatarUrl,
              name: res.assistant.name,
              email: res.assistant.email,
              assignmentId: res.assignment.id,
            },
          ],
        };
      }),
    );

    setUnassignedAssistants((prev) => prev.filter((a) => a.id !== assistantId));
    return res.assignment;
  };

  const removeAssignment = async (assignmentId: string) => {
    const assistantMeta =
      teams.flatMap((t) => t.assistants).find((a) => a.assignmentId === assignmentId) ?? null;
    const res = await apiFetch<{
      ok: true;
      assignment: { id: string; admin_id: string; assistant_id: string };
      assistant: { id: string; clerkUserId?: string | null; avatarUrl?: string | null; name: string; email: string };
    }>(
      { getToken },
      `/api/team-assignments?id=${encodeURIComponent(assignmentId)}`,
      { method: "DELETE" }
    );

    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        assistants: team.assistants.filter((a) => a.assignmentId !== assignmentId),
      })),
    );

    const assistantToAdd = {
      id: res.assistant.id ?? (assistantMeta?.id ?? res.assignment.assistant_id),
      clerkUserId: res.assistant.clerkUserId ?? assistantMeta?.clerkUserId ?? null,
      avatarUrl: res.assistant.avatarUrl ?? assistantMeta?.avatarUrl ?? null,
      name: res.assistant.name ?? assistantMeta?.name ?? "Assistente",
      email: res.assistant.email ?? assistantMeta?.email ?? "",
    };

    setUnassignedAssistants((prev) => [...prev.filter((a) => a.id !== assistantToAdd.id), assistantToAdd]);
  };

  const transferAssistant = async (assistantId: string, fromAdminId: string, toAdminId: string) => {
    const team = teams.find((t) => t.adminId === fromAdminId);
    const assistant = team?.assistants.find((a) => a.id === assistantId);
    if (!assistant) return;
    await removeAssignment(assistant.assignmentId);
    await assignAssistant(toAdminId, assistantId);
  };

  const stats = {
    totalAdmins: teams.length,
    totalAssistants: teams.reduce((acc, t) => acc + t.assistants.length, 0),
    unassignedCount: unassignedAssistants.length,
  };

  return {
    teams,
    unassignedAssistants,
    availableAdmins,
    isLoading,
    error,
    stats,
    refetch: () => fetchTeamData(true),
    assignAssistant,
    removeAssignment,
    transferAssistant,
  };
}
