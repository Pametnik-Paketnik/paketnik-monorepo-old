import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  setCredentials,
  reset2FAFlow,
  setFaceAuthRequest,
  updateFaceAuthStatus,
  setWebSocketConnected,
} from "@/store/authSlice";
import { useAuth } from "@/hooks/use-auth";
import { getAuthService } from "@/services/auth.service";
import { getWebSocketFaceAuthService } from "@/services/websocket-face-auth.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scan, ArrowLeft, CheckCircle, XCircle, Clock, Smartphone } from "lucide-react";

export function FaceIdWebSocket() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    tempToken,
    faceAuthRequestId,
    faceAuthStatus,
    websocketConnected,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devicesNotified, setDevicesNotified] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const authService = getAuthService();
  const wsService = getWebSocketFaceAuthService();

  // Initialize Face ID authentication
  useEffect(() => {
    let mounted = true;

    const initiateFaceAuth = async () => {
      if (!tempToken || faceAuthRequestId) return;

      setLoading(true);
      setError(null);

      try {
        // Connect to WebSocket
        await wsService.connect();
        if (mounted) {
          dispatch(setWebSocketConnected(true));
        }

        // Initiate Face ID request
        const response = await authService.initiateFaceAuthWeb(tempToken);
        
        if (mounted) {
          dispatch(setFaceAuthRequest({
            requestId: response.requestId,
            status: response.status,
          }));
          setDevicesNotified(response.devicesNotified);

          // Calculate time remaining
          const expirationTime = new Date(response.expiresAt).getTime();
          const currentTime = new Date().getTime();
          const remaining = Math.max(0, Math.floor((expirationTime - currentTime) / 1000));
          setTimeRemaining(remaining);

          // Join WebSocket room
          await wsService.joinRoom(response.requestId, tempToken);

          // Set up WebSocket event listeners
          wsService.onFaceAuthComplete((event) => {
            if (!mounted) return;

            if (event.success && event.data && event.data.user && event.data.access_token) {
              // Check user type - only HOST users can access dashboard
              if (event.data.user.userType !== "HOST") {
                // Clean up WebSocket connection on access denied
                if (faceAuthRequestId) {
                  wsService.leaveRoom(faceAuthRequestId);
                }
                wsService.removeAllListeners();
                wsService.disconnect();
                
                dispatch(updateFaceAuthStatus('failed'));
                setError("Access denied. Only HOST users can access the dashboard.");
                return;
              }
              
              // Clean up WebSocket connection before navigation
              if (faceAuthRequestId) {
                wsService.leaveRoom(faceAuthRequestId);
              }
              wsService.removeAllListeners();
              wsService.disconnect();
              
              // Save credentials and redirect to dashboard
              dispatch(setCredentials({
                user: event.data.user,
                accessToken: event.data.access_token,
              }));
              
              // Redirect to dashboard
              navigate('/');
            } else {
              dispatch(updateFaceAuthStatus('failed'));
              setError(event.error || 'Face ID authentication failed');
            }
          });

          wsService.onFaceAuthStatus((event) => {
            if (!mounted) return;
            dispatch(updateFaceAuthStatus(event.status as 'idle' | 'pending' | 'completed' | 'failed' | 'expired'));
          });

          wsService.onError((error) => {
            if (!mounted) return;
            setError(error.message);
            dispatch(updateFaceAuthStatus('failed'));
            
            // Clean up WebSocket connection on error
            wsService.removeAllListeners();
            wsService.disconnect();
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initiate Face ID authentication');
          dispatch(updateFaceAuthStatus('failed'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initiateFaceAuth();

    return () => {
      mounted = false;
      // Cleanup WebSocket listeners
      wsService.removeAllListeners();
      if (faceAuthRequestId) {
        wsService.leaveRoom(faceAuthRequestId);
      }
    };
  }, [tempToken, dispatch]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          dispatch(updateFaceAuthStatus('expired'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, dispatch]);

  const handleBack = () => {
    // Clean up
    if (faceAuthRequestId) {
      wsService.leaveRoom(faceAuthRequestId);
    }
    wsService.removeAllListeners();
    wsService.disconnect();
    dispatch(reset2FAFlow());
  };

  const handleRetry = () => {
    setError(null);
    
    // Clean up any existing WebSocket connection before retrying
    if (faceAuthRequestId) {
      wsService.leaveRoom(faceAuthRequestId);
    }
    wsService.removeAllListeners();
    wsService.disconnect();
    
    // Reset the face auth request to trigger re-initialization
    dispatch(setFaceAuthRequest({ requestId: '', status: 'idle' }));
    dispatch(updateFaceAuthStatus('idle'));
    
    // This will trigger the useEffect to initiate again
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (faceAuthStatus) {
      case 'pending':
        return <Clock className="h-8 w-8 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
      case 'expired':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Scan className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (faceAuthStatus) {
      case 'pending':
        return `Waiting for Face ID authentication on your mobile device${devicesNotified > 0 ? ` (${devicesNotified} device${devicesNotified > 1 ? 's' : ''} notified)` : ''}`;
      case 'completed':
        return 'Face ID authentication successful! Logging you in...';
      case 'failed':
        return error || 'Face ID authentication failed. Please try again.';
      case 'expired':
        return 'Face ID request expired. Please try again.';
      default:
        return 'Preparing Face ID authentication...';
    }
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
              <Scan className="h-5 w-5" />
              Face ID Authentication
            </CardTitle>
            <CardDescription>
              Complete authentication using your mobile device
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {getStatusMessage()}
              </p>
              
              {faceAuthStatus === 'pending' && timeRemaining !== null && timeRemaining > 0 && (
                <p className="text-lg font-mono font-medium">
                  {formatTime(timeRemaining)}
                </p>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${websocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {websocketConnected ? 'Connected' : 'Disconnected'}
          </div>

          {/* Instructions */}
          {faceAuthStatus === 'pending' && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium text-sm">On your mobile device:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Check for the Face ID authentication notification</li>
                <li>Tap the notification to open the app</li>
                <li>Look at your device's camera for Face ID scan</li>
                <li>Wait for verification to complete</li>
              </ol>
            </div>
          )}

          {/* Error Display */}
          {error && faceAuthStatus === 'failed' && (
            <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
            
            {(faceAuthStatus === 'failed' || faceAuthStatus === 'expired') && (
              <Button
                type="button"
                onClick={handleRetry}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 