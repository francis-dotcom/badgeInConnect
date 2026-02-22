import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, ActivityIndicator, Modal, TextInput, TouchableOpacity, Alert } from "react-native";
import { CONFIG, getAdminApiHeaders } from "../constants/Config";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DatePicker from 'react-native-date-picker';
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function ScheduleListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  
  // Edit State
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStartTime, setEditStartTime] = useState(new Date());
  const [editEndTime, setEditEndTime] = useState(new Date());
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);
  
  const API_URL = `${CONFIG.API_BASE_URL}/api/admin/shifts`;

  const loadShifts = async (isRefresh = false) => {
    if (!user?.email) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // 1. Get Caregiver ID from Profile
      const profileRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/profile?email=${user.email}`);
      const profileData = await profileRes.json();
      
      if (!profileData.success || !profileData.caregiver) {
        setError("Caregiver profile not found.");
        setLoading(false);
        setRefreshing(false);
        return; 
      }
      
      const caregiverId = profileData.caregiver.id;

      // 2. Fetch Shifts for this Caregiver
      const res = await fetch(`${API_URL}?caregiver_id=${caregiverId}`, { headers: getAdminApiHeaders() });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setShifts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load shifts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadShifts();
    }
  }, [user?.email]);

  const handleRowPress = (shift: any) => {
     setSelectedShift(shift);
     setEditNotes(shift.notes || "");
     setEditStartTime(new Date(shift.start_time));
     setEditEndTime(new Date(shift.end_time));
     setEditModalVisible(true);
  };

  const handleDeleteShift = async () => {
     if (!selectedShift) return;
     Alert.alert(
       "Delete Shift",
       "Are you sure you want to delete this shift?",
       [
         { text: "Cancel", style: "cancel" },
         { 
           text: "Delete", 
           style: "destructive", 
           onPress: async () => {
             try {
               const res = await fetch(`${API_URL}?id=${selectedShift.id}`, { method: 'DELETE', headers: getAdminApiHeaders() });
               if (!res.ok) throw new Error("Failed to delete");
               setEditModalVisible(false);
               loadShifts(true); // Refresh list
             } catch (err) {
               Alert.alert("Error", "Could not delete shift");
             }
           }
         }
       ]
     );
  };

  const handleSaveShift = async () => {
     if (!selectedShift) return;
     try {
        const res = await fetch(API_URL, {
           method: 'PATCH',
           headers: getAdminApiHeaders(),
           body: JSON.stringify({
              id: selectedShift.id,
              notes: editNotes,
              start_time: editStartTime.toISOString(),
              end_time: editEndTime.toISOString(),
           })
        });
        if (!res.ok) throw new Error("Failed to update");
        setEditModalVisible(false);
        loadShifts(true);
     } catch (err) {
        Alert.alert("Error", "Could not update shift");
     }
  };

  const grouped = useMemo(() => {
    const today = new Date();
    const todayKey = today.toDateString();
    const map = new Map<string, typeof shifts>();
    for (const s of shifts) {
      const d = new Date(s.start_time);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    const entries = Array.from(map.entries()).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });
    // Default to today first: put today's group first, then future, then past
    const todayIdx = entries.findIndex(([date]) => date === todayKey);
    if (todayIdx <= 0) return entries;
    const todayEntry = entries[todayIdx];
    const before = entries.slice(0, todayIdx);
    const after = entries.slice(todayIdx + 1);
    return [todayEntry, ...after, ...before];
  }, [shifts]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        {/* ScrollView for list */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadShifts(true)} />
          }
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My Schedule</Text>
            <View style={styles.addBtn}>
              <Feather name="plus" size={18} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.segmented}>
            <TouchableOpacity 
              style={styles.segmentInactive}
              onPress={() => router.push("/(tabs)/schedule-calendar")}
            >
              <Text style={styles.segmentInactiveText}>Calendar</Text>
            </TouchableOpacity>
            <View style={styles.segmentActive}>
              <Text style={styles.segmentActiveText}>List</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color="#3D8A5A" />
              <Text style={styles.emptyText}>Loading shifts...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Error: {error}</Text>
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No shifts available.</Text>
            </View>
          ) : (
            grouped.map(([date, items]) => (
              <View key={date} style={styles.group}>
                <Text style={styles.groupTitle}>{formatGroupTitle(date)}</Text>
                <View style={styles.table}>
                   <View style={styles.tableHeader}>
                      <Text style={[styles.th, { width: 60 }]}>Time</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Client</Text>
                      <Text style={[styles.th, { width: 80 }]}>Status</Text>
                   </View>
                   {items.map((s, idx) => {
                      const status = getShiftStatus(s);
                      const isLast = idx === items.length - 1;
                      return (
                        <TouchableOpacity 
                           key={s.id} 
                           activeOpacity={0.7}
                           onPress={() => handleRowPress(s)}
                           style={[styles.tr, !isLast && styles.trBorder]}
                        >
                          <View style={{ width: 60 }}>
                             <Text style={styles.tdTime}>{formatTime(s.start_time)}</Text>
                             <Text style={styles.tdAmPm}>{formatAmPm(s.start_time)}</Text>
                          </View>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                             <Text style={styles.tdClient}>{s.client_name}</Text>
                             <Text style={styles.tdNote} numberOfLines={1}>{s.notes || "No notes"}</Text>
                          </View>
                          <View style={{ width: 80, alignItems: 'flex-end' }}>
                             <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                             </View>
                          </View>
                        </TouchableOpacity>
                      );
                   })}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
        
        {/* Edit Modal */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Edit Shift</Text>
               <Text style={styles.modalSubtitle}>{selectedShift?.client_name}</Text>
               
               <View style={styles.dateTimeGrid}>
                  <TouchableOpacity style={styles.dateTimeField} onPress={() => setOpenStart(true)}>
                     <Text style={styles.label}>Start Time</Text>
                     <View style={styles.timeDisplay}>
                        <Text style={styles.timeValue}>{editStartTime.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
                        <Feather name="calendar" size={14} color="#3D8A5A" />
                     </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.dateTimeField} onPress={() => setOpenEnd(true)}>
                     <Text style={styles.label}>End Time</Text>
                     <View style={styles.timeDisplay}>
                        <Text style={styles.timeValue}>{editEndTime.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
                        <Feather name="calendar" size={14} color="#3D8A5A" />
                     </View>
                  </TouchableOpacity>
               </View>

               <View style={styles.inputGroup}>
                 <Text style={styles.label}>Notes</Text>
                 <TextInput
                   style={styles.input}
                   value={editNotes}
                   onChangeText={setEditNotes}
                   placeholder="Add notes..."
                   multiline
                 />
               </View>

               <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteShift}>
                     <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                     <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveShift}>
                     <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
               </View>
            </View>
          </View>

          <DatePicker
            modal
            open={openStart}
            date={editStartTime}
            onConfirm={(date) => {
              setOpenStart(false);
              setEditStartTime(date);
            }}
            onCancel={() => setOpenStart(false)}
          />

          <DatePicker
            modal
            open={openEnd}
            date={editEndTime}
            onConfirm={(date) => {
              setOpenEnd(false);
              setEditEndTime(date);
            }}
            onCancel={() => setOpenEnd(false)}
          />
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  root: { flex: 1, backgroundColor: "#F9F8F6" },
  content: { padding: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#1A1918", fontFamily: "Outfit_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#3D8A5A", justifyContent: "center", alignItems: "center" },
  segmented: { flexDirection: "row", backgroundColor: "#E5E4E1", borderRadius: 12, padding: 4, marginBottom: 20 },
  segmentActive: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 8, paddingVertical: 8, alignItems: "center", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 2 } }) },
  segmentInactive: { flex: 1, paddingVertical: 8, alignItems: "center" },
  segmentActiveText: { fontSize: 13, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  segmentInactiveText: { fontSize: 13, fontWeight: "500", color: "#6D6C6A", fontFamily: "Outfit_500Medium" },
  group: { marginBottom: 24 },
  groupTitle: { fontSize: 13, fontWeight: "600", color: "#6D6C6A", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Outfit_600SemiBold" },
  table: { backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 3 } }) },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F0EE", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#F9F8F6" },
  th: { fontSize: 11, fontWeight: "600", color: "#9A9996", textTransform: "uppercase", fontFamily: "Outfit_600SemiBold" },
  tr: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, alignItems: "center" },
  trBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F0EE" },
  tdTime: { fontSize: 14, fontWeight: "700", color: "#1A1918", fontFamily: "Outfit_700Bold" },
  tdAmPm: { fontSize: 10, color: "#9A9996", marginTop: -2, fontFamily: "Outfit_500Medium" },
  tdClient: { fontSize: 14, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  tdNote: { fontSize: 12, color: "#9A9996", marginTop: 2, fontFamily: "Outfit_400Regular" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700", fontFamily: "Outfit_700Bold" },
  emptyCard: { padding: 40, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#9A9996", fontSize: 14, fontFamily: "Outfit_500Medium" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 20,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  modalTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Outfit_700Bold", color: "#1A1918" },
  modalSubtitle: { fontSize: 15, color: "#6D6C6A", fontFamily: "Outfit_500Medium", marginTop: -12 },
  dateTimeGrid: { flexDirection: "row", gap: 12 },
  dateTimeField: { flex: 1, gap: 8 },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9F8F6",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E4E1",
  },
  timeValue: { fontSize: 13, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#6D6C6A", fontFamily: "Outfit_600SemiBold", textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E4E1",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: "#F9F8F6",
  },
  modalActions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  deleteBtn: { paddingVertical: 10, paddingHorizontal: 0 },
  deleteBtnText: { color: "#EF4444", fontWeight: "700", fontFamily: "Outfit_700Bold", fontSize: 13 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { color: "#6D6C6A", fontWeight: "600", fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  saveBtn: { 
    backgroundColor: "#3D8A5A", 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 12,
    shadowColor: "#3D8A5A",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontFamily: "Outfit_700Bold", fontSize: 14 },
  
});

function getShiftStatus(s: any) {
  if (s.actual_end_time) {
    return { label: "DONE", color: "#3D8A5A", bg: "#C8F0D8" }; 
  }
  if (s.actual_start_time) {
    return { label: "ACTIVE", color: "#D97706", bg: "#FEF3C7" }; 
  }
  if (s.status === 'approved') {
    return { label: "READY", color: "#4B5563", bg: "#E5E7EB" }; 
  }
  
  return { label: (s.status || "WAIT").toUpperCase(), color: "#D89575", bg: "#FFF0E8" };
}

function formatGroupTitle(date: string) {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(date: string) {
  const d = new Date(date);
  let h = d.getHours();
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return h.toString();
}

function formatAmPm(date: string) {
  const d = new Date(date);
  return d.getHours() >= 12 ? "PM" : "AM";
}
