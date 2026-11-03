import { Link } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { allowOnboardingEntry } from '@/lib/intro-flow';
import CommuteHeader from '@/components/commute-header';
import { networkDisclaimer } from '@/data/general-trias';

const ink = '#0B2923';
const paper = '#F4F2EA';

export default function WelcomeScreen() {
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.page}>
      <CommuteHeader />
      <Text style={s.title}>Every General Trias ride,</Text><Text style={s.titleAccent}>mapped out.</Text>
      <Text style={s.copy}>Compare jeepney, bus, UV Express and tricycle routes — then see exactly where to board, transfer and get off.</Text>
      <View style={s.features}>
        <Feature icon="⇄" title="Compare real alternatives" text="Fastest, fewest transfers or lowest fare — you choose the trade-off."/>
        <Feature icon="⌖" title="Know your terminals" text="Boarding bays, transfer points and walking steps for each leg."/>
        <Feature icon="◷" title="Honest about what it knows" text="Estimated fares and sample timetables are labelled, never dressed up as live data."/>
      </View>
      <View style={s.actions}>
        <Link href={{ pathname: '/onboarding', params: { next: 'register' } }} asChild><Pressable accessibilityRole="link" onPress={allowOnboardingEntry} style={s.lightButton}><Text style={s.lightText}>Create an account  →</Text></Pressable></Link>
        <Link href="/onboarding" asChild><Pressable accessibilityRole="link" onPress={allowOnboardingEntry} style={s.outlineButton}><Text style={s.whiteButtonText}>See how it works</Text></Pressable></Link>
        <Link href={{ pathname: '/onboarding', params: { next: 'guest' } }} asChild><Pressable accessibilityRole="link" onPress={allowOnboardingEntry} style={s.guest}><Text style={s.whiteButtonText}>Continue as guest</Text></Pressable></Link>
        <Link href={{ pathname: '/onboarding', params: { next: 'login' } }} asChild><Pressable accessibilityRole="link" onPress={allowOnboardingEntry} style={s.signIn}><Text style={s.signInText}>Already have an account? Sign in</Text></Pressable></Link>
      </View>
      <Text style={s.note}>{networkDisclaimer}</Text>
    </ScrollView>
  </SafeAreaView>;
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <View style={s.feature}><View style={s.featureIcon}><Text style={s.featureIconText}>{icon}</Text></View><View style={s.featureCopy}><Text style={s.featureTitle}>{title}</Text><Text style={s.featureText}>{text}</Text></View></View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink }, page: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 },
  title: { color: paper, fontSize: 27, lineHeight: 30, letterSpacing: -0.8, fontWeight: '900', marginTop: 2 }, titleAccent: { color: '#FF9C7D', fontSize: 27, lineHeight: 30, letterSpacing: -0.8, fontWeight: '900' }, copy: { color: '#DBE3DD', fontSize: 12, lineHeight: 17, marginTop: 12, maxWidth: 360 },
  features: { gap: 10, marginTop: 21 }, feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, featureIcon: { width: 23, height: 23, borderRadius: 7, backgroundColor: '#FFFFFF16', alignItems: 'center', justifyContent: 'center' }, featureIconText: { color: '#F3A280', fontSize: 13, fontWeight: '800' }, featureCopy: { flex: 1 }, featureTitle: { color: '#FFF', fontSize: 10, fontWeight: '900' }, featureText: { color: '#C7D4CD', fontSize: 9, lineHeight: 13, marginTop: 2 },
  actions: { gap: 8, marginTop: 'auto', paddingTop: 20 }, lightButton: { minHeight: 43, borderRadius: 10, backgroundColor: paper, alignItems: 'center', justifyContent: 'center' }, lightText: { color: ink, fontSize: 11, fontWeight: '900' }, outlineButton: { minHeight: 42, borderWidth: 1, borderColor: '#FFFFFF29', borderRadius: 10, backgroundColor: '#FFFFFF14', alignItems: 'center', justifyContent: 'center' }, whiteButtonText: { color: '#FFF', fontSize: 11, fontWeight: '800' }, guest: { minHeight: 34, alignItems: 'center', justifyContent: 'center' }, signIn: { alignItems: 'center', paddingVertical: 3 }, signInText: { color: '#C7D4CD', fontSize: 9 }, note: { color: '#8AA59A', fontSize: 8, lineHeight: 12, textAlign: 'center', marginTop: 8 },
});
