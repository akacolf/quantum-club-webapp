"use client";

import { useDeviceDetection } from "./deviceDetection";
import { useRegisterAndAuth } from "./registerAndAuth";
import { useSafeArea } from "./safeArea";
import Loader from "../(components)/Loader";

export default function Login() {
  useRegisterAndAuth();
  useSafeArea();
  useDeviceDetection();

  return <Loader />;
}