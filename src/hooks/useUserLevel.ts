import { useAuth } from "@/contexts/AuthContext";

export const useUserLevel = () => {
  const { userPlan, levelConfigs } = useAuth();

  const getCurrentUserLevel = (): number => {
    if (!userPlan || !levelConfigs) return 1; // Default to level 1
    
    const config = levelConfigs.find(config => config.plan_name === userPlan && config.active);
    return config?.access_level || 1;
  };

  const isLevel3 = (): boolean => {
    return getCurrentUserLevel() === 3;
  };

  const isLevel1or2 = (): boolean => {
    const level = getCurrentUserLevel();
    return level === 1 || level === 2;
  };

  return {
    currentLevel: getCurrentUserLevel(),
    isLevel3: isLevel3(),
    isLevel1or2: isLevel1or2(),
    userPlan
  };
};