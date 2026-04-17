import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

const VerifyOtpPage = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { pendingEmail, setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEmail || otp.length !== 6) return;
    setLoading(true);

    try {
      const { data } = await authService.verifyOtp({ email: pendingEmail, otp });
      const tokens = data?.tokens ?? data;
      if (!tokens?.access || !tokens?.refresh) {
        throw new Error("Invalid token response from server");
      }
      setTokens(tokens.access, tokens.refresh);

      try {
        const profile = await authService.getProfile();
        setUser(profile.data);
      } catch {
        // profile optional
      }

      toast.success("Account verified!");
      navigate("/events");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.detail || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!pendingEmail) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-8">
          <CalendarDays className="h-7 w-7 text-primary" />
          <span className="text-2xl font-semibold">UniEvents</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <span className="font-medium text-foreground">{pendingEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
