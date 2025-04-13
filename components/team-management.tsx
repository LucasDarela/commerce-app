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
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { toast } from "sonner";

type TeamMember = {
  id: string;
  email: string;
  role: string;
  isBlocked: boolean;
};

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
      if (!companyId) return;
    
      const { data, error } = await supabase
        .from("company_users")
        .select("role, user_id, profiles(id, email)")
        .eq("company_id", companyId);
    
      if (error) {
        console.error("Erro ao buscar equipe:", error.message);
        return;
      }
    
      const members: TeamMember[] = (data || [])
        .filter((item: any) => item.profiles)
        .map((item: any) => ({
          id: item.user_id, // ← Importante para saber quem é o user
          email: item.profiles.email,
          role: item.role,
          isBlocked: false,
        }));
    
      setTeamMembers(members);
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
  
    if (error) return toast.error("Erro ao criar usuário.");
  
    const newUserId = data.user?.id;
    if (!newUserId) return toast.error("Usuário não foi criado corretamente.");
  
    // ✅ Aguarda o profile ser criado pela trigger (se necessário)
    let profileReady = false;
    let attempts = 0;
    while (!profileReady && attempts < 10) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", newUserId)
        .maybeSingle();
  
      if (profile) {
        profileReady = true;
      } else {
        await new Promise((res) => setTimeout(res, 500)); // espera 500ms
        attempts++;
      }
    }
  
    // ✅ Atualiza o company_id corretamente no profile do novo usuário
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ company_id: companyId })
      .eq("id", newUserId);
  
    if (profileUpdateError) {
      console.error("Erro ao atualizar company_id no perfil:", profileUpdateError);
      return toast.error("Erro ao atualizar empresa no perfil.");
    }
  
    // ⛔ Verifica se já está em company_users
    const { data: existing } = await supabase
      .from("company_users")
      .select("id")
      .eq("user_id", newUserId)
      .eq("company_id", companyId)
      .maybeSingle();
  
    // ✅ Vincula o user à company_users (caso ainda não esteja)
    if (!existing) {
      const { error: insertError } = await supabase
        .from("company_users")
        .insert({
          user_id: newUserId,
          company_id: companyId,
          role: newMember.role,
        });
  
      if (insertError) {
        return toast.error("Erro ao vincular o usuário à empresa.");
      }
    }
  
    // ✅ Atualiza UI
    setTeamMembers([
      ...teamMembers,
      { id: newUserId, email: newMember.email, role: newMember.role },
    ]);
    setNewMember({ email: "", password: "", role: "normal" });
    toast.success("Team member added.");
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
    <div className="space-y-6 p-8">
        <h2 className="text-xl font-bold">Team Management</h2>
        <div className="grid grid-cols-3 gap-4">
          <Input
            type="email"
            placeholder="New member email"
            value={newMember.email ?? ""}
            onChange={(e) =>
              setNewMember({ ...newMember, email: e.target.value })
            }
          />
          <Input
            type="password"
            placeholder="Password"
            value={newMember.password ?? ""}
            onChange={(e) =>
              setNewMember({ ...newMember, password: e.target.value })
            }
          />
          <Select
            value={newMember.role ?? ""}
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

        <Table className="my-8 text-sm w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member, index) => (
              <TableRow key={index}>
                <TableCell className="py-2">{member.email}</TableCell>
                <TableCell className="py-2">
                  {member.role === "admin" ? "👑" : "👤"}
                </TableCell>
                <TableCell className="py-2">
                  {member.isBlocked ? "Blocked" : "Active"}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex gap-2">
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  );
}