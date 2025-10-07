import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: any | null;
  userRole: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    userRole: null,
    loading: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({ ...prev, session, user: session?.user ?? null }));
        
        if (session?.user) {
          // Defer profile fetching with setTimeout to avoid recursion
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setAuthState(prev => ({ ...prev, profile: null, userRole: null, loading: false }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({ ...prev, session, user: session?.user ?? null }));
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Fetch from user_roles table (legacy system)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      // Also check RBAC system for role assignments
      const { data: rbacRoles } = await supabase
        .from('user_role_assignments')
        .select(`
          role:roles(name)
        `)
        .eq('user_id', userId);

      // Determine the effective role (prioritize RBAC system)
      let effectiveRole = roleData?.role || 'employee';
      
      // If user has RBAC roles, map them to legacy role names
      if (rbacRoles && rbacRoles.length > 0) {
        const rbacRoleNames = rbacRoles.map((r: any) => r.role?.name?.toLowerCase());
        
        // Priority: super_admin > hr > manager > employee
        if (rbacRoleNames.includes('super admin') || rbacRoleNames.includes('admin')) {
          effectiveRole = 'super_admin';
        } else if (rbacRoleNames.includes('hr admin') || rbacRoleNames.includes('hr')) {
          effectiveRole = 'hr';
        } else if (rbacRoleNames.includes('manager')) {
          effectiveRole = 'manager';
        }
      }

      setAuthState(prev => ({
        ...prev,
        profile,
        userRole: effectiveRole,
        loading: false,
      }));
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Reset Password Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link.",
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      }
    });

    if (error) {
      toast({
        title: "Google Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      }
    });

    if (error) {
      toast({
        title: "GitHub Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    signInWithGoogle,
    signInWithGitHub,
  };
}