import { ClerkProvider } from '@clerk/clerk-react';

// Use Vite-style env for renderer
export const clerkPubKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || '';

export const clerkConfig = {
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
  afterSignInUrl: '/chat',
  afterSignUpUrl: '/onboarding',
  appearance: {
    baseTheme: undefined,
    variables: {
      colorPrimary: '#8b5cf6',
    },
  },
};

// LangChain-controlled auth decisions (renderer convenience)
export async function validateWithLangChain(user: any) {
  return await (window as any).electron.invoke('langchain:validate-user', user);
}

