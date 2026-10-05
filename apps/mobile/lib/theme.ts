import { StyleSheet } from "react-native";

export const colors = {
  primary: "#B51D5C", primaryDark: "#86133F", ink: "#24161B", muted: "#806D74",
  cream: "#FBF7F3", soft: "#FFF0F6", line: "#ECD8DF", white: "#FFFFFF", success: "#2D8A61",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 36 },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, textAlign: "right" },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: "right", lineHeight: 22 },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line },
  button: { backgroundColor: colors.primary, minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, minHeight: 50, paddingHorizontal: 15, color: colors.ink, textAlign: "right", fontSize: 15 },
});
