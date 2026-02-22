import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ShiftDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  // Parse record from params if available
  const record = params.record ? JSON.parse(params.record as string) : null;

  const handleSubmit = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.replace("/(tabs)/home");
    }, 1500);
  };

  if (!record) {
    return (
        <SafeAreaView style={styles.safe}>
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.headerTitle}>No Shift Record Found</Text>
                <TouchableOpacity onPress={() => router.back()} style={[styles.submitBtn, { paddingHorizontal: 20, marginTop: 20 }]}>
                    <Text style={styles.submitBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
  }

  const durationStr = record.total_hours ? `${Math.floor(record.total_hours)}h ${Math.round((record.total_hours % 1) * 60)}m` : "3h 58m";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Feather name="chevron-left" size={20} color="#1A1918" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shift Summary</Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="share-2" size={20} color="#1A1918" />
            </TouchableOpacity>
          </View>

          {/* Success Card */}
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
                <Feather name="check" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Shift Completed!</Text>
            <Text style={styles.successSubtitle}>
                {record.client_name || "Margaret Johnson"} — {new Date(record.clock_in_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>{durationStr}</Text>
                <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>4 / 4</Text>
                <Text style={styles.statLabel}>Tasks Done</Text>
            </View>
            <View style={styles.statBox}>
                <View style={styles.gpsIconCircle}>
                    <Feather name="check" size={14} color="#3D8A5A" />
                </View>
                <Text style={styles.statLabel}>GPS Verified</Text>
            </View>
          </View>

          {/* Time Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Feather name="clock" size={16} color="#6D6C6A" />
                <Text style={styles.sectionTitle}>Time Details</Text>
            </View>
            <View style={styles.uiCard}>
                <DetailRow label="Clock In" value={new Date(record.clock_in_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} />
                <DetailRow label="Clock Out" value={record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "11:59 AM"} />
                <DetailRow label="Total Duration" value={durationStr} valueStyle={{ color: '#3D8A5A' }} />
                <DetailRow label="Scheduled" value="8:00 AM — 12:00 PM" last />
            </View>
          </View>

          {/* Shift Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Feather name="file-text" size={16} color="#6D6C6A" />
                <Text style={styles.sectionTitle}>Shift Notes</Text>
            </View>
            <View style={styles.uiCard}>
                <Text style={styles.notesText}>
                    {record.notes || "Client was in good spirits today. Administered all morning medications on schedule. Assisted with bathing and prepared lunch. Vital signs stable — BP 128/82, Temp 98.4F."}
                </Text>
                <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabel}>Digital Signature</Text>
                    <View style={styles.signedBadge}>
                        <Feather name="check-circle" size={14} color="#3D8A5A" />
                        <Text style={styles.signedText}>Signed</Text>
                    </View>
                </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? (
                <ActivityIndicator color="#FFFFFF" />
            ) : (
                <>
                    <Feather name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit Shift Report</Text>
                </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, valueStyle, last }: { label: string; value: string; valueStyle?: any; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.rowBorder]}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1918", fontFamily: "Outfit_700Bold" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(shadow || {}),
  },

  successCard: {
    backgroundColor: "#C8F0D8",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#3D8A5A", fontFamily: "Outfit_800ExtraBold" },
  successSubtitle: { fontSize: 14, color: "#3D8A5A", opacity: 0.8, fontFamily: "Outfit_400Regular" },

  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 80,
    ...(shadow || {}),
  },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1A1918", fontFamily: "Outfit_800ExtraBold" },
  statLabel: { fontSize: 11, fontWeight: "600", color: "#6D6C6A", fontFamily: "Outfit_600SemiBold", textAlign: 'center' },
  gpsIconCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#F0F9F4", alignItems: "center", justifyContent: "center", marginBottom: 4 },

  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#6D6C6A", fontFamily: "Outfit_700Bold", textTransform: 'uppercase', letterSpacing: 0.5 },

  uiCard: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", ...(shadow || {}) },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 20 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F4F1" },
  detailLabel: { fontSize: 14, color: "#6D6C6A", fontFamily: "Outfit_400Regular" },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#1A1918", fontFamily: "Outfit_700Bold" },

  notesText: { fontSize: 14, color: "#1A1918", fontFamily: "Outfit_400Regular", lineHeight: 22, padding: 20, paddingBottom: 16 },
  signatureRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 20 },
  signatureLabel: { fontSize: 12, color: "#9C9B99", fontFamily: "Outfit_400Regular" },
  signedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  signedText: { fontSize: 12, fontWeight: "600", color: "#3D8A5A", fontFamily: "Outfit_600SemiBold" },

  submitBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#3D8A5A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    ...(shadow || {}),
  },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Outfit_700Bold" }
});
