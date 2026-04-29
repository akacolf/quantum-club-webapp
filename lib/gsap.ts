"use client";

/**
 * Central GSAP setup — import from here to get a pre-configured gsap instance.
 *
 * Following the official GSAP docs pattern:
 * https://gsap.com/docs/v3/Installation
 * https://gsap.com/resources/React/
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };
