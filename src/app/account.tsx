import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPreference, setPreference } from '@/lib/saved-items';

const C = { paper: '#F4F2EA', card: '#FFFFFF', ink: '#10372E', muted: '#66736E', line: '#E3DED3', orange: '#E96B49' };

export default function AccountScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [name, setName] = useState(() => getPreference('riderName', ''));
  const [message, setMessage] = useState('');

  const save = () => {
    const cleanName = name.trim().slice(0, 40);
    setName(cleanName);
    setPreference('riderName', cleanName);
    setMessage(cleanName ? 'Rider profile saved on this device.' : 'Rider profile cleared.');
  };

  return <SafeAreaView style={s.safe} edges={['top']}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Link href={returnTo === 'profile' ? '/profile' : '/' as Href} asChild><Pressable accessibilityRole="link" style={s.back}><Text style={s.backText}>{returnTo === 'profile' ? '‹  Back to profile' : '‹  Back home'}</Text></Pressable></Link>
    <Text style={s.brand}>GENERAL TRIAS COMMUTE</Text>
    <Text style={s.title}>Rider profile</Text>
    <Text style={s.sub}>Add a name to personalize this app. Your profile stays on this device and does not require an account.</Text>
    <Text style={s.label}>NAME</Text>
    <TextInput value={name} onChangeText={(value) => { setName(value); setMessage(''); }} maxLength={40} autoCapitalize="words" autoCorrect={false} placeholder="What should we call you?" placeholderTextColor="#8A8B83" style={s.input} returnKeyType="done" onSubmitEditing={save}/>
    <Pressable accessibilityRole="button" onPress={save} style={s.primary}><Text style={s.primaryText}>Save profile</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => { setName(''); setPreference('riderName', ''); setMessage('Rider profile cleared.'); }} style={s.secondary}><Text style={s.secondaryText}>Clear profile</Text></Pressable>
    {message ? <View accessibilityLiveRegion="polite" style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}
    <View style={s.note}><Text style={s.noteTitle}>Your data</Text><Text style={s.sub}>Saved trips, preferences, and this profile are stored locally. They are not uploaded or synced.</Text></View>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper }, page: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 22, paddingTop: 16, flexGrow: 1 }, back: { minHeight: 44, justifyContent: 'center', marginBottom: 16 }, backText: { fontSize: 14, color: C.ink, fontWeight: '700' }, brand: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: C.orange }, title: { fontSize: 28, fontWeight: '900', color: C.ink, marginTop: 18 }, sub: { fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 6 }, label: { fontSize: 11, fontWeight: '800', color: C.ink, marginTop: 24, marginBottom: 7, letterSpacing: 0.7 }, input: { minHeight: 49, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.card, color: C.ink, fontSize: 15 }, primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.orange, marginTop: 14 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 }, secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, marginTop: 8 }, secondaryText: { color: C.ink, fontWeight: '700', fontSize: 13 }, message: { padding: 11, marginTop: 12, borderRadius: 9, backgroundColor: '#E4E9DB' }, messageText: { fontSize: 12, color: C.ink, lineHeight: 17 }, note: { padding: 14, marginTop: 26, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }, noteTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
});
