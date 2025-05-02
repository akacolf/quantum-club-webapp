import { ReactNode } from "react";

export interface TaskHistory {
    id: string;
    quant: number;
    date: string;
    platform: ReactNode;
    title: string;
  }