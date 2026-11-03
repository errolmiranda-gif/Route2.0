import { Link, router } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { allowOnboardingEntry } from '@/lib/intro-flow';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPreference, usePreferenceRevision } from '@/lib/saved-items';
import { coordinatePosition, generalTrias, getRoutePreview, networkDisclaimer, networkLocations } from '@/data/general-trias';
import Svg, { Polyline } from 'react-native-svg';

const c = { paper: '#F4F2EA', card: '#FCFBF7', ink: '#10372E', muted: '#66736E', line: '#E3DED3', orange: '#F05A2A', gold: '#E7AE28', green: '#438875', blue: '#5277BB' };
const shortcuts = generalTrias.routes.slice(0, 4).map((route, index) => {
  const preview = getRoutePreview(route);
  return { ...preview, title: route.name, road: route.code, fare: `₱${preview.fare}`, time: `${preview.minutes} min`, color: ['#F1D77B', '#A7D4C2', '#BED1EA', '#F0C6AC'][index] };
});
const mapModeColors: Record<string, string> = { jeepney: '#E7AE28', bus: '#5277BB', uv_express: '#E08A4C', tricycle: '#438875' };
const homeRouteLines = generalTrias.routes.map((route) => ({
  id: route.id,
  color: mapModeColors[route.mode] ?? c.green,
  points: route.stopIds.map((id) => {
    const stop = generalTrias.stops.find((item) => item.id === id);
    return stop && !stop.external ? coordinatePosition(stop) : null;
  }).filter((point): point is { x: number; y: number } => point !== null),
})).filter((route) => route.points.length > 1);

type PickerFor = 'from' | 'to' | number | null;

