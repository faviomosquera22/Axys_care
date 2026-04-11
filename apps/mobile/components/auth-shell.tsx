import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
}>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.metricRow}>
              <AuthMetric label="Agenda" value="Viva" />
              <AuthMetric label="Paciente" value="Unificado" />
              <AuthMetric label="Encounter" value="Continuo" />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function AuthLink({
  label,
  action,
  onPress,
}: {
  label: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.linkRow}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Pressable onPress={onPress}>
        <Text style={styles.linkAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4eee4",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 18,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 30,
    backgroundColor: "#1f676a",
  },
  heroGlow: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(255, 244, 224, 0.22)",
  },
  heroCard: {
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 10,
  },
  eyebrow: {
    color: "#d9efe7",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    color: "#fff9f3",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    color: "rgba(255, 249, 243, 0.82)",
    fontSize: 15,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  metric: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 249, 243, 0.14)",
    gap: 4,
  },
  metricValue: {
    color: "#fff9f3",
    fontSize: 15,
    fontWeight: "700",
  },
  metricLabel: {
    color: "rgba(255, 249, 243, 0.72)",
    fontSize: 12,
  },
  formCard: {
    borderRadius: 28,
    backgroundColor: "#fffaf4",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "rgba(32, 24, 18, 0.08)",
    gap: 14,
  },
  footer: {
    gap: 12,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  linkLabel: {
    color: "#6d635b",
  },
  linkAction: {
    color: "#156669",
    fontWeight: "700",
  },
});
