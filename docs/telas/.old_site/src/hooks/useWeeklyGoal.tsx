import { useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { apiFetch } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAppUser } from "./useAppUser";

const DEFAULT_WEEKLY_GOAL = 25;

export function useWeeklyGoal() {
  const { user, getToken } = useAuth();
  const queryClient = useQueryClient();
  const { appUser, isLoading: isLoadingMe, refetch: refetchMe } = useAppUser();

  const [isSaving, setIsSaving] = useState(false);
  const weeklyGoal = useMemo(() => {
    const goal = appUser?.weekly_goal;
    return typeof goal === "number" ? goal : DEFAULT_WEEKLY_GOAL;
  }, [appUser?.weekly_goal]);

  const updateGoal = async (newGoal: number) => {
    if (!user) throw new Error("User not authenticated");

    setIsSaving(true);
    try {
      const patchRes = await apiFetch<{ ok: true; user?: { weekly_goal?: number | null } }>(
        { getToken },
        "/api/me",
        { method: "PATCH", body: JSON.stringify({ weekly_goal: newGoal }) }
      );

      const nextGoal =
        typeof patchRes.user?.weekly_goal === "number" ? patchRes.user.weekly_goal : newGoal;

      queryClient.setQueryData(["me", user.id], (prev: any) => {
        if (!prev || typeof prev !== "object") return prev;
        return {
          ...prev,
          user: { ...(prev as any).user, weekly_goal: nextGoal },
        };
      });
    } catch (err) {
      console.error("Error updating weekly goal:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    weeklyGoal,
    isLoading: isLoadingMe,
    isSaving,
    updateGoal,
    refetch: () => refetchMe(),
  };
}
