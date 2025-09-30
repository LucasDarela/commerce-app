"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconSelector } from "@/components/icon-selector";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, companyId } = useAuthenticatedCompany();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("User");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!user?.id || !companyId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, email, avatar")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setUsername(data.username);
        setEmail(data.email);
        setAvatar(data.avatar);
      }
    };

    const fetchCompany = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .limit(1)
        .single();

      if (!error && data) setCompanyName(data.name);
    };

    fetchProfile();
    fetchCompany();
  }, [user?.id, companyId]);

  const handleUpdateProfile = async () => {
    if (!user || !companyId) return;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ username, email })
      .eq("id", user.id);

    const { error: companyError } = await supabase
      .from("companies")
      .update({ name: companyName })
      .eq("id", companyId);

    if (profileError || companyError) toast.error("Failed to update profile.");
    else toast.success("Profile updated!");
    window.location.reload();
  };

  const handleChangeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 150;
        canvas.height = 150;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) return toast.error("Failed to compress image.");

            const fileName = `avatar_${user.id}.webp`;
            await supabase.storage.from("avatars").remove([fileName]);

            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(fileName, blob, {
                cacheControl: "3600",
                upsert: true,
              });

            if (uploadError) return toast.error("Failed to upload avatar.");

            const publicURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ avatar: publicURL })
              .eq("id", user.id);

            if (updateError) return toast.error("Failed to update avatar.");
            setAvatar(`${publicURL}?t=${Date.now()}`);
            toast.success("Avatar updated!");
          },
          "image/webp",
          0.8,
        );
      };
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Ajustes de Conta</h1>

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center p-6 gap-4">
          <label htmlFor="avatarUpload" className="cursor-pointer">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatar || "https://dummyimage.com/150"} />
              <AvatarFallback>
                {username?.charAt(0) || email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </label>
          <input
            name="avatar-upload"
            type="file"
            id="avatarUpload"
            accept="image/png, image/jpeg, image/jpg, image/heic, image/webp"
            className="hidden"
            onChange={handleChangeAvatar}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="space-y-4">
          <label className="text-sm mb-1 block font-medium text-muted-foreground">
            Nome de Usuário
          </label>
          <Input
            type="text"
            placeholder="Nome de Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label className="text-sm mb-1 block font-medium text-muted-foreground">
            Email
          </label>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="text-sm mb-1 block font-medium text-muted-foreground">
            Nome da Empresa
          </label>
          <Input
            type="text"
            placeholder="Nome da Empresa"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <IconSelector />

          <Button onClick={handleUpdateProfile}>Salvar Alterações</Button>
        </CardContent>
      </Card>
    </div>
  );
}
