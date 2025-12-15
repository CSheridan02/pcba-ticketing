import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Shield } from 'lucide-react';
import AAONLogo from '@/assets/SVG/AAON_Digital_AAON_Digital_Blue.svg';

export default function PendingApprovalPage() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={AAONLogo} alt="AAON Logo" className="h-12" />
          </div>
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Access Pending</CardTitle>
          <CardDescription className="text-base">
            Your account is awaiting approval from an administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900">
                <p>
                  <strong>Welcome, {profile?.full_name}!</strong>
                </p>
                <p>
                  Your account has been created successfully, but you need administrator approval to access the Work Order Ticketing System.
                </p>
                <p>
                  An administrator will review your request and grant you access soon. You will be able to log in once your access has been approved.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-600 text-center">
              <p>Please contact your system administrator if you need immediate access.</p>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            You can check back later or wait for an email notification once your access has been granted.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

