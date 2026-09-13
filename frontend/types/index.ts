import React from "react";

export type ViewMode = "grid" | "list";

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface ModalState<T = any> {
  isOpen: boolean;
  data?: T;
}

export interface ToastNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  durationMs?: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}
