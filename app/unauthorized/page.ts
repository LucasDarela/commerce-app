export default function UnauthorizedPage() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-600">Acesso Negado</h1>
        <p className="text-muted-foreground max-w-md">
        You do not have permission to access this page or resource. If you believe this is an error, contact your company administrator.</p>
      </div>
    );
  }