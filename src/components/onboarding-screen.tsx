import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { setPreference } from '@/lib/saved-items';
import { canOpenOnboarding, resetOnboardingEntry } from '@/lib/intro-flow';

const steps = [
  { kicker: 'STEP 1 · SEARCH', title: 'Find the right ride, fast', body: 'Enter where you are and where you’re going. Compare travel time, transfers and estimated fare side by side.', bullets: ['Travel time, transfers and walking on one line', 'Fare ranges, always marked as estimates', 'Mode sequence you can scan at a glance'], hint: 'Start with a landmark you already know — like General Trias City Hall — rather than an exact street address.' },
  { kicker: 'STEP 2 · BOARD', title: 'Know exactly where to hop on', body: 'Every option names the terminal or stop, the bay if known, and where to transfer. Walking legs are counted separately.', bullets: ['Boarding bay or roadside landmark', 'Transfer points called out by name', 'Walking legs counted separately'], hint: 'Many bays are roadside, not inside a terminal. The landmark text is what drivers and conductors recognise.' },
  { kicker: 'STEP 3 · FOLLOW', title: 'Ride with confidence', body: 'A numbered step-by-step plan keeps the whole trip in view — no guessing at the transfer point or the drop-off.', bullets: ['Numbered steps from door to door', 'Board and alight details for every leg', 'No live tracking promised that we cannot deliver'], hint: 'Save a journey once and reopen it from Saved — no need to type both locations again.' },
];

export default function OnboardingScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [index, setIndex] = useState(0);
  const checkedEntry = useRef(false);
  const step = steps[index];
  useEffect(() => {
    if (checkedEntry.current) return;
    checkedEntry.current = true;
    if (!canOpenOnboarding()) router.replace('/welcome' as Href);
  }, []);
  function finish() {
    setPreference('completedWelcomeOnboarding', true);
    resetOnboardingEntry();
    router.replace((next === 'login' ? '/login' : '/register') as Href);
  }
  return <SafeAreaView style={s.safe}>
    <View style={s.page}>
      <View style={s.top}><Text style={s.eyebrow}>HOW IT WORKS</Text><Pressable accessibilityRole="button" onPress={finish} hitSlop={10}><Text style={s.skip}>Skip</Text></Pressable></View>
      {index === 0 ? <SearchPreview /> : index === 1 ? <BoardPreview /> : <FollowPreview />}
      <Text style={s.kicker}>{step.kicker}</Text><Text style={s.title}>{step.title}</Text><Text style={s.body}>{step.body}</Text>
      <View style={s.bullets}>{step.bullets.map((item) => <View key={item} style={s.bulletRow}><Text style={s.check}>✓</Text><Text style={s.bullet}>{item}</Text></View>)}</View>
      <View style={s.hint}><Text style={s.info}>ⓘ</Text><Text style={s.hintText}>{step.hint}</Text></View>
      {index === 2 && <Text style={s.disclaimer}>ⓘ  Estimates are illustrative — this prototype has no live schedule feed.</Text>}
      <View style={s.bottom}><View style={s.progress}>{steps.map((_, i) => <View key={i} style={[s.pip, i === index && s.pipActive]}/>)}</View><View style={s.actions}>{index > 0 && <Pressable accessibilityRole="button" onPress={() => setIndex(index - 1)} style={s.back}><Text style={s.backText}>Back</Text></Pressable>}<Pressable accessibilityRole="button" onPress={() => index === steps.length - 1 ? finish() : setIndex(index + 1)} style={[s.next, index > 0 && s.nextFlex]}><Text style={s.nextText}>{index === steps.length - 1 ? 'Get started' : 'Next'}  →</Text></Pressable></View></View>
    </View>
  </SafeAreaView>;
}

