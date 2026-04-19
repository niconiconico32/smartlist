import React from "react";
import { Image } from "react-native";
import {
  FlexWidget,
  ImageWidget,
  OverlapWidget,
  TextWidget,
} from "react-native-android-widget";
import type { Routine } from "../types/routine";

// Static outfit image map — require() must be static, cannot be dynamic
const WIDGET_OUTFIT_IMAGES: Record<string, number> = {
  outfit_1_1: require("../../assets/images/outfits/1_1.png"),
  outfit_1_2: require("../../assets/images/outfits/1_2.png"),
  outfit_1_3: require("../../assets/images/outfits/1_3.png"),
  outfit_1_4: require("../../assets/images/outfits/1_4.png"),
  outfit_w5: require("../../assets/images/outfits/5.webp"),
  outfit_w6: require("../../assets/images/outfits/6.webp"),
  outfit_w7: require("../../assets/images/outfits/7.webp"),
  outfit_w8: require("../../assets/images/outfits/8.webp"),
  outfit_w9: require("../../assets/images/outfits/9.webp"),
  outfit_w10: require("../../assets/images/outfits/10.webp"),
  outfit_w11: require("../../assets/images/outfits/11.webp"),
  outfit_w12: require("../../assets/images/outfits/12.webp"),
  outfit_w13: require("../../assets/images/outfits/13.webp"),
  outfit_w14: require("../../assets/images/outfits/14.webp"),
};
const WIDGET_DEFAULT_OUTFIT: number = require("../../assets/images/logomain.png");

// Default background — matches the home screen (FocusHeroCard)
const WIDGET_DEFAULT_BG: number = require("../../assets/images/pixelbgs/spring.png");

// Static background image map — mirrors FocusHeroCard's BG_IMAGES
const WIDGET_BG_IMAGES: Record<string, number> = {
  bg_spring: require("../../assets/images/pixelbgs/spring.png"),
  bg_beach: require("../../assets/images/pixelbgs/beach.png"),
  bg_autumn: require("../../assets/images/pixelbgs/autumm.png"),
  bg_winter: require("../../assets/images/pixelbgs/winter.png"),
  bg_woods: require("../../assets/images/pixelbgs/woods.png"),
  bg_w1: require("../../assets/images/pixelbgs/1.webp"),
  bg_w2: require("../../assets/images/pixelbgs/2.webp"),
  bg_w3: require("../../assets/images/pixelbgs/3.webp"),
  bg_w4: require("../../assets/images/pixelbgs/4.webp"),
  bg_w5: require("../../assets/images/pixelbgs/5.webp"),
  bg_w6: require("../../assets/images/pixelbgs/6.webp"),
  bg_w7: require("../../assets/images/pixelbgs/7.webp"),
  bg_w8: require("../../assets/images/pixelbgs/8.webp"),
  bg_w9: require("../../assets/images/pixelbgs/9.webp"),
  bg_w10: require("../../assets/images/pixelbgs/10.webp"),
};

export type BgMode = "user" | "solid" | "surface";

// Colors — rgba() strings work: the library converts them to #AARRGGBB
const C = {
  primary: "#ECF230",
  textPrimary: "#FAF9F6",
  textTertiary: "#9399B2",
  accent: "#CBA6F7",
  glassBorder: "rgba(203, 166, 247, 0.22)",
  cardBg: "rgba(203, 166, 247, 0.12)",
  cardBorder: "rgba(203, 166, 247, 0.20)",
  btnActive: "rgba(203, 166, 247, 0.28)",
  btnInactive: "rgba(203, 166, 247, 0.08)",
  avatarBg: "rgba(203, 166, 247, 0.15)",
  avatarBorder: "rgba(203, 166, 247, 0.30)",
  dimmedText: "rgba(250, 249, 246, 0.60)",
  inactiveArrow: "rgba(203, 166, 247, 0.30)",
};

// Gradients that approximate each background's color scheme
const BG_GRADIENTS: Record<string, { from: string; to: string }> = {
  bg_spring: { from: "#14532D", to: "#166534" },
  bg_beach: { from: "#0C4A6E", to: "#075985" },
  bg_autumn: { from: "#7C2D12", to: "#9A3412" },
  bg_winter: { from: "#1E3A5F", to: "#1E40AF" },
  bg_woods: { from: "#14532D", to: "#15803D" },
  bg_w1: { from: "#280D8C", to: "#3730A3" },
  bg_w2: { from: "#1E1B4B", to: "#312E81" },
  bg_w3: { from: "#0F172A", to: "#1E3A5F" },
  bg_w4: { from: "#3B0764", to: "#6B21A8" },
  bg_w5: { from: "#0F172A", to: "#1A365D" },
  bg_w6: { from: "#1A1A2E", to: "#16213E" },
  bg_w7: { from: "#064E3B", to: "#065F46" },
  bg_w8: { from: "#450A0A", to: "#7F1D1D" },
  bg_w9: { from: "#27272A", to: "#3F3F46" },
  bg_w10: { from: "#0C0A09", to: "#1C1917" },
};
const DEFAULT_GRADIENT = { from: "#280D8C", to: "#3730A3" };

