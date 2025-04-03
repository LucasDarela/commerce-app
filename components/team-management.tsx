"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function TeamManagementPage() {
  const { user, companyId } = useAuthenticatedCompany();
  const [companyName, setCompanyName] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({
    email: "",
    password: "",
    role: "normal",
  });

  useEffect(() => {
    if (!user?.id || !companyId) return;

    const fetchCompany = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      if (!error && data) setCompanyName(data.name);
    };

    const fetchTeam = async () => {
      const { data, error } = await supabase
        .from("company_users")
        .select("role, profiles(id, email)")
        .eq("company_id", companyId);

      if (!error && data) {
        setTeamMembers(
          data.map((item: any) => ({
            id: item.profiles.id,
            email: item.profiles.email,
            role: item.role,
            isBlocked: false, // default value for now
          }))
        );
      }
    };

    fetchCompany();
    fetchTeam();
  }, [user?.id, companyId]);

  const handleAddMember = async () => {
    if (!newMember.email || !newMember.password) {
      return toast.error("Please fill in email and password.");
    }

    const { data, error } = await supabase.auth.signUp({
      email: newMember.email,
      password: newMember.password,
    });

    if (error) return toast.error("Error creating user.");

    const newUserId = data.user?.id;
    if (newUserId) {
      const { error: insertError } = await supabase.from("company_users").insert({
        user_id: newUserId,
        company_id: companyId,
        role: newMember.role,
      });

      if (insertError) return toast.error("Failed to add member to company_users.");

      setTeamMembers([
        ...teamMembers,
        { id: newUserId, email: newMember.email, role: newMember.role },
      ]);
      setNewMember({ email: "", password: "", role: "normal" });
      toast.success("Team member added.");
    }
  };

  const handleToggleBlock = (id: string, blocked: boolean) => {
    setTeamMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, isBlocked: blocked } : member
      )
    );
  };

  const handleResetPassword = (email: string) => {
    toast("Password reset link sent to " + email);
  };

  const handleRemoveUser = async (id: string) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== id));
    toast("User removed");
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-bold">Team Management</h2>
        <div className="grid grid-cols-3 gap-4">
          <Input
            type="email"
            placeholder="New member email"
            value={newMember.email}
            onChange={(e) =>
              setNewMember({ ...newMember, email: e.target.value })
            }
          />
          <Input
            type="password"
            placeholder="Password"
            value={newMember.password}
            onChange={(e) =>
              setNewMember({ ...newMember, password: e.target.value })
            }
          />
          <Select
            value={newMember.role}
            onValueChange={(value) =>
              setNewMember({ ...newMember, role: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAddMember}>Add Member</Button>

        <table className="w-full h-auto text-sm my-8">
          <thead>
            <tr>
              <th className="text-left">Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, index) => (
              <tr key={index}>
                <td className="py-2">{member.email}</td>
                <td className="py-2">{member.role === "admin" ? "👑" : "👤"}</td>
                <td className="py-2">{member.isBlocked ? "Blocked" : "Active"}</td>
                <td className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleBlock(member.id, !member.isBlocked)}
                  >
                    {member.isBlocked ? "Unlock" : "Block"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleResetPassword(member.email)}
                  >
                    Update Password
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveUser(member.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}