import DateTimePicker from "@react-native-community/datetimepicker";
import { type PropsWithChildren, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function LabelledInput({
  label,
  multiline,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          error ? styles.inputError : null,
        ]}
        multiline={multiline}
        placeholderTextColor="#7c7068"
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function parseDateValue(value: string | undefined, mode: "date" | "datetime") {
  if (!value) return new Date();

  const parsed =
    mode === "date"
      ? new Date(`${value}T12:00:00`)
      : new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateFieldValue(date: Date, mode: "date" | "datetime"): string {
  if (mode === "date") {
    return [
      date.getFullYear(),
      padDatePart(date.getMonth() + 1),
      padDatePart(date.getDate()),
    ].join("-");
  }

  return `${toDateFieldValue(date, "date")}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatDateFieldLabel(value: string | undefined, mode: "date" | "datetime", placeholder: string) {
  if (!value) return placeholder;

  const parsed = parseDateValue(value, mode);
  if (mode === "date") {
    return new Intl.DateTimeFormat("es-EC", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function DateField({
  label,
  value,
  onChange,
  mode = "date",
  placeholder,
  error,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  mode?: "date" | "datetime";
  placeholder?: string;
  error?: string;
}) {
  const fallbackPlaceholder = mode === "date" ? "Seleccionar fecha" : "Seleccionar fecha y hora";
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateValue(value, mode));

  const currentDate = useMemo(() => parseDateValue(value, mode), [mode, value]);
  const displayValue = formatDateFieldLabel(value, mode, placeholder ?? fallbackPlaceholder);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.input, styles.dateFieldTrigger, error ? styles.inputError : null]}
        onPress={() => {
          setDraftDate(currentDate);
          setOpen((current) => !current);
        }}
      >
        <Text style={value ? styles.dateFieldValue : styles.dateFieldPlaceholder}>{displayValue}</Text>
      </Pressable>
      {open ? (
        <View style={styles.dateFieldPanel}>
          <DateTimePicker
            value={draftDate}
            mode={mode}
            display={Platform.OS === "ios" ? (mode === "date" ? "inline" : "spinner") : "default"}
            onChange={(event, nextDate) => {
              if (Platform.OS === "android") {
                setOpen(false);
                if (event.type === "set" && nextDate) {
                  onChange(toDateFieldValue(nextDate, mode));
                }
                return;
              }

              if (nextDate) {
                setDraftDate(nextDate);
              }
            }}
          />
          {Platform.OS === "ios" ? (
            <View style={styles.dateFieldActions}>
              <Pressable
                style={styles.dateFieldSecondaryAction}
                onPress={() => {
                  setDraftDate(currentDate);
                  setOpen(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.dateFieldPrimaryAction}
                onPress={() => {
                  onChange(toDateFieldValue(draftDate, mode));
                  setOpen(false);
                }}
              >
                <Text style={styles.buttonText}>Aplicar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.infoPanel}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.subtitle}>{body}</Text>
    </View>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}) {
  return (
    <View
      style={[
        styles.statusBadge,
        tone === "info" ? styles.statusBadgeInfo : null,
        tone === "success" ? styles.statusBadgeSuccess : null,
        tone === "warning" ? styles.statusBadgeWarning : null,
        tone === "danger" ? styles.statusBadgeDanger : null,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          tone === "info" ? styles.statusBadgeTextInfo : null,
          tone === "success" ? styles.statusBadgeTextSuccess : null,
          tone === "warning" ? styles.statusBadgeTextWarning : null,
          tone === "danger" ? styles.statusBadgeTextDanger : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choiceChip, selected ? styles.choiceChipActive : null]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.choiceChipText,
          selected ? styles.choiceChipTextActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.secondaryButton, disabled ? styles.buttonDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2ecdf" },
  screenContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 132,
    gap: 18,
  },
  card: {
    backgroundColor: "rgba(255, 250, 244, 0.96)",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.08)",
    gap: 14,
    shadowColor: "#2b231d",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeader: { gap: 6, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "800", color: "#201812", letterSpacing: -0.4 },
  subtitle: { color: "#6d635b", lineHeight: 21, fontSize: 14 },
  field: { gap: 8 },
  label: { fontSize: 13, color: "#6d635b", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.12)",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#201812",
  },
  dateFieldTrigger: {
    justifyContent: "center",
    minHeight: 48,
  },
  dateFieldValue: {
    color: "#201812",
  },
  dateFieldPlaceholder: {
    color: "#7c7068",
  },
  dateFieldPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.08)",
    backgroundColor: "rgba(255,255,255,0.98)",
    padding: 12,
    gap: 12,
  },
  dateFieldActions: {
    flexDirection: "row",
    gap: 10,
  },
  dateFieldPrimaryAction: {
    flex: 1,
    backgroundColor: "#156669",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  dateFieldSecondaryAction: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(32, 24, 18, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.08)",
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  inputError: {
    borderColor: "rgba(166, 61, 61, 0.45)",
  },
  errorText: {
    color: "#a63d3d",
    fontSize: 12,
    lineHeight: 16,
  },
  infoPanel: {
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(21, 102, 105, 0.14)",
    backgroundColor: "rgba(21, 102, 105, 0.08)",
    gap: 6,
  },
  infoTitle: { fontWeight: "700", color: "#184d50" },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(32, 24, 18, 0.08)",
  },
  statusBadgeInfo: { backgroundColor: "rgba(21, 102, 105, 0.12)" },
  statusBadgeSuccess: { backgroundColor: "rgba(29, 106, 72, 0.12)" },
  statusBadgeWarning: { backgroundColor: "rgba(166, 111, 42, 0.12)" },
  statusBadgeDanger: { backgroundColor: "rgba(166, 61, 61, 0.12)" },
  statusBadgeText: { color: "#5f564e", fontWeight: "700", fontSize: 12 },
  statusBadgeTextInfo: { color: "#156669" },
  statusBadgeTextSuccess: { color: "#1d6a48" },
  statusBadgeTextWarning: { color: "#8f5e1f" },
  statusBadgeTextDanger: { color: "#a63d3d" },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.12)",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  choiceChipActive: {
    borderColor: "rgba(21, 102, 105, 0.24)",
    backgroundColor: "rgba(21, 102, 105, 0.12)",
  },
  choiceChipText: { color: "#6d635b", fontWeight: "600" },
  choiceChipTextActive: { color: "#156669" },
  button: {
    backgroundColor: "#156669",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#0f4f51",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(32, 24, 18, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.08)",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "700" },
  secondaryButtonText: { color: "#201812", fontWeight: "700" },
});

export const uiStyles = styles;
