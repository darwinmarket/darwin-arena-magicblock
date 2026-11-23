"use client";

// Le fond animé du hero de app.darwin.market (darwinmarket/darwin-app-mainnet,
// src/components/darwin/Hero.module.css + HeroShaderCanvas), étendu en plein écran.
// Couches : dégradé or de repli (affiché tant que le shader WebGPU n'a pas peint, ou s'il est
// indisponible) -> shader "sunset" -> voile sombre à gauche pour la lisibilité du texte.
import { useEffect, useState } from "react";
import { HeroShader } from "./HeroShader";

export function HeroBackground() {
  const [ready, setReady] = useState(false);

  // Le canvas pose data-ready quand il a peint : on s'en sert pour le fondu d'entrée.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.querySelector("[data-hero-shader][data-ready]")) {
        setReady(true);
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(100% 55% at 0 100%, #8f3a0c 0%, #a85e22 28%, #b8803c 48%, #c49a55 72%)" }}
      />
      <HeroShader
        className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${ready ? "opacity-100" : "opacity-0"}`}
        palette="sunset"
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #4a1c0747, #4a1c0708 62%)" }} />
    </div>
  );
}
