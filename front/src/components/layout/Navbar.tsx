import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, LogOut, Plus, ShieldCheck, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const Navbar = () => {
  const { user, refreshToken, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authService.logout({ refresh: refreshToken });
      }
    } catch {
      // ignore
    }
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/events" className="flex items-center gap-2 font-semibold text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="text-lg">UniEvents</span>
        </Link>

        {isAuthenticated && (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/events">Events</Link>
              </Button>
              {user?.is_staff && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/events/create">
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Link>
                </Button>
              )}
              {user?.is_staff && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/users">
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    User Roles
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </>
        )}

        {!isAuthenticated && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Sign up</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {mobileOpen && isAuthenticated && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-2 animate-fade-in">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setMobileOpen(false)}>
            <Link to="/events"><CalendarDays className="h-4 w-4 mr-2" />Events</Link>
          </Button>
          {user?.is_staff && (
            <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setMobileOpen(false)}>
              <Link to="/events/create"><Plus className="h-4 w-4 mr-2" />Create Event</Link>
            </Button>
          )}
          {user?.is_staff && (
            <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setMobileOpen(false)}>
              <Link to="/admin/users"><ShieldCheck className="h-4 w-4 mr-2" />User Roles</Link>
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />Log out
          </Button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
