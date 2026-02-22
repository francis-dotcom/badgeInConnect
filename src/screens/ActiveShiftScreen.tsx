import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { TimeRecordService } from "../services/TimeRecordService";
import { useAuth } from "../context/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { CONFIG } from "../constants/Config";

export default function ActiveShiftScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [eligibleShift, setEligibleShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [isClocking, setIsClocking] = useState(false);
  const [clockInNotes, setClockInNotes] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    if (params.shift) {
      try {
        const s = JSON.parse(params.shift as string);
        setEligibleShift(s);
      } catch (e) {
        console.error("Failed to parse shift param", e);
      }
    }
    loadData();
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
      }
    })();

    const interval = setInterval(() => {
        if (activeShift?.clock_in_time) {
            updateElapsedTime(activeShift.clock_in_time);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [user, activeShift?.id]);

  const updateElapsedTime = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  };

  const loadData = async () => {
    if (!user?.email) return;
    try {
      const timeRecordService = new TimeRecordService();
      
      // 1. Check for Active Shift
      const active = await timeRecordService.getActiveShift(user.email);
      setActiveShift(active);

      // 2. If no active shift, check for Eligible Shift for today
      if (!active) {
        const eligible = await timeRecordService.getEligibleShift(user.email);
        setEligibleShift(eligible);
      }

      // 3. Always fetch history for the fallback view
      const profileRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/profile?email=${user.email}`);
      const pData = await profileRes.json();
      if (pData.success && pData.caregiver) {
          const hist = await timeRecordService.getTimeRecords(pData.caregiver.id, 5);
          setHistory(hist);
      }
      
      if (active?.clock_in_time) {
          updateElapsedTime(active.clock_in_time);
      } else {
          setElapsedTime("00:00:00");
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    const shiftToClockIn = activeShift || eligibleShift;
    if (!shiftToClockIn || !user?.email) {
      Alert.alert("Error", "No scheduled shift available to clock in.");
      return;
    }

    try {
      setIsClocking(true);
      
      let loc = null;
      try {
          loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
      } catch (e) {
          console.warn("Could not get location", e);
      }

      const timeRecordService = new TimeRecordService();
      const result = await timeRecordService.clockIn({
        client_id: shiftToClockIn.client_id,
        notes: clockInNotes.trim() || undefined,
        location_gps_in: loc ? { 
          latitude: loc.coords.latitude, 
          longitude: loc.coords.longitude 
        } : undefined
      }, user.email);

      if (result.success) {
        setShowConfirmModal(false);
        setEligibleShift(null);
        await loadData();
      } else {
        Alert.alert("Error", result.error || "Failed to clock in");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift || !user?.email) return;

    try {
      setIsClocking(true);
      
      let loc = null;
      try {
          loc = await Location.getCurrentPositionAsync({});
      } catch (e) {
          console.warn("Could not get location", e);
      }

      const timeRecordService = new TimeRecordService();
      const result = await timeRecordService.clockOut({
        time_record_id: activeShift.id,
        location_gps_out: loc ? { 
          latitude: loc.coords.latitude, 
          longitude: loc.coords.longitude 
        } : undefined
      }, user.email);

      if (result.success) {
        Alert.alert("Success", "Successfully clocked out!");
        const recordToSummarize = { ...activeShift, clock_out_time: new Date().toISOString() };
        setActiveShift(null);
        // Navigate to summary
        router.push({
          pathname: "/(tabs)/shift-details",
          params: { record: JSON.stringify(recordToSummarize) }
        });
      } else {
        Alert.alert("Error", result.error || "Failed to clock out");
      }
    } catch (error) {
       Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsClocking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3D8A5A" />
      </View>
    );
  }

  const shiftToDisplay = activeShift || eligibleShift;
  const isShiftActive = !!activeShift;
  const hasEligibleShift = !!eligibleShift;

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const careTasks = [
    { id: '1', text: "Administer morning medication" },
    { id: '2', text: "Assist with bathing" },
    { id: '3', text: "Prepare lunch" },
    { id: '4', text: "Record vital signs" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Feather name="chevron-left" size={20} color="#1A1918" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Timesheet</Text>
            <TouchableOpacity onPress={loadData} style={styles.iconBtn}>
              <Feather name="refresh-cw" size={18} color="#6D6C6A" />
            </TouchableOpacity>
          </View>

          <View style={styles.timerSection}>
            <View style={[styles.timerRingOuter, !isShiftActive && { borderColor: '#EDECEA' }]}>
              <View style={styles.timerRingInner}>
                <Text style={[styles.timerValue, !isShiftActive && { color: '#9C9B99' }]}>
                  {isShiftActive ? elapsedTime : "00:00:00"}
                </Text>
                <Text style={styles.timerLabel}>
                  {isShiftActive ? "Elapsed Time" : "No Shift Active"}
                </Text>
              </View>
            </View>
            <View style={[styles.statusPillLarge, !isShiftActive && { backgroundColor: '#EDECEA' }]}>
              <View style={[styles.statusDotLarge, !isShiftActive && { backgroundColor: '#9C9B99' }]} />
              <Text style={[styles.statusTextLarge, !isShiftActive && { color: '#6D6C6A' }]}>
                {isShiftActive ? "Shift In Progress" : hasEligibleShift ? "Ready to Clock In" : "No Work Scheduled"}
              </Text>
            </View>
          </View>

          {shiftToDisplay ? (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/client-details",
                    params: {
                      clientId: String(shiftToDisplay.client_id || ""),
                      clientName: String(shiftToDisplay.client_name || "Unknown Client"),
                    },
                  })
                }
                style={styles.clientDesignCard}
              >
                <View style={styles.clientAvatarDesign}>
                  <Text style={styles.clientAvatarDesignText}>
                    {shiftToDisplay.client_name ? shiftToDisplay.client_name.split(' ').map((n: string) => n[0]).join('') : 'C'}
                  </Text>
                </View>
                <View style={styles.clientDesignInfo}>
                  <Text style={styles.clientDesignName}>{shiftToDisplay.client_name || "Unknown Client"}</Text>
                  <Text style={styles.clientDesignService}>Scheduled Shift</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#6D6C6A" />
              </TouchableOpacity>

              <View style={styles.uiCard}>
                <UIDetailRow 
                  label="Scheduled Start" 
                  value={shiftToDisplay.scheduled_start ? new Date(shiftToDisplay.scheduled_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "--:--"} 
                />
                <UIDetailRow 
                  label="Scheduled End" 
                  value={shiftToDisplay.scheduled_end ? new Date(shiftToDisplay.scheduled_end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "--:--"} 
                />
                {isShiftActive && (
                  <UIDetailRow 
                    label="Actual Clock In" 
                    value={new Date(activeShift.clock_in_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} 
                  />
                )}
                <View style={styles.uiRow}>
                  <Text style={styles.uiLabel}>GPS Verification</Text>
                  <View style={styles.gpsBadge}>
                    <Feather 
                      name={isShiftActive ? "check-circle" : "circle"} 
                      size={14} 
                      color={isShiftActive ? "#3D8A5A" : "#9C9B99"} 
                    />
                    <Text style={[styles.gpsBadgeText, !isShiftActive && { color: '#9C9B99' }]}>
                      {isShiftActive ? "Verified" : "Standby"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitleDesign}>Care Tasks</Text>
                <View style={styles.taskCardDesign}>
                  {careTasks.map((task, i) => (
                    <TouchableOpacity 
                      key={task.id} 
                      onPress={() => isShiftActive && toggleTask(task.id)}
                      disabled={!isShiftActive}
                      style={[styles.taskRowDesign, i === careTasks.length - 1 && { borderBottomWidth: 0 }, !isShiftActive && { opacity: 0.5 }]}
                    >
                      <View style={[styles.taskCheckDesign, completedTasks.includes(task.id) && styles.taskCheckDesignActive]}>
                        {completedTasks.includes(task.id) && <Feather name="check" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.taskTextDesign, completedTasks.includes(task.id) && styles.taskTextDesignChecked]}>{task.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {isShiftActive ? (
                <TouchableOpacity onPress={handleClockOut} disabled={isClocking} style={styles.fullClockOutBtn}>
                  {isClocking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="log-out" size={20} color="#FFFFFF" />
                      <Text style={styles.fullClockOutText}>Clock Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => setShowConfirmModal(true)} 
                  disabled={isClocking} 
                  style={[styles.clockInBtn, { height: 56, borderRadius: 16 }]}
                >
                  {isClocking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="log-in" size={20} color="#FFFFFF" />
                      <Text style={styles.fullClockOutText}>Clock In</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="calendar" size={48} color="#EDECEA" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No Scheduled Work</Text>
              <Text style={styles.emptySubtitle}>You don&apos;t have any shifts available to clock in for at this moment.</Text>
            </View>
          )}

          {/* Recent History Section */}
          <View style={[styles.section, { marginTop: 12 }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitleDesign}>Recent History</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/history" as any)}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.historyList}>
              {history.length > 0 ? (
                history.map((item, idx) => (
                  <View key={item.id} style={[styles.historyRow, idx === history.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyClient}>{item.client_name}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.clock_in_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyDuration}>{Math.round((item.total_hours || 0) * 10) / 10}h</Text>
                      <Feather name="check-circle" size={14} color="#3D8A5A" />
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>No recent activity</Text>
                </View>
              )}
            </View>
          </View>

          {/* ... Confirmation Modal ... */}
          <Modal visible={showConfirmModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalIconBox}>
                  <Feather name="help-circle" size={32} color="#3D8A5A" />
                </View>
                <Text style={styles.modalTitle}>Ready to clock in?</Text>
                <Text style={styles.modalDesc}>
                  You are starting your shift with {shiftToDisplay?.client_name}. Make sure you are at the client&apos;s location.
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={styles.modalCancel}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleClockIn} disabled={isClocking} style={styles.modalConfirm}>
                    {isClocking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalConfirmText}>Confirm</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function UIDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.uiRow}>
      <Text style={styles.uiLabel}>{label}</Text>
      <Text style={styles.uiValue}>{value}</Text>
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
  content: { paddingHorizontal: 24, paddingTop: 8, gap: 24 },

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

  timerSection: { alignItems: "center", gap: 16 },
  timerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 6,
    borderColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
    ...(shadow || {}),
  },
  timerValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1A1918",
    letterSpacing: -1,
    fontFamily: "Outfit_700Bold",
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C8F0D8",
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3D8A5A" },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D8A5A",
    fontFamily: "Outfit_600SemiBold",
  },

  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...(shadow || {}),
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#C8F0D8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D8A5A",
    fontFamily: "Outfit_700Bold",
  },
  clientInfo: { flex: 1, gap: 4 },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },
  clientService: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6D6C6A",
    fontFamily: "Outfit_400Regular",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    ...(shadow || {}),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E4E1",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1918",
    fontFamily: "Outfit_600SemiBold",
  },
  gpsCheck: { flexDirection: "row", alignItems: "center", gap: 6 },
  gpsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4D9B6A",
    fontFamily: "Outfit_600SemiBold",
  },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1918",
    letterSpacing: -0.2,
    fontFamily: "Outfit_600SemiBold",
  },
  clientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  clientPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E5E4E1",
  },
  clientPillActive: {
    backgroundColor: "#C8F0D8",
    borderColor: "#3D8A5A",
  },
  clientPillText: {
    fontSize: 14,
    color: "#6D6C6A",
    fontFamily: "Outfit_500Medium",
  },
  clientPillTextActive: {
    color: "#3D8A5A",
    fontWeight: "600",
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#1A1918",
    fontFamily: "Outfit_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
    ...(shadow || {}),
  },
  clockInBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#3D8A5A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    ...(shadow || {}),
  },
  emptyText: {
    fontSize: 14,
    color: "#9C9B99",
    fontFamily: "Outfit_400Regular",
  },
  
  // New Design Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    padding: 24,
    alignItems: "center",
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F9F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1918",
    fontFamily: "Outfit_700Bold",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: "#6D6C6A",
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EDECEA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6D6C6A",
    fontFamily: "Outfit_600SemiBold",
  },
  modalConfirm: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Outfit_600SemiBold",
  },

  timerRingOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 10,
    borderColor: "#3D8A5A",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    ...(shadow || {}),
  },
  timerRingInner: {
    alignItems: "center",
  },
  statusPillLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F9F4",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 100,
    marginTop: 16,
  },
  statusDotLarge: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#3D8A5A"
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D8A5A",
    fontFamily: "Outfit_600SemiBold"
  },

  clientDesignCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    ...(shadow || {}),
  },
  clientAvatarDesign: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0F9F4",
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarDesignText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D8A5A",
    fontFamily: "Outfit_700Bold"
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center', 
    padding: 40, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    marginTop: 20,
    ...shadow,
  },
  emptyTitle: {
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1A1918', 
    fontFamily: 'Outfit_700Bold', 
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14, 
    color: '#6D6C6A', 
    fontFamily: 'Outfit_400Regular', 
    textAlign: 'center', 
    lineHeight: 20,
  },
  rowBetween: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 4,
  },
  seeAllLink: {
    fontSize: 14, 
    fontWeight: '600', 
    color: '#3D8A5A', 
    fontFamily: 'Outfit_600SemiBold',
  },
  historyList: {
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    overflow: 'hidden', 
    ...shadow,
  },
  historyRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F4F1',
  },
  historyLeft: {
    gap: 2,
  },
  historyClient: {
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1A1918', 
    fontFamily: 'Outfit_600SemiBold',
  },
  historyDate: {
    fontSize: 12, 
    color: '#9C9B99', 
    fontFamily: 'Outfit_400Regular',
  },
  historyRight: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
  },
  historyDuration: {
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1A1918', 
    fontFamily: 'Outfit_700Bold',
  },
  emptyHistory: {
    padding: 24, 
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14, 
    color: '#9C9B99', 
    fontFamily: 'Outfit_400Regular',
  },
  clientDesignInfo: { flex: 1, gap: 4 },
  clientDesignName: { fontSize: 18, fontWeight: "700", color: "#1A1918", fontFamily: "Outfit_700Bold" },
  clientDesignService: { fontSize: 13, color: "#6D6C6A", fontFamily: "Outfit_400Regular" },

  uiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    ...(shadow || {}),
  },
  uiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F4F1",
  },
  uiLabel: { fontSize: 14, color: "#6D6C6A", fontFamily: "Outfit_400Regular" },
  uiValue: { fontSize: 14, fontWeight: "700", color: "#1A1918", fontFamily: "Outfit_700Bold" },
  gpsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gpsBadgeText: { fontSize: 14, fontWeight: "600", color: "#3D8A5A", fontFamily: "Outfit_600SemiBold" },

  sectionTitleDesign: { fontSize: 18, fontWeight: "700", color: "#1A1918", fontFamily: "Outfit_700Bold", marginBottom: 12 },
  taskCardDesign: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", ...(shadow || {}) },
  taskRowDesign: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F5F4F1" },
  taskCheckDesign: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#EDECEA", alignItems: "center", justifyContent: "center" },
  taskCheckDesignActive: { backgroundColor: "#3D8A5A", borderColor: "#3D8A5A" },
  taskTextDesign: { fontSize: 14, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  taskTextDesignChecked: { textDecorationLine: "none", opacity: 0.8 },

  fullClockOutBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#D06868",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    ...(shadow || {}),
  },
  fullClockOutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Outfit_700Bold"
  }
});
