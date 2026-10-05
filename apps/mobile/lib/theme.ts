import { StyleSheet } from "react-native";

export const colors = {
  primary: "#B51D5C", primaryDark: "#86133F", wine: "#341321", ink: "#24161B", muted: "#806D74",
  cream: "#FBF7F3", soft: "#FFF0F6", blush: "#F8E2E8", line: "#ECD8DF", white: "#FFFFFF", success: "#2D8A61", gold: "#B98B52",
};
export const shadow = { shadowColor: "#5A1735", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 };
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 42 },
  title: { fontSize: 26, fontWeight: "900", color: colors.ink, textAlign: "right", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: "right", lineHeight: 22 },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line, ...shadow },
  button: { backgroundColor: colors.primary, minHeight: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, ...shadow },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, minHeight: 54, paddingHorizontal: 15, color: colors.ink, textAlign: "right", fontSize: 15 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "900", textAlign: "right" },
});
