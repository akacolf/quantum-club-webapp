import { ReactNode } from "react";

export interface TaskHistory {
    id: string;
    quant: number;
    date: string;
    platform: ReactNode;
    title: string;
  }

export interface Referral {
    id: string;
    username: string;
    quantamount:number;
}