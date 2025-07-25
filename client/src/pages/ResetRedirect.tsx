import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Download, ArrowRight, Clock, Shield } from 'lucide-react';

interface PlatformInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  browserName: string;
  hasAppInstalled?: boolean;
}

const ResetRedirect = () => {
  const [match, params] = useRoute('/reset-redirect/:token');
  const [location, setLocation] = useLocation();
  const token = params?.token;
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [redirecting, setRedirecting] = useState(false);
  const [manualAction, setManualAction] = useState(false);

  const detectPlatform = (): PlatformInfo => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    
    let browserName = 'Unknown';
    if (userAgent.includes('chrome')) browserName = 'Chrome';
    else if (userAgent.includes('firefox')) browserName = 'Firefox';
    else if (userAgent.includes('safari')) browserName = 'Safari';
    else if (userAgent.includes('edge')) browserName = 'Edge';

    return {
      isMobile,
      isIOS,
      isAndroid,
      browserName
    };
  };

  const checkMobileAppInstalled = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Try to open the mobile app
      const appLink = `rindwa://reset-password/${token}`;
      const timeout = setTimeout(() => resolve(false), 2000);
      
      // Create a hidden iframe to test the deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = appLink;
      document.body.appendChild(iframe);
      
      // If the app opens, the page will lose focus
      const handleVisibilityChange = () => {
        if (document.hidden) {
          clearTimeout(timeout);
          resolve(true);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      setTimeout(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.body.removeChild(iframe);
        clearTimeout(timeout);
      }, 2500);
    });
  };

  const redirectToMobileApp = () => {
    const appLink = `rindwa://reset-password/${token}`;
    console.log('Attempting to open mobile app:', appLink);
    
    // Try multiple methods to open the app
    window.location.href = appLink;
    
    // Fallback: Open in a new window/tab
    setTimeout(() => {
      window.open(appLink, '_self');
    }, 500);
    
    // Final fallback: Show manual instructions
    setTimeout(() => {
      setManualAction(true);
    }, 3000);
  };

  const redirectToWebReset = () => {
    setLocation(`/reset-password/${token}`);
  };

  const handleSmartRedirect = async () => {
    if (!platform || !token) return;

    setRedirecting(true);

    if (platform.isMobile) {
      console.log('Mobile device detected, checking for app installation...');
      
      // Check if mobile app is installed
      const hasApp = await checkMobileAppInstalled();
      
      if (hasApp) {
        console.log('Mobile app detected, redirecting to app...');
        redirectToMobileApp();
      } else {
        console.log('Mobile app not installed, showing options...');
        // Stop countdown and show manual options
        setCountdown(0);
        setRedirecting(false);
      }
    } else {
      console.log('Desktop device detected, redirecting to web reset...');
      redirectToWebReset();
    }
  };

  useEffect(() => {
    if (!token) {
      setLocation('/login');
      return;
    }

    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    console.log('Platform detected:', detectedPlatform);
  }, [token, setLocation]);

  useEffect(() => {
    if (!platform) return;

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSmartRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [platform]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/forgot-password')} className="w-full">
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Detecting your device...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {platform.isMobile ? (
              <Smartphone className="h-12 w-12 text-blue-600" />
            ) : (
              <Monitor className="h-12 w-12 text-blue-600" />
            )}
          </div>
          <CardTitle>Password Reset</CardTitle>
          <CardDescription>
            We're redirecting you to the best place to reset your password
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Platform Detection Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <Shield className="h-4 w-4" />
              <span>
                Detected: {platform.isMobile ? 'Mobile' : 'Desktop'} • {platform.browserName}
                {platform.isIOS && ' • iOS'}
                {platform.isAndroid && ' • Android'}
              </span>
            </div>
          </div>

          {/* Countdown or Options */}
          {countdown > 0 && !manualAction ? (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-600 mb-4">
                <Clock className="h-4 w-4" />
                <span>Redirecting in {countdown} seconds...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {platform.isMobile ? (
                <>
                  <p className="text-sm text-gray-600 text-center">
                    Choose how you'd like to reset your password:
                  </p>
                  
                  <Button 
                    onClick={redirectToMobileApp}
                    className="w-full flex items-center justify-center space-x-2"
                    variant="default"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Open in Rindwa Mobile App</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    onClick={redirectToWebReset}
                    className="w-full flex items-center justify-center space-x-2"
                    variant="outline"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Continue in Browser</span>
                  </Button>

                  {manualAction && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Don't have the mobile app?</strong>
                        <br />
                        Download it or continue in your browser above.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Button 
                  onClick={redirectToWebReset}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Continue to Password Reset</span>
                </Button>
              )}
            </div>
          )}

          {/* Manual Skip Option */}
          {countdown > 0 && (
            <Button 
              onClick={() => {
                setCountdown(0);
                setRedirecting(false);
              }}
              variant="ghost" 
              className="w-full text-sm"
            >
              Choose manually
            </Button>
          )}

          {/* Security Notice */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 text-center">
              🔒 This link expires in 1 hour for your security.
              <br />
              If you didn't request this reset, you can safely ignore this.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetRedirect; 