function resolveGradient(bgId: string | null, bgMode: BgMode) {
  if (bgMode === "solid") return { from: "#280D8C", to: "#280D8C" };
  if (bgMode === "surface") return { from: "#7663F2", to: "#5B4FD4" };
  return bgId && BG_GRADIENTS[bgId] ? BG_GRADIENTS[bgId] : DEFAULT_GRADIENT;
}

interface RoutinesWidgetProps {
  currentRoutine: Routine | null;
  currentIndex: number;
  totalRoutines: number;
  taskVisibleIndex: number;
  outfitId?: string | null;
  bgMode: BgMode;
  bgId?: string | null;
  earnedCoins?: number | null;
  isPro?: boolean;
}

export function RoutinesWidget({
  currentRoutine,
  currentIndex,
  totalRoutines,
  taskVisibleIndex,
  outfitId,
  bgMode,
  bgId,
  earnedCoins,
  isPro = false,
}: RoutinesWidgetProps) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalRoutines - 1;
  const gradient = resolveGradient(bgId || null, bgMode);

  // Resolve background image:
  // - "user" mode with a valid purchased bgId → use that bg
  // - "user" mode without bgId (no purchase) → use default spring.png
  // - "solid" / "surface" modes → gradient only, no image
  const hasPurchasedBg = bgMode === "user" && !!bgId && !!WIDGET_BG_IMAGES[bgId];
  const useDefaultBg = bgMode === "user" && !hasPurchasedBg;
  const bgImageSource = hasPurchasedBg
    ? WIDGET_BG_IMAGES[bgId!]
    : useDefaultBg
      ? WIDGET_DEFAULT_BG
      : null;

  // Background image: use centerCrop scaleType (patched native) so the image
  // fills the widget completely, cropping any overflow. We decode the bitmap
  // at ~320dp wide preserving aspect ratio — centerCrop handles the rest.
  const BG_DECODE_WIDTH = 320;
  let bgRenderWidth = BG_DECODE_WIDTH;
  let bgRenderHeight = BG_DECODE_WIDTH; // fallback square
  if (bgImageSource) {
    const asset = Image.resolveAssetSource(bgImageSource);
    if (asset?.width && asset?.height && asset.width > 0 && asset.height > 0) {
      bgRenderHeight = Math.round(
        BG_DECODE_WIDTH * (asset.height / asset.width),
      );
    }
  }

  // ── Avatar (compact for 4×1) ─────────────────────────────────────────────
  const outfitSource =
    outfitId && WIDGET_OUTFIT_IMAGES[outfitId]
      ? WIDGET_OUTFIT_IMAGES[outfitId]
      : WIDGET_DEFAULT_OUTFIT;
  const avatarEl = (
    <ImageWidget image={outfitSource} imageWidth={88} imageHeight={88} />
  );

  // ── Pro gate ─────────────────────────────────────────────────────────────
  if (!isPro) {
    return (
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          borderRadius: 16,
          overflow: "hidden",
          backgroundGradient: {
            from: "#280D8C",
            to: "#3730A3",
            orientation: "LEFT_RIGHT",
          },
          borderWidth: 1,
          borderColor: C.glassBorder,
          paddingHorizontal: 14,
          paddingVertical: 8,
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        {avatarEl}
        <FlexWidget
          style={{ flex: 1, flexDirection: "column", marginLeft: 8 }}
        >
          <TextWidget
            text="✨ Únete a PRO"
            maxLines={1}
            style={{ fontSize: 14, color: C.primary, fontWeight: "800" }}
          />
          <TextWidget
            text="para mostrar tus rutinas acá"
            maxLines={1}
            style={{
              fontSize: 12,
              color: C.dimmedText,
              fontWeight: "400",
              marginTop: 2,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!currentRoutine || totalRoutines === 0) {
    return (
      <OverlapWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {bgImageSource ? (
          <ImageWidget
            image={bgImageSource}
            imageWidth={bgRenderWidth}
            imageHeight={bgRenderHeight}
            scaleType="centerCrop"
            style={{ width: "match_parent", height: "match_parent" }}
          />
        ) : (
          <FlexWidget
            style={{
              width: "match_parent",
              height: "match_parent",
              backgroundGradient: { ...gradient, orientation: "LEFT_RIGHT" },
            }}
          />
        )}
        {bgImageSource ? (
          <FlexWidget
            style={{
              width: "match_parent",
              height: "match_parent",
              backgroundColor: "rgba(0, 0, 0, 0.15)",
            }}
          />
        ) : null}
        <FlexWidget
          style={{
            height: "match_parent",
            width: "match_parent",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(203, 166, 247, 0.20)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          {avatarEl}
          <FlexWidget
            style={{ flex: 1, flexDirection: "column", marginLeft: 8 }}
          >
            <TextWidget
              text="¡No tienes rutinas hoy!"
              maxLines={1}
              style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "800" }}
            />
            <TextWidget
              text="Las rutinas que crees en la app aparecerán aquí"
              maxLines={2}
              style={{
                fontSize: 12,
                color: "#FFFFFF",
                marginTop: 2,
                fontWeight: "300",
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </OverlapWidget>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const tasks = currentRoutine.tasks;
  const firstUncompletedIdx = tasks.findIndex((t) => !t.completed);
  const safeTaskIdx =
    firstUncompletedIdx >= 0
      ? firstUncompletedIdx
      : Math.max(0, tasks.length - 1);
  const currentTask = tasks.length > 0 ? tasks[safeTaskIdx] : null;
  const completedCount = tasks.filter((t) => t.completed).length;
  const allComplete = tasks.length > 0 && tasks.every((t) => t.completed);
  const progressLabel = `${completedCount}/${tasks.length}`;

  // ── Main layout: [Avatar] [Name + Task] [›] ─────────────────────────────
  return (
    <OverlapWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {bgImageSource ? (
        <ImageWidget
          image={bgImageSource}
          imageWidth={bgRenderWidth}
          imageHeight={bgRenderHeight}
          scaleType="centerCrop"
          style={{ width: "match_parent", height: "match_parent" }}
        />
      ) : (
        <FlexWidget
          style={{
            width: "match_parent",
            height: "match_parent",
            backgroundGradient: { ...gradient, orientation: "LEFT_RIGHT" },
          }}
        />
      )}
      {bgImageSource ? (
        <FlexWidget
          style={{
            width: "match_parent",
            height: "match_parent",
            backgroundColor: "rgba(0, 0, 0, 0.25)",
          }}
        />
      ) : null}
      {/* › Next routine button — top-right corner */}
      {totalRoutines > 1 ? (
        <FlexWidget
          style={{
            width: "match_parent",
            height: "match_parent",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            paddingTop: 6,
            paddingRight: 8,
          }}
        >
          <FlexWidget
            clickAction="NEXT_ROUTINE"
            style={{
              width: 28,
              height: 28,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TextWidget
              text="›"
              style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "bold" }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : null}
      {/* Content: column layout (main row + progress bar) */}
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.glassBorder,
          flexDirection: "column",
          paddingHorizontal: 10,
          paddingTop: 6,
          paddingBottom: 5,
        }}
      >
        {/* Hint — only when no tasks completed yet */}
        {completedCount === 0 && !allComplete && tasks.length > 0 ? (
          <TextWidget
            text="Toca el nombre de la tarea para completar"
            maxLines={1}
            style={{ fontSize: 8, color: C.dimmedText }}
          />
        ) : null}
        {/* Main info row */}
        <FlexWidget
          style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
        >
          {/* Avatar — left */}
          {avatarEl}

          {/* Center column: routine name label + task row */}
          <FlexWidget
            style={{ flex: 1, flexDirection: "column", marginLeft: 8 }}
          >
            {/* Routine name + task progress dots */}
            <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
              <TextWidget
                text={currentRoutine.name}
                maxLines={1}
                truncate="END"
                style={{
                  fontSize: 9,
                  color: "#280D8C",
                  backgroundColor: "#ECF0ED",
                  paddingHorizontal: 4,
                  borderRadius: 16,
                }}
              />
              {/* Task progress dots */}
              <FlexWidget
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 5,
                }}
              >
                {tasks.slice(0, 8).map((t, i) => (
                  <FlexWidget
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      borderWidth: 1,
                      borderColor: "#ECF0ED",
                      backgroundColor: t.completed ? "#ECF0ED" : "#00000000",
                      marginRight: 3,
                    }}
                  />
                ))}
              </FlexWidget>
            </FlexWidget>

            {/* Task row */}
            {allComplete ? (
              <FlexWidget
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <TextWidget
                  text="¡Completada!"
                  maxLines={1}
                  truncate="END"
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: C.textPrimary,
                  }}
                />
              </FlexWidget>
            ) : currentTask ? (
              <FlexWidget
                clickAction="TOGGLE_TASK"
                clickActionData={{
                  taskId: currentTask.id,
                  routineId: currentRoutine.id,
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <TextWidget
                  text={currentTask.title}
                  maxLines={1}
                  truncate="END"
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: C.textPrimary,
                  }}
                />
              </FlexWidget>
            ) : (
              <TextWidget
                text="Sin tareas"
                style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}
              />
            )}
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
