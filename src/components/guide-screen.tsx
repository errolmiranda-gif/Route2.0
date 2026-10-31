import { useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPreference, removeSavedItem, setPreference, toggleSavedItem, usePreferenceRevision, useSavedItems } from '@/lib/saved-items';
import { ExternalLink } from '@/components/external-link';

const C = { paper: '#F4F2EA', card: '#FFFFFF', ink: '#10372E', muted: '#66736E', line: '#E3DED3', orange: '#E96B49', green: '#438875', gold: '#E7AE28', blue: '#5277BB' };
const places = ['Manggahan Terminal', 'Poblacion Terminal', 'Pasong Camachile Terminal', 'Javalera Terminal', 'Bacao Transport Bay', 'Biclatan Stop', 'Navarro Terminal', 'Santiago Terminal', 'Governor Ferrer Stop'];
type Ride = 'Jeepney' | 'Bus' | 'Tricycle' | 'Walk';
type Trip = { id: string; from: string; to: string; road: string; fare: number; minutes: number; rides: Ride[]; transfers: number };
const trips: Trip[] = [
  { id: 'poblacion-bacao', from: places[1], to: places[4], road: 'Governor’s Drive', fare: 15, minutes: 22, rides: ['Jeepney', 'Bus'], transfers: 0 },
  { id: 'poblacion-pasong', from: places[1], to: places[2], road: 'Arnaldo Highway', fare: 30, minutes: 33, rides: ['Jeepney', 'Bus'], transfers: 1 },
  { id: 'manggahan-javalera', from: places[0], to: places[3], road: 'Manggahan–Javalera upland road', fare: 27, minutes: 23, rides: ['Jeepney', 'Tricycle'], transfers: 0 },
];
type Screen = 'plan' | 'saved' | 'nearby' | 'alerts' | 'profile';
type SavedTab = 'Routes' | 'Terminals';

