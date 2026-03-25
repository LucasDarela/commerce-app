"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconSelector } from "@/components/icon-selector";
import { toast } from "sonner";

type ProfileRow = {
  username: string | null;
  email: string | null;
  avatar: string | null;
};

type CompanyRow = {
  name: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { user, companyId } = useAuthenticatedCompany();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [username, setUsername] = useState("User");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user?.id || !companyId) return;

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);

      try {
        const [profileRes, companyRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, email, avatar")
            .eq("id", user.id)
            .single(),
          supabase
            .from("companies")
            .select("name")
            .eq("id", companyId)
            .single(),
        ]);

        if (!isMounted) return;

        if (profileRes.error) {
          console.error("Erro ao buscar profile:", profileRes.error);
        } else if (profileRes.data) {
          const data = profileRes.data as ProfileRow;
          setProfile(data);
          setUsername(data.username ?? "User");
          setEmail(data.email ?? "");
          setAvatar(data.avatar ?? null);
        }

        if (companyRes.error) {
          console.error("Erro ao buscar empresa:", companyRes.error);
        } else if (companyRes.data) {
          const data = companyRes.data as CompanyRow;
          setCompanyName(data.name ?? "");
        }
      } catch (error) {
        console.error("Erro inesperado ao carregar conta:", error);
        toast.error("Erro ao carregar dados da conta.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, companyId, supabase]);

  const handleUpdateProfile = async () => {
    if (!user?.id || !companyId || isSaving) return;

    setIsSaving(true);

    try {
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedCompanyName = companyName.trim();

      const [profileRes, companyRes] = await Promise.all([
        supabase
          .from("profiles")
          .update({
            username: trimmedUsername || null,
            email: trimmedEmail || null,
          })
          .eq("id", user.id),
        supabase
          .from("companies")
          .update({
            name: trimmedCompanyName || null,
          })
          .eq("id", companyId),
      ]);

      if (profileRes.error || companyRes.error) {
        console.error("Erro ao atualizar perfil:", profileRes.error);
        console.error("Erro ao atualizar empresa:", companyRes.error);
        toast.error("Erro ao atualizar perfil.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: trimmedUsername || null,
              email: trimmedEmail || null,
            }
          : {
              username: trimmedUsername || null,
              email: trimmedEmail || null,
              avatar,
            },
      );

      toast.success("Perfil atualizado com sucesso!");
      router.refresh();
    } catch (error) {
      console.error("Erro inesperado ao atualizar perfil:", error);
      toast.error("Erro inesperado ao atualizar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeAvatar = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !companyId || isUploadingAvatar) return;

    setIsUploadingAvatar(true);

    try {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/heic",
        "image/webp",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato de imagem inválido.");
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = async () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              toast.error("Erro ao processar imagem.");
              setIsUploadingAvatar(false);
              return;
            }

            canvas.width = 150;
            canvas.height = 150;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
              async (blob) => {
                try {
                  if (!blob) {
                    toast.error("Falha ao comprimir imagem.");
                    return;
                  }

                  const filePath = `${companyId}/avatar_${user.id}.webp`;

                  const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(filePath, blob, {
                      cacheControl: "3600",
                      upsert: true,
                      contentType: "image/webp",
                    });

                  if (uploadError) {
                    console.error("Erro no upload:", uploadError);
                    toast.error("Falha ao enviar avatar.");
                    return;
                  }

                  const { data: publicUrlData } = supabase.storage
                    .from("avatars")
                    .getPublicUrl(filePath);

                  const publicURL = publicUrlData.publicUrl;

                  const { error: updateError } = await supabase
                    .from("profiles")
                    .update({ avatar: publicURL })
                    .eq("id", user.id);

                  if (updateError) {
                    console.error("Erro ao salvar avatar no profile:", updateError);
                    toast.error("Falha ao atualizar avatar.");
                    return;
                  }

                  const bustedUrl = `${publicURL}?t=${Date.now()}`;
                  setAvatar(bustedUrl);
                  setProfile((prev) =>
                    prev
                      ? { ...prev, avatar: bustedUrl }
                      : {
                          username,
                          email,
                          avatar: bustedUrl,
                        },
                  );

                  toast.success("Avatar atualizado!");
                  router.refresh();
                } catch (error) {
                  console.error("Erro inesperado no avatar:", error);
                  toast.error("Erro inesperado ao atualizar avatar.");
                } finally {
                  setIsUploadingAvatar(false);
                }
              },
              "image/webp",
              0.8,
            );
          } catch (error) {
            console.error("Erro ao renderizar imagem:", error);
            toast.error("Erro ao processar imagem.");
            setIsUploadingAvatar(false);
          }
        };

        img.onerror = () => {
          toast.error("Erro ao carregar imagem.");
          setIsUploadingAvatar(false);
        };
      };

      reader.onerror = () => {
        toast.error("Erro ao ler arquivo.");
        setIsUploadingAvatar(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro inesperado ao trocar avatar:", error);
      toast.error("Erro inesperado ao trocar avatar.");
      setIsUploadingAvatar(false);
    } finally {
      e.target.value = "";
    }
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

          {isUploadingAvatar && (
            <p className="text-sm text-muted-foreground">Enviando avatar...</p>
          )}
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
            disabled={loading || isSaving}
          />

          <label className="text-sm mb-1 block font-medium text-muted-foreground">
            Email
          </label>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || isSaving}
          />

          <label className="text-sm mb-1 block font-medium text-muted-foreground">
            Nome da Empresa
          </label>
          <Input
            type="text"
            placeholder="Nome da Empresa"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading || isSaving}
          />

          <IconSelector />

          <Button onClick={handleUpdateProfile} disabled={loading || isSaving}>
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}