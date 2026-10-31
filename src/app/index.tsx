import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPreference, usePreferenceRevision } from '@/lib/saved-items';

const c = { paper: '#F3EDDF', card: '#FBF8EF', ink: '#17372F', muted: '#5D7169', line: '#D7CBB4', orange: '#E6561D', gold: '#E7AE28', green: '#438875', blue: '#5277BB' };
const terminals = [
  'Manggahan Terminal',
  'Poblacion Terminal',
  'Pasong Camachile Terminal',
  'Javalera Terminal',
  'Bacao Transport Bay',
  'Biclatan Stop',
  'Navarro Terminal',
  'Santiago Terminal',
  'Governor Ferrer Stop',
];
const shortcuts = [
  { from: 'Poblacion Terminal', to: 'Bacao Transport Bay', title: 'Poblacion to Bacao', road: 'Governor’s Drive', fare: '₱15', time: '22 min', color: '#F1D77B' },
  { from: 'Manggahan Terminal', to: 'Javalera Terminal', title: 'Manggahan to Javalera', road: 'Upland road', fare: '₱27', time: '23 min', color: '#A7D4C2' },
];

type PickerFor = 'from' | 'to' | null;

export default function HomeScreen() {
  usePreferenceRevision();
  const riderName = getPreference<string>('riderName', '');
  const initials = riderName ? riderName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') : 'GT';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pickerFor, setPickerFor] = useState<PickerFor>(null);

  function chooseTerminal(terminal: string) {
    if (pickerFor === 'from') {
      setFrom(terminal);
      if (to === terminal) setTo('');
      setPickerFor('to');
      return;
    }
    setTo(terminal);
    if (from === terminal) setFrom('');
    setPickerFor(null);
  }

  return <SafeAreaView style={s.safe} edges={['top']}><ScrollView contentContainerStyle={s.page}>
    <View style={s.hero}>
      <View pointerEvents="none" style={s.heroOrbit}/>
      <View style={s.heroTop}>
        <View style={s.brand}>
          <View style={s.brandMark}><Text style={s.brandMarkText}>↝</Text></View>
          <View><Text style={s.brandTitle}>GENERAL TRIAS</Text><Text style={s.brandSub}>LOCAL ROUTE GUIDE</Text></View>
        </View>
        <Link href={riderName ? '/profile' : { pathname: '/account', params: { returnTo: 'home' } }} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={riderName ? `Open ${riderName}'s profile` : 'Set up rider profile'} style={s.avatar}><Text style={s.avatarText}>{initials}</Text></Pressable>
        </Link>
      </View>

      <Text style={s.heroKicker}>GENERAL TRIAS, CAVITE</Text>
      <Text style={s.heroTitle}>Saan ang punta natin ngayon?</Text>
      <Text style={s.heroCopy}>Plan a local trip or pick a popular route.</Text>

      <View style={s.tripCard}>
        <View style={s.tripFields}>
          <View style={s.timeline}><View style={s.originDot}/><View style={s.timelineLine}/><View style={s.destinationDot}/></View>
          <View style={s.fieldColumn}>
            <Pressable accessibilityRole="button" accessibilityLabel={from ? `Starting point: ${from}. Tap to change.` : 'Choose a starting terminal'} onPress={() => setPickerFor('from')} style={s.placeField}>
              <Text style={s.fieldLabel}>FROM</Text><Text numberOfLines={1} style={[s.placeText, !from && s.placePlaceholder]}>{from || 'Choose a terminal'}</Text>
            </Pressable>
            <View style={s.fieldDivider}/>
            <Pressable accessibilityRole="button" accessibilityLabel={to ? `Destination: ${to}. Tap to change.` : 'Choose a destination terminal'} onPress={() => setPickerFor('to')} style={s.placeField}>
              <Text style={s.fieldLabel}>TO</Text><Text numberOfLines={1} style={[s.placeText, !to && s.placePlaceholder]}>{to || 'Choose a terminal'}</Text>
            </Pressable>
          </View>
          {from && to ? <Link href={{ pathname: '/plan', params: { from, to } }} asChild><Pressable accessibilityRole="button" accessibilityLabel="Find sample routes" style={s.goButton}><Text style={s.goText}>›</Text></Pressable></Link> : <Pressable accessibilityRole="button" accessibilityLabel="Choose trip terminals" onPress={() => setPickerFor(!from ? 'from' : 'to')} style={s.goButton}><Text style={s.goText}>›</Text></Pressable>}
        </View>
        {pickerFor && <View style={s.picker}>
          <View style={s.pickerHeading}><Text style={s.pickerTitle}>{pickerFor === 'from' ? 'Choose starting terminal' : 'Choose destination'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close terminal picker" onPress={() => setPickerFor(null)}><Text style={s.pickerClose}>Close ×</Text></Pressable></View>
          <View style={s.pickerOptions}>{terminals.map((terminal) => <Pressable key={terminal} accessibilityRole="button" onPress={() => chooseTerminal(terminal)} style={s.pickerOption}><Text style={s.pickerOptionText}>{terminal}</Text></Pressable>)}</View>
        </View>}
      </View>
    </View>

    <Link href="/explore" asChild><Pressable accessibilityRole="link" style={s.guideCard}>
      <View style={s.guideIcon}><Text style={s.guideIconText}>⌖</Text></View>
      <View style={s.guideCopy}><Text style={s.guideTitle}>Local route guide</Text><Text style={s.guideSub}>Explore stops, terminal details and sample corridors.</Text></View>
      <Text style={s.guideArrow}>›</Text>
    </Pressable></Link>

    <View style={s.sectionHeader}>
      <View><Text style={s.sectionKicker}>QUICK TRIPS · SAMPLE ESTIMATES</Text><Text style={s.sectionTitle}>Popular routes</Text></View>
      <Link href="/plan" asChild><Pressable accessibilityRole="link" style={s.viewAll}><Text style={s.viewAllText}>View all</Text></Pressable></Link>
    </View>
    <View style={s.routeGrid}>{shortcuts.map((route) => <Link key={route.title} href={{ pathname: '/plan', params: { from: route.from, to: route.to } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`Plan ${route.title}; sample estimate ${route.time}, ${route.fare}`} style={s.routeCard}>
        <View style={[s.routeBand, { backgroundColor: route.color }]}><Text numberOfLines={1} style={s.routePlace}>{shortName(route.from)}</Text><Text style={s.routeArrow}>→</Text><Text numberOfLines={1} style={s.routePlace}>{shortName(route.to)}</Text></View>
        <View style={s.routeDetails}><Text numberOfLines={2} style={s.routeTitle}>{route.title}</Text><Text style={s.routeMeta}>{route.road}</Text><Text style={s.routeMeta}>{route.time} · {route.fare} sample fare</Text></View>
      </Pressable>
    </Link>)}</View>

    <Link href="/nearby" asChild><Pressable accessibilityRole="link" style={s.terminalCard}>
      <View style={s.terminalIcon}><Text style={s.terminalIconText}>▤</Text></View>
      <View style={s.guideCopy}><Text style={s.guideTitle}>Find a terminal</Text><Text style={s.guideSub}>Search the General Trias terminal directory.</Text></View>
      <Text style={s.guideArrow}>›</Text>
    </Pressable></Link>

    <Text style={s.footer}>Offline guide · route, fare and time details are estimates. Confirm with local operators.</Text>
  </ScrollView></SafeAreaView>;
}

function shortName(terminal: string) {
  return terminal.replace(' Terminal', '').replace(' Transport Bay', '').replace(' Stop', '');
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 36, gap: 14 },
  hero: { overflow: 'hidden', position: 'relative', backgroundColor: c.ink, borderRadius: 26, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  heroOrbit: { position: 'absolute', width: 270, height: 270, borderRadius: 150, borderWidth: 1, borderColor: '#FFFFFF16', right: -95, top: 30 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: c.ink, fontSize: 24, fontWeight: '900' },
  brandTitle: { color: c.card, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  brandSub: { color: c.gold, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#8B918E', backgroundColor: '#FFFFFF10' },
  avatarText: { color: c.card, fontSize: 12, fontWeight: '800' },
  heroKicker: { color: c.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 24 },
  heroTitle: { maxWidth: 380, color: c.card, fontSize: 29, lineHeight: 33, letterSpacing: -0.6, fontWeight: '900', marginTop: 7 },
  heroCopy: { color: '#D5DED9', fontSize: 12, marginTop: 6, marginBottom: 16 },
  tripCard: { borderRadius: 17, padding: 12, backgroundColor: c.card },
  tripFields: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 11 },
  timeline: { width: 12, height: 62, alignItems: 'center', justifyContent: 'space-between' },
  originDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.ink },
  timelineLine: { position: 'absolute', width: 1, top: 8, bottom: 8, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#B8B5A9' },
  destinationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.gold },
  fieldColumn: { flex: 1, minWidth: 0 },
  placeField: { minHeight: 41, justifyContent: 'center' },
  fieldLabel: { color: c.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  placeText: { color: c.ink, fontSize: 13, fontWeight: '800', marginTop: 3 },
  placePlaceholder: { color: '#8A8D84', fontWeight: '600' },
  fieldDivider: { height: 1, backgroundColor: '#E8E1D4' },
  goButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.gold },
  goText: { color: c.ink, fontSize: 30, lineHeight: 33, marginTop: -3, fontWeight: '600' },
  picker: { borderTopWidth: 1, borderColor: '#E8E1D4', paddingTop: 9, marginTop: 4 },
  pickerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  pickerTitle: { color: c.ink, fontSize: 11, fontWeight: '800' },
  pickerClose: { color: c.muted, fontSize: 10, padding: 5 },
  pickerOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerOption: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#F0E9DA', borderWidth: 1, borderColor: c.line },
  pickerOptionText: { color: c.ink, fontSize: 10, fontWeight: '700' },
  guideCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: c.gold, borderRadius: 15, backgroundColor: '#FBF5E3' },
  guideIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.gold },
  guideIconText: { color: c.ink, fontSize: 20, fontWeight: '800' },
  guideCopy: { flex: 1, minWidth: 0 },
  guideTitle: { color: c.ink, fontSize: 12, fontWeight: '900' },
  guideSub: { color: c.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  guideArrow: { color: c.ink, fontSize: 25, paddingHorizontal: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  sectionKicker: { color: c.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: c.ink, fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 3 },
  viewAll: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 5 },
  viewAllText: { color: c.ink, fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  routeCard: { width: '48%', flexGrow: 1, minWidth: 135, overflow: 'hidden', borderWidth: 1, borderColor: '#E5DCCB', borderRadius: 15, backgroundColor: c.card },
  routeBand: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  routePlace: { maxWidth: '43%', color: c.ink, fontSize: 9, fontWeight: '900', borderWidth: 1.5, borderColor: c.ink, borderRadius: 4, backgroundColor: c.card, paddingHorizontal: 5, paddingVertical: 4 },
  routeArrow: { color: c.ink, fontSize: 15, fontWeight: '800' },
  routeDetails: { paddingHorizontal: 10, paddingVertical: 9 },
  routeTitle: { color: c.ink, fontSize: 11, lineHeight: 14, fontWeight: '900', minHeight: 28 },
  routeMeta: { color: c.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  terminalCard: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#E5DCCB', borderRadius: 15, backgroundColor: c.card },
  terminalIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7EABD' },
  terminalIconText: { color: c.ink, fontSize: 18, fontWeight: '800' },
  footer: { color: c.muted, fontSize: 9, lineHeight: 13, textAlign: 'center', paddingHorizontal: 10, paddingTop: 2 },
});
