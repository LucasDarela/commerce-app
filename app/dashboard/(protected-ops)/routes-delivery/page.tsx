"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Navigation,
  Truck,
  Plus,
  Route as RouteIcon,
  Search,
  Filter,
  X,
  GripVertical,
  Clock,
  Trash2,
} from "lucide-react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker,
} from "@react-google-maps/api";
import clsx from "clsx";
import DriverSelect from "@/components/routes/SelectMotorista";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CustomDateInput from "@/components/ui/CustomDateInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CreatedRoutesList } from "@/components/routes/CreatedRoutesList";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

type OrderForRoute = {
  id: string;
  customer_name: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  appointment_date: string;
  appointment_hour?: string;
  delivery_status: string;
  products?: string;
  appointment_local?: string;
  text_note?: string;
  lat?: number;
  lng?: number;
  driver_id?: string | null;
};

type CompanyInfo = {
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
};

type RouteStop = {
  orderId: string;
  customerName: string;
  address: string;
  estimatedArrival?: string;
  isDepot?: boolean;
  delivery_status?: string;
};

function SortableStopItem({
  stop,
  index,
  onRemove,
}: {
  stop: RouteStop;
  index: number;
  onRemove: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.orderId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "relative bg-card border rounded p-3 text-sm flex gap-3 items-center transition-all",
        isDragging && "opacity-50 shadow-md border-primary",
      )}
    >
      <div
        className={clsx(
          "absolute w-3 h-3 rounded-full -left-[23px] top-4",
          stop.isDepot ? "bg-black dark:bg-white" : "bg-primary",
        )}
      />
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 touch-none"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-medium truncate">
          {index + 1}. {stop.customerName}
        </p>
        <p className="text-muted-foreground text-xs truncate">{stop.address}</p>
        {stop.estimatedArrival && (
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
            ETA: {stop.estimatedArrival}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center justify-end min-w-[32px]">
        {confirmDelete ? (
          <div className="flex flex-col gap-1 items-end">
            <Button
              variant="destructive"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => onRemove(stop.orderId)}
            >
              Confirmar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive opacity-50 hover:opacity-100 hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EditableTableCell({
  initialValue,
  displayValue,
  orderId,
  field,
  type = "text",
  onSave,
}: {
  initialValue: string;
  displayValue?: string;
  orderId: string;
  field: string;
  type?: "text" | "date" | "time";
  onSave: (orderId: string, field: string, value: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    await onSave(orderId, field, value);
    setIsSaving(false);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        type={type}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        disabled={isSaving}
        className="h-7 text-xs w-full px-1.5 min-w-0 max-w-full"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setValue(initialValue);
            setIsEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="cursor-text hover:bg-muted p-1 -m-1 rounded min-h-[24px] w-full flex items-center truncate"
    >
      {displayValue || initialValue || (
        <span className="opacity-50 italic text-[10px]">
          clique para editar
        </span>
      )}
    </div>
  );
}

export default function CreateRoutePage() {
  const { companyId, loading: companyLoading } = useAuthenticatedCompany();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [orders, setOrders] = useState<OrderForRoute[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<RouteStop[]>([]);

  // Filtros
  const [searchName, setSearchName] = useState("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [startDate, endDate] = dateRange;
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [selectedDriver, setSelectedDriver] = useState("");

  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Depot Settings
  const [originAddress, setOriginAddress] = useState("");
  const [sameAsOrigin, setSameAsOrigin] = useState(true);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [deliveryServiceTime, setDeliveryServiceTime] = useState(30);
  const [collectionServiceTime, setCollectionServiceTime] = useState(5);

  // Drag Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [leftPanelWidth, setLeftPanelWidth] = useState(70);
  const isDragging = useRef(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  useEffect(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset)
      .toISOString()
      .split("T")[0];
    setDepartureDate(localDate);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 20 && newWidth <= 80) {
        setLeftPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;

      const { data: compData, error: compError } = await supabase
        .from("companies")
        .select("address, number, neighborhood, city, state, zip_code")
        .eq("id", companyId)
        .single();

      if (!compError && compData) {
        setCompany(compData);
        setOriginAddress(
          `${compData.address}, ${compData.number}, ${compData.neighborhood}, ${compData.city}, ${compData.state}, ${compData.zip_code}`,
        );
      }

      const { data: ordData, error: ordError } = await supabase
        .from("orders")
        .select(
          `
          id,
          appointment_date,
          appointment_hour,
          delivery_status,
          appointment_local,
          text_note,
          products,
          driver_id,
          customers (
            name, address, number, neighborhood, city, state, zip_code
          ),
          order_items (
            quantity,
            product:products!order_items_product_id_fkey(name)
          )
        `,
        )
        .eq("company_id", companyId)
        .in("delivery_status", ["Entregar", "Coletar"])
        .or(editingRoute ? `route_number.is.null,route_number.eq.${editingRoute.route_number}` : `route_number.is.null`)
        .order("appointment_date", { ascending: true });

      if (ordError) {
        toast.error("Erro ao buscar entregas pendentes.");
        return;
      }

      if (ordData) {
        const formatted: OrderForRoute[] = ordData
          .map((o: any) => {
            let productsText = o.products;
            if (
              (!productsText || productsText.trim() === "") &&
              o.order_items &&
              o.order_items.length > 0
            ) {
              productsText = o.order_items
                .map(
                  (i: any) =>
                    `${i.product?.name || "Produto"} (${i.quantity}x)`,
                )
                .join(", ");
            }

            return {
              id: o.id,
              appointment_date: o.appointment_date,
              appointment_hour: o.appointment_hour,
              appointment_local: o.appointment_local,
              text_note: o.text_note,
              delivery_status: o.delivery_status,
              products: productsText,
              customer_name: o.customers?.name || "Desconhecido",
              address: o.customers?.address || "",
              number: o.customers?.number || "",
              neighborhood: o.customers?.neighborhood || "",
              city: o.customers?.city || "",
              state: o.customers?.state || "",
              zip_code: o.customers?.zip_code || "",
              driver_id: o.driver_id,
            };
          })
          .filter((o: any) => o.address || o.appointment_local);

        setOrders(formatted);
      }
    }

    fetchData();
  }, [companyId, supabase, editingRoute]);

  const handleEditRoute = (route: any) => {
    setEditingRoute(route);
    setDirectionsResponse(null);
    setOptimizedRoute([]);
    setSelectedDriver(route.driver_id);
    
    // Select the orders that are already in this route
    if (route.stops) {
      const orderIds = route.stops.map((s: any) => s.orderId).filter((id: string) => !id.startsWith("depot"));
      setSelectedOrderIds(new Set(orderIds));
    }
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleInlineUpdate = async (
    orderId: string,
    field: string,
    value: string,
  ) => {
    const { error } = await supabase
      .from("orders")
      .update({ [field]: value })
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (error) {
      toast.error(`Erro ao atualizar campo.`);
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o)),
    );
    toast.success("Endereço atualizado com sucesso!");
  };

  const toggleOrderSelection = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedOrderIds(newSet);
  };

  const getFullAddress = (obj: any) => {
    if (obj.appointment_local && obj.appointment_local.trim().length > 5) {
      const addr = obj.appointment_local.trim();
      return addr.toLowerCase().includes("brasil") ? addr : `${addr}, Brasil`;
    }
    
    const parts = [];
    if (obj.address) parts.push(obj.address);
    if (obj.number) parts.push(obj.number);
    if (obj.neighborhood) parts.push(`- ${obj.neighborhood}`);
    if (obj.city) parts.push(`, ${obj.city}`);
    if (obj.state) parts.push(`- ${obj.state}`);
    if (obj.zip_code) parts.push(`, ${obj.zip_code}`);
    
    let assembled = parts.join(" ").trim();
    if (assembled.length > 5 && !assembled.toLowerCase().includes("brasil")) {
      assembled += ", Brasil";
    }
    return assembled.length > 5 ? assembled : "Endereço Inválido";
  };

  const calculateRoute = async (manualStopsSequence?: RouteStop[]) => {
    if (selectedOrderIds.size === 0 && !manualStopsSequence) {
      toast.error("Selecione pelo menos um pedido para a rota.");
      return;
    }

    setIsCalculating(true);
    try {
      const DirectionsService = new google.maps.DirectionsService();

      let origin = "";
      let destination = "";
      let waypoints: any[] = [];
      let orderedStops: RouteStop[] = [];

      if (manualStopsSequence) {
        orderedStops = manualStopsSequence;
        origin = orderedStops[0].address;
        destination = orderedStops[orderedStops.length - 1].address;
        waypoints = orderedStops.slice(1, -1).map((stop) => ({
          location: stop.address,
          stopover: true,
        }));
      } else {
        const stops = orders.filter((o) => selectedOrderIds.has(o.id));
        const hasOrigin = originAddress.trim().length > 5;

        origin = hasOrigin ? originAddress : getFullAddress(stops[0]);

        if (sameAsOrigin && hasOrigin) {
          destination = originAddress;
          waypoints = stops.map((stop) => ({
            location: getFullAddress(stop),
            stopover: true,
          }));
          orderedStops = [
            {
              orderId: "depot-start",
              customerName: "Local de Partida",
              address: originAddress,
              isDepot: true,
            },
            ...stops.map((s) => ({
              orderId: s.id,
              customerName: s.customer_name,
              address: getFullAddress(s),
              delivery_status: s.delivery_status,
            })),
            {
              orderId: "depot-end",
              customerName: "Local de Chegada",
              address: originAddress,
              isDepot: true,
            },
          ];
        } else {
          const hasDestination =
            !sameAsOrigin && destinationAddress.trim().length > 5;
          if (hasDestination) {
            destination = destinationAddress;
            waypoints = stops.map((stop) => ({
              location: getFullAddress(stop),
              stopover: true,
            }));
            orderedStops = [
              {
                orderId: "depot-start",
                customerName: "Local de Partida",
                address: origin,
                isDepot: true,
              },
              ...stops.map((s) => ({
                orderId: s.id,
                customerName: s.customer_name,
                address: getFullAddress(s),
                delivery_status: s.delivery_status,
              })),
              {
                orderId: "depot-end",
                customerName: "Local de Chegada",
                address: destination,
                isDepot: true,
              },
            ];
          } else if (hasOrigin) {
            destination = getFullAddress(stops[stops.length - 1]);
            waypoints = stops.slice(0, -1).map((stop) => ({
              location: getFullAddress(stop),
              stopover: true,
            }));
            orderedStops = [
              {
                orderId: "depot-start",
                customerName: "Local de Partida",
                address: origin,
                isDepot: true,
              },
              ...stops.map((s) => ({
                orderId: s.id,
                customerName: s.customer_name,
                address: getFullAddress(s),
                delivery_status: s.delivery_status,
              })),
            ];
          } else {
            origin = getFullAddress(stops[0]);
            destination = getFullAddress(stops[stops.length - 1]);
            waypoints = stops.slice(1, -1).map((stop) => ({
              location: getFullAddress(stop),
              stopover: true,
            }));
            orderedStops = stops.map((s) => ({
              orderId: s.id,
              customerName: s.customer_name,
              address: getFullAddress(s),
              delivery_status: s.delivery_status,
            }));
          }
        }
      }

      const ensureBrasil = (addr: string) => {
        if (!addr || addr === "Endereço Inválido") return addr;
        return addr.toLowerCase().includes("brasil") ? addr : `${addr}, Brasil`;
      };

      const response = await DirectionsService.route({
        origin: ensureBrasil(origin),
        destination: ensureBrasil(destination),
        waypoints,
        optimizeWaypoints: !manualStopsSequence,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      setDirectionsResponse(response);

      const route = response.routes[0];
      let waypointOrder = route.waypoint_order;

      let finalStops: RouteStop[] = [];

      if (!manualStopsSequence) {
        finalStops.push(orderedStops[0]);
        waypointOrder.forEach((idx: number) => {
          finalStops.push(orderedStops[idx + 1]);
        });
        if (orderedStops.length > 1) {
          finalStops.push(orderedStops[orderedStops.length - 1]);
        }
      } else {
        finalStops = orderedStops;
      }

      let startTime = new Date();
      if (departureDate) {
        const [year, month, day] = departureDate.split("-");
        startTime.setFullYear(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
        );
      }
      if (departureTime) {
        const [hours, minutes] = departureTime.split(":");
        startTime.setHours(parseInt(hours, 10));
        startTime.setMinutes(parseInt(minutes, 10));
        startTime.setSeconds(0);
      } else {
        startTime.setMinutes(startTime.getMinutes() + 5);
      }

      const formatETA = (date: Date) => {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const time = date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${day}/${month} ${time}`;
      };

      const legs = route.legs;
      finalStops.forEach((stop, index) => {
        if (index === 0) {
          stop.estimatedArrival = "Partida (" + formatETA(startTime) + ")";
        } else {
          const leg = legs[index - 1];
          const durationSeconds = leg.duration?.value || 0;

          startTime.setSeconds(startTime.getSeconds() + durationSeconds);
          stop.estimatedArrival = formatETA(startTime);

          if (!stop.isDepot && index < finalStops.length - 1) {
            const mins =
              stop.delivery_status === "Coletar"
                ? collectionServiceTime
                : deliveryServiceTime;
            startTime.setMinutes(startTime.getMinutes() + mins);
          }
        }
      });

      setOptimizedRoute([...finalStops]);
      toast.success(
        manualStopsSequence
          ? "Rota atualizada manualmente!"
          : "Rota otimizada com sucesso!",
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao calcular a rota. Verifique os endereços.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = optimizedRoute.findIndex((x) => x.orderId === active.id);
      const newIndex = optimizedRoute.findIndex((x) => x.orderId === over?.id);

      const newRoute = arrayMove(optimizedRoute, oldIndex, newIndex);
      setOptimizedRoute(newRoute);
      calculateRoute(newRoute);
    }
  };

  useEffect(() => {
    if (
      mapInstance &&
      directionsResponse &&
      directionsResponse.routes[0]?.bounds
    ) {
      const timer = setTimeout(() => {
        mapInstance.fitBounds(directionsResponse.routes[0].bounds);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [mapInstance, directionsResponse]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (startDate || endDate) {
        const orderDateStr = o.appointment_date;
        if (!orderDateStr) return false;

        const orderTime = new Date(orderDateStr + "T12:00:00").getTime();
        const start = startDate
          ? new Date(startDate).setHours(0, 0, 0, 0)
          : null;
        const end = endDate
          ? new Date(endDate).setHours(23, 59, 59, 999)
          : null;

        if (start && end) {
          if (orderTime < start || orderTime > end) return false;
        } else if (start && orderTime < start) {
          return false;
        } else if (end && orderTime > end) {
          return false;
        }
      }

      if (filterStatus !== "Todos" && o.delivery_status !== filterStatus)
        return false;
      if (
        searchName &&
        !o.customer_name.toLowerCase().includes(searchName.toLowerCase())
      )
        return false;

      if (selectedDriver && o.driver_id && o.driver_id !== selectedDriver) {
        return false;
      }

      return true;
    });
  }, [orders, dateRange, filterStatus, searchName, selectedDriver]);

  if (companyLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row overflow-hidden relative flex-1 min-w-0 w-full">
      <div
        className="flex flex-col bg-background overflow-hidden h-full z-10 shrink-0 transition-all duration-300 min-w-0 lg:max-w-full"
          style={
            typeof window !== "undefined" &&
            window.innerWidth >= 1024 &&
            directionsResponse
              ? { width: `${leftPanelWidth}%`, flex: 'none' }
              : { width: '100%', flex: 'none' }
          }
        >
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <RouteIcon className="w-6 h-6 text-primary" /> Planejador de Rotas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione as entregas pendentes para criar uma rota otimizada.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 min-w-0 w-full max-w-full">
          {!directionsResponse ? (
            <div className="space-y-4 min-w-0 w-full max-w-full">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full min-w-0">
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Filtros da Rota</h3>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Motorista
                    </label>
                    <DriverSelect
                      value={selectedDriver}
                      onChange={setSelectedDriver}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Período
                      </label>
                      <div className="relative w-full z-50">
                        <DatePicker
                          selectsRange
                          startDate={startDate}
                          endDate={endDate}
                          onChange={(update) =>
                            setDateRange(update as [Date | null, Date | null])
                          }
                          isClearable={false}
                          placeholderText="Data"
                          dateFormat="dd/MM/yyyy"
                          customInput={<CustomDateInput />}
                          popperPlacement="bottom-start"
                          popperClassName="z-[9999]"
                          wrapperClassName="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Tipo
                      </label>
                      <Select
                        value={filterStatus}
                        onValueChange={setFilterStatus}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Entregar">Entregas</SelectItem>
                          <SelectItem value="Coletar">Coletas</SelectItem>
                          <SelectItem value="Todos">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente..."
                        className="pl-8 h-9 text-sm"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Partida e Chegada</h3>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Local de Partida
                    </label>
                    <Input
                      placeholder="Endereço completo de partida"
                      value={originAddress}
                      onChange={(e) => setOriginAddress(e.target.value)}
                      className="text-sm h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="same-dest"
                      checked={sameAsOrigin}
                      onCheckedChange={(c) => setSameAsOrigin(!!c)}
                    />
                    <label
                      htmlFor="same-dest"
                      className="text-xs font-medium cursor-pointer"
                    >
                      Local de chegada é o mesmo de partida
                    </label>
                  </div>
                  {!sameAsOrigin && (
                    <div className="pt-2 border-t mt-2">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Local de Chegada (Opcional)
                      </label>
                      <Input
                        placeholder="Deixe em branco para terminar na última entrega"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">
                      Parâmetros de Tempo
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Data de Saída
                      </label>
                      <Input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Horário de Saída
                      </label>
                      <Input
                        type="time"
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Min. p/ Entrega
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={deliveryServiceTime}
                        onChange={(e) =>
                          setDeliveryServiceTime(parseInt(e.target.value) || 0)
                        }
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Min. p/ Coleta
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={collectionServiceTime}
                        onChange={(e) =>
                          setCollectionServiceTime(
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  Entregas ({filteredOrders.length})
                </h2>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedOrderIds.size} selecionadas
                </span>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma entrega encontrada.
                </p>
              ) : (
                <div className="rounded-md border bg-card overflow-hidden w-full min-w-0 max-w-full">
                  <div className="overflow-x-auto w-full max-w-full">
                    <Table className="w-full">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[40px] text-center pl-4 pr-1">
                            <Checkbox
                              checked={
                                filteredOrders.length > 0 &&
                                selectedOrderIds.size === filteredOrders.length
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedOrderIds(
                                    new Set(filteredOrders.map((o) => o.id)),
                                  );
                                } else {
                                  setSelectedOrderIds(new Set());
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="w-[60px]">Status</TableHead>
                          <TableHead className="w-[90px]">Data</TableHead>
                          <TableHead className="min-w-[150px]">
                            Cliente
                          </TableHead>
                          <TableHead className="min-w-[200px]">
                            Endereço
                          </TableHead>
                          <TableHead className="min-w-[150px]">
                            Observação
                          </TableHead>
                          <TableHead className="min-w-[300px]">
                            Produtos
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow
                            key={order.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleOrderSelection(order.id)}
                          >
                            <TableCell
                              className="text-center pl-4 pr-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={selectedOrderIds.has(order.id)}
                                onCheckedChange={() =>
                                  toggleOrderSelection(order.id)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <span
                                className={clsx(
                                  "inline-flex text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap",
                                  order.delivery_status === "Coletar"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                                )}
                              >
                                {order.delivery_status}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground align-top">
                              <div className="flex flex-col gap-1 min-w-[90px]">
                                <EditableTableCell
                                  initialValue={order.appointment_date || ""}
                                  displayValue={
                                    order.appointment_date
                                      ? `${order.appointment_date.split("-")[2]}/${order.appointment_date.split("-")[1]}/${order.appointment_date.split("-")[0]}`
                                      : "-"
                                  }
                                  orderId={order.id}
                                  field="appointment_date"
                                  type="date"
                                  onSave={handleInlineUpdate}
                                />
                                <div className="font-medium text-foreground">
                                  <EditableTableCell
                                    initialValue={order.appointment_hour || ""}
                                    displayValue={order.appointment_hour || "-"}
                                    orderId={order.id}
                                    field="appointment_hour"
                                    type="time"
                                    onSave={handleInlineUpdate}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-sm align-top">
                              {order.customer_name}
                            </TableCell>
                            <TableCell
                              className="text-xs text-muted-foreground align-top min-w-[200px]"
                              title={getFullAddress(order)}
                            >
                              <EditableTableCell
                                initialValue={
                                  order.appointment_local ||
                                  getFullAddress(order)
                                }
                                displayValue={getFullAddress(order)}
                                orderId={order.id}
                                field="appointment_local"
                                onSave={handleInlineUpdate}
                              />
                            </TableCell>
                            <TableCell
                              className="text-xs text-muted-foreground align-top min-w-[150px]"
                              title={order.text_note}
                            >
                              <EditableTableCell
                                initialValue={order.text_note || ""}
                                displayValue={order.text_note || ""}
                                orderId={order.id}
                                field="text_note"
                                onSave={handleInlineUpdate}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground align-top min-w-[300px] whitespace-normal">
                              {order.products || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="pt-4 mt-2 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {selectedOrderIds.size} pedidos selecionados
                  </p>
                  <Button
                    onClick={() => calculateRoute()}
                    disabled={
                      selectedOrderIds.size === 0 ||
                      isCalculating ||
                      !selectedDriver
                    }
                  >
                    {isCalculating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4 mr-2" />
                    )}
                    {isCalculating ? "Calculando..." : "Calcular Melhor Rota"}
                  </Button>
                </div>
              </div>
              {!selectedDriver && (
                <p className="text-xs text-center text-destructive">
                  Selecione um motorista primeiro.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  Sequência da Rota
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newRoute = [
                        ...optimizedRoute,
                        {
                          orderId: `depot-mid-${Date.now()}`,
                          customerName: "Retorno ao Depósito",
                          address: originAddress,
                          isDepot: true,
                        },
                      ];
                      setOptimizedRoute(newRoute);
                      calculateRoute(newRoute);
                    }}
                  >
                    + Parada no Depósito
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDirectionsResponse(null);
                      setOptimizedRoute([]);
                    }}
                  >
                    Editar Seleção
                  </Button>
                </div>
              </div>

              <div className="space-y-3 relative border-l-2 border-primary/20 ml-3 pl-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={optimizedRoute.map((r) => r.orderId)}
                    strategy={verticalListSortingStrategy}
                  >
                    {optimizedRoute.map((stop, i) => (
                      <SortableStopItem
                        key={stop.orderId}
                        stop={stop}
                        index={i}
                        onRemove={(id) => {
                          const newRoute = optimizedRoute.filter(
                            (r) => r.orderId !== id,
                          );
                          setOptimizedRoute(newRoute);
                          calculateRoute(newRoute);
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              <Button 
                className="w-full mt-6" 
                onClick={async () => {
                  if (!selectedDriver) {
                    toast.error("Selecione um motorista nos Filtros da Rota.");
                    return;
                  }
                  
                  const deliveries = optimizedRoute.filter(stop => !stop.isDepot);
                  if (deliveries.length === 0) {
                    toast.error("Nenhuma entrega válida na rota.");
                    return;
                  }

                  try {
                    toast.loading("Salvando e atribuindo rota...");
                    const deliveryIds = deliveries.map(d => d.orderId);

                    const res = await fetch("/api/routes/generate", {
                      method: editingRoute ? "PUT" : "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        routeId: editingRoute?.id,
                        routeNumber: editingRoute?.route_number,
                        deliveryIds,
                        driverId: selectedDriver,
                        date: departureDate || new Date().toISOString().split("T")[0],
                        type: filterStatus === "Todos" ? "Entregar" : filterStatus,
                        companyId: companyId,
                        stops: optimizedRoute
                      })
                    });

                    if (!res.ok) {
                      const errBody = await res.json().catch(() => ({}));
                      throw new Error(errBody.error || "Falha ao salvar a rota.");
                    }
                    toast.dismiss();
                    toast.success(editingRoute ? "Rota atualizada com sucesso!" : "Rota salva e atribuída com sucesso ao motorista!");
                    setEditingRoute(null);
                  } catch (error) {
                    console.error(error);
                    toast.dismiss();
                    toast.error("Erro ao salvar a rota.");
                  }
                }}
              >
                Salvar e Atribuir Rota
              </Button>
            </div>
          )}

          {/* ROTAS CRIADAS - Section at the bottom of the left panel */}
          <div className="mt-12 pt-6 border-t w-full">
            <CreatedRoutesList onEditRoute={handleEditRoute} />
          </div>
        </div>
      </div>

      {/* Somente exibe Divisor e Mapa após calcular a rota */}
      {directionsResponse && (
        <>
          {/* DRAG DIVIDER */}
          <div
            className="hidden lg:flex w-1.5 bg-border hover:bg-primary/50 cursor-col-resize active:bg-primary z-20 shrink-0 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              isDragging.current = true;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          />

          {/* PAINEL DIREITO: Mapa */}
          <div className="flex-1 h-[50vh] lg:h-full bg-muted relative min-w-0 flex flex-col">
            {!isLoaded ? (
              <div className="flex h-full items-center justify-center flex-col gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Carregando mapa...</p>
              </div>
            ) : loadError ? (
              <div className="flex h-full items-center justify-center text-destructive p-4 text-center">
                <p>Erro ao carregar o Google Maps. Verifique sua API Key.</p>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={{ lat: -27.590824, lng: -48.551262 }}
                onLoad={(map) => setMapInstance(map)}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                }}
              >
                <DirectionsRenderer
                  directions={directionsResponse}
                  options={{
                    suppressMarkers: false,
                    preserveViewport: true,
                    polylineOptions: {
                      strokeColor: "#2563eb",
                      strokeWeight: 5,
                      strokeOpacity: 0.8,
                    },
                  }}
                />
              </GoogleMap>
            )}
          </div>
        </>
      )}
    </div>
  );
}
