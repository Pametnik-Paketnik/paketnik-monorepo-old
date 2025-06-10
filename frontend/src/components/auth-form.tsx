import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, set2FARequired, reset2FAFlow } from "@/store/authSlice"; 
import { useAuth } from "@/hooks/use-auth";
import { getAuthService } from "@/services/auth.service";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { TwoFactorSelector } from "@/components/auth/two-factor-selector";
import { TotpVerification } from "@/components/auth/totp-verification";
import { FaceIdWebSocket } from "@/components/auth/face-id-websocket";

type AuthFormProps = React.ComponentProps<"div"> & {
  mode: "login" | "register";
};

export function AuthForm({ className, mode, ...props }: AuthFormProps) {
  const isLogin = mode === "login";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    is2FAFlow, 
    selectedMethod, 
    isFaceIDSelected, 
    isTotpSelected 
  } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authService = getAuthService();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let response;

      if (isLogin) {
        response = await authService.login(email, password);
      } else {
        response = await authService.register(email, password, name, surname);
      }

      if (!response.success) {
        throw new Error(response.message);
      }

      // Check if 2FA is required
      if ('twoFactorRequired' in response && response.twoFactorRequired) {
        dispatch(set2FARequired({
          tempToken: response.tempToken,
          available2FAMethods: response.available_2fa_methods,
        }));
      } else if ('access_token' in response && response.access_token && response.user) {
        // For login, check user type before storing credentials
        if (isLogin) {
          if (response.user.userType !== "HOST") {
            throw new Error("Access denied. Only HOST users can access the dashboard.");
          }
        }
        
        // Dispatch to redux store
        dispatch(setCredentials({
          user: response.user,
          accessToken: response.access_token,
        }));
        // Redirect to home page after successful authentication
        navigate('/');
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleCancel2FA = () => {
    dispatch(reset2FAFlow());
    setError(null);
  };

  // Render 2FA flow
  if (is2FAFlow) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        {!selectedMethod && <TwoFactorSelector />}
        {isTotpSelected && <TotpVerification />}
        {isFaceIDSelected && <FaceIdWebSocket />}
        
        {/* Cancel 2FA option */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel2FA}
            className="text-muted-foreground"
          >
            Cancel and return to login
          </Button>
        </div>
      </div>
    );
  }

  // Render normal login/register form
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isLogin ? "Login to your account" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your email and password below to login"
              : "Enter your information to create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {/* Registration fields */}
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-3">
                      <Label htmlFor="name">First Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="surname">Last Name</Label>
                      <Input
                        id="surname"
                        type="text"
                        placeholder="Doe"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email field */}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password field */}
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Show error */}
              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? isLogin
                      ? "Logging in..."
                      : "Creating account..."
                    : isLogin
                    ? "Login"
                    : "Create account"}
                </Button>
                <Button variant="outline" className="w-full" type="button">
                  {isLogin ? "Login with Google" : "Sign up with Google"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link to="/register" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link to="/login" className="underline underline-offset-4">
                    Login
                  </Link>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
