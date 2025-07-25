import { useEffect, useState } from "react";
import { Bell, Clock, User, LogOut } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { LanguageSelector } from '@/components/ui/language-selector';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { useTranslation } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header = ({ title, subtitle }: HeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const handleLogout = () => {
    toast({
      title: t('logoutSuccess'),
      description: "You have been logged out of your account.",
    });
    
    // Add a small delay to show the toast before logout
    setTimeout(() => {
      logout();
    }, 500);
  };

  const handleProfileClick = () => {
    setLocation('/profile');
  };

  return (
    <header className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">{title || t('dashboard')}</h2>
          <div className="text-muted-foreground whitespace-pre-line">{subtitle || t('welcome')}</div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <LanguageSelector />
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notification Center */}
          <NotificationCenter />
          
          {/* Current Time */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2" />
            <span>{formatTime(currentTime)} EAT</span>
          </div>

          <Separator orientation="vertical" className="h-6 bg-border" />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 hover:bg-accent text-foreground">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-left">
                  <p className="font-medium text-base text-foreground">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfileClick}>
                <User className="w-4 h-4 mr-2" />
                {t('viewProfile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
