// lib/permissions.ts

export type UserRole = "admin" | "motorista";

export const DRIVER_ALLOWED_ROUTES = [
  "/dashboard/orders",
  "/dashboard/routes-delivery",
  "/dashboard/loan",
  "/dashboard/help",
] as const;

export function isAdmin(role?: UserRole | null) {
  return role === "admin";
}

export function isDriver(role?: UserRole | null) {
  return role === "motorista";
}

export function canAccessRoute(
  role: UserRole | null | undefined,
  pathname: string,
) {
  if (!role) return false;

  if (isAdmin(role)) return true;

  if (isDriver(role)) {
    return DRIVER_ALLOWED_ROUTES.some((route) => pathname.startsWith(route));
  }

  return false;
}

export function canViewOrders(role?: UserRole | null) {
  return isAdmin(role) || isDriver(role);
}

export function canViewRoutesDelivery(role?: UserRole | null) {
  return isAdmin(role) || isDriver(role);
}

export function canViewLoan(role?: UserRole | null) {
  return isAdmin(role) || isDriver(role);
}

export function canViewHelp(role?: UserRole | null) {
  return isAdmin(role) || isDriver(role);
}

export function canCreateOrder(role?: UserRole | null) {
  return isAdmin(role);
}

export function canEditOrder(role?: UserRole | null) {
  return isAdmin(role);
}

export function canDeleteOrder(role?: UserRole | null) {
  return isAdmin(role);
}

export function canAssignDriver(role?: UserRole | null) {
  return isAdmin(role);
}

export function canHandlePayment(role?: UserRole | null) {
  return isAdmin(role);
}

export function canEmitNfe(role?: UserRole | null) {
  return isAdmin(role);
}

export function canViewFinancial(role?: UserRole | null) {
  return isAdmin(role);
}

export function canViewCustomers(role?: UserRole | null) {
  return isAdmin(role);
}

export function canViewProducts(role?: UserRole | null) {
  return isAdmin(role);
}

export function canViewTeam(role?: UserRole | null) {
  return isAdmin(role);
}