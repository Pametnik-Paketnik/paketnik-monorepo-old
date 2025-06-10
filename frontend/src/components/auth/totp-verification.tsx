import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, reset2FAFlow } from "@/store/authSlice";
import { useAuth } from "@/hooks/use-auth";
import { getAuthService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, ArrowLeft } from "lucide-react";

export function TotpVerification() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tempToken } = useAuth();
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = getAuthService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken || !totpCode.trim()) return;

    setError(null);
    setLoading(true);

    try {
      // Strip all non-digit characters to get clean 6-digit code
      const cleanCode = totpCode.replace(/\D/g, '');
      
      if (cleanCode.length !== 6) {
        setError('Please enter a complete 6-digit code');
        setLoading(false);
        return;
      }

      const result = await authService.verifyTotp(tempToken, cleanCode);
      
      if (result.success && result.access_token && result.user) {
        // Check user type - only HOST users can access dashboard
        if (result.user.userType !== "HOST") {
          setError("Access denied. Only HOST users can access the dashboard.");
          setLoading(false);
          return;
        }
        
        // Save credentials and redirect to dashboard
        dispatch(setCredentials({
          user: result.user,
          accessToken: result.access_token,
        }));
        
        // Redirect to dashboard
        navigate('/');
      } else {
        setError(result.message || 'TOTP verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    dispatch(reset2FAFlow());
  };

  const formatCode = (value: string) => {
    // Remove all non-digits and limit to 6 characters
    const digits = value.replace(/\D/g, '').slice(0, 6);
    // Add spaces every 3 digits for better readability
    return digits.replace(/(\d{3})(\d{1,3})/, '$1 $2');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setTotpCode(formatted);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-1 h-auto"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Authenticator Code
            </CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp-code">Authentication Code</Label>
            <Input
              id="totp-code"
              type="text"
              placeholder="000 000"
              value={totpCode}
              onChange={handleCodeChange}
              className="text-center text-lg tracking-widest font-mono"
              maxLength={7} // 6 digits + 1 space
              autoComplete="one-time-code"
              autoFocus
            />
            <p className="text-sm text-muted-foreground text-center">
              Open your authenticator app and enter the current 6-digit code
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading || totpCode.replace(/\D/g, '').length !== 6}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 