function SearchPreview() {
  return <View style={[s.preview, s.darkPreview]}><View style={s.resultCard}><View style={s.resultTop}><View style={s.timeLine}><Text style={s.minutes}>62</Text><Text style={s.min}> min</Text></View><Text style={s.badge}>RECOMMENDED</Text></View><View style={s.modes}><Mode icon="♟"/><Text style={s.arrow}>→</Text><Mode icon="▣" active/><Text style={s.arrow}>→</Text><Mode icon="♟"/><Text style={s.arrow}>→</Text><Mode icon="▣" active/></View><View style={s.resultBottom}><Text style={s.resultNote}>1 transfer · ₱50–70 est.</Text><Text style={s.view}>View</Text></View></View><View style={s.tags}><Text style={s.tag}>FASTEST</Text><Text style={s.tag}>FEWEST TRANSFERS</Text><Text style={s.tag}>LOWEST FARE</Text></View></View>;
}

function BoardPreview() {
  return <View style={[s.preview, s.mapPreview]}>
    <View style={s.mapBay}/><View style={s.mapRoadA}/><View style={s.mapRoadB}/><View style={s.mapRoadC}/>
    <Text style={[s.mapLabel, { left: '41%', top: 19 }]}>General Trias</Text><Text style={[s.mapLabel, { left: '52%', top: 42 }]}>General Trias City Hall</Text><Text style={[s.mapLabel, { left: '69%', top: 34 }]}>Carmona</Text>
    <View style={[s.mapPin, { left: '44%', top: 48 }]}/><View style={[s.mapPin, s.mapPinOrange, { left: '61%', top: 76 }]}/><Text style={s.mapWater}>MANILA BAY</Text>
    <View style={s.mapCallout}><View style={s.calloutIcon}><Text style={s.calloutIconText}>⌖</Text></View><View><Text style={s.calloutTitle}>Manggahan Terminal</Text><Text style={s.calloutSub}>Transfer point · 3 min walk</Text></View></View>
  </View>;
}

function FollowPreview() {
  return <View style={[s.preview, s.darkPreview, s.followPreview]}><View style={s.timelineCard}>{[['1', 'Board at Bay 2', 'Jeepney · General Trias Poblacion'], ['2', 'Manggahan Terminal', 'Local route connection'], ['3', 'Your destination', 'You have arrived']].map(([n, title, sub], i) => <View key={n} style={s.timelineRow}><View style={s.timelineRail}><View style={[s.timelineDot, i === 0 && s.dotOrange, i === 2 && s.dotBlue]} />{i < 2 && <View style={s.timelineLine}/>}</View><View><Text style={s.timelineTitle}>{title}</Text><Text style={s.timelineSub}>{sub}</Text></View></View>)}</View></View>;
}

