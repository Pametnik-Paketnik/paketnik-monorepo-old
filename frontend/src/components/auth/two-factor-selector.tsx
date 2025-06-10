import React from "react";
import { useDispatch } from "react-redux";
import { select2FAMethod } from "@/store/authSlice";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Smartphone, Scan } from "lucide-react";

export function TwoFactorSelector() {
  const dispatch = useDispatch();
  const { available2FAMethods, selectedMethod } = useAuth();

  const handleMethodSelect = (methodType: string) => {
    dispatch(select2FAMethod(methodType));
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'totp':
        return <Smartphone className="h-8 w-8" />;
      case 'face_id':
        return <Scan className="h-8 w-8" />;
      default:
        return <Shield className="h-8 w-8" />;
    }
  };

  const getMethodDescription = (type: string) => {
    switch (type) {
      case 'totp':
        return 'Use your authenticator app to generate a 6-digit code';
      case 'face_id':
        return 'Use Face ID authentication with your mobile device';
      default:
        return 'Additional security verification';
    }
  };

  if (available2FAMethods.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Choose 2FA Method
        </CardTitle>
        <CardDescription>
          Select your preferred two-factor authentication method to complete login
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {available2FAMethods.map((method) => (
            <Button
              key={method.type}
              variant={selectedMethod === method.type ? "default" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => handleMethodSelect(method.type)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0">
                  {getMethodIcon(method.type)}
                </div>
                <div className="text-left">
                  <div className="font-medium">{method.display_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getMethodDescription(method.type)}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 