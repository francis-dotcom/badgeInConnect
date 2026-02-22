import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ActivityIndicator } from "react-native";

import { TimeRecordService } from "../services/TimeRecordService";
import { useAuth } from "../context/AuthContext";

type RowItem = {
  label: string;
  value: string;
  highlight?: boolean;
};

export default function ClientDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientName?: string; clientId?: string }>();
  
  const [loading, setLoading] = React.useState(true);
  const [diagnosisRows, setDiagnosisRows] = React.useState<RowItem[]>([]);
  const [adlRows, setAdlRows] = React.useState<RowItem[]>([]);
  const [medicationRows, setMedicationRows] = React.useState<RowItem[]>([]);
  const [basicRows, setBasicRows] = React.useState<RowItem[]>([]);
  const [fallRisk, setFallRisk] = React.useState(false);
  const [adlNotes, setAdlNotes] = React.useState<string | null>(null);
  const [emergencyRows, setEmergencyRows] = React.useState<RowItem[]>([]);
  const [physicianRows, setPhysicianRows] = React.useState<RowItem[]>([]);
  const [isAcknowledging, setIsAcknowledging] = React.useState(false);
  const [isAcknowledged, setIsAcknowledged] = React.useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    async function loadData() {
      if (!params.clientId) {
        setLoading(false);
        return;
      }

      try {
        const service = new TimeRecordService();
        const data = await service.getClientClinicalData(params.clientId);

        if (data) {
          const { client, clinical } = data;

          // Map Basic Info
          if (client) {
            const bio: RowItem[] = [];
            if (client.address) bio.push({ label: "Address", value: client.address });
            if (client.gate_code) bio.push({ label: "Gate Code", value: client.gate_code, highlight: true });
            if (client.dob) bio.push({ label: "DOB", value: client.dob });
            if (client.gender) bio.push({ label: "Gender", value: client.gender });
            if (client.language) bio.push({ label: "Language", value: client.language });
            setBasicRows(bio);

            // Emergency Contacts
            const emg: RowItem[] = [];
            if (client.emergency_name) emg.push({ label: "Name", value: client.emergency_name });
            if (client.emergency_relationship) emg.push({ label: "Relation", value: client.emergency_relationship });
            if (client.emergency_phone) emg.push({ label: "Phone", value: client.emergency_phone, highlight: true });
            setEmergencyRows(emg);

            // Physician
            const phy: RowItem[] = [];
            if (client.physician_name) phy.push({ label: "Name", value: client.physician_name });
            if (client.physician_phone) phy.push({ label: "Phone", value: client.physician_phone, highlight: true });
            setPhysicianRows(phy);
          }

          if (clinical) {
            // Map Clinical Profile
            const diag: RowItem[] = [];
            if (clinical.profile?.primary_diagnosis) diag.push({ label: "Primary", value: clinical.profile.primary_diagnosis });
            if (clinical.profile?.secondary_diagnosis) diag.push({ label: "Secondary", value: clinical.profile.secondary_diagnosis });
            if (clinical.profile?.dietary_restrictions) diag.push({ label: "Dietary", value: clinical.profile.dietary_restrictions });
            if (clinical.profile?.allergies) diag.push({ label: "Allergies", value: clinical.profile.allergies });
            if (clinical.profile?.code_status) diag.push({ label: "Code Status", value: clinical.profile.code_status, highlight: true });
            setDiagnosisRows(diag);
            setFallRisk(!!clinical.profile?.fall_risk_status);

            // Map Medications
            if (clinical.medications && Array.isArray(clinical.medications)) {
              setMedicationRows(clinical.medications.map((m: any) => ({
                label: m.name || "Unknown Med",
                value: `${m.dosage || ""} ${m.frequency || ""}`.trim() || m.instructions || "N/A"
              })));
            }

            // Map ADLs
            const adls: RowItem[] = [];
            if (clinical.adl_plan?.bathing_support) adls.push({ label: "Bathing", value: clinical.adl_plan.bathing_support });
            if (clinical.adl_plan?.dressing_support) adls.push({ label: "Dressing", value: clinical.adl_plan.dressing_support });
            if (clinical.adl_plan?.toileting_support) adls.push({ label: "Toileting", value: clinical.adl_plan.toileting_support });
            if (clinical.adl_plan?.transfer_support) adls.push({ label: "Transfers", value: clinical.adl_plan.transfer_support, highlight: true });
            if (clinical.adl_plan?.eating_support) adls.push({ label: "Eating", value: clinical.adl_plan.eating_support });
            if (clinical.adl_plan?.grooming_support) adls.push({ label: "Grooming", value: clinical.adl_plan.grooming_support });
            setAdlRows(adls);
            setAdlNotes(clinical.adl_plan?.notes || null);
          }
        }
      } catch (error) {
        console.error("Failed to load clinical data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.clientId]);

  const clientName = params.clientName || "Client";
  const initials = clientName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAcknowledge = async () => {
    if (!params.clientId || !user?.email) return;
    
    setIsAcknowledging(true);
    try {
      const service = new TimeRecordService();
      const res = await service.acknowledgeShift(params.clientId, user.email);
      
      if (res.success) {
        setIsAcknowledged(true);
        // Navigate directly to Active Shift screen so they can clock in immediately
        router.push("/(tabs)/active-shift");
      } else {
        Alert.alert("Error", res.error || "Failed to acknowledge care plan");
      }
    } catch (error) {
      Alert.alert("Error", "A network error occurred.");
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Feather name="chevron-left" size={20} color="#1A1918" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Client Details</Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="phone" size={18} color="#3D8A5A" />
            </TouchableOpacity>
          </View>

          <View style={styles.clientCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || "??"}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{clientName}</Text>
              <Text style={styles.clientMeta}>Personal Care & Medication</Text>
              {!!params.clientId && <Text style={styles.clientMeta}>ID: {params.clientId}</Text>}
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          {fallRisk && (
            <View style={styles.alertBanner}>
              <Feather name="alert-triangle" size={16} color="#8B6914" />
              <Text style={styles.alertText}>High Fall risk. Exercise extreme caution during transfers.</Text>
            </View>
          )}

          {basicRows.length > 0 && (
            <SectionCard
              title="Basic Information"
              icon={<Feather name="info" size={16} color="#3D8A5A" />}
              rows={basicRows}
            />
          )}

          {diagnosisRows.length > 0 && (
            <SectionCard
              title="Diagnosis & Conditions"
              icon={<Feather name="heart" size={16} color="#3D8A5A" />}
              rows={diagnosisRows}
            />
          )}

          {medicationRows.length > 0 ? (
            <SectionCard
              title="Medications"
              icon={<Feather name="plus-square" size={16} color="#3D8A5A" />}
              rows={medicationRows}
            />
          ) : (
            !loading && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <Feather name="plus-square" size={16} color="#3D8A5A" />
                  <Text style={styles.sectionTitle}>Medications</Text>
                </View>
                <View style={styles.card}>
                  <View style={styles.row}><Text style={styles.rowLabel}>No medications listed</Text></View>
                </View>
              </View>
            )
          )}

          {adlRows.length > 0 && (
            <SectionCard
              title="Activities of Daily Living"
              icon={<MaterialIcons name="accessibility" size={17} color="#3D8A5A" />}
              rows={adlRows}
              footerNote={adlNotes}
            />
          )}

          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Feather name="phone-call" size={16} color="#3D8A5A" />
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
            </View>
            <View style={styles.card}>
              {emergencyRows.length > 0 ? (
                emergencyRows.map((row, idx) => (
                  <SimpleRow key={idx} label={row.label} value={row.value} valueHighlight={row.highlight} last={idx === emergencyRows.length - 1} />
                ))
              ) : (
                <View style={styles.row}><Text style={styles.rowLabel}>No contact information provided</Text></View>
              )}
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={16} color="#3D8A5A" />
              <Text style={styles.sectionTitle}>Physician Info</Text>
            </View>
            <View style={styles.card}>
              {physicianRows.length > 0 ? (
                physicianRows.map((row, idx) => (
                  <SimpleRow key={idx} label={row.label} value={row.value} valueHighlight={row.highlight} last={idx === physicianRows.length - 1} />
                ))
              ) : (
                <View style={styles.row}><Text style={styles.rowLabel}>No physician info available</Text></View>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.ackButton, (isAcknowledged || isAcknowledging) && styles.ackButtonDisabled]}
            onPress={handleAcknowledge}
            disabled={isAcknowledging || isAcknowledged}
          >
            {isAcknowledging ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name={isAcknowledged ? "check" : "check-circle"} size={18} color="#FFFFFF" />
                <Text style={styles.ackButtonText}>
                  {isAcknowledged ? "Acknowledged" : "I Have Read & Acknowledged"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SectionCard({ title, icon, rows, footerNote }: { title: string; icon: React.ReactNode; rows: RowItem[]; footerNote?: string | null }) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.card}>
        {rows.map((row, idx) => (
          <SimpleRow
            key={`${row.label}-${idx}`}
            label={row.label}
            value={row.value}
            valueHighlight={row.highlight}
            last={idx === rows.length - 1 && !footerNote}
          />
        ))}
        {footerNote && (
          <View style={styles.footerWrap}>
            <Text style={styles.footerTitle}>NURSE NOTES</Text>
            <Text style={styles.footerText}>{footerNote}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SimpleRow({
  label,
  value,
  valueHighlight,
  last,
}: {
  label: string;
  value: string;
  valueHighlight?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueHighlight && styles.rowValueHighlight]}>{value}</Text>
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
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 14 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(shadow || {}),
  },

  clientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...(shadow || {}),
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontFamily: "Outfit_700Bold" },
  clientInfo: { flex: 1 },
  clientName: { color: "#1A1918", fontSize: 17, fontFamily: "Outfit_600SemiBold" },
  clientMeta: { color: "#6D6C6A", fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DDF3E6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3D8A5A" },
  statusText: { color: "#3D8A5A", fontSize: 11, fontFamily: "Outfit_600SemiBold" },

  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF3E8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  alertText: { flex: 1, color: "#8B6914", fontSize: 13, fontFamily: "Outfit_500Medium" },

  sectionWrap: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 3 },
  sectionTitle: { color: "#1A1918", fontSize: 15, fontFamily: "Outfit_600SemiBold" },

  card: { backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", ...(shadow || {}) },
  row: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F0EFEC" },
  rowLabel: { color: "#6D6C6A", fontSize: 13, fontFamily: "Outfit_400Regular", flex: 1 },
  rowValue: { color: "#1A1918", fontSize: 13, fontFamily: "Outfit_600SemiBold", flex: 1, textAlign: "right" },
  rowValueHighlight: { color: "#3D8A5A" },

  ackButton: {
    marginTop: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...(shadow || {}),
  },
  ackButtonText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  ackButtonDisabled: { backgroundColor: "#A0A0A0", opacity: 0.8 },
  footerWrap: { padding: 16, borderTopWidth: 1, borderTopColor: "#F0EFEC", backgroundColor: "#F9F8F6" },
  footerTitle: { fontSize: 10, fontFamily: "Outfit_700Bold", color: "#9A9996", marginBottom: 4 },
  footerText: { fontSize: 13, color: "#1A1918", fontFamily: "Outfit_400Regular", lineHeight: 18 },
});