export default function GuideScreen({ screen }: { screen: Screen }) {
  const params = useLocalSearchParams<{ from?: string }>();
  const savedItems = useSavedItems();
  usePreferenceRevision();
  const [from, setFrom] = useState(params.from && places.includes(params.from) ? params.from : '');
  const [to, setTo] = useState('');
  const [ride, setRide] = useState<Ride | 'All'>(() => getPreference('defaultRide', 'All'));
  const [preference, setPreferenceState] = useState<'Fewest transfers' | 'Lowest sample fare' | 'Shortest estimate'>(() => getPreference('tripPreference', 'Fewest transfers'));
  const [defaultRide, setDefaultRide] = useState<Ride | 'All'>(() => getPreference('defaultRide', 'All'));
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState<SavedTab>('Routes');
  const [alertTab, setAlertTab] = useState('All');
  const [query, setQuery] = useState('');
  const [nearbyRide, setNearbyRide] = useState<Ride | 'All'>(getPreference('nearbyRide', 'All'));
  const [nearbyArea, setNearbyArea] = useState('All areas');
  const [showAreaOptions, setShowAreaOptions] = useState(false);
  const [alertArea, setAlertArea] = useState('All');
  const [notice, setNotice] = useState('');
  const [recentTrips, setRecentTrips] = useState<{ from: string; to: string }[]>(() => getPreference('recentTrips', []));
  const [showSampleAlerts, setShowSampleAlerts] = useState(() => getPreference('showSampleAlerts', true));
  const riderName = getPreference<string>('riderName', '');

  const title = { plan: 'Plan a trip', saved: 'Saved', nearby: 'Nearby', alerts: 'Alerts & departures', profile: 'Profile' }[screen];
  const subtitle = { plan: 'General Trias, Cavite · local route guide', saved: 'Stored on this device', nearby: 'Sample stops · General Trias, Cavite', alerts: 'Sample notices · no live service feed', profile: 'On-device profile and travel preferences' }[screen];
  const matchingTrips = useMemo(() => {
    if (!searched || !from || !to) return [];
    const matches = trips.filter((trip) => {
      const pairMatches = (trip.from === from && trip.to === to) || (trip.from === to && trip.to === from);
      return pairMatches && (ride === 'All' || trip.rides.includes(ride));
    });
    return matches.sort((a, b) => preference === 'Lowest sample fare' ? a.fare - b.fare : preference === 'Shortest estimate' ? a.minutes - b.minutes : a.transfers - b.transfers);
  }, [from, to, ride, preference, searched]);

  const saveTrip = (trip: Trip) => toggleSavedItem({ id: tripSaveId(trip, from, to), kind: 'route', title: `${from} → ${to}`, subtitle: `${trip.road} · ₱${trip.fare} sample · ${trip.minutes} min estimate`, from, to });
  const pickPlace = (place: string) => {
    if (!from || (from && to)) { setFrom(place); setTo(''); }
    else if (place !== from) setTo(place);
    setSearched(false);
    setNotice('');
  };
  const selectedRide = (type: Ride) => setRide((current) => current === type ? 'All' : type);
  const searchTrips = () => {
    setSearched(true);
    if (!from || !to) {
      setNotice('Choose both an origin and a destination to see matching sample routes.');
      return;
    }
    if (from === to) {
      setNotice('Choose two different terminals.');
      return;
    }
    const recent = [{ from, to }, ...recentTrips.filter((item) => item.from !== from || item.to !== to)].slice(0, 5);
    setRecentTrips(recent);
    setPreference('recentTrips', recent);
    setNotice('');
  };
  const chooseDefaultRide = (type: Ride | 'All') => {
    setDefaultRide(type);
    setRide(type);
    setNearbyRide(type);
    setPreference('defaultRide', type);
    setPreference('nearbyRide', type);
  };
  const chooseTripPreference = (value: typeof preference) => {
    setPreferenceState(value);
    setPreference('tripPreference', value);
  };
  const filteredPlaces = places.filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()) && (nearbyRide === 'All' || terminalRides(name).includes(nearbyRide)) && (nearbyArea === 'All areas' || terminalArea(name) === nearbyArea));
  const visibleSaved = savedItems.filter((item) => item.kind === (tab === 'Routes' ? 'route' : 'terminal'));

  return <SafeAreaView style={s.safe} edges={['top']}><View style={s.head}><View style={s.headInner}><Text style={s.title}>{title}</Text><Text style={s.sub}>{subtitle}</Text></View></View><ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    {screen === 'plan' && <>
      <View style={s.card}><Text style={s.label}>FROM · GENERAL TRIAS ONLY</Text><TextInput value={from} onChangeText={(value) => { setFrom(value); setSearched(false); }} placeholder="Choose a General Trias origin" placeholderTextColor={C.muted} style={s.input}/><Text style={s.label}>TO · GENERAL TRIAS ONLY</Text><TextInput value={to} onChangeText={(value) => { setTo(value); setSearched(false); }} placeholder="Choose a General Trias destination" placeholderTextColor={C.muted} style={s.input}/><Text style={s.rowSub}>Tap a terminal below to fill the next empty field.</Text><View style={s.pills}>{places.map((place) => <Pressable key={place} onPress={() => pickPlace(place)} style={[s.chip, (place === from || place === to) && s.chipChosen]}><Text style={s.chipText}>{place === from ? `From · ${place}` : place === to ? `To · ${place}` : place}</Text></Pressable>)}</View></View>
      <Text style={s.h2}>Ride type</Text><Text style={s.sub}>Choose a mode to filter sample routes. Tap it again to include all modes.</Text><View style={s.pills}>{(['Jeepney', 'Bus', 'Tricycle', 'Walk'] as Ride[]).map((type) => <Pressable onPress={() => selectedRide(type)} key={type} accessibilityRole="button" accessibilityState={{ selected: ride === type }} style={[s.chip, ride === type && s.active]}><Text style={[s.chipText, ride === type && s.white]}>{ride === type ? '✓ ' : ''}{type}</Text></Pressable>)}</View>
      <Text style={s.h2}>Sort trips by</Text><View style={s.segment}>{(['Fewest transfers', 'Lowest sample fare', 'Shortest estimate'] as const).map((item) => <Pressable key={item} onPress={() => chooseTripPreference(item)} style={[s.segmentItem, preference === item && s.segmentSelected]}><Text style={s.chipText}>{item}</Text></Pressable>)}</View>
      {recentTrips.length > 0 && <View style={s.recent}><View style={s.recentHeader}><Text style={s.rowTitle}>Recent searches</Text><Pressable accessibilityRole="button" onPress={() => { setRecentTrips([]); setPreference('recentTrips', []); }}><Text style={s.removeText}>Clear</Text></Pressable></View>{recentTrips.map((item, index) => <Pressable accessibilityRole="button" key={`${item.from}-${item.to}-${index}`} onPress={() => { setFrom(item.from); setTo(item.to); setSearched(false); setNotice(''); }} style={s.recentItem}><Text style={s.rowTitle}>{item.from} → {item.to}</Text><Text style={s.rowSub}>Tap to plan again</Text></Pressable>)}</View>}
      <Pressable onPress={searchTrips} style={s.button}><Text style={s.white}>Find sample trips</Text></Pressable>{notice ? <Text style={s.notice}>{notice}</Text> : null}
      {searched && from && to && from !== to && <><Text style={s.h2}>Route results</Text>{matchingTrips.length ? matchingTrips.map((trip, index) => <View key={trip.id} style={s.resultCard}><View style={s.resultTop}><View style={s.resultMetric}><Text style={s.resultMinutes}>{trip.minutes}</Text><Text style={s.metricUnit}>min est.</Text></View><View style={s.resultLabels}><Text style={s.resultRoute}>{from} → {to}</Text><Text style={s.rowSub}>{trip.road} · {trip.transfers} transfers</Text></View><Text style={s.recommended}>{index === 0 ? 'BEST MATCH' : 'ALTERNATIVE'}</Text></View><View style={s.modeSequence}>{trip.rides.map((mode) => <View key={mode} style={s.modeStep}><Text style={s.modeGlyph}>{rideGlyph(mode)}</Text><Text style={s.modeName}>{mode}</Text></View>)}</View><View style={s.resultBottom}><Text style={s.resultFare}>₱{trip.fare} estimated</Text><ExternalLink href={`https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=${encodeURIComponent(`${from}, General Trias, Cavite`)}&destination=${encodeURIComponent(`${to}, General Trias, Cavite`)}`} style={s.mapDirections}><Text style={s.mapDirectionsText}>Check directions ↗</Text></ExternalLink><Pressable accessibilityRole="button" accessibilityLabel={savedItems.some((item) => item.id === tripSaveId(trip, from, to)) ? 'Remove saved trip' : 'Save trip'} accessibilityState={{ selected: savedItems.some((item) => item.id === tripSaveId(trip, from, to)) }} onPress={() => saveTrip(trip)} style={s.saveButton}><Text style={s.save}>{savedItems.some((item) => item.id === tripSaveId(trip, from, to)) ? '★' : '☆'}</Text></Pressable></View><Text style={s.sampleCaption}>Illustrative route data · verify with the driver</Text></View>) : <View style={s.empty}><View style={s.emptyIcon}><Text style={s.emptyGlyph}>⌕</Text></View><Text style={s.emptyTitle}>Walang nahanap — nothing found</Text><Text style={s.sub}>No sample route connects these stops yet. Change the locations or try one of the modeled corridors.</Text><Pressable accessibilityRole="button" onPress={() => { setFrom(''); setTo(''); setSearched(false); }} style={s.button}><Text style={s.white}>Change locations</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setFrom(places[1]); setTo(places[4]); setRide('All'); setSearched(true); setNotice(''); }} style={s.outline}><Text style={s.outlineText}>Try a modeled route</Text></Pressable><View style={s.modeledList}><Text style={s.label}>MODELED CORRIDORS</Text>{trips.map((trip) => <Pressable key={trip.id} accessibilityRole="button" onPress={() => { setFrom(trip.from); setTo(trip.to); setRide('All'); setSearched(true); setNotice(''); }} style={s.modeledRow}><Text style={s.modeledGlyph}>⇄</Text><Text style={s.modeledText}>{trip.from} → {trip.to}</Text></Pressable>)}</View></View>}</>}
      <Text style={s.note}>Fares and durations are illustrative estimates. This guide has no live routes, schedules, or traffic.</Text>
    </>}

    {screen === 'nearby' && <>
      <View style={s.nearbyHeading}><View><Text style={s.h2}>Nearby terminals</Text><Text style={s.sub}>Sample stops · Cavite network</Text></View><Link href="/explore" asChild><Pressable accessibilityRole="link" accessibilityLabel="Open map explorer" style={s.mapButton}><Text style={s.mapButtonGlyph}>⌖</Text></Pressable></Link></View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search terminals, stops or areas" placeholderTextColor={C.muted} style={s.search}/>
      <View style={s.areaBar}><Text style={s.areaGlyph}>⌖</Text><Text style={s.areaText}>Browse area · General Trias (sample)</Text><Pressable accessibilityRole="button" onPress={() => setShowAreaOptions((value) => !value)}><Text style={s.areaChange}>{showAreaOptions ? 'Done' : 'Change'}</Text></Pressable></View>
      {showAreaOptions && <View style={s.areaOptions}>{['All areas', ...Array.from(new Set(places.map(terminalArea)))].map((area) => <Pressable key={area} onPress={() => { setNearbyArea(area); setShowAreaOptions(false); }} style={[s.chip, nearbyArea === area && s.active]}><Text style={[s.chipText, nearbyArea === area && s.white]}>{area}</Text></Pressable>)}</View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>{(['All', 'Jeepney', 'Bus', 'Tricycle'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: nearbyRide === type }} onPress={() => { setNearbyRide(type); setStoredNearbyRide(type); }} style={[s.chip, nearbyRide === type && s.active]}><Text style={[s.chipText, nearbyRide === type && s.white]}>{type}</Text></Pressable>)}</ScrollView>
      <View style={s.nearbyCount}><Text style={s.h2}>{filteredPlaces.length} terminals</Text><Text style={s.rowSub}>Sample area order</Text></View>
      {filteredPlaces.map((name) => <Link key={name} href={{ pathname: '/explore', params: { terminal: name } }} asChild><Pressable accessibilityRole="link" accessibilityLabel={`View details for ${name}`} style={s.terminalCard}><View style={s.terminalIcon}><Text style={{ color: C.green, fontSize: 17 }}>⌖</Text></View><View style={s.terminalInfo}><Text style={s.rowTitle}>{name}</Text><Text style={s.rowSub}>{terminalArea(name)} · sample stop</Text><View style={s.rideIcons}>{terminalRides(name).map((type) => <Text key={type} style={s.rideIcon}>{rideGlyph(type)}</Text>)}<Text style={s.rowSub}>· route details</Text></View></View><View style={s.terminalArrow}><Text style={s.chevron}>›</Text></View></Pressable></Link>)}
      {filteredPlaces.length === 0 && <View style={s.empty}><Text style={s.emptyTitle}>No terminals found</Text><Text style={s.sub}>Try another stop name or choose a different area or ride type.</Text><Pressable onPress={() => { setQuery(''); setNearbyArea('All areas'); setNearbyRide('All'); }} style={s.outline}><Text style={s.outlineText}>Clear filters</Text></Pressable></View>}
      <Text style={s.note}>Area selection is manual. Distances and live arrivals are not available in this guide.</Text>
    </>}

    {screen === 'saved' && <><View style={s.segment}>{(['Routes', 'Terminals'] as SavedTab[]).map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: tab === item }} key={item} onPress={() => setTab(item)} style={[s.segmentItem, tab === item && s.segmentSelected]}><Text style={s.chipText}>{item} ({savedItems.filter((saved) => saved.kind === (item === 'Routes' ? 'route' : 'terminal')).length})</Text></Pressable>)}</View>{visibleSaved.length === 0 ? <View style={s.empty}><View style={s.emptyIcon}><Text style={s.emptyGlyph}>☆</Text></View><Text style={s.emptyTitle}>No saved {tab.toLowerCase()} yet</Text><Text style={s.sub}>Save routes and stops to keep them together on this device.</Text><Link href={tab === 'Routes' ? '/plan' : '/nearby'} asChild><Pressable style={s.button}><Text style={s.white}>{tab === 'Routes' ? 'Find a route' : 'Browse terminals'}</Text></Pressable></Link></View> : visibleSaved.map((item) => <View key={item.id} style={s.savedCard}><View style={s.savedCardHead}><View style={s.terminalIcon}><Text style={s.rideIcon}>{item.kind === 'route' ? '⇄' : '⌖'}</Text></View><View style={s.savedInfo}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{item.subtitle}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.title} from saved`} onPress={() => removeSavedItem(item.id)} style={s.removeButton}><Text style={s.removeText}>Remove</Text></Pressable></View>{item.kind === 'route' && item.from && item.to ? <View style={s.savedActions}><Link href={{ pathname: '/plan', params: { from: item.from, to: item.to } }} asChild><Pressable style={s.savedActionPrimary}><Text style={s.savedActionPrimaryText}>View details ›</Text></Pressable></Link><ExternalLink href={`https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=${encodeURIComponent(`${item.from}, General Trias, Cavite`)}&destination=${encodeURIComponent(`${item.to}, General Trias, Cavite`)}`} style={s.savedAction}><Text style={s.mapDirectionsText}>Directions ↗</Text></ExternalLink></View> : <Link href={{ pathname: '/explore', params: { terminal: item.title } }} asChild><Pressable style={s.savedAction}><Text style={s.mapDirectionsText}>Terminal details ›</Text></Pressable></Link>}</View>)}<Text style={s.note}>Saved journeys and stops are stored on this device only.</Text></>}

    {screen === 'alerts' && <><View style={s.card}><Text style={s.h2}>Live departures unavailable</Text><Text style={s.sub}>No connected operator feed. The timetable below is illustrative—confirm times and routes at the terminal.</Text></View><View style={s.segment}>{(['All', 'Route updates', 'Schedules'] as const).map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: alertTab === item }} key={item} onPress={() => setAlertTab(item)} style={[s.segmentItem, alertTab === item && s.segmentSelected]}><Text style={s.chipText}>{item}</Text></Pressable>)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>{['All', 'Manggahan', 'Poblacion'].map((area) => <Pressable key={area} accessibilityRole="button" accessibilityState={{ selected: alertArea === area }} onPress={() => setAlertArea(area)} style={[s.chip, alertArea === area && s.active]}><Text style={[s.chipText, alertArea === area && s.white]}>{area}</Text></Pressable>)}</ScrollView>{!showSampleAlerts ? <View style={s.empty}><Text style={s.emptyTitle}>Sample notices are hidden</Text><Text style={s.sub}>Turn them back on in Profile if you want to preview the example board.</Text><Link href="/profile" asChild><Pressable style={s.button}><Text style={s.white}>Open travel preferences</Text></Pressable></Link></View> : <>{alertTab !== 'Route updates' && <View style={s.scheduleCard}><View style={s.scheduleHeader}><Text style={s.rowTitle}>Illustrative timetable</Text><Text style={s.badge}>SAMPLE</Text></View><Text style={s.rowSub}>Departure examples · not connected to a live schedule</Text>{getAlerts().filter((item) => item.kind === 'schedule' && (alertArea === 'All' || item.area === alertArea)).map((item) => <View key={item.label} style={s.scheduleRow}><Text style={s.scheduleTime}>{item.time}</Text><Text style={s.scheduleMode}>{rideGlyph(item.mode ?? 'Jeepney')}</Text><View style={s.scheduleInfo}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{item.body}</Text></View></View>)}<View style={s.scheduleFoot}><Text style={s.rowSub}>Times shown are examples, not a connected database.</Text></View></View>}{alertTab !== 'Schedules' && <><View style={s.nearbyCount}><Text style={s.h2}>Advisories</Text><Text style={s.rowSub}>{getAlerts().filter((item) => item.kind === 'update' && (alertArea === 'All' || item.area === alertArea)).length} examples</Text></View>{getAlerts().filter((item) => item.kind === 'update' && (alertArea === 'All' || item.area === alertArea)).map((item, index) => <View key={item.label} style={[s.alert, { borderLeftColor: [C.orange, C.gold, C.blue][index % 3] }]}><View style={s.alertHeading}><Text style={s.alertIcon}>△</Text><Text style={s.label}>{item.label}</Text><Text style={s.badge}>SAMPLE</Text></View><Text style={s.rowTitle}>{item.title}</Text><Text style={s.sub}>{item.body}</Text><Text style={s.rowSub}>{item.area} · illustrative notice</Text></View>)}</>}</>}</>}

    {screen === 'profile' && <><View style={s.profile}><View style={s.profileTop}><View style={s.avatar}><Text style={s.white}>{riderName ? riderName.trim().slice(0, 1).toUpperCase() : 'G'}</Text></View><View style={s.profileIdentity}><Text style={s.profileName}>{riderName || 'Guest commuter'}</Text><Text style={s.profileHint}>Saved on this device</Text></View><Text style={s.profileBadge}>GUEST</Text></View><View style={s.profileStats}><View style={s.profileStat}><Text style={s.statValue}>{savedItems.filter((item) => item.kind === 'route').length}</Text><Text style={s.statLabel}>saved routes</Text></View><View style={s.profileStat}><Text style={s.statValue}>{savedItems.filter((item) => item.kind === 'terminal').length}</Text><Text style={s.statLabel}>saved stops</Text></View><View style={s.profileStat}><Text style={s.statValue}>{recentTrips.length}</Text><Text style={s.statLabel}>recent trips</Text></View></View><Link href={{ pathname: '/account', params: { returnTo: 'profile' } }} asChild><Pressable accessibilityRole="link" style={s.profileAction}><Text style={s.profileActionText}>Edit rider profile</Text></Pressable></Link></View><Text style={s.h2}>Travel preferences</Text><View style={s.card}><Text style={s.label}>DEFAULT RIDE TYPES</Text><View style={s.pills}>{(['All', 'Jeepney', 'Bus', 'Tricycle', 'Walk'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: defaultRide === type }} onPress={() => chooseDefaultRide(type)} style={[s.chip, defaultRide === type && s.active]}><Text style={[s.chipText, defaultRide === type && s.white]}>{rideGlyph(type)}  {type}</Text></Pressable>)}</View><View style={s.cardDivider}/><Text style={s.label}>ROUTE PREFERENCE</Text><View style={s.segment}>{(['Fewest transfers', 'Lowest sample fare', 'Shortest estimate'] as const).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: preference === item }} onPress={() => chooseTripPreference(item)} style={[s.segmentItem, preference === item && s.segmentSelected]}><Text style={s.chipText}>{item}</Text></Pressable>)}</View><View style={s.setting}><View style={s.preferenceCopy}><Text style={s.rowTitle}>Show sample service notices</Text><Text style={s.rowSub}>Controls example cards in Alerts. No push notifications are sent.</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: showSampleAlerts }} onPress={() => { const next = !showSampleAlerts; setShowSampleAlerts(next); setPreference('showSampleAlerts', next); }} style={[s.toggle, showSampleAlerts && s.toggleOn]}><View style={[s.toggleKnob, showSampleAlerts && s.toggleKnobOn]}/></Pressable></View></View><View style={s.card}><Text style={s.label}>ABOUT THIS GUIDE</Text><Text style={s.sub}>This offline guide has a limited illustrative route list. Fares, travel times, and service notices are estimates; there is no live vehicle tracking, traffic feed, or verified departure schedule.</Text></View></>}
  </ScrollView></SafeAreaView>;
}

function terminalRides(name: string): Ride[] {
  if (name.includes('Manggahan') || name.includes('Javalera') || name.includes('Biclatan') || name.includes('Santiago')) return ['Jeepney', 'Tricycle'];
  return ['Jeepney', 'Bus'];
}

function setStoredNearbyRide(type: Ride | 'All') {
  setPreference('nearbyRide', type);
}

function tripSaveId(trip: Trip, from: string, to: string) {
  return `route:${trip.id}:${from}->${to}`;
}

type AlertItem = { kind: 'update' | 'schedule'; area: string; label: string; title: string; body: string; time?: string; mode?: Ride };

function getAlerts(): AlertItem[] {
  return [
    { kind: 'schedule', area: 'Manggahan', label: 'GOVERNOR’S DRIVE', title: 'Toward Bacao I', body: 'Illustrative departure · confirm at terminal', time: '05:10', mode: 'Jeepney' },
    { kind: 'schedule', area: 'Poblacion', label: 'ARNALDO HIGHWAY', title: 'Toward Pasong Camachile', body: 'Illustrative departure · confirm at terminal', time: '05:25', mode: 'Bus' },
    { kind: 'schedule', area: 'Manggahan', label: 'MANGGAHAN–JAVALERA', title: 'Toward Javalera', body: 'Illustrative departure · confirm at terminal', time: '05:40', mode: 'Tricycle' },
    { kind: 'update', area: 'Manggahan', label: 'SAMPLE · MANGGAHAN', title: 'Road delay example', body: 'Allow extra time along Governor’s Drive. This is an example notice, not a live report.' },
    { kind: 'update', area: 'Poblacion', label: 'SAMPLE · POBLACION', title: 'Town center congestion example', body: 'Illustrative notice for the modelled local corridor. Confirm current conditions on site.' },
    { kind: 'update', area: 'All', label: 'SAMPLE · GENERAL TRIAS', title: 'Temporary loading area example', body: 'Confirm current loading points with your driver.' },
  ];
}

function terminalArea(name: string) {
  if (name.includes('Manggahan')) return 'Manggahan';
  if (name.includes('Poblacion') || name.includes('Governor Ferrer')) return 'Governor Ferrer';
  if (name.includes('Pasong')) return 'Pasong Camachile';
  if (name.includes('Javalera')) return 'Javalera';
  if (name.includes('Bacao')) return 'Bacao I';
  if (name.includes('Biclatan')) return 'Biclatan';
  if (name.includes('Navarro')) return 'Navarro';
  if (name.includes('Santiago')) return 'Santiago';
  return 'General Trias';
}

function rideGlyph(type: Ride | 'All') {
  return ({ All: '◉', Jeepney: '⌘', Bus: '▣', Tricycle: '♧', Walk: '♙' })[type];
}

const legacyStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper }, head: { paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderColor: C.line }, headInner: { width: '100%', maxWidth: 760, alignSelf: 'center' }, title: { fontSize: 24, fontWeight: '900', color: C.ink }, sub: { fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 4 }, body: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 }, card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 14, marginBottom: 13 }, label: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: C.muted, marginTop: 7 }, input: { height: 43, borderBottomWidth: 1, borderColor: C.line, color: C.ink, fontSize: 14 }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 10 }, chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, chipChosen: { backgroundColor: '#E9E2D3' }, chipText: { fontSize: 11, fontWeight: '700', color: C.ink }, active: { backgroundColor: C.ink, borderColor: C.ink }, selected: { backgroundColor: C.orange, borderColor: C.orange }, white: { color: '#fff', fontSize: 12, fontWeight: '800' }, h2: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 12, marginBottom: 2 }, segment: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#E8E0CF', borderRadius: 12, padding: 4, marginTop: 8, marginBottom: 14 }, segmentItem: { flex: 1, minWidth: 95, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 9 }, segmentSelected: { backgroundColor: C.card }, row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginTop: 7, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, rowTitle: { fontSize: 13, fontWeight: '700', color: C.ink }, rowSub: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 4 }, badge: { borderWidth: 1, borderColor: C.line, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, fontSize: 8, fontWeight: '800', color: C.ink }, button: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: C.orange, borderRadius: 10, marginTop: 10 }, outline: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink, borderRadius: 10, marginTop: 7 }, outlineText: { color: C.ink, fontWeight: '700', fontSize: 12 }, notice: { fontSize: 12, lineHeight: 18, color: C.ink, marginTop: 8, padding: 10, backgroundColor: '#E5EAD9', borderRadius: 8 }, search: { height: 48, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.card, paddingHorizontal: 13, marginTop: 12, color: C.ink }, empty: { alignItems: 'center', padding: 24, marginTop: 14, borderWidth: 1, borderRadius: 14, borderColor: C.line, backgroundColor: C.card }, save: { color: C.ink, fontSize: 16, padding: 8 }, saveButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, removeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 }, removeText: { color: C.orange, fontSize: 11, fontWeight: '800' }, note: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 12 }, alert: { borderLeftWidth: 4, borderRadius: 12, padding: 14, backgroundColor: C.card, marginTop: 9 }, profile: { backgroundColor: C.ink, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' }, profileEdit: { minWidth: 46, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#91A59C', borderRadius: 9 }, profileEditText: { color: C.card, fontWeight: '800', fontSize: 12 }, preferenceCheck: { color: C.green, fontSize: 18, paddingHorizontal: 8 }, setting: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line, paddingVertical: 8 }, terminalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEE5D2', alignItems: 'center', justifyContent: 'center' }, recent: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 12 }, recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }, recentItem: { paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }, mapDirections: { alignSelf: 'flex-start', paddingVertical: 8 }, mapDirectionsText: { color: C.green, fontSize: 11, fontWeight: '800' },
});

const s = StyleSheet.create({
  ...legacyStyles,
  safe: { flex: 1, backgroundColor: C.paper },
  head: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.paper, borderBottomWidth: 1, borderColor: C.line },
  headInner: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { fontSize: 23, lineHeight: 28, fontWeight: '900', color: C.ink },
  sub: { fontSize: 11, lineHeight: 16, color: C.muted, marginTop: 4 },
  body: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 112, gap: 9 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 15, marginBottom: 4 },
  label: { fontSize: 8, fontWeight: '900', letterSpacing: 1, color: C.muted, marginTop: 5 },
  input: { height: 46, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, color: C.ink, fontSize: 13, backgroundColor: C.card, marginTop: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 9 },
  chip: { minHeight: 34, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipChosen: { backgroundColor: '#E8EEE8' },
  chipText: { fontSize: 10, fontWeight: '800', color: C.ink },
  active: { backgroundColor: C.ink, borderColor: C.ink },
  selected: { backgroundColor: C.ink, borderColor: C.ink },
  white: { color: '#fff', fontSize: 12, fontWeight: '800' },
  h2: { fontSize: 16, lineHeight: 21, fontWeight: '900', color: C.ink, marginTop: 8, marginBottom: 2 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#EAE7DE', borderRadius: 12, padding: 4, marginTop: 8, marginBottom: 11 },
  segmentItem: { flex: 1, minWidth: 90, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 9 },
  segmentSelected: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 7, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  rowTitle: { fontSize: 12, lineHeight: 16, fontWeight: '800', color: C.ink },
  rowSub: { fontSize: 9, lineHeight: 13, color: C.muted, marginTop: 3 },
  badge: { overflow: 'hidden', borderWidth: 1, borderColor: C.line, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, fontSize: 7, fontWeight: '900', letterSpacing: 0.4, color: C.muted },
  button: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: C.ink, borderRadius: 11, marginTop: 9 },
  outline: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: 11, marginTop: 8, paddingHorizontal: 12 },
  outlineText: { color: C.ink, fontWeight: '800', fontSize: 11 },
  notice: { fontSize: 11, lineHeight: 16, color: C.ink, marginTop: 8, padding: 11, backgroundColor: '#E7EEE8', borderRadius: 10 },
  search: { height: 46, borderWidth: 1, borderColor: C.line, borderRadius: 11, backgroundColor: C.card, paddingHorizontal: 13, marginTop: 9, color: C.ink, fontSize: 12 },
  empty: { alignItems: 'center', padding: 19, marginTop: 8, borderWidth: 1, borderRadius: 16, borderColor: C.line, backgroundColor: C.card },
  save: { color: C.ink, fontSize: 16, padding: 8 },
  saveButton: { minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F3F4EE' },
  removeButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 7 },
  removeText: { color: C.orange, fontSize: 10, fontWeight: '800' },
  note: { fontSize: 9, lineHeight: 14, color: C.muted, marginTop: 10, paddingHorizontal: 3 },
  alert: { borderLeftWidth: 3, borderRadius: 13, borderWidth: 1, borderColor: C.line, padding: 13, backgroundColor: C.card, marginTop: 8 },
  profile: { backgroundColor: C.ink, padding: 15, borderRadius: 17, gap: 13 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#31554A', alignItems: 'center', justifyContent: 'center' },
  setting: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, paddingVertical: 9 },
  terminalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E8EEE8', alignItems: 'center', justifyContent: 'center' },
  recent: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginTop: 10 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 },
  recentItem: { paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  mapDirections: { alignSelf: 'flex-start', paddingVertical: 8 },
  mapDirectionsText: { color: C.green, fontSize: 10, fontWeight: '900' },
  resultCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 13, marginTop: 8 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  resultMetric: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  resultMinutes: { fontSize: 25, fontWeight: '900', color: C.ink },
  metricUnit: { fontSize: 9, color: C.muted, fontWeight: '700' },
  resultLabels: { flex: 1, minWidth: 0 },
  resultRoute: { color: C.ink, fontSize: 11, fontWeight: '900' },
  recommended: { color: C.orange, fontSize: 7, fontWeight: '900', letterSpacing: 0.5, backgroundColor: '#F9E9E2', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4 },
  modeSequence: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEEAE0', marginTop: 8 },
  modeStep: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, backgroundColor: '#EDF1EB' },
  modeGlyph: { color: C.green, fontSize: 12 },
  modeName: { color: C.ink, fontSize: 8, fontWeight: '800' },
  resultBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  resultFare: { flex: 1, color: C.ink, fontSize: 11, fontWeight: '900' },
  sampleCaption: { color: C.muted, fontSize: 8, marginTop: 4 },
  emptyIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#E8EEE8', marginBottom: 10 },
  emptyGlyph: { color: C.green, fontSize: 26 },
  emptyTitle: { color: C.ink, fontSize: 15, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  modeledList: { alignSelf: 'stretch', marginTop: 13, padding: 11, borderRadius: 11, backgroundColor: '#F5F4EF' },
  modeledRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  modeledGlyph: { color: C.green, fontSize: 14 },
  modeledText: { color: C.ink, fontSize: 10, fontWeight: '700' },
  nearbyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  mapButtonGlyph: { fontSize: 19, color: C.ink },
  areaBar: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  areaGlyph: { color: C.muted, fontSize: 13 },
  areaText: { flex: 1, color: C.muted, fontSize: 9 },
  areaChange: { color: C.green, fontSize: 10, fontWeight: '900', padding: 7 },
  areaOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  nearbyCount: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 },
  terminalCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, marginTop: 7 },
  terminalInfo: { flex: 1, minWidth: 0 },
  rideIcons: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  rideIcon: { color: C.green, fontSize: 12, fontWeight: '800' },
  terminalArrow: { width: 27, alignItems: 'center' },
  chevron: { color: C.ink, fontSize: 23 },
  scheduleCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 13, marginTop: 10 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleRow: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, marginTop: 7, paddingTop: 7 },
  scheduleTime: { width: 42, color: C.ink, fontSize: 10, fontWeight: '900' },
  scheduleMode: { width: 22, color: C.green, fontSize: 13 },
  scheduleInfo: { flex: 1 },
  scheduleFoot: { padding: 9, borderRadius: 8, backgroundColor: '#F3F1EA', marginTop: 8 },
  alertHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  alertIcon: { color: C.orange, fontSize: 13, fontWeight: '900' },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileIdentity: { flex: 1 },
  profileName: { color: C.card, fontSize: 13, fontWeight: '900' },
  profileHint: { color: '#D2DDD7', fontSize: 9, marginTop: 3 },
  profileBadge: { color: '#C9D9D1', borderWidth: 1, borderColor: '#577065', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4, fontSize: 7, fontWeight: '900' },
  profileStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  profileStat: { flex: 1 },
  statValue: { color: C.card, fontSize: 17, fontWeight: '900' },
  statLabel: { color: '#CCD9D2', fontSize: 8, marginTop: 2 },
  profileAction: { minHeight: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderRadius: 9 },
  profileActionText: { color: C.ink, fontSize: 10, fontWeight: '900' },
  cardDivider: { height: 1, backgroundColor: C.line, marginVertical: 8 },
  preferenceCopy: { flex: 1 },
  toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: '#B9BDB7', padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: C.green },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  savedCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 12, marginTop: 9 },
  savedCardHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  savedInfo: { flex: 1 },
  savedActions: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: '#EEEAE0', marginTop: 8, paddingTop: 6 },
  savedActionPrimary: { minHeight: 36, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: C.ink },
  savedActionPrimaryText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  savedAction: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 },
});
