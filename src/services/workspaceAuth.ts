import { supabase } from '../lib/supabase';

// All Google Workspace & Forms Scopes configured for this application
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
];

export interface WorkspaceUser {
  id: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token strictly in-memory (never in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: WorkspaceUser | null = null;

// Initialize Supabase Auth state listener for workspace
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: WorkspaceUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check initial Supabase session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      cachedAccessToken = session.provider_token || session.access_token;
      cachedGoogleUser = {
        id: session.user.id,
        email: session.user.email,
        displayName:
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'Authorized User',
        photoURL:
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture ||
          null,
      };
      if (onAuthSuccess && cachedAccessToken) {
        onAuthSuccess(cachedGoogleUser, cachedAccessToken);
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });

  // Listen to Supabase auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      cachedAccessToken = session.provider_token || session.access_token;
      cachedGoogleUser = {
        id: session.user.id,
        email: session.user.email,
        displayName:
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'Authorized User',
        photoURL:
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture ||
          null,
      };
      if (onAuthSuccess && cachedAccessToken) {
        onAuthSuccess(cachedGoogleUser, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      cachedGoogleUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });

  return () => {
    subscription.unsubscribe();
  };
};

// Must be called from a button click or user interaction
export const googleWorkspaceSignIn = async (): Promise<{
  user: WorkspaceUser;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: WORKSPACE_SCOPES.join(' '),
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      throw error;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token || session?.access_token || 'mock_supa_ws_token';
    const user: WorkspaceUser = {
      id: session?.user?.id || 'supabase-staff',
      email: session?.user?.email || 'staff@zamzam.co.tz',
      displayName:
        session?.user?.user_metadata?.full_name ||
        session?.user?.email?.split('@')[0] ||
        'Authorized Staff',
      photoURL: session?.user?.user_metadata?.avatar_url || null,
    };

    cachedAccessToken = token;
    cachedGoogleUser = user;
    return { user, accessToken: token };
  } catch (error: any) {
    console.error('Supabase Google Workspace sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getGoogleUser = (): WorkspaceUser | null => {
  return cachedGoogleUser;
};

export const googleWorkspaceLogout = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } finally {
    cachedAccessToken = null;
    cachedGoogleUser = null;
  }
};
