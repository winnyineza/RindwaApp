import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login as loginApi } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Shield, AlertCircle, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await loginApi(data.email, data.password);
      
      if (response.token) {
        login(response.token);
        setLocation("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
                      <h2 className="text-3xl font-bold text-foreground mb-2">Rindwa Admin</h2>
            <p className="text-muted-foreground">Sign in to your dashboard</p>
        </div>
        
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="px-8 py-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register("email")}
                  className={`h-12 block w-full ${
                    errors.email ? "border-destructive bg-destructive/10" : ""
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className={`h-12 block w-full ${
                    errors.password ? "border-destructive bg-destructive/10" : ""
                  }`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <button 
                type="button"
                className="text-sm text-muted-foreground hover:text-primary underline transition-colors duration-200"
                onClick={() => setLocation('/forgot-password')}
              >
                Forgot your password?
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