export default function HomeScreen() {
  usePreferenceRevision();
  const riderName = getPreference<string>('riderName', '');
  const initials = riderName ? riderName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') : 'GT';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [pickerFor, setPickerFor] = useState<PickerFor>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const placeSuggestions = pickerFor !== null ? networkLocations
    .filter((location) => !placeQuery.trim() || location.name.toLowerCase().includes(placeQuery.trim().toLowerCase()))
    .filter((location) => location.name !== from && location.name !== to && (typeof pickerFor !== 'number' || !stops.some((stopName, index) => index !== pickerFor && stopName === location.name)))
    .slice(0, 7) : [];

  useEffect(() => {
    if (!getPreference('completedWelcomeOnboarding', false)) router.replace('/welcome' as Href);
  }, []);

  function choosePlace(name: string) {
    if (pickerFor === 'from') setFrom(name);
    else if (pickerFor === 'to') setTo(name);
    else if (typeof pickerFor === 'number') setStops((current) => current.map((stopName, index) => index === pickerFor ? name : stopName));
    setPickerFor(null);
    setPlaceQuery('');
  }

  function openPicker(target: Exclude<PickerFor, null>) {
    setPickerFor(target);
    setPlaceQuery(target === 'from' ? from : target === 'to' ? to : stops[target] ?? '');
  }

  function addStop() {
    const index = stops.length;
    setStops((current) => [...current, '']);
    openPicker(index);
  }

  function removeStop(index: number) {
    setStops((current) => current.filter((_, stopIndex) => stopIndex !== index));
    setPickerFor((current) => current === index ? null : typeof current === 'number' && current > index ? current - 1 : current);
  }

  return <SafeAreaView style={s.safe} edges={['top']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <View style={s.hero}>
      <View pointerEvents="none" style={s.heroOrbit}/>
      <View style={s.heroTop}>
        <View style={s.brand}>
          <View style={s.brandMark}><Text style={s.brandMarkText}>↝</Text></View>
          <View><Text style={s.brandTitle}>GENERAL TRIAS</Text><Text style={s.brandSub}>LOCAL ROUTE GUIDE</Text></View>
        </View>
        <Link href={riderName ? '/profile' : '/login'} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={riderName ? `Open ${riderName}'s profile` : 'Sign in or create an account'} style={s.avatar}><Text style={s.avatarText}>{initials}</Text></Pressable>
        </Link>
      </View>

      <Text style={s.heroKicker}>GENERAL TRIAS, CAVITE</Text>
      <Text style={s.heroTitle}>Saan ang punta natin ngayon?</Text>
      <Text style={s.heroCopy}>Plan a local trip or pick a popular route.</Text>

      <View style={s.tripCard}>
        <View style={s.tripFields}>
          <View style={s.timeline}><View style={s.originDot}/><View style={s.timelineLine}/><View style={s.destinationDot}/></View>
          <View style={s.fieldColumn}>
            <View style={s.placeField}><Text style={s.fieldLabel}>FROM</Text><TextInput accessibilityLabel="Search starting point" value={pickerFor === 'from' ? placeQuery : from} onFocus={() => openPicker('from')} onChangeText={(value) => { setPlaceQuery(value); setPickerFor('from'); }} placeholder="Search a place or stop" placeholderTextColor="#8A8D84" style={s.placeInput}/></View>
            <View style={s.fieldDivider}/>
            <View style={s.placeField}><Text style={s.fieldLabel}>TO</Text><TextInput accessibilityLabel="Search destination" value={pickerFor === 'to' ? placeQuery : to} onFocus={() => openPicker('to')} onChangeText={(value) => { setPlaceQuery(value); setPickerFor('to'); }} placeholder="Search a place or stop" placeholderTextColor="#8A8D84" style={s.placeInput}/></View>
          </View>
        </View>
        {stops.map((stopName, index) => <View key={index} style={s.stopTag}><TextInput accessibilityLabel={'Stop ' + (index + 1)} value={pickerFor === index ? placeQuery : stopName} onFocus={() => openPicker(index)} onChangeText={(value) => { setPlaceQuery(value); setPickerFor(index); }} placeholder={'Search stop ' + (index + 1)} placeholderTextColor="#8A8D84" style={s.stopInput}/><Pressable accessibilityRole="button" accessibilityLabel={'Remove stop ' + (index + 1)} onPress={() => removeStop(index)} style={s.removeStop}><Text style={s.removeStopText}>Remove ×</Text></Pressable></View>)}
        {stops.length < 5 && <Pressable accessibilityRole="button" accessibilityLabel="Add another stop" onPress={addStop} style={s.addStop}><Text style={s.addStopText}>＋ Add a stop</Text><Text style={s.optional}>Optional</Text></Pressable>}
        {from && to ? <Link href={{ pathname: '/plan', params: { from, to, ...(stops.some(Boolean) ? { via: stops.filter(Boolean).join('|') } : {}) } }} asChild><Pressable accessibilityRole="button" accessibilityLabel="Plan a route with these locations" style={s.planRouteButton}><Text style={s.planRouteText}>⌕  Plan a route</Text></Pressable></Link> : <Pressable accessibilityRole="button" accessibilityLabel="Choose trip locations" onPress={() => openPicker(!from ? 'from' : 'to')} style={s.planRouteButton}><Text style={s.planRouteText}>＋  Choose locations</Text></Pressable>}
        {pickerFor !== null && <View style={s.picker}>
          <View style={s.pickerHeading}><Text style={s.pickerTitle}>{pickerFor === 'from' ? 'Starting point' : pickerFor === 'to' ? 'Destination' : 'Stop ' + String(pickerFor + 1)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close location suggestions" onPress={() => setPickerFor(null)}><Text style={s.pickerClose}>Close ×</Text></Pressable></View>
          {placeSuggestions.length ? placeSuggestions.map((location) => <Pressable key={location.id} accessibilityRole="button" onPress={() => choosePlace(location.name)} style={s.suggestion}><Text style={s.suggestionName}>{location.name}</Text><Text style={s.suggestionType}>{location.kind}</Text></Pressable>) : <Text style={s.noSuggestions}>No matching places or stops.</Text>}
        </View>}
      </View>
    </View>

    <Link href="/explore" asChild><Pressable accessibilityRole="link" style={s.guideCard}>
      <View style={s.guideIcon}><Text style={s.guideIconText}>⌖</Text></View>
      <View style={s.guideCopy}><Text style={s.guideTitle}>Local route guide</Text><Text style={s.guideSub}>Explore stops, terminal details and sample corridors.</Text></View>
      <Text style={s.guideArrow}>›</Text>
    </Pressable></Link>

    {!riderName && <View style={s.authPrompt}>
      <View style={s.authPromptCopy}><Text style={s.authPromptTitle}>New to the route guide?</Text><Text style={s.authPromptSub}>Create a rider profile or sign in. Guest browsing stays available.</Text></View>
      <Link href="/register" asChild><Pressable accessibilityRole="link" style={s.authPromptButton}><Text style={s.authPromptButtonText}>Create account</Text></Pressable></Link>
      <Link href="/login" asChild><Pressable accessibilityRole="link" style={s.authPromptLink}><Text style={s.authPromptLinkText}>Sign in</Text></Pressable></Link>
      <Link href="/welcome" asChild><Pressable accessibilityRole="link" style={s.authPromptLink}><Text style={s.authPromptLinkText}>Welcome</Text></Pressable></Link>
      <Link href="/onboarding" asChild><Pressable accessibilityRole="link" onPress={allowOnboardingEntry} style={s.authPromptLink}><Text style={s.authPromptLinkText}>How it works</Text></Pressable></Link>
    </View>}

    <Link href="/explore" asChild><Pressable accessibilityRole="link" accessibilityLabel="Open the illustrative General Trias map" style={s.mapPreview}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">{homeRouteLines.map((route) => <Polyline key={route.id} points={route.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={route.color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.72}/>)}</Svg>
      <View style={s.mapChip}><Text style={s.mapChipText}>Around General Trias</Text></View>
      {generalTrias.terminals.map((terminal, index) => { const point = coordinatePosition(terminal); return <View key={terminal.id} style={[s.mapPin, { left: `${point.x}%`, top: `${point.y}%` }]}><View style={[s.mapPinDot, index === 0 && s.mapPinOrange]}/><Text style={s.mapPinLabel}>{terminal.name.replace(' Terminal', '').replace(' Loading Bay', '').replace(' Crossing Loading Area', '')}</Text></View>; })}
      <View style={s.mapFooter}><Text style={s.mapNote}>Illustrative coordinates · unverified</Text><View style={s.openMap}><Text style={s.openMapText}>Open map  ›</Text></View></View>
    </Pressable></Link>

    <View style={s.sectionHeader}>
      <View><Text style={s.sectionKicker}>GENERAL TRIAS NETWORK · ESTIMATES</Text><Text style={s.sectionTitle}>Popular routes</Text></View>
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

    <Text style={s.footer}>{networkDisclaimer}</Text>
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
  placeInput: { color: c.ink, fontSize: 13, fontWeight: '700', marginTop: 2, paddingVertical: 1 },
  fieldLabel: { color: c.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  placeText: { color: c.ink, fontSize: 13, fontWeight: '800', marginTop: 3 },
  placePlaceholder: { color: '#8A8D84', fontWeight: '600' },
  fieldDivider: { height: 1, backgroundColor: '#E8E1D4' },
  goButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.gold },
  goText: { color: c.ink, fontSize: 30, lineHeight: 33, marginTop: -3, fontWeight: '600' },
  planRouteButton: { minHeight: 43, alignItems: 'center', justifyContent: 'center', marginTop: 9, borderRadius: 10, backgroundColor: c.ink },
  planRouteText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  picker: { borderTopWidth: 1, borderColor: '#E8E1D4', paddingTop: 9, marginTop: 4 },
  pickerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 5 },
  pickerTitle: { color: c.ink, fontSize: 11, fontWeight: '800' },
  suggestion: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 7, borderTopWidth: 1, borderColor: '#EEEAE0' },
  suggestionName: { flex: 1, color: c.ink, fontSize: 10, fontWeight: '700' },
  suggestionType: { color: c.muted, fontSize: 8, textTransform: 'capitalize' },
  noSuggestions: { color: c.muted, fontSize: 10, paddingVertical: 10 },
  addStop: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  addStopText: { color: c.ink, fontSize: 10, fontWeight: '700' },
  optional: { color: c.muted, fontSize: 9 },
  stopTag: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#F0E9DA' },
  stopTagText: { flex: 1, color: c.ink, fontSize: 9, fontWeight: '700' },
  stopInput: { flex: 1, minWidth: 0, color: c.ink, fontSize: 10, fontWeight: '700', paddingVertical: 3 },
  removeStop: { paddingVertical: 6, paddingHorizontal: 8 },
  removeStopText: { color: c.orange, fontSize: 9, fontWeight: '800' },
  pickerClose: { color: c.muted, fontSize: 10, padding: 5 },
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
  mapPreview: { height: 164, overflow: 'hidden', position: 'relative', borderRadius: 17, borderWidth: 1, borderColor: '#D8DED3', backgroundColor: '#E4EAE0' },
  authPrompt: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 11, borderRadius: 14, borderWidth: 1, borderColor: '#E3DED3', backgroundColor: '#FCFBF7' },
  authPromptCopy: { flex: 1, minWidth: 145 },
  authPromptTitle: { color: c.ink, fontSize: 10, fontWeight: '900' },
  authPromptSub: { color: c.muted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  authPromptButton: { minHeight: 32, paddingHorizontal: 9, justifyContent: 'center', borderRadius: 8, backgroundColor: c.ink },
  authPromptButtonText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  authPromptLink: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 2 },
  authPromptLinkText: { color: c.ink, fontSize: 8, fontWeight: '800' },
  mapRoadOne: { position: 'absolute', width: '120%', height: 13, left: '-8%', top: '49%', backgroundColor: '#FCFBF7', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D6D2C7', transform: [{ rotate: '-18deg' }] },
  mapRoadTwo: { position: 'absolute', width: '100%', height: 8, left: '8%', top: '37%', backgroundColor: '#FCFBF7', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D6D2C7', transform: [{ rotate: '38deg' }] },
  mapRoadThree: { position: 'absolute', width: '90%', height: 7, left: '20%', top: '70%', backgroundColor: '#FCFBF7', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D6D2C7', transform: [{ rotate: '-55deg' }] },
  mapChip: { position: 'absolute', top: 9, left: 9, backgroundColor: '#FCFBF7', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  mapChipText: { color: c.ink, fontSize: 9, fontWeight: '700' },
  mapPin: { position: 'absolute', alignItems: 'center', gap: 3 },
  mapPinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.green, borderWidth: 2, borderColor: c.card },
  mapPinOrange: { backgroundColor: c.orange },
  mapPinLabel: { color: c.ink, fontSize: 8, fontWeight: '800', backgroundColor: '#FCFBF7CC', paddingHorizontal: 4, borderRadius: 4 },
  mapFooter: { position: 'absolute', left: 8, right: 8, bottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapNote: { color: c.muted, fontSize: 8, backgroundColor: '#FCFBF7E8', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 7 },
  openMap: { borderRadius: 9, backgroundColor: c.card, paddingHorizontal: 9, paddingVertical: 6 },
  openMapText: { color: c.ink, fontSize: 9, fontWeight: '800' },
  terminalCard: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#E5DCCB', borderRadius: 15, backgroundColor: c.card },
  terminalIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7EABD' },
  terminalIconText: { color: c.ink, fontSize: 18, fontWeight: '800' },
  footer: { color: c.muted, fontSize: 9, lineHeight: 13, textAlign: 'center', paddingHorizontal: 10, paddingTop: 2 },
});
