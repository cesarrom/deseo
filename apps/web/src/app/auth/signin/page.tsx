'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@deseo/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@deseo/ui/card';
import { Github, Chrome } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Deseo <span className="text-blue-600">SEO</span>
        </h1>
        <p className="text-slate-500">Autonomous SEO Intelligence & Automation</p>
      </div>
      
      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>
            Choose your preferred provider to access your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button 
            variant="outline" 
            className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <Chrome className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>
          
          <Button 
            variant="outline" 
            className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          >
            <Github className="mr-2 h-4 w-4" />
            Continue with GitHub
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Enterprise Only</span>
            </div>
          </div>

          <p className="px-8 text-center text-sm text-slate-500">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
