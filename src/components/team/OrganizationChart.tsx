import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string | null;
  department: string | null;
  job_title: string | null;
  manager_id: string | null;
  user_roles?: {
    role: string;
  }[];
  subordinates?: Profile[];
}

interface OrgNodeProps {
  profile: Profile;
  level: number;
}

function OrgNode({ profile, level }: OrgNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasSubordinates = profile.subordinates && profile.subordinates.length > 0;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'hr': return 'default';
      case 'manager': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="relative">
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasSubordinates && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-0 h-6 w-6"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="text-xs">
                  {profile.first_name[0]}{profile.last_name[0]}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h4 className="font-semibold text-sm">
                  {profile.first_name} {profile.last_name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {profile.job_title || 'No title'}
                </p>
                {profile.department && (
                  <p className="text-xs text-muted-foreground">
                    {profile.department}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {profile.user_roles?.map((ur) => (
                <Badge
                  key={ur.role}
                  variant={getRoleBadgeVariant(ur.role)}
                  className="text-xs"
                >
                  {ur.role.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
              {hasSubordinates && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {profile.subordinates!.length}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subordinates */}
      {hasSubordinates && isExpanded && (
        <div className="ml-6 pl-4 border-l-2 border-muted">
          {profile.subordinates!.map((subordinate) => (
            <OrgNode
              key={subordinate.id}
              profile={subordinate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationChart() {
  const [orgData, setOrgData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrgData();
  }, []);

  const fetchOrgData = async () => {
    try {
      // Fetch profiles with legacy roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `)
        .eq('is_active', true)
        .order('first_name');

      if (profilesError) throw profilesError;

      // Fetch RBAC roles
      const { data: rbacRoles, error: rbacError } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          roles(name)
        `);

      if (rbacError) throw rbacError;

      // Merge legacy and RBAC roles
      const enrichedProfiles = profilesData?.map(profile => {
        const legacyRoles = profile.user_roles || [];
        const userRbacRoles = rbacRoles
          ?.filter(r => r.user_id === profile.user_id)
          .map(r => ({ role: r.roles?.name })) || [];
        
        return {
          ...profile,
          user_roles: [...legacyRoles, ...userRbacRoles]
        };
      });

      // Build the organizational hierarchy
      const profileMap = new Map<string, Profile>();
      const rootProfiles: Profile[] = [];

      // First pass: create the map and identify root profiles
      enrichedProfiles?.forEach((profile) => {
        const profileWithSubs = { ...profile, subordinates: [] };
        profileMap.set(profile.id, profileWithSubs);
        
        if (!profile.manager_id) {
          rootProfiles.push(profileWithSubs);
        }
      });

      // Second pass: build the hierarchy
      enrichedProfiles?.forEach((profile) => {
        if (profile.manager_id) {
          const manager = profileMap.get(profile.manager_id);
          const subordinate = profileMap.get(profile.id);
          
          if (manager && subordinate) {
            manager.subordinates!.push(subordinate);
          }
        }
      });

      // Sort subordinates by name
      const sortSubordinates = (profiles: Profile[]) => {
        profiles.forEach(profile => {
          if (profile.subordinates) {
            profile.subordinates.sort((a, b) => 
              `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
            );
            sortSubordinates(profile.subordinates);
          }
        });
      };

      rootProfiles.sort((a, b) => 
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      );
      sortSubordinates(rootProfiles);

      setOrgData(rootProfiles);
    } catch (error) {
      console.error('Error fetching org data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch organization chart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading organization chart...</div>;
  }

  if (orgData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No organizational data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Click the chevron icons to expand or collapse team sections.
      </div>
      
      {orgData.map((profile) => (
        <OrgNode key={profile.id} profile={profile} level={0} />
      ))}
    </div>
  );
}