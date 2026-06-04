import { colors } from "@/constants/theme";
import {
    HStack,
    Image,
    Rectangle,
    Spacer,
    Text,
    VStack,
    ZStack,
} from "@expo/ui/swift-ui";
import {
    background,
    font,
    foregroundStyle,
    frame,
    padding,
    shapes,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import i18n from "../config/i18n";

export type RoutinesWidgetProps = {
  isPro: boolean;
  currentRoutineName: string | null;
  currentTaskTitle: string;
  allComplete: boolean;
  completedCount: number;
  totalCount: number;
  totalRoutines?: number;
  hasPending?: boolean;
  streak: number;
};
const BG_COLOR = colors.surface;
const ACCENT_COLOR = "#ECF230";
const WHITE = "#FFFFFF";
const WHITE_DIM = "#FFFFFFAA";
const PILL_BG = "#FFFFFFEE";
const PILL_TEXT = "#280D8C";

// ── Small widget ─────────────────────────────────────────────────────────────
function SmallWidget(props: RoutinesWidgetProps) {
  "widget";
  const {
    isPro,
    currentRoutineName,
    currentTaskTitle,
    allComplete,
    completedCount,
    totalCount,
    totalRoutines,
    hasPending,
    streak,
  } = props;
  // Show upsell for non-Pro users only when there are multiple routines
  if (!isPro && (totalRoutines ?? 0) > 1) {
    return (
      <ZStack modifiers={[frame({ maxWidth: 9999, maxHeight: 9999 })]}>
        <Rectangle
          modifiers={[
            background(BG_COLOR),
            frame({ maxWidth: 9999, maxHeight: 9999 }),
          ]}
        />
        <HStack
          spacing={12}
          modifiers={[
            padding({ all: 12 }),
            frame({ maxWidth: 9999, maxHeight: 9999 }),
          ]}
        >
          <Image source={require("../../assets/images/logomain.png")} size={36} />
          <VStack alignment="leading" spacing={4}>
            <Text
              modifiers={[font({ size: 11, weight: "regular" }), foregroundStyle(WHITE)]}
            >
              Para tus rutinas,
            </Text>
            <Text
              modifiers={[font({ size: 13, weight: "bold" }), foregroundStyle(ACCENT_COLOR)]}
            >
              {i18n.t("widgets.pro_line_2")}
            </Text>
          </VStack>
        </HStack>
      </ZStack>
    );
  }

  return (
    <ZStack modifiers={[frame({ maxWidth: 9999, maxHeight: 9999 })]}>
      {/* Fondo */}
      <Rectangle
        modifiers={[
          background(BG_COLOR),
          frame({ maxWidth: 9999, maxHeight: 9999 }),
        ]}
      />

      {/* Contenido */}
      <HStack
        spacing={8}
        modifiers={[padding({ all: 12 }), frame({ maxWidth: 9999, maxHeight: 9999 })]}
      >
        <Image source={require("../../assets/images/logomain.png")} size={36} />
        <VStack
        alignment="leading"
        spacing={4}
        modifiers={[frame({ maxWidth: 9999, maxHeight: 9999 })]}
        >
        {/* Pill de nombre de rutina */}
        <Text
          modifiers={[
            font({ size: 10, weight: "semibold" }),
            foregroundStyle(PILL_TEXT),
            background(PILL_BG, shapes.capsule()),
            padding({ top: 3, bottom: 3, leading: 8, trailing: 8 }),
          ]}
        >
          {currentRoutineName ?? i18n.t("widgets.no_routine")}
        </Text>

        <Spacer />

        {/* Ícono y tarea actual */}
        {allComplete ? (
          <Image
            systemName="checkmark.circle.fill"
            size={28}
            color={ACCENT_COLOR}
          />
        ) : (
          <Image
            systemName="arrow.right.circle.fill"
            size={22}
            color={WHITE_DIM}
          />
        )}
        <Text
          modifiers={[
            font({ size: 13, weight: "bold" }),
            foregroundStyle(allComplete ? ACCENT_COLOR : WHITE),
          ]}
        >
          {allComplete ? i18n.t("widgets.completed") : currentTaskTitle}
        </Text>

        <Spacer />
        {/* Pie: progreso y racha */}
        <HStack>
          <Text modifiers={[font({ size: 10 }), foregroundStyle(WHITE_DIM)]}>
            {completedCount}/{totalCount}
          </Text>
          <Spacer />
          <HStack spacing={2}>
            <Image systemName="flame.fill" size={10} color={ACCENT_COLOR} />
            <Text
              modifiers={[font({ size: 10, weight: "semibold" }), foregroundStyle(ACCENT_COLOR)]}
            >
              {streak}
            </Text>
          </HStack>
        </HStack>
        {/* Pending indicator */}
        {hasPending ? (
          <Text modifiers={[font({ size: 9 }), foregroundStyle(WHITE_DIM)]}>
            {i18n.t("widgets.action_queued")}
          </Text>
        ) : null}
      </VStack>
      </HStack>
    </ZStack>
  );
}

// ── Medium widget ────────────────────────────────────────────────────────────
function MediumWidget(props: RoutinesWidgetProps) {
  "widget";
  const {
    isPro,
    currentRoutineName,
    currentTaskTitle,
    allComplete,
    completedCount,
    totalCount,
    streak,
    hasPending,
  } = props;

  if (!isPro) {
    return (
      <ZStack modifiers={[frame({ maxWidth: 9999, maxHeight: 9999 })]}>
        <Rectangle
          modifiers={[
            background(BG_COLOR),
            frame({ maxWidth: 9999, maxHeight: 9999 }),
          ]}
        />
        <HStack
          spacing={12}
          modifiers={[
            padding({ all: 16 }),
            frame({ maxWidth: 9999, maxHeight: 9999 }),
          ]}
        >
          <Image
            source={require("../../assets/images/logomain.png")}
            size={48}
          />
          <VStack alignment="leading" spacing={4}>
            <Text
              modifiers={[
                font({ size: 14, weight: "bold" }),
                foregroundStyle(WHITE),
              ]}
            >
              {i18n.t("widgets.pro_title")}
            </Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(WHITE_DIM)]}>
              {i18n.t("widgets.enable_pro")}
            </Text>
          </VStack>
        </HStack>
      </ZStack>
    );
  }

  const progressFraction = totalCount > 0 ? completedCount / totalCount : 0;
  const progressPct = Math.round(progressFraction * 100);

  return (
    <ZStack modifiers={[frame({ maxWidth: 9999, maxHeight: 9999 })]}>
      {/* Fondo */}
      <Rectangle
        modifiers={[
          background(BG_COLOR),
          frame({ maxWidth: 9999, maxHeight: 9999 }),
        ]}
      />

      {/* Contenido */}
      <HStack
        modifiers={[
          padding({ all: 14 }),
          frame({ maxWidth: 9999, maxHeight: 9999 }),
        ]}
      >
        {/* Columna izquierda: ícono + racha */}
        <VStack alignment="leading" spacing={8}>
          {allComplete ? (
            <Image
              systemName="checkmark.seal.fill"
              size={40}
              color={ACCENT_COLOR}
            />
          ) : (
            <Image
              systemName="brain.filled.head.profile"
              size={40}
              color={WHITE}
            />
          )}
          <HStack spacing={3}>
            <Image systemName="flame.fill" size={14} color={ACCENT_COLOR} />
            <Text
              modifiers={[
                font({ size: 14, weight: "bold" }),
                foregroundStyle(ACCENT_COLOR),
              ]}
            >
              {streak}
            </Text>
          </HStack>
        </VStack>

        <Spacer />

        {/* Columna derecha: rutina y tarea */}
        <VStack alignment="trailing" spacing={6}>
          <Text
            modifiers={[
              font({ size: 11, weight: "semibold" }),
              foregroundStyle(PILL_TEXT),
              background(PILL_BG, shapes.capsule()),
              padding({ top: 4, bottom: 4, leading: 10, trailing: 10 }),
            ]}
          >
            {currentRoutineName ?? i18n.t("widgets.no_routine")}
          </Text>

          <Spacer />

          <Text
            modifiers={[
              font({ size: 14, weight: "bold" }),
              foregroundStyle(allComplete ? ACCENT_COLOR : WHITE),
            ]}
          >
            {allComplete
              ? i18n.t("widgets.routine_completed")
              : currentTaskTitle}
          </Text>

          <Text modifiers={[font({ size: 11 }), foregroundStyle(WHITE_DIM)]}>
            {i18n.t("widgets.progress", {
              completed: completedCount,
              total: totalCount,
              pct: progressPct,
            })}
          </Text>
        </VStack>
      </HStack>
    </ZStack>
  );
}

// ── Widget principal ─────────────────────────────────────────────────────────
const RoutinesWidgetComponent = (
  props: RoutinesWidgetProps,
  env: WidgetEnvironment,
) => {
  "widget";
  if (env.widgetFamily === "systemMedium") {
    return <MediumWidget {...props} />;
  }
  return <SmallWidget {...props} />;
};

export default createWidget("RoutinesWidget", RoutinesWidgetComponent);
