"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Search, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DriverSelect from "@/components/routes/SelectMotorista";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DeliveryRoute = {
  id: string;
  route_number: number;
  date: string;
  status: string;
  stops: any[];
  driver_id: string;
  profiles?: any;
};

export function CreatedRoutesList({ onEditRoute }: { onEditRoute?: (route: any) => void }) {
  const { companyId } = useAuthenticatedCompany();
  const supabase = createBrowserSupabaseClient();
  
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [routeToDelete, setRouteToDelete] = useState<DeliveryRoute | null>(null);

  const fetchRoutes = async () => {
    if (!companyId) return;
    setLoading(true);

    let query = supabase
      .from("delivery_routes")
      .select(`
        id, route_number, date, status, stops, driver_id,
        profiles(username)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (selectedDriver) {
      query = query.eq("driver_id", selectedDriver);
    }
    
    if (selectedDate) {
      query = query.eq("date", selectedDate);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar rotas criadas.");
    } else {
      setRoutes(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!routeToDelete) return;
    
    toast.loading("Excluindo rota...");
    
    try {
      const res = await fetch(`/api/routes/generate?routeId=${routeToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao excluir a rota");
      }
      
      toast.dismiss();
      toast.success("Rota excluída com sucesso!");
      setRouteToDelete(null);
      fetchRoutes();
    } catch (err: any) {
      console.error(err);
      toast.dismiss();
      toast.error("Erro ao excluir a rota.");
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [companyId, selectedDriver, selectedDate]);

  return (
    <div className="flex flex-col gap-4 p-4 mt-8 border-t border-muted w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> Rotas Criadas
        </h2>
        <Button variant="outline" size="sm" onClick={fetchRoutes} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Buscar
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Data da Rota</label>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Motorista</label>
          <DriverSelect value={selectedDriver} onChange={setSelectedDriver} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : routes.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
          <p className="text-muted-foreground">Nenhuma rota encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {routes.map((route) => (
            <Card key={route.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Rota #{route.route_number}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {route.profiles?.username || "Motorista Desconhecido"}
                    </p>
                    <div className="flex gap-2">
                      {onEditRoute && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => onEditRoute(route)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setRouteToDelete(route)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    {route.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[250px] overflow-y-auto p-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase">Sequência ({route.stops?.length || 0} paradas)</p>
                  {route.stops && route.stops.map((stop: any, idx: number) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 ${stop.isDepot ? 'bg-black dark:bg-white' : 'bg-primary'}`} />
                        {idx !== route.stops.length - 1 && <div className="w-px h-full bg-border flex-1 my-1" />}
                      </div>
                      <div className="pb-2">
                        <p className="font-medium leading-none">{stop.customerName}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{stop.address}</p>
                        {stop.estimatedArrival && (
                          <p className="text-[10px] text-blue-500 mt-0.5">ETA: {stop.estimatedArrival}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Exclusão Modal */}
      <AlertDialog open={!!routeToDelete} onOpenChange={(open) => !open && setRouteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A rota <strong>#{routeToDelete?.route_number}</strong> será excluída do sistema e os pedidos associados voltarão ao status "Pendente" para que possam ser adicionados em outra rota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
