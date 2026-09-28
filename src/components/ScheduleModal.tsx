import { PRIMARY_GRADIENT_COLORS } from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarClock, Clock, X } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recurrenceType: "once" | "daily" | "weekly";
  setRecurrenceType: (type: "once" | "daily" | "weekly") => void;
  selectedDays: number[];
  setSelectedDays: (
    updater: number[] | ((prev: number[]) => number[]),
  ) => void;
  scheduledTime: Date | null;
  setScheduledTime: (time: Date | null) => void;
  showTimePicker: boolean;
  setShowTimePicker: (show: boolean) => void;
  reminderEnabled: boolean;
  setReminderEnabled: (enabled: boolean) => void;
  reminderTime: number;
  setReminderTime: (time: number) => void;
}

export function ScheduleModal({
  visible,
  onClose,
  onConfirm,
  recurrenceType,
  setRecurrenceType,
  selectedDays,
  setSelectedDays,
  scheduledTime,
  setScheduledTime,
  showTimePicker,
  setShowTimePicker,
  reminderEnabled,
  setReminderEnabled,
  reminderTime,
  setReminderTime,
}: ScheduleModalProps) {
  const { t } = useTranslation();

  const dayLabels = t("index_tab.schedule.day_short", { returnObjects: true }) as string[];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <CalendarClock size={22} color={colors.primary} />
              <Text style={styles.modalTitle}>
                {t("index_tab.schedule.title")}
              </Text>
            </View>
            <Pressable style={styles.modalCloseButton} onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>
              {t("index_tab.schedule.frequency")}
            </Text>
            <View style={styles.frequencyChips}>
              <Pressable
                style={[
                  styles.chip,
                  recurrenceType === "once" && styles.chipActive,
                ]}
                onPress={() => setRecurrenceType("once")}
              >
                <Text
                  style={[
                    styles.chipText,
                    recurrenceType === "once" && styles.chipTextActive,
                  ]}
                >
                  {t("index_tab.schedule.once")}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  recurrenceType === "daily" && styles.chipActive,
                ]}
                onPress={() => setRecurrenceType("daily")}
              >
                <Text
                  style={[
                    styles.chipText,
                    recurrenceType === "daily" && styles.chipTextActive,
                  ]}
                >
                  {t("index_tab.schedule.daily")}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  recurrenceType === "weekly" && styles.chipActive,
                ]}
                onPress={() => setRecurrenceType("weekly")}
              >
                <Text
                  style={[
                    styles.chipText,
                    recurrenceType === "weekly" && styles.chipTextActive,
                  ]}
                >
                  {t("index_tab.schedule.weekly")}
                </Text>
              </Pressable>
            </View>

            {recurrenceType === "weekly" && (
              <>
                <Text style={styles.sectionLabel}>
                  {t("index_tab.schedule.days")}
                </Text>
                <View style={styles.daySelector}>
                  {dayLabels.map((day, index) => (
                    <Pressable
                      key={index}
                      style={[
                        styles.dayChip,
                        selectedDays.includes(index) && styles.dayChipActive,
                      ]}
                      onPress={() => {
                        setSelectedDays((prev) =>
                          prev.includes(index)
                            ? prev.filter((d) => d !== index)
                            : [...prev, index].sort(),
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          selectedDays.includes(index) &&
                            styles.dayChipTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionLabel}>
              {t("index_tab.schedule.time_optional")}
            </Text>
            <Pressable
              style={styles.timePickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={20} color={colors.textSecondary} />
              <Text style={styles.timePickerText}>
                {scheduledTime
                  ? `${String(scheduledTime.getHours()).padStart(2, "0")}:${String(scheduledTime.getMinutes()).padStart(2, "0")}`
                  : t("index_tab.schedule.select_time")}
              </Text>
              {scheduledTime && (
                <Pressable
                  onPress={() => {
                    setScheduledTime(null);
                    setReminderEnabled(false);
                  }}
                  hitSlop={8}
                >
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              )}
            </Pressable>

            {showTimePicker && (
              <DateTimePicker
                value={scheduledTime || new Date()}
                mode="time"
                is24Hour={true}
                themeVariant="dark"
                onChange={(event, selectedDate) => {
                  setShowTimePicker(false);
                  if (selectedDate) {
                    setScheduledTime(selectedDate);
                  }
                }}
              />
            )}

            {scheduledTime && (
              <View style={styles.reminderSection}>
                <View style={styles.reminderToggle}>
                  <Text style={styles.sectionLabel}>
                    {t("index_tab.schedule.reminder")}
                  </Text>
                  <Switch
                    value={reminderEnabled}
                    onValueChange={setReminderEnabled}
                    trackColor={{
                      false: "rgba(255,255,255,0.15)",
                      true: colors.primary,
                    }}
                    thumbColor={"#FFFFFF"}
                  />
                </View>
                {reminderEnabled && (
                  <View style={styles.reminderOptions}>
                    {[5, 15, 30, 60].map((mins) => (
                      <Pressable
                        key={mins}
                        style={[
                          styles.chip,
                          reminderTime === mins && styles.chipActive,
                        ]}
                        onPress={() => setReminderTime(mins)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            reminderTime === mins && styles.chipTextActive,
                          ]}
                        >
                          {t("index_tab.schedule.minutes_before", {
                            count: mins,
                          })}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.modalButton} onPress={onConfirm}>
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>
                  {t("index_tab.schedule.confirm")}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  } as any,
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
  } as any,
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  } as any,
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  } as any,
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  } as any,
  modalCloseButton: {
    padding: 3,
  } as any,
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  } as any,
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  } as any,
  modalButton: {
    borderRadius: 32,
    overflow: "hidden",
  } as any,
  modalButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  } as any,
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 0.3,
  } as any,
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  } as any,
  frequencyChips: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 20,
  } as any,
  chip: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  } as any,
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  } as any,
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  } as any,
  chipTextActive: {
    color: "#1E1E2E",
    fontWeight: "700",
  } as any,
  daySelector: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 20,
  } as any,
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  } as any,
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  } as any,
  dayChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  } as any,
  dayChipTextActive: {
    color: "#1E1E2E",
    fontWeight: "700",
  } as any,
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
    marginBottom: 16,
  } as any,
  timePickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  } as any,
  reminderSection: {
    marginTop: 4,
  } as any,
  reminderToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  } as any,
  reminderOptions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  } as any,
});
