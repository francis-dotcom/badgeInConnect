import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CONFIG } from "../constants/Config";
import { useAuth } from "../context/AuthContext";

export default function AvailableShiftsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = () => {
    setLoading(true);
    const url = user?.email
      ? `${CONFIG.API_BASE_URL}/api/caregivers/available-shifts?email=${encodeURIComponent(user.email)}`
      : `${CONFIG.API_BASE_URL}/api/caregivers/available-shifts`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setShifts(data.shifts || []);
      })
      .catch((err) => console.error("Failed to load available shifts", err))
      .finally(() => setLoading(false));
  };

  const handlePickUp = (shiftId: string) => {
    if (!user?.email) {
      Alert.alert("Sign in required", "Please sign in to request a shift.");
      return;
    }
    Alert.alert(
      "Pick Up Shift",
      "Are you sure you want to request this shift?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Request",
          onPress: () => submitRequest(shiftId),
        },
      ]
    );
  };

  const submitRequest = async (shiftId: string) => {
    setRequestingId(shiftId);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/request-shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift_id: shiftId, email: user?.email }),
      });
      const data = await res.json();
      if (data.success) {
        setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, requested: true } : s)));
        Alert.alert("Request Sent", data.message || "Your request to pick up this shift has been sent to the office.");
      } else {
        Alert.alert("Request failed", data.error || "Please try again.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not send request. Please try again.");
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color="#1A1918" />
          </TouchableOpacity>
          <Text style={styles.title}>Available Shifts</Text>
          <TouchableOpacity onPress={loadShifts} style={styles.backBtn}>
            <Feather name="refresh-cw" size={18} color="#3D8A5A" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3D8A5A" />
          </View>
        ) : shifts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No available shifts at the moment.</Text>
            <Text style={styles.subEmpty}>Check back later for new opportunities!</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {shifts.map((shift) => (
              <View key={shift.id} style={styles.card}>
                <View style={styles.shiftHeader}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{new Date(shift.start_time).getDate()}</Text>
                    <Text style={styles.dateMonth}>{new Date(shift.start_time).toLocaleString("default", { month: "short" }).toUpperCase()}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{shift.client_name}</Text>
                    <Text style={styles.time}>
                      {new Date(shift.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                      - {new Date(shift.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.bottomRow}>
                  <View style={styles.locRow}>
                    <Feather name="map-pin" size={12} color="#6D6C6A" />
                    <Text style={styles.locText} numberOfLines={1}>{shift.address || "Location pending"}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.pickBtn,
                      (requestingId === shift.id || shift.requested) && styles.pickBtnDisabled,
                      shift.requested && styles.pickBtnRequested,
                    ]}
                    onPress={() => handlePickUp(shift.id)}
                    disabled={requestingId === shift.id || shift.requested}
                  >
                    {requestingId === shift.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : shift.requested ? (
                      <Text style={styles.pickTextRequested}>Requested</Text>
                    ) : (
                      <Text style={styles.pickText}>Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#1A1918",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F4F1" },
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  title: { fontSize: 18, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { color: "#1A1918", fontSize: 16, fontWeight: "600", fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  subEmpty: { color: "#6D6C6A", fontSize: 14, marginTop: 8, textAlign: "center", fontFamily: "Outfit_400Regular" },
  list: { padding: 20, gap: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    ...shadow,
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  dateBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#E6F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 18, fontWeight: "700", color: "#3D8A5A", fontFamily: "Outfit_700Bold" },
  dateMonth: { fontSize: 10, fontWeight: "600", color: "#3D8A5A", fontFamily: "Outfit_600SemiBold" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  time: { fontSize: 14, color: "#6D6C6A", marginTop: 4, fontFamily: "Outfit_500Medium" },
  divider: { height: 1, backgroundColor: "#F0EFEC", marginVertical: 14 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  locText: { fontSize: 12, color: "#6D6C6A", fontFamily: "Outfit_400Regular" },
  pickBtn: {
    backgroundColor: "#3D8A5A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtnDisabled: { opacity: 0.7 },
  pickBtnRequested: { backgroundColor: "#6D6C6A" },
  pickText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", fontFamily: "Outfit_600SemiBold" },
  pickTextRequested: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", fontFamily: "Outfit_600SemiBold" },
});
