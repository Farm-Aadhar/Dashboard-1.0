import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input type="email" id="email" className="w-full px-3 py-2 border rounded" required />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <input type="password" id="password" className="w-full px-3 py-2 border rounded" required autoComplete="current-password" />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-primary text-white rounded">Login</button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
