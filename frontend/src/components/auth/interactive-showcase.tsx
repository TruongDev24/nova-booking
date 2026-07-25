"use client";

import React, { useRef, useEffect, useState } from "react";
import { useLanguage } from "@/context/language-context";

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type AuthFormState = "idle" | "email_focus" | "password_typing" | "submitting" | "success";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  maxLife: number;
  life: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
}

interface InteractiveShowcaseProps {
  formState?: AuthFormState;
  passwordLength?: number;
}

export default function InteractiveShowcase({
  formState = "idle",
  passwordLength = 0,
}: InteractiveShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { locale } = useLanguage();

  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  // Rotating showcase telemetry highlights
  const features = {
    vi: [
      { code: "HAWK-EYE 4K", title: "Quản Lý Lịch Trình Tức Thời", desc: "Đồng bộ trạng thái sân theo thời gian thực qua WebSockets." },
      { code: "REDIS ATOMIC", title: "Chống Đặt Trùng Tuyệt Đối", desc: "Khóa tạm 10 phút bảo vệ slot với độ chính xác cao." },
      { code: "VIETQR PAY", title: "Thanh Toán Tự Động 3s", desc: "Xác nhận Webhook nguyên tử trực tiếp từ PayOS." },
      { code: "ANALYTICS VIP", title: "Báo Cáo Thống Kê Sâu", desc: "Theo dõi tỷ lệ lấp đầy, khung giờ vàng và doanh thu." },
    ],
    en: [
      { code: "HAWK-EYE 4K", title: "Real-time Court Sync", desc: "Instant schedule updates powered by WebSockets." },
      { code: "REDIS ATOMIC", title: "Double-Booking Guard", desc: "10-minute atomic reservation locking mechanism." },
      { code: "VIETQR PAY", title: "3s Instant Auto-Checkout", desc: "Atomic webhook confirmation directly via PayOS." },
      { code: "ANALYTICS VIP", title: "Deep Analytics Control", desc: "Track court occupancy rates, peak hours, and revenue." },
    ],
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % features.vi.length);
    }, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation Loop & Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse & Pointer Tracking
    const pointer = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      active: false,
    };

    // Particle Pool
    const MAX_PARTICLES = 140;
    const particlePool: Particle[] = [];
    let particleCount = 0;

    const spawnParticle = (x: number, y: number, vx: number, vy: number, color: string, size = 2, maxLife = 40) => {
      if (particleCount < MAX_PARTICLES) {
        if (!particlePool[particleCount]) {
          particlePool[particleCount] = { x, y, vx, vy, alpha: 1, size, color, maxLife, life: maxLife };
        } else {
          const p = particlePool[particleCount];
          p.x = x;
          p.y = y;
          p.vx = vx;
          p.vy = vy;
          p.alpha = 1;
          p.size = size;
          p.color = color;
          p.maxLife = maxLife;
          p.life = maxLife;
        }
        particleCount++;
      }
    };

    // Shockwaves Active List
    const shockwaves: Shockwave[] = [];

    const addShockwave = (x: number, y: number, color = "rgba(6, 182, 212, ALPHA)", maxRadius = 160) => {
      shockwaves.push({ x, y, radius: 0, maxRadius, alpha: 1.0, color, speed: 4.5 });
    };

    // Responsive Canvas Resize
    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // 3D Isometric Projection Engine Config
    const scale = 340;
    const cameraDistance = 4.2;

    let time = 0;
    let scanLineZ = -3.2;
    let scanDirection = 1;

    // Court Geometry Bounds
    const W = 1.6;
    const L = 3.2;
    const H = 0.45;

    const courtLines3D: Array<[Point3D, Point3D]> = [
      // Outer Doubles Boundaries
      [{ x: -W, y: 0, z: -L }, { x: W, y: 0, z: -L }],
      [{ x: W, y: 0, z: -L }, { x: W, y: 0, z: L }],
      [{ x: W, y: 0, z: L }, { x: -W, y: 0, z: L }],
      [{ x: -W, y: 0, z: L }, { x: -W, y: 0, z: -L }],

      // Singles Inner Boundaries
      [{ x: -W + 0.18, y: 0, z: -L }, { x: -W + 0.18, y: 0, z: L }],
      [{ x: W - 0.18, y: 0, z: -L }, { x: W - 0.18, y: 0, z: L }],

      // Short Service Lines
      [{ x: -W, y: 0, z: -1.2 }, { x: W, y: 0, z: -1.2 }],
      [{ x: -W, y: 0, z: 1.2 }, { x: W, y: 0, z: 1.2 }],

      // Long Doubles Service Lines
      [{ x: -W, y: 0, z: -2.85 }, { x: W, y: 0, z: -2.85 }],
      [{ x: -W, y: 0, z: 2.85 }, { x: W, y: 0, z: 2.85 }],

      // Center Lines
      [{ x: 0, y: 0, z: -L }, { x: 0, y: 0, z: -1.2 }],
      [{ x: 0, y: 0, z: 1.2 }, { x: 0, y: 0, z: L }],

      // Net Structure
      [{ x: -W, y: 0, z: 0 }, { x: -W, y: H, z: 0 }],
      [{ x: W, y: 0, z: 0 }, { x: W, y: H, z: 0 }],
      [{ x: -W, y: H, z: 0 }, { x: W, y: H, z: 0 }],
      [{ x: -W, y: 0.08, z: 0 }, { x: W, y: 0.08, z: 0 }],
    ];

    for (let xPos = -W + 0.2; xPos < W; xPos += 0.2) {
      courtLines3D.push([{ x: xPos, y: 0.08, z: 0 }, { x: xPos, y: H, z: 0 }]);
    }

    // 3D Projection Math Matrix - Offsets court to left on desktop so right side holds the floating form card
    const project3D = (pt: Point3D, yaw: number, pitch: number): Point2D => {
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = pt.x * cosY - pt.z * sinY;
      const z1 = pt.x * sinY + pt.z * cosY;

      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);
      const y2 = pt.y * cosX - z1 * sinX;
      const z2 = pt.y * sinX + z1 * cosX;

      const denom = z2 + cameraDistance;
      const projScale = scale * (height / 640);

      // On desktop, center court on the left-center (30% width) to balance the inward floating form card
      const centerX = width > 1024 ? width * 0.30 : width * 0.5;

      return {
        x: centerX + (x1 * projScale) / denom,
        y: height * 0.52 - (y2 * projScale) / denom,
      };
    };

    // Calculate Dynamic Hawk-Eye Arc Trajectory
    const getTrajectoryPoint = (t: number, speedMultiplier: number): Point3D => {
      const startX = -1.1;
      const startZ = -2.9;
      const targetX = 0.9;
      const targetZ = 2.4;

      const x = startX + (targetX - startX) * t;
      const z = startZ + (targetZ - startZ) * t;
      const apexH = 1.45 * speedMultiplier;
      const y = Math.sin(t * Math.PI) * apexH;

      return { x, y, z };
    };

    // MAIN RENDER LOOP
    const render = () => {
      time += 0.016;

      pointer.x += (pointer.targetX - pointer.x) * 0.1;
      pointer.y += (pointer.targetY - pointer.y) * 0.1;

      // 1. Deep Cyber Grid Background
      const bgGrad = ctx.createRadialGradient(
        width * 0.35, height * 0.5, 30,
        width / 2, height / 2, Math.max(width, height)
      );
      bgGrad.addColorStop(0, "#0a0e19");
      bgGrad.addColorStop(0.5, "#04060c");
      bgGrad.addColorStop(1, "#020306");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Full-Screen Digital Cyber Grid Backdrop
      ctx.strokeStyle = "rgba(6, 182, 212, 0.035)";
      ctx.lineWidth = 1;
      const gridGap = 44;
      for (let x = 0; x < width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Camera Angles Adjust based on Form State & Hover
      let targetYaw = -0.15 + Math.sin(time * 0.5) * 0.06;
      let targetPitch = 0.54 + Math.cos(time * 0.4) * 0.03;

      if (formState === "email_focus") {
        targetPitch = 0.68;
      } else if (formState === "password_typing") {
        targetYaw += 0.12;
      } else if (formState === "submitting") {
        targetPitch = 0.48;
      }

      // Scanner laser line animation
      scanLineZ += 0.035 * scanDirection;
      if (scanLineZ > L) scanDirection = -1;
      if (scanLineZ < -L) scanDirection = 1;

      // 3. Render Court Wireframe Lines
      courtLines3D.forEach(([p1, p2]) => {
        const proj1 = project3D(p1, targetYaw, targetPitch);
        const proj2 = project3D(p2, targetYaw, targetPitch);

        let closeToCursor = false;
        if (pointer.active) {
          const midX = (proj1.x + proj2.x) / 2;
          const midY = (proj1.y + proj2.y) / 2;
          const dist = Math.hypot(pointer.x - midX, pointer.y - midY);
          if (dist < 70) closeToCursor = true;
        }

        ctx.beginPath();
        ctx.moveTo(proj1.x, proj1.y);
        ctx.lineTo(proj2.x, proj2.y);

        if (closeToCursor) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 12;
        } else if (p1.y > 0) {
          ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = formState === "email_focus"
            ? "rgba(6, 182, 212, 0.55)"
            : "rgba(6, 182, 212, 0.26)";
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      });

      ctx.shadowBlur = 0;

      // 4. Render Tactical Laser Scanner Line
      const scanP1 = project3D({ x: -W, y: 0, z: scanLineZ }, targetYaw, targetPitch);
      const scanP2 = project3D({ x: W, y: 0, z: scanLineZ }, targetYaw, targetPitch);

      const scanGrad = ctx.createLinearGradient(scanP1.x, scanP1.y, scanP2.x, scanP2.y);
      scanGrad.addColorStop(0, "rgba(6, 182, 212, 0)");
      scanGrad.addColorStop(0.5, formState === "email_focus" ? "rgba(6, 182, 212, 0.95)" : "rgba(6, 182, 212, 0.45)");
      scanGrad.addColorStop(1, "rgba(6, 182, 212, 0)");

      ctx.beginPath();
      ctx.moveTo(scanP1.x, scanP1.y);
      ctx.lineTo(scanP2.x, scanP2.y);
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = formState === "email_focus" ? 3.5 : 1.8;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = formState === "email_focus" ? 14 : 5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 5. Draw Hawk-Eye Arc Trajectory Curve
      const speedMultiplier = 1.0 + Math.min(passwordLength * 0.15, 1.2);
      const calculatedSpeedKmH = Math.floor(280 + (time * 20) % 80 + passwordLength * 18);

      ctx.beginPath();
      const trajSteps = 30;
      let impactPoint2D: Point2D | null = null;

      for (let i = 0; i <= trajSteps; i++) {
        const t = i / trajSteps;
        const pt3D = getTrajectoryPoint(t, speedMultiplier);
        const proj2D = project3D(pt3D, targetYaw, targetPitch);

        if (i === 0) ctx.moveTo(proj2D.x, proj2D.y);
        else ctx.lineTo(proj2D.x, proj2D.y);

        if (i === trajSteps) {
          impactPoint2D = proj2D;
        }
      }

      ctx.strokeStyle = formState === "password_typing" ? "rgba(236, 72, 153, 0.9)" : "rgba(99, 102, 241, 0.55)";
      ctx.lineWidth = formState === "password_typing" ? 2.5 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 6. Draw Moving Shuttlecock
      const shuttleT = (time * 0.45) % 1.0;
      const currentShuttle3D = getTrajectoryPoint(shuttleT, speedMultiplier);
      const currentShuttle2D = project3D(currentShuttle3D, targetYaw, targetPitch);

      // Floor Shadow
      const shadow2D = project3D({ ...currentShuttle3D, y: 0 }, targetYaw, targetPitch);
      ctx.beginPath();
      ctx.ellipse(shadow2D.x, shadow2D.y, 12, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fill();

      // Shuttlecock Feather Glow
      ctx.beginPath();
      ctx.arc(currentShuttle2D.x, currentShuttle2D.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = formState === "password_typing" ? "#ec4899" : "#06b6d4";
      ctx.shadowColor = formState === "password_typing" ? "#ec4899" : "#06b6d4";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spawn trail particles
      if (Math.random() < 0.65) {
        spawnParticle(
          currentShuttle2D.x,
          currentShuttle2D.y,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5 + 1.0,
          formState === "password_typing" ? "#ec4899" : "#06b6d4",
          Math.random() * 2.5 + 1,
          35
        );
      }

      // Ambient background particles drifting across full canvas
      if (Math.random() < 0.25) {
        spawnParticle(
          Math.random() * width,
          Math.random() * height,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          "rgba(6, 182, 212, 0.4)",
          Math.random() * 2 + 0.8,
          60
        );
      }

      // 7. Interactive Hawk-Eye Impact Target Node & Hologram Widget
      if (impactPoint2D) {
        // A. Floor Target Zone Box (Isometric Ground Footprint)
        const groundPt3D = getTrajectoryPoint(1.0, speedMultiplier);
        const floorCenter = project3D({ ...groundPt3D, y: 0 }, targetYaw, targetPitch);

        ctx.beginPath();
        ctx.ellipse(floorCenter.x, floorCenter.y, 24, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = formState === "password_typing" ? "rgba(236, 72, 153, 0.15)" : "rgba(6, 182, 212, 0.12)";
        ctx.fill();
        ctx.strokeStyle = formState === "password_typing" ? "rgba(236, 72, 153, 0.65)" : "rgba(6, 182, 212, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // B. Pulsating Crosshair Radar Target Rings
        const reticleR = 16 + Math.sin(time * 5) * 3;
        ctx.beginPath();
        ctx.arc(impactPoint2D.x, impactPoint2D.y, reticleR, 0, Math.PI * 2);
        ctx.strokeStyle = formState === "password_typing" ? "#ec4899" : "#06b6d4";
        ctx.lineWidth = 2;
        ctx.shadowColor = formState === "password_typing" ? "#ec4899" : "#06b6d4";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Rotational Radar Ticks
        const angleOffset = time * 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
          const tickX1 = impactPoint2D.x + Math.cos(a + angleOffset) * (reticleR - 3);
          const tickY1 = impactPoint2D.y + Math.sin(a + angleOffset) * (reticleR - 3);
          const tickX2 = impactPoint2D.x + Math.cos(a + angleOffset) * (reticleR + 5);
          const tickY2 = impactPoint2D.y + Math.sin(a + angleOffset) * (reticleR + 5);

          ctx.beginPath();
          ctx.moveTo(tickX1, tickY1);
          ctx.lineTo(tickX2, tickY2);
          ctx.strokeStyle = formState === "password_typing" ? "#ec4899" : "#06b6d4";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // C. Premium Cyberpunk Holographic Speedometer HUD Panel
        const cardX = impactPoint2D.x + 24;
        const cardY = impactPoint2D.y - 38;
        const cardW = 156;
        const cardH = 58;

        // Background Glass Card
        ctx.fillStyle = "rgba(4, 6, 16, 0.92)";
        ctx.strokeStyle = formState === "password_typing" ? "rgba(236, 72, 153, 0.7)" : "rgba(6, 182, 212, 0.6)";
        ctx.lineWidth = 1.2;
        ctx.shadowColor = formState === "password_typing" ? "rgba(236, 72, 153, 0.35)" : "rgba(6, 182, 212, 0.35)";
        ctx.shadowBlur = 14;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(cardX, cardY, cardW, cardH, 10);
        } else {
          ctx.rect(cardX, cardY, cardW, cardH);
        }
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Top Title Tag
        ctx.fillStyle = formState === "password_typing" ? "#ec4899" : "#06b6d4";
        ctx.font = "900 9px monospace";
        ctx.fillText(formState === "password_typing" ? "⚡ POWER SMASH LOCK" : "🎯 HAWK-EYE TELEMETRY", cardX + 10, cardY + 16);

        // Speed Number Value + Unit Tag
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 13px monospace";
        ctx.fillText(`${calculatedSpeedKmH}`, cardX + 10, cardY + 34);
        ctx.fillStyle = formState === "password_typing" ? "#ec4899" : "#06b6d4";
        ctx.font = "bold 9px monospace";
        ctx.fillText("KM/H", cardX + 48 + (calculatedSpeedKmH > 350 ? 8 : 0), cardY + 34);

        // Accuracy Indicator Tag
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "9px monospace";
        ctx.fillText("IN: 99.8%", cardX + cardW - 55, cardY + 34);

        // Visual Speedometer Progress Gauge Bar
        const barX = cardX + 10;
        const barY = cardY + 43;
        const barW = 136;
        const barH = 5;

        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(barX, barY, barW, barH, 2);
        } else {
          ctx.rect(barX, barY, barW, barH);
        }
        ctx.fill();

        const speedPercent = Math.min(calculatedSpeedKmH / 500, 1.0);
        const fillW = Math.max(barW * speedPercent, 6);
        const gaugeGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        gaugeGrad.addColorStop(0, "#06b6d4");
        gaugeGrad.addColorStop(0.7, "#6366f1");
        gaugeGrad.addColorStop(1, "#ec4899");

        ctx.fillStyle = gaugeGrad;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(barX, barY, fillW, barH, 2);
        } else {
          ctx.rect(barX, barY, fillW, barH);
        }
        ctx.fill();

        // Connector Line from Target Reticle to Hologram Card
        ctx.beginPath();
        ctx.moveTo(impactPoint2D.x + reticleR, impactPoint2D.y - 2);
        ctx.lineTo(cardX, cardY + cardH / 2);
        ctx.strokeStyle = formState === "password_typing" ? "rgba(236, 72, 153, 0.5)" : "rgba(6, 182, 212, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 8. Process Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        sw.alpha -= 0.022;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color.replace("ALPHA", String(sw.alpha));
        ctx.lineWidth = 2;
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 12 * sw.alpha;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 9. Update & Draw Particle Pool
      for (let i = 0; i < particleCount; i++) {
        const p = particlePool[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;

        if (p.life <= 0) {
          particlePool[i] = particlePool[particleCount - 1];
          particleCount--;
          i--;
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(render);
    };

    render();

    // Mouse Listeners
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = e.clientX - rect.left;
      pointer.targetY = e.clientY - rect.top;
      pointer.active = true;
    };

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      addShockwave(clickX, clickY, "rgba(6, 182, 212, ALPHA)", 180);

      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 3.5 + 1.5;
        spawnParticle(
          clickX,
          clickY,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          i % 2 === 0 ? "#06b6d4" : "#6366f1",
          Math.random() * 3 + 1,
          45
        );
      }
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      cancelAnimationFrame(animId);
    };
  }, [formState, passwordLength]);

  const activeFeatures = locale === "vi" ? features.vi : features.en;

  return (
    <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block cursor-crosshair" />

      {/* Top Left Floating HUD Telemetry Badge */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none flex items-center gap-3">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-full border border-cyan-500/30 text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest shadow-xl">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          HAWK-EYE TELEMETRY v2.4 // ONLINE
        </div>
      </div>

      {/* Bottom Feature Presentation Card (Left Side) */}
      <div className="hidden lg:block absolute bottom-10 left-8 z-10 pointer-events-none w-full max-w-sm xl:max-w-md">
        <div className="bg-slate-950/85 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-transparent"></div>

          <div className="min-h-[95px] flex flex-col justify-center">
            {activeFeatures.map((feat, idx) => (
              <div
                key={idx}
                className={`transition-all duration-700 space-y-1.5 absolute pr-4 ${
                  idx === activeFeatureIndex
                    ? "opacity-100 translate-y-0 relative"
                    : "opacity-0 -translate-y-4 pointer-events-none hidden"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {feat.code}
                  </span>
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  {feat.title}
                </h3>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            {activeFeatures.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === activeFeatureIndex ? "w-7 bg-cyan-400" : "w-2 bg-slate-800"
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle vignette border gradient */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
}
