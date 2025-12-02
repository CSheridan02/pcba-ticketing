import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Menu, X } from 'lucide-react';
import AAONLogo from '@/assets/SVG/AAON_Digital_AAON_Digital_Blue.svg';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={AAONLogo} alt="AAON Logo" className="h-6 sm:h-8" />
              <span className="text-sm sm:text-lg font-semibold hidden xs:inline">
                Work Order Ticketing
              </span>
              <span className="text-sm font-semibold xs:hidden">AAON WO</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-1">
              <Link
                to="/work-orders"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/work-orders')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Work Orders
              </Link>
              {profile?.role === 'admin' && (
                <Link
                  to="/settings"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    location.pathname === '/settings'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              )}
            </nav>

            {/* Right side - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-sm text-right">
                <div className="font-medium">{profile?.full_name}</div>
                <div className="text-gray-500 text-xs capitalize">
                  {profile?.role?.replace('_', ' ')}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t py-3 space-y-2">
              <Link
                to="/work-orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  location.pathname.startsWith('/work-orders')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Work Orders
              </Link>
              {profile?.role === 'admin' && (
                <Link
                  to="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === '/settings'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </div>
                </Link>
              )}
              <div className="pt-3 border-t mt-3">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium">{profile?.full_name}</div>
                  <div className="text-gray-500 text-xs capitalize">
                    {profile?.role?.replace('_', ' ')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}

