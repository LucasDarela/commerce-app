// app/dashboard/forbidden/page.tsx
export default function ForbiddenPage() {
  return (
    <div className="p-8 space-y-2">
      <h1 className="text-2xl font-semibold">Acesso negado</h1>
      <p className="text-muted-foreground">
        Esta área é restrita a administradores da empresa.
      </p>
    </div>
  );
}
