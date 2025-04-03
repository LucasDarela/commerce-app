export default function UnauthorizedPage() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-600">Acesso Negado</h1>
        <p className="text-muted-foreground max-w-md">
          Você não tem permissão para acessar esta página ou recurso. Caso acredite que isso é um erro, entre em contato com o administrador da sua empresa.
        </p>
      </div>
    );
  }