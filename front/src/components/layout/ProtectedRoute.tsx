import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, setUser, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (isAuthenticated) {
        try {
          // Burada sənin login olan istifadəçinin məlumatlarını qaytaran endpoint olmalıdır.
          // Əgər belə bir endpoint yoxdursa, aşağıda qeyd etdiyim backend hissəsinə bax.
          const response = await authService.getProfile(); 
          setUser(response.data); // Store-dakı user-i (is_staff və s.) yeniləyirik
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            // Əgər token keçərsizdirsə və ya user silinibdisə
            logout();
          }
        }
      }
      setIsChecking(false);
    };

    checkUserStatus();
  }, [isAuthenticated, setUser, logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Yoxlama bitənə qədər balaca bir loading göstərmək olar ki, düymələr "atılıb-düşməsin"
  if (isChecking) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;