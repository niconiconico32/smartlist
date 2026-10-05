import { colors } from "@/constants/theme";
import React from "react";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, Text, View } from "react-native";

const TERMS_URL = "https://brainyadhd.com/terms.html";
const PRIVACY_URL = "https://brainyadhd.com/privacy.html";

/**
 * Legal notice shown on every screen of the login funnel. Extracted so the
 * copy (and its links) stay identical across /login, /login-options,
 * /login-existing and /login-social.
 */
export function LoginLegalNotice() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {t("login.legal_prefix")}{" "}
        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={() => Linking.openURL(TERMS_URL)}
        >
          {t("login.legal_terms")}
        </Text>
        {t("login.legal_and")}{" "}
        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        >
          {t("login.legal_privacy")}
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "400",
    color: "rgba(0,0,0,0.4)",
    textAlign: "center",
    lineHeight: 16,
  },
  link: {
    color: colors.background,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
});