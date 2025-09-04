import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  LogOut, 
  Settings, 
  UserCircle, 
  Shield,
  ChevronDown,
  Mail,
  Key
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from '@tanstack/react-router';

export const UserMenu: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigate = (path: string) => {
    navigate({ to: path });
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  // Get role badge color
  const getRoleBadgeVariant = () => {
    switch (user.role) {
      case 'admin':
        return 'destructive';
      case 'developer':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">{user.username}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none">{user.username}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getRoleBadgeVariant() as any} className="text-xs">
                {user.role}
              </Badge>
              {!user.emailVerified && (
                <Badge variant="outline" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  Unverified
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleNavigate('/profile')}>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleNavigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        {user.role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigate('/admin')}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin Panel</span>
            </DropdownMenuItem>
          </>
        )}
        
        {user.role === 'developer' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigate('/api-keys')}>
              <Key className="mr-2 h-4 w-4" />
              <span>API Keys</span>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Simplified user button for tight spaces
export const UserButton: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return (
      <Button 
        variant="default" 
        size="sm"
        onClick={() => navigate({ to: '/auth/login' })}
      >
        Sign In
      </Button>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = () => {
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: '/profile' })}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: '/settings' })}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
