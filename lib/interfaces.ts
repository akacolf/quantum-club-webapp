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

export interface EarnTask {
  id: string;
  description:string | React.ReactNode;
  completed:boolean;
  category:string;
  platform:React.ReactNode;
  buttontitle:string;
  buttonText:React.ReactNode|string;
  url:string |undefined;
  quant:number;
  whichPlatform:string;
  timestamp:number;
}
