"use client";
import { useDeviceDetection } from "../hooks/deviceDetection";
import { useRegisterAndAuth } from "../hooks/registerAndAuth";
import { useSafeArea } from "../hooks/safeArea";
import Loader from "../../components/MainLoader";

export default function LoginClient() {
  useRegisterAndAuth();
  useSafeArea();
  useDeviceDetection();

  return <Loader />;
}