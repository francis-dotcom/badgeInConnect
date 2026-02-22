import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CONFIG } from "../constants/Config";
import { useAuth } from "../context/AuthContext";

export default function ClientListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetch(`${CONFIG.API_BASE_URL}/api/caregivers/clients?email=${user.email}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setClients(data.clients);
          }
        })
        .catch(err => console.error("Failed to load clients", err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color="#1A1918" />
          </TouchableOpacity>
          <Text style={styles.title}>My Clients</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3D8A5A" />
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No clients found.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {clients.map((client) => (
              <TouchableOpacity 
                key={client.id} 
                style={styles.card}
                onPress={() => router.push({
                  pathname: "/(tabs)/client-details",
                  params: { clientId: client.id, clientName: client.name }
                })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{client.name}</Text>
                  <Text style={styles.sub}>{client.address || "No address provided"}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#A8A7A5" />
              </TouchableOpacity>
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
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  android: { elevation: 2 },
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#6D6C6A", fontSize: 15, fontFamily: "Outfit_500Medium" },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E6F4EA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: { color: "#3D8A5A", fontSize: 16, fontWeight: "700", fontFamily: "Outfit_700Bold" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#1A1918", fontFamily: "Outfit_600SemiBold" },
  sub: { fontSize: 13, color: "#6D6C6A", marginTop: 2, fontFamily: "Outfit_400Regular" },
});
