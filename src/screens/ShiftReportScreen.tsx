import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function ShiftReportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { record } = route.params as any || {};

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Feather name="chevron-left" size={20} color="#1A1918" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shift Report</Text>
            <View style={styles.iconBtn}>
              <Feather name="share-2" size={20} color="#6D6C6A" />
            </View>
          </View>

          <View style={styles.segmented}>
            <View style={styles.segmentActive}>
              <Feather name="briefcase" size={14} color="#3D8A5A" />
              <Text style={styles.segmentActiveText}>To Office</Text>
            </View>
            <View style={styles.segmentInactive}>
              <Feather name="users" size={14} color="#9C9B99" />
              <Text style={styles.segmentInactiveText}>To Client</Text>
            </View>
          </View>

          <View style={styles.infoLabel}>
            <Feather name="briefcase" size={14} color="#3D8A5A" />
            <Text style={styles.infoLabelText}>Office Report — includes clinical & compliance data</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="clipboard" size={16} color="#6D6C6A" />
              <Text style={styles.cardHeaderText}>Shift Summary</Text>
            </View>
            <Row label="Client" value={record?.client_name || "Unknown Client"} />
            <Row label="Date" value={record?.created_at ? new Date(record.created_at).toLocaleDateString() : "--"} />
            <Row label="Clock In / Out" value={`${record?.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "--"} — ${record?.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "Active"}`} />
            <Row label="Total Hours" value={record?.total_hours ? `${record.total_hours.toFixed(1)}h` : "--"} valueColor="#3D8A5A" bold />
            <Row label="GPS Status" value="Verified" icon name="check-circle" valueColor="#4D9B6A" last />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Tasks Completed</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Complete</Text>
              </View>
            </View>
            <TaskRow text="Administer morning medication" />
            <TaskRow text="Assist with bathing" />
            <TaskRow text="Prepare lunch" />
            <TaskRow text="Record vital signs" last />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="activity" size={16} color="#6D6C6A" />
              <Text style={styles.cardHeaderText}>Vitals (Office Only)</Text>
              <View style={styles.officeBadge}>
                <Text style={styles.officeBadgeText}>Internal</Text>
              </View>
            </View>
            <View style={styles.vitalsRow}>
              <VitalCol value="128/82" label="Blood Pressure" />
              <VitalCol value="98.4°F" label="Temperature" />
              <VitalCol value="72" label="Pulse" />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="file-text" size={16} color="#6D6C6A" />
              <Text style={styles.cardHeaderText}>Care Notes</Text>
            </View>
            <View style={styles.notesBody}>
              <Text style={styles.notesText}>
                {record?.notes || "No additional notes recorded for this shift."}
              </Text>
            </View>
          </View>

          <View style={styles.submitBtn}>
            <Feather name="send" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>Submit to Office</Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  valueColor,
  bold,
  icon,
  name,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  icon?: boolean;
  name?: keyof typeof Feather.glyphMap;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {icon && name ? (
        <View style={styles.rowIconWrap}>
          <Feather name={name} size={14} color={valueColor || "#1A1918"} />
          <Text style={[styles.rowValue, valueColor && { color: valueColor }, bold && styles.rowValueBold]}>
            {value}
          </Text>
        </View>
      ) : (
        <Text style={[styles.rowValue, valueColor && { color: valueColor }, bold && styles.rowValueBold]}>
          {value}
        </Text>
      )}
    </View>
  );
}

function TaskRow({ text, last }: { text: string; last?: boolean }) {
  return (
    <View style={[styles.taskRow, !last && styles.rowBorder]}>
      <Feather name="check-circle" size={16} color="#4D9B6A" />
      <Text style={styles.taskText}>{text}</Text>
    </View>
  );
}

function VitalCol({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.vitalCol}>
      <Text style={styles.vitalValue}>{value}</Text>
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#1A1918",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F4F1" },
  root: { flex: 1, backgroundColor: "#F5F4F1" },
  content: { paddingHorizontal: 24, paddingTop: 8, gap: 20 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(shadow || {}),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },

  segmented: {
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDECEA",
    padding: 4,
    flexDirection: "row",
  },
  segmentActive: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexDirection: "row",
    ...(shadow || {}),
  },
  segmentInactive: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexDirection: "row",
  },
  segmentActiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },
  segmentInactiveText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },

  infoLabel: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  infoLabelText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#3D8A5A",
    fontFamily: "Outfit_500Medium",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...(shadow || {}),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#FAFAF8",
  },
  cardHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#E5E4E1" },
  rowLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },
  rowValueBold: { fontWeight: "700", fontFamily: "Outfit_700Bold" },
  rowIconWrap: { flexDirection: "row", alignItems: "center", gap: 6 },

  badge: {
    marginLeft: "auto",
    backgroundColor: "#C8F0D8",
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3D8A5A",
    fontFamily: "Outfit_600SemiBold",
  },

  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  taskText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1918",
    fontFamily: "Outfit_500Medium",
  },

  officeBadge: {
    marginLeft: "auto",
    backgroundColor: "#F0F4FE",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  officeBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#5B7EC2",
    fontFamily: "Outfit_600SemiBold",
  },

  vitalsRow: { flexDirection: "row", gap: 12, paddingVertical: 14, paddingHorizontal: 18 },
  vitalCol: { flex: 1, alignItems: "center", gap: 4 },
  vitalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1918",
    fontFamily: "Outfit_700Bold",
  },
  vitalLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9C9B99",
    fontFamily: "Outfit_500Medium",
  },

  notesBody: { paddingVertical: 14, paddingHorizontal: 18 },
  notesText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6D6C6A",
    lineHeight: 20,
    fontFamily: "Outfit_400Regular",
  },

  submitBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#3D8A5A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Outfit_600SemiBold",
  },
});
