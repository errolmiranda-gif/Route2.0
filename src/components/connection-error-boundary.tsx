import { Link, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ink = '#10372E';
const muted = '#66736E';

export function ConnectionErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <View style={styles.screen}>
    <Text style={styles.kicker}>SOMETHING WENT WRONG</Text>
    <Text style={styles.subtitle}>Connection error example</Text>
    <View style={styles.icon}><Text style={styles.iconGlyph}>⌁</Text></View>
    <Text style={styles.title}>We couldn’t load this screen</Text>
    <Text style={styles.copy}>The page failed to load. Nothing was lost — your saved journeys are stored on this device.</Text>
    <Pressable accessibilityRole="button" onPress={retry} style={styles.primary}><Text style={styles.primaryText}>↻  Try again</Text></Pressable>
    <Link href="/saved" asChild><Pressable accessibilityRole="link" style={styles.secondary}><Text style={styles.secondaryText}>Open saved journeys</Text></Pressable></Link>
    <View style={styles.tip}><Text style={styles.tipTitle}>WHAT YOU CAN STILL DO</Text><Text style={styles.tipCopy}>· Read previously saved routes and terminals.{ '\n' }· Browse the map and terminal addresses.{ '\n' }· Retry the screen when the connection is back.</Text></View>
    <Text style={styles.footnote}>If this keeps happening, return Home and try again later.</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 36, justifyContent: 'center', backgroundColor: '#F4F2EA' },
  kicker: { color: '#F05A2A', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  subtitle: { color: muted, fontSize: 10, marginTop: 3 },
  icon: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderRadius: 31, backgroundColor: '#F8EDD8', marginTop: 28, marginBottom: 16 },
  iconGlyph: { color: '#C88319', fontSize: 30 },
  title: { color: ink, fontSize: 19, lineHeight: 25, fontWeight: '900', textAlign: 'center' },
  copy: { color: muted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 8, marginBottom: 15 },
  primary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: ink },
  primaryText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  secondary: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDD7C9', borderRadius: 10, backgroundColor: '#FFF', marginTop: 7 },
  secondaryText: { color: ink, fontSize: 11, fontWeight: '800' },
  tip: { padding: 13, borderRadius: 12, backgroundColor: '#FAF9F4', marginTop: 16 },
  tipTitle: { color: muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  tipCopy: { color: muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  footnote: { color: muted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 14 },
});
