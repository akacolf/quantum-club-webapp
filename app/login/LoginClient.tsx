"use client";

import { useDeviceDetection } from "./deviceDetection";
import { useRegisterAndAuth } from "./registerAndAuth";
import { useSafeArea } from "./safeArea";
import Loader from "../components/MainLoader";

export default function LoginClient() {
  useRegisterAndAuth();
  useSafeArea();
  useDeviceDetection();

  return <Loader />;
}