function Mode({ icon, active = false }: { icon: string; active?: boolean }) { return <View style={[s.mode, active && s.modeActive]}><Text style={[s.modeText, active && s.modeTextActive]}>{icon}</Text></View>; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F2EA' }, page: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20 },
  top: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }, eyebrow: { color: '#66736E', fontSize: 9, letterSpacing: 1, fontWeight: '800' }, skip: { color: '#10372E', fontSize: 10, fontWeight: '700', padding: 6 },
  preview: { height: 154, borderRadius: 19, marginBottom: 25, overflow: 'hidden' }, darkPreview: { backgroundColor: '#0B2923', padding: 12, justifyContent: 'center' }, resultCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 12 }, resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, timeLine: { flexDirection: 'row', alignItems: 'baseline' }, minutes: { color: '#10372E', fontSize: 23, fontWeight: '900' }, min: { color: '#66736E', fontSize: 9 }, badge: { color: '#B94A2B', backgroundColor: '#FCE4D8', overflow: 'hidden', borderRadius: 5, fontSize: 7, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 5 }, modes: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, marginBottom: 8 }, mode: { width: 19, height: 19, borderRadius: 5, backgroundColor: '#EEF0E9', alignItems: 'center', justifyContent: 'center' }, modeActive: { backgroundColor: '#F7E9C8' }, modeText: { color: '#74837A', fontSize: 9 }, modeTextActive: { color: '#C8841D' }, arrow: { color: '#A1AAA3', fontSize: 9 }, resultBottom: { borderTopWidth: 1, borderColor: '#EEEAE1', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }, resultNote: { color: '#66736E', fontSize: 9 }, view: { color: '#10372E', fontSize: 9, fontWeight: '800' }, tags: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, marginTop: 8 }, tag: { color: '#DDE6E0', backgroundColor: '#315C50', overflow: 'hidden', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, fontSize: 7, fontWeight: '800' },
  mapPreview: { backgroundColor: '#E8E7D8', borderWidth: 1, borderColor: '#D8D9CC' }, mapBay: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '15%', backgroundColor: '#D0E4DF', borderRightWidth: 1, borderColor: '#B9D5D0' }, mapRoadA: { position: 'absolute', width: '100%', height: 12, left: '5%', top: '34%', backgroundColor: '#FBF9F1', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D8D2C1', transform: [{ rotate: '28deg' }] }, mapRoadB: { position: 'absolute', width: '85%', height: 10, left: '20%', top: '51%', backgroundColor: '#FBF9F1', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D8D2C1', transform: [{ rotate: '-35deg' }] }, mapRoadC: { position: 'absolute', width: '72%', height: 8, left: '30%', top: '13%', backgroundColor: '#FBF9F1', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D8D2C1', transform: [{ rotate: '58deg' }] }, mapLabel: { position: 'absolute', color: '#7D7564', fontSize: 7 }, mapPin: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#F4F2EA', borderWidth: 2, borderColor: '#E9A62E' }, mapPinOrange: { backgroundColor: '#F05A2A', borderColor: '#FFF', width: 11, height: 11 }, mapWater: { position: 'absolute', left: 5, top: 38, color: '#57847E', fontSize: 6, letterSpacing: 1, transform: [{ rotate: '-90deg' }] }, mapCallout: { position: 'absolute', bottom: 10, left: 10, right: 10, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, backgroundColor: '#FFFFFFF2', borderRadius: 13 }, calloutIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center' }, calloutIconText: { color: '#10372E', fontSize: 15 }, calloutTitle: { color: '#10372E', fontSize: 10, fontWeight: '800' }, calloutSub: { color: '#66736E', fontSize: 9, marginTop: 2 },
  followPreview: { height: 174 }, timelineCard: { backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 12 }, timelineRow: { minHeight: 36, flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, timelineRail: { width: 12, height: 36, alignItems: 'center' }, timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#74837A', marginTop: 3, zIndex: 1 }, dotOrange: { backgroundColor: '#E7A228' }, dotBlue: { backgroundColor: '#4274D9' }, timelineLine: { position: 'absolute', top: 12, bottom: -3, width: 1, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#B7B8AA' }, timelineTitle: { color: '#10372E', fontSize: 10, fontWeight: '800' }, timelineSub: { color: '#66736E', fontSize: 8, marginTop: 2 },
  kicker: { color: '#D24E2D', fontSize: 8, letterSpacing: 1, fontWeight: '900' }, title: { color: '#102820', fontSize: 23, lineHeight: 27, fontWeight: '900', letterSpacing: -0.4, marginTop: 6 }, body: { color: '#52635C', fontSize: 12, lineHeight: 18, marginTop: 9 }, bullets: { gap: 9, marginTop: 15 }, bulletRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' }, check: { color: '#0F5447', fontSize: 13, fontWeight: '900' }, bullet: { color: '#53635B', fontSize: 11, lineHeight: 16, flex: 1 }, hint: { flexDirection: 'row', gap: 9, backgroundColor: '#FCFBF7', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, marginTop: 17 }, info: { color: '#176456', fontSize: 13 }, hintText: { color: '#53635B', fontSize: 10, lineHeight: 15, flex: 1 }, disclaimer: { color: '#7B8580', fontSize: 9, lineHeight: 13, marginTop: 12 },
  bottom: { marginTop: 'auto', paddingTop: 18 }, progress: { flexDirection: 'row', gap: 5, marginBottom: 14 }, pip: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#CFCABB' }, pipActive: { width: 21, backgroundColor: '#0B2923' }, actions: { flexDirection: 'row', gap: 8 }, back: { minWidth: 70, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#D6D0C3', backgroundColor: '#FFF' }, backText: { color: '#10372E', fontSize: 12, fontWeight: '700' }, next: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#0B2923', alignItems: 'center', justifyContent: 'center' }, nextFlex: { flex: 1 }, nextText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
