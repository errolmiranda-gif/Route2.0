import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function CustomLoadingOverlay() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return <View onLayout={() => {
    SplashScreen.hideAsync().finally(() => {
      setTimeout(() => setVisible(false), 850);
    });
  }} style={s.overlay}>
    <View style={s.brandMark}><Text style={s.brandGlyph}>↗</Text></View>
    <Text style={s.brand}>CAVITE COMMUTE GUIDE</Text>
    <View style={s.routeLine}><View style={s.stop}/><View style={s.dash}/><View style={[s.stop, s.destination]}/></View>
    <ActivityIndicator color="#F05A2A" size="small" />
    <Text style={s.loading}>Finding your way</Text>
  </View>;
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B2923' },
  brandMark: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F05A2A' },
  brandGlyph: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' },
  brand: { color: '#F4F2EA', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 13 },
  routeLine: { width: 96, height: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 29, marginBottom: 25 },
  stop: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F4F2EA', borderWidth: 2, borderColor: '#F05A2A' },
  destination: { backgroundColor: '#F05A2A' },
  dash: { flex: 1, height: 1, marginHorizontal: 7, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#789087' },
  loading: { color: '#AFC0B8', fontSize: 10, marginTop: 9 },
});
