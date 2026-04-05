import type { PropsWithChildren } from "react";
import {
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
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
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        multiline={multiline}
        placeholderTextColor="#7c7068"
        {...props}
      />
    </View>
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
    <Pressable style={[styles.button, disabled ? styles.buttonDisabled : null]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5efe5" },
  screenContent: { padding: 20, gap: 16 },
  card: {
    backgroundColor: "#fffaf4",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.08)",
    gap: 12,
  },
  sectionHeader: { gap: 4, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "700", color: "#201812" },
  subtitle: { color: "#6d635b", lineHeight: 20 },
  field: { gap: 8 },
  label: { fontSize: 13, color: "#6d635b" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.12)",
    borderRadius: 14,
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#201812",
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  button: {
    backgroundColor: "#156669",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "700" },
});

export const uiStyles = styles;
