import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPreference, removeSavedItem, setPreference, toggleSavedItem, usePreferenceRevision, useSavedItems } from '@/lib/saved-items';
import { ExternalLink } from '@/components/external-link';
import * as Location from 'expo-location';
import { distanceKm, findNetworkTrips, findNetworkTripsViaMany, generalTrias, getBarangayName, getRoutePreview, modeLabelsForStop, networkDisclaimer, networkLocations, rideLabel, ridesForTerminal } from '@/data/general-trias';

const C = { paper: '#F4F2EA', card: '#FFFFFF', ink: '#10372E', muted: '#66736E', line: '#E3DED3', orange: '#F05A2A', green: '#438875', gold: '#E7AE28', blue: '#5277BB' };
type Ride = 'Jeepney' | 'Bus' | 'Tricycle' | 'Walk' | 'UV Express';
type Trip = ReturnType<typeof findNetworkTrips>[number];
const places = networkLocations.map((location) => location.name);
const nearbyLocations = networkLocations;
const alertAreas = ['All', ...Array.from(new Set([
  ...generalTrias.stops.filter((stop) => generalTrias.routes.some((route) => route.stopIds.includes(stop.id))).map((stop) => getBarangayName(stop.barangayId)),
  ...generalTrias.tricycleZones.flatMap((zone) => zone.barangayIds.map((id) => getBarangayName(id))),
]))];
type Screen = 'plan' | 'saved' | 'nearby' | 'alerts' | 'profile';
type SavedTab = 'Routes' | 'Terminals';

export default function GuideScreen({ screen }: { screen: Screen }) {
  const params = useLocalSearchParams<{ from?: string; to?: string; via?: string }>();
  const savedItems = useSavedItems();
  usePreferenceRevision();
  const [from, setFrom] = useState(typeof params.from === 'string' && places.includes(params.from) ? params.from : '');
  const [to, setTo] = useState(typeof params.to === 'string' && places.includes(params.to) ? params.to : '');
  const [ride, setRide] = useState<Ride | 'All'>(() => getPreference('defaultRide', 'All'));
  const [preference, setPreferenceState] = useState<'Fewest transfers' | 'Lowest sample fare' | 'Shortest estimate'>(() => getPreference('tripPreference', 'Shortest estimate'));
  const [defaultRide, setDefaultRide] = useState<Ride | 'All'>(() => getPreference('defaultRide', 'All'));
  const [searched, setSearched] = useState(false);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const searchTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [optionalStops, setOptionalStops] = useState<string[]>(() => typeof params.via === 'string' ? params.via.split('|').filter((place) => places.includes(place)) : []);
  const [placePickerFor, setPlacePickerFor] = useState<'from' | 'to' | number | null>(null);
  const [showDepartureOptions, setShowDepartureOptions] = useState(false);
  const [departureChoice, setDepartureChoice] = useState('Leave now');
  const [tab, setTab] = useState<SavedTab>('Routes');
  const [alertTab, setAlertTab] = useState('All');
  const [query, setQuery] = useState('');
  const [nearbyRide, setNearbyRide] = useState<Ride | 'All'>(getPreference('nearbyRide', 'All'));
  const [nearbyArea, setNearbyArea] = useState('All areas');
  const [showAreaOptions, setShowAreaOptions] = useState(false);
  const [showLocationRationale, setShowLocationRationale] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const [alertRetryMessage, setAlertRetryMessage] = useState('');
  const [alertArea, setAlertArea] = useState('All');
  const [notice, setNotice] = useState('');
  const [recentTrips, setRecentTrips] = useState<{ from: string; to: string }[]>(() => getPreference('recentTrips', []));
  const [showSampleAlerts, setShowSampleAlerts] = useState(() => getPreference('showSampleAlerts', true));
  const riderName = getPreference<string>('riderName', '');
  useEffect(() => () => searchTimers.current.forEach(clearTimeout), []);
  const pickerQuery = placePickerFor === 'from' ? from : placePickerFor === 'to' ? to : typeof placePickerFor === 'number' ? optionalStops[placePickerFor] ?? '' : '';
  const placeSuggestions = placePickerFor !== null ? networkLocations
    .filter((location) => pickerQuery ? location.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()) : location.kind === 'terminal')
    .slice(0, 18) : [];

  const title = { plan: 'Plan a trip', saved: 'Saved', nearby: 'Nearby', alerts: 'Alerts & departures', profile: 'Profile' }[screen];
  const subtitle = { plan: 'General Trias, Cavite · local route guide', saved: 'Stored on this device', nearby: 'Sample stops · General Trias, Cavite', alerts: 'Sample notices · no live service feed', profile: 'On-device profile and travel preferences' }[screen];
  const matchingTrips = useMemo(() => {
    if (!searched || !from || !to) return [];
    const fromLocation = networkLocations.find((location) => location.name === from);
    const toLocation = networkLocations.find((location) => location.name === to);
    if (!fromLocation || !toLocation) return [];
    const viaLocations = optionalStops.filter(Boolean).map((name) => networkLocations.find((location) => location.name === name)).filter((location): location is (typeof networkLocations)[number] => Boolean(location));
    const matches = viaLocations.length ? findNetworkTripsViaMany(fromLocation, viaLocations, toLocation, ride) : findNetworkTrips(fromLocation, toLocation, ride);
    return matches.sort((a, b) => preference === 'Lowest sample fare' ? a.fare - b.fare : preference === 'Shortest estimate' ? a.minutes - b.minutes : a.transfers - b.transfers).slice(0, 3);
  }, [from, to, optionalStops, ride, preference, searched]);

  const saveTrip = (trip: Trip) => toggleSavedItem({ id: tripSaveId(trip, from, to), kind: 'route', title: `${from} → ${to}`, subtitle: `${trip.routeCodes.join(', ')} · ${tripFareLabel(trip)} estimated · ${trip.minutes} min`, from, to });
  const pickPlace = (place: string) => {
    if (typeof placePickerFor === 'number') {
      setOptionalStops((current) => current.map((stop, index) => index === placePickerFor ? place : stop));
    } else if (placePickerFor === 'to') {
      setTo(place);
      if (from === place) setFrom('');
    } else {
      setFrom(place);
      if (to === place) setTo('');
    }
    setSearched(false);
    setNotice('');
    setPlacePickerFor(null);
  };
  const selectedRide = (type: Ride) => setRide((current) => current === type ? 'All' : type);
  const searchTrips = () => {
    searchTimers.current.forEach(clearTimeout);
    searchTimers.current = [];
    setSelectedTripId(null);
    setSearched(false);
    setIsSearchingRoute(false);
    setSearchProgress(0);
    if (!from || !to) {
      setNotice('Choose both an origin and a destination to see matching General Trias routes.');
      return;
    }
    if (from === to) {
      setNotice('Choose two different places or stops.');
      return;
    }
    if (optionalStops.some((stop) => !networkLocations.some((location) => location.name === stop)) || !networkLocations.some((location) => location.name === from) || !networkLocations.some((location) => location.name === to)) {
      setNotice('Choose locations from the General Trias suggestions.');
      return;
    }
    const recent = [{ from, to }, ...recentTrips.filter((item) => item.from !== from || item.to !== to)].slice(0, 5);
    setRecentTrips(recent);
    setPreference('recentTrips', recent);
    setNotice('');
    setIsSearchingRoute(true);
    [20, 45, 72, 100].forEach((progress, index) => {
      searchTimers.current.push(setTimeout(() => {
        setSearchProgress(progress);
        if (progress === 100) {
          setIsSearchingRoute(false);
          setSearched(true);
        }
      }, (index + 1) * 110));
    });
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
  const requestNearbyLocation = async () => {
    setShowLocationRationale(false);
    setIsRequestingLocation(true);
    setLocationNotice('Finding the closest barangay...');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationNotice('Location permission was not granted. Choose a barangay manually.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const nearestBarangay = generalTrias.barangays.reduce((nearest, item) => {
        const origin = { lat: current.coords.latitude, lng: current.coords.longitude };
        return distanceKm(origin, item) < distanceKm(origin, nearest) ? item : nearest;
      }, generalTrias.barangays[0]);
      setNearbyArea(nearestBarangay.name);
      setShowAreaOptions(false);
      setLocationNotice(`Showing nearby places around ${nearestBarangay.name}. Your coordinates are not saved.`);
    } catch {
      setLocationNotice('Could not get your location. Choose a barangay manually.');
    } finally {
      setIsRequestingLocation(false);
    }
  };
  const filteredPlaces = nearbyLocations.filter((location) => location.name.toLowerCase().includes(query.trim().toLowerCase()) && (nearbyRide === 'All' || locationRides(location).includes(nearbyRide)) && (nearbyArea === 'All areas' || getBarangayName(location.barangayId) === nearbyArea));
  const nearbyAreas = ['All areas', ...generalTrias.barangays.map((item) => item.name)];
  const visibleSaved = savedItems.filter((item) => item.kind === (tab === 'Routes' ? 'route' : 'terminal'));

  if (screen === 'plan') {
    return <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.planHeader}>
        <Link href={'/' as Href} asChild><Pressable accessibilityRole="link" accessibilityLabel="Back to Home" style={s.planBack}><Text style={s.planBackGlyph}>‹</Text></Pressable></Link>
        <View style={s.planHeading}><Text style={s.planTitle}>Plan your trip</Text><Text style={s.planSubtitle}>Cavite · sample network</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Reset ride filters" onPress={() => setRide('All')} style={s.planHeaderAction}><Text style={s.planHeaderActionText}>☷</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={s.planContent} keyboardShouldPersistTaps="handled">
        <View style={s.planLocationCard}>
          <View style={s.planPlaceRow}>
            <View style={s.planOriginDot}/>
            <View style={s.planPlaceCopy}>
              <Text style={s.planFieldLabel}>STARTING POINT</Text>
              <TextInput accessibilityLabel="Starting point" value={from} onFocus={() => setPlacePickerFor('from')} onChangeText={(value) => { setFrom(value); setSearched(false); setPlacePickerFor('from'); }} placeholder="Choose a starting point" placeholderTextColor="#7B8881" style={s.planInput} />
            </View>
          </View>
          <View style={s.planPlaceDivider}/>
          <View style={s.planPlaceRow}>
            <View style={s.planDestinationDiamond}/>
            <View style={s.planPlaceCopy}>
              <Text style={s.planFieldLabel}>DESTINATION</Text>
              <TextInput accessibilityLabel="Destination" value={to} onFocus={() => setPlacePickerFor('to')} onChangeText={(value) => { setTo(value); setSearched(false); setPlacePickerFor('to'); }} placeholder="Choose a destination" placeholderTextColor="#7B8881" style={s.planInput} />
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Swap start and destination" onPress={() => { setFrom(to); setTo(from); setSearched(false); }} style={s.planSwap}><Text style={s.planSwapGlyph}>⇄</Text></Pressable>
        </View>

        {placePickerFor !== null && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.placePickerRow}>
          {placeSuggestions.map((place) => <Pressable key={place.id} accessibilityRole="button" onPress={() => pickPlace(place.name)} style={s.placePickerChip}><Text style={s.placePickerChipText}>{shortTerminal(place.name)}</Text></Pressable>)}
        </ScrollView>}

        {optionalStops.map((stop, index) => <View key={index} style={s.optionalStopRow}><TextInput accessibilityLabel={'Optional stop ' + (index + 1)} value={stop} onFocus={() => setPlacePickerFor(index)} onChangeText={(value) => { setOptionalStops((current) => current.map((item, stopIndex) => stopIndex === index ? value : item)); setSearched(false); setPlacePickerFor(index); }} placeholder={'Search stop ' + (index + 1)} placeholderTextColor="#7B8881" style={s.optionalStopInput}/><Pressable accessibilityRole="button" accessibilityLabel={'Remove stop ' + (index + 1)} onPress={() => { setOptionalStops((current) => current.filter((_, stopIndex) => stopIndex !== index)); setPlacePickerFor((current) => current === index ? null : typeof current === 'number' && current > index ? current - 1 : current); setSearched(false); setNotice(''); }} style={s.removeButton}><Text style={s.removeText}>Remove</Text></Pressable></View>)}
        {optionalStops.length < 5 && <View style={s.addStopRow}><Pressable accessibilityRole="button" accessibilityLabel="Add another stop" onPress={() => { const index = optionalStops.length; setOptionalStops((current) => [...current, '']); setPlacePickerFor(index); setSearched(false); setNotice(''); }} style={s.addStopButton}><Text style={s.addStopPlus}>+</Text><Text style={s.addStopText}>Add a stop</Text></Pressable><Text style={s.optionalLabel}>Optional · {optionalStops.length}/5</Text></View>}

        <View style={s.planSectionHeading}><Text style={s.planSectionTitle}>Ride types</Text><Text style={s.planSectionMeta}>{ride === 'All' ? '4 selected' : '1 selected'}</Text></View>
        <View style={s.planRides}>{(['Jeepney', 'Bus', 'UV Express', 'Tricycle'] as const).map((type) => {
          const selected = ride === 'All' || ride === type;
          return <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { selectedRide(type); setSearched(false); }} style={[s.planRideChip, selected && s.planRideChipSelected]}>
            <Text style={[s.planRideGlyph, selected && s.planRideGlyphSelected]}>{rideGlyph(type)}</Text><Text style={[s.planRideText, selected && s.planRideTextSelected]}>{type}</Text>
          </Pressable>;
        })}</View>

        <View style={s.planSectionHeading}><Text style={s.planSectionTitle}>Preference</Text></View>
        <View style={s.planPreferenceBar}>{([
          { label: 'Fastest', value: 'Shortest estimate' },
          { label: 'Fewest transfers', value: 'Fewest transfers' },
          { label: 'Lowest fare', value: 'Lowest sample fare' },
        ] as const).map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: preference === option.value }} onPress={() => chooseTripPreference(option.value)} style={[s.planPreference, preference === option.value && s.planPreferenceActive]}>
          <Text style={[s.planPreferenceText, preference === option.value && s.planPreferenceTextActive]}>{option.label}</Text>
        </Pressable>)}</View>
        <Text style={s.planPreferenceHint}>We prioritise the {preference === 'Shortest estimate' ? 'shortest total travel time, including walking.' : preference === 'Fewest transfers' ? 'fewest transfers across the available sample routes.' : 'lowest estimated fare across the sample routes.'}</Text>

        <View style={s.tripSettingsCard}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDepartureOptions }} onPress={() => setShowDepartureOptions((current) => !current)} style={s.tripSettingRow}>
            <Text style={s.settingGlyph}>◷</Text><Text style={s.settingLabel}>Departure</Text><Text style={s.settingValue}>{departureChoice}</Text><Text style={s.settingChevron}>›</Text>
          </Pressable>
          {showDepartureOptions && <View style={s.departureChoices}>{['Leave now', 'Set a time'].map((choice) => <Pressable key={choice} accessibilityRole="button" accessibilityState={{ selected: departureChoice === choice }} onPress={() => { setDepartureChoice(choice); setShowDepartureOptions(false); }} style={s.departureChoice}><Text style={[s.departureChoiceText, departureChoice === choice && s.departureChoiceTextSelected]}>{choice}</Text></Pressable>)}</View>}
          <Pressable accessibilityRole="button" onPress={() => setNotice('Location access is not connected. Choose a starting point from the sample network.')} style={s.tripSettingRow}>
            <Text style={s.settingGlyph}>⌖</Text><Text style={s.settingLabel}>Use my current location</Text><Text style={s.settingChevron}>›</Text>
          </Pressable>
          <Link href="/explore" asChild><Pressable accessibilityRole="link" style={StyleSheet.flatten([s.tripSettingRow, s.tripSettingRowLast])}>
            <Text style={s.settingGlyph}>⚑</Text><Text style={s.settingLabel}>Network coverage</Text><Text style={s.settingValue}>General Trias network</Text><Text style={s.settingChevron}>›</Text>
          </Pressable></Link>
        </View>

        {recentTrips.length > 0 && <View style={s.recent}><View style={s.recentHeader}><Text style={s.rowTitle}>Recent searches</Text><Pressable accessibilityRole="button" onPress={() => { setRecentTrips([]); setPreference('recentTrips', []); }}><Text style={s.removeText}>Clear</Text></Pressable></View>{recentTrips.map((item, index) => <Pressable accessibilityRole="button" key={`${item.from}-${item.to}-${index}`} onPress={() => { setFrom(item.from); setTo(item.to); setSearched(false); setNotice(''); }} style={s.recentItem}><Text style={s.rowTitle}>{item.from} → {item.to}</Text><Text style={s.rowSub}>Tap to plan again</Text></Pressable>)}</View>}

        {isSearchingRoute && <View accessibilityRole="progressbar" accessibilityLabel="Searching sample routes" accessibilityValue={{ min: 0, max: 100, now: searchProgress }} style={s.searchLoadingCard}>
          <View style={s.searchLoadingHeading}><Text style={s.rowTitle}>Finding routes...</Text><Text style={s.searchPercent}>{searchProgress}%</Text></View>
          <View style={s.searchProgressTrack}><View style={[s.searchProgressFill, { width: `${searchProgress}%` }]}/></View>
        </View>}
        {notice ? <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text> : null}
        {searched && from && to && from !== to && <>
          <View style={s.resultsHeading}><Text style={s.planSectionTitle}>{matchingTrips.length} route {matchingTrips.length === 1 ? 'option' : 'options'}</Text><Text style={s.illustrativeBadge}>ILLUSTRATIVE</Text></View>
          {matchingTrips.length ? matchingTrips.map((trip, index) => <View key={trip.id} style={s.resultCard}>
            <View style={s.resultTop}><View style={s.resultMetric}><Text style={s.resultMinutes}>{trip.minutes}</Text><Text style={s.metricUnit}>min</Text></View><View style={s.resultLabels}><Text style={s.resultRoute}>{from} → {to}</Text><Text style={s.rowSub}>{trip.transfers === 0 ? 'Direct' : `${trip.transfers} transfer${trip.transfers > 1 ? 's' : ''}`} · sample estimate</Text></View><Text style={s.recommended}>{index === 0 ? 'BEST MATCH' : 'ALTERNATIVE'}</Text></View>
            <View style={s.modeSequence}>{trip.rides.map((mode, index) => <View key={`${mode}-${index}`} style={s.modeStep}><Text style={s.modeGlyph}>{rideGlyph(mode)}</Text><Text style={s.modeName}>{mode}</Text></View>)}</View>
            <View style={s.resultBottom}><Text style={s.resultFare}>{tripFareLabel(trip)} estimated</Text><ExternalLink href={`https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=${encodeURIComponent(`${from}, General Trias, Cavite`)}&destination=${encodeURIComponent(`${to}, General Trias, Cavite`)}`} style={s.mapDirections}><Text style={s.mapDirectionsText}>Directions ↗</Text></ExternalLink><Pressable accessibilityRole="button" accessibilityLabel={savedItems.some((item) => item.id === tripSaveId(trip, from, to)) ? 'Remove saved trip' : 'Save trip'} onPress={() => saveTrip(trip)} style={s.saveButton}><Text style={s.save}>{savedItems.some((item) => item.id === tripSaveId(trip, from, to)) ? '★' : '☆'}</Text></Pressable></View>
            <Text style={s.sampleCaption}>{trip.routeCodes.join(" · ")} · {trip.stopNames.join(" → ")} · {trip.headwayMin ? `every ${trip.headwayMin} min` : `service ${trip.firstTrip}–${trip.lastTrip}`}</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: selectedTripId === trip.id }} onPress={() => setSelectedTripId(selectedTripId === trip.id ? null : trip.id)} style={s.detailsToggle}><Text style={s.detailsToggleText}>{selectedTripId === trip.id ? 'Hide route details' : 'View details'}  ›</Text></Pressable>
            {selectedTripId === trip.id && <View style={s.tripDetail}><Text style={s.detailHeading}>Your route</Text><Text style={s.rowTitle}>{from} → {to}</Text><Text style={s.rowSub}>Travel via {trip.road} using {trip.rides.join(" and ")}. Fare {tripFareLabel(trip)} estimated; about {trip.minutes} min. Service {trip.firstTrip}–{trip.lastTrip}. Operators: {trip.operators.join(", ")}.</Text></View>}
          </View>) : <View style={s.emptyResults}>
            <View style={s.emptyResultsIcon}><Text style={s.emptyResultsGlyph}>⌕</Text></View>
            <Text style={s.emptyResultsTitle}>Walang nahanap — nothing found</Text>
            <Text style={s.emptyResultsCopy}>No sample route connects these selected locations. This guide only models General Trias corridors.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setFrom(''); setTo(''); setOptionalStops([]); setSearched(false); setNotice(''); }} style={s.emptyResultsPrimary}><Text style={s.white}>Change locations</Text></Pressable>
            <Text style={s.label}>MODELLED CORRIDORS</Text>
            {generalTrias.routes.slice(0, 3).map((route) => { const trip = getRoutePreview(route); return <Pressable key={route.id} accessibilityRole="button" onPress={() => { setFrom(trip.from); setTo(trip.to); setOptionalStops([]); setRide('All'); setNotice(''); setSearched(false); searchTimers.current.forEach(clearTimeout); setIsSearchingRoute(true); setSearchProgress(20); searchTimers.current = [setTimeout(() => { setSearchProgress(100); setIsSearchingRoute(false); setSearched(true); }, 250)]; }} style={s.modeledRow}><Text style={s.modeledGlyph}>⇄</Text><Text style={s.modeledText}>{trip.from} → {trip.to}</Text></Pressable>; })}
          </View>}
        </>}
        <Text style={s.planFooterNote}>{networkDisclaimer}</Text>
      </ScrollView>

      <View style={[s.planDock, Platform.OS === 'web' && s.planDockWeb]}>
        <Pressable accessibilityRole="button" onPress={searchTrips} style={s.planFindButton}><Text style={s.planFindText}>⌕  Find routes</Text></Pressable>
        <Text style={s.planDockNote}>Illustrative estimates · confirm routes and schedules locally.</Text>
      </View>
    </SafeAreaView>;
  }

  return <SafeAreaView style={s.safe} edges={['top']}><View style={s.head}><View style={s.headInner}><Text style={s.title}>{title}</Text><Text style={s.sub}>{subtitle}</Text></View></View><ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">


    {screen === 'nearby' && <>
      <View style={s.nearbyHeading}><View><Text style={s.h2}>General Trias network</Text><Text style={s.sub}>Terminals and boarding stops · sample data</Text></View><Link href="/explore" asChild><Pressable accessibilityRole="link" accessibilityLabel="Open map explorer" style={s.mapButton}><Text style={s.mapButtonGlyph}>⌖</Text></Pressable></Link></View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search terminals, stops or areas" placeholderTextColor={C.muted} style={s.search}/>
      <View style={s.areaBar}><Text style={s.areaGlyph}>⌖</Text><Text style={s.areaText}>Barangay · General Trias</Text><Pressable accessibilityRole="button" disabled={isRequestingLocation} onPress={() => setShowLocationRationale(true)}><Text style={s.areaChange}>{isRequestingLocation ? 'Finding...' : 'Use location'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setShowAreaOptions((value) => !value)}><Text style={s.areaChange}>{showAreaOptions ? 'Done' : 'Change'}</Text></Pressable></View>
      {locationNotice ? <Text accessibilityLiveRegion="polite" style={s.locationNotice}>{locationNotice}</Text> : null}
      {showAreaOptions && <View style={s.areaOptions}>{nearbyAreas.map((area) => <Pressable key={area} onPress={() => { setNearbyArea(area); setShowAreaOptions(false); }} style={[s.chip, nearbyArea === area && s.active]}><Text style={[s.chipText, nearbyArea === area && s.white]}>{area}</Text></Pressable>)}</View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>{(['All', 'Jeepney', 'Bus', 'UV Express', 'Tricycle'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: nearbyRide === type }} onPress={() => { setNearbyRide(type); setStoredNearbyRide(type); }} style={[s.chip, nearbyRide === type && s.active]}><Text style={[s.chipText, nearbyRide === type && s.white]}>{type}</Text></Pressable>)}</ScrollView>
      <View style={s.nearbyCount}><Text style={s.h2}>{filteredPlaces.length} network locations</Text><Text style={s.rowSub}>Approximate map coordinates</Text></View>
      {filteredPlaces.map((location) => <Link key={location.id} href={{ pathname: '/explore', params: { terminal: location.name } }} asChild><Pressable accessibilityRole="link" accessibilityLabel={`View ${location.name} on the map`} style={s.terminalCard}><View style={s.terminalIcon}><Text style={{ color: C.green, fontSize: 17 }}>⌖</Text></View><View style={s.terminalInfo}><Text style={s.rowTitle}>{location.name}</Text><Text style={s.rowSub}>{getBarangayName(location.barangayId)} · {location.kind}</Text><View style={s.rideIcons}>{locationRides(location).map((type) => <Text key={type} style={s.rideIcon}>{rideGlyph(type)}</Text>)}<Text style={s.rowSub}>· route details</Text></View></View><View style={s.terminalArrow}><Text style={s.chevron}>›</Text></View></Pressable></Link>)}
      {filteredPlaces.length === 0 && <View style={s.empty}><Text style={s.emptyTitle}>No network places found</Text><Text style={s.sub}>Try a General Trias barangay, place, stop or terminal name.</Text><Pressable onPress={() => { setQuery(''); setNearbyArea('All areas'); setNearbyRide('All'); }} style={s.outline}><Text style={s.outlineText}>Clear filters</Text></Pressable></View>}
      <Text style={s.note}>{networkDisclaimer}</Text>
    </>}

    {screen === 'saved' && <><View style={s.segment}>{(['Routes', 'Terminals'] as SavedTab[]).map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: tab === item }} key={item} onPress={() => setTab(item)} style={[s.segmentItem, tab === item && s.segmentSelected]}><Text style={s.chipText}>{item} ({savedItems.filter((saved) => saved.kind === (item === 'Routes' ? 'route' : 'terminal')).length})</Text></Pressable>)}</View>{visibleSaved.length === 0 ? <View style={s.empty}><View style={s.emptyIcon}><Text style={s.emptyGlyph}>☆</Text></View><Text style={s.emptyTitle}>No saved {tab.toLowerCase()} yet</Text><Text style={s.sub}>Save routes and stops to keep them together on this device.</Text><Link href={tab === 'Routes' ? '/plan' : '/nearby'} asChild><Pressable style={s.button}><Text style={s.white}>{tab === 'Routes' ? 'Find a route' : 'Browse terminals'}</Text></Pressable></Link></View> : visibleSaved.map((item) => <View key={item.id} style={s.savedCard}><View style={s.savedCardHead}><View style={s.terminalIcon}><Text style={s.rideIcon}>{item.kind === 'route' ? '⇄' : '⌖'}</Text></View><View style={s.savedInfo}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{item.subtitle}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.title} from saved`} onPress={() => removeSavedItem(item.id)} style={s.removeButton}><Text style={s.removeText}>Remove</Text></Pressable></View>{item.kind === 'route' && item.from && item.to ? <View style={s.savedActions}><Link href={{ pathname: '/plan', params: { from: item.from, to: item.to } }} asChild><Pressable style={s.savedActionPrimary}><Text style={s.savedActionPrimaryText}>View details ›</Text></Pressable></Link><ExternalLink href={`https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=${encodeURIComponent(`${item.from}, General Trias, Cavite`)}&destination=${encodeURIComponent(`${item.to}, General Trias, Cavite`)}`} style={s.savedAction}><Text style={s.mapDirectionsText}>Directions ↗</Text></ExternalLink></View> : <Link href={{ pathname: '/explore', params: { terminal: item.title } }} asChild><Pressable style={s.savedAction}><Text style={s.mapDirectionsText}>Terminal details ›</Text></Pressable></Link>}</View>)}<Text style={s.note}>Saved journeys and stops are stored on this device only.</Text></>}

    {screen === 'alerts' && <><View style={s.departureUnavailable}><View style={s.departureUnavailableIcon}><Text style={s.departureUnavailableGlyph}>!</Text></View><Text style={s.emptyResultsTitle}>Live departures unavailable</Text><Text style={s.emptyResultsCopy}>We cannot reach a departure feed for this terminal. The sample timetable below is clearly labelled.</Text><Link href={{ pathname: '/explore', params: { terminal: generalTrias.terminals[0].name } }} asChild><Pressable accessibilityRole="link" style={s.emptyResultsPrimary}><Text style={s.white}>View sample terminal</Text></Pressable></Link><Pressable accessibilityRole="button" onPress={() => setAlertRetryMessage("Live departures remain unavailable. Showing the labelled sample timetable.")} style={s.departureRetry}><Text style={s.outlineText}>Try again</Text></Pressable></View>{alertRetryMessage ? <Text accessibilityLiveRegion="polite" style={s.locationNotice}>{alertRetryMessage}</Text> : null}<View style={s.segment}>{(['All', 'Route updates', 'Schedules'] as const).map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: alertTab === item }} key={item} onPress={() => setAlertTab(item)} style={[s.segmentItem, alertTab === item && s.segmentSelected]}><Text style={s.chipText}>{item}</Text></Pressable>)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>{alertAreas.map((area) => <Pressable key={area} accessibilityRole="button" accessibilityState={{ selected: alertArea === area }} onPress={() => setAlertArea(area)} style={[s.chip, alertArea === area && s.active]}><Text style={[s.chipText, alertArea === area && s.white]}>{area}</Text></Pressable>)}</ScrollView>{!showSampleAlerts ? <View style={s.empty}><Text style={s.emptyTitle}>Sample notices are hidden</Text><Text style={s.sub}>Turn them back on in Profile if you want to preview the example board.</Text><Link href="/profile" asChild><Pressable style={s.button}><Text style={s.white}>Open travel preferences</Text></Pressable></Link></View> : <>{alertTab !== 'Route updates' && <View style={s.scheduleCard}><View style={s.scheduleHeader}><Text style={s.rowTitle}>Illustrative timetable</Text><Text style={s.badge}>SAMPLE</Text></View><Text style={s.rowSub}>Departure examples · not connected to a live schedule</Text>{getAlerts().filter((item) => item.kind === 'schedule' && (alertArea === 'All' || item.area === alertArea)).map((item) => <View key={item.label} style={s.scheduleRow}><Text style={s.scheduleTime}>{item.time}</Text><Text style={s.scheduleMode}>{rideGlyph(item.mode ?? 'Jeepney')}</Text><View style={s.scheduleInfo}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{item.body}</Text></View></View>)}<View style={s.scheduleFoot}><Text style={s.rowSub}>Times shown are examples, not a connected database.</Text></View></View>}{alertTab !== 'Schedules' && <><View style={s.nearbyCount}><Text style={s.h2}>Advisories</Text><Text style={s.rowSub}>{getAlerts().filter((item) => item.kind === 'update' && (alertArea === 'All' || item.area === alertArea)).length} examples</Text></View>{getAlerts().filter((item) => item.kind === 'update' && (alertArea === 'All' || item.area === alertArea)).map((item, index) => <View key={item.label} style={[s.alert, { borderLeftColor: [C.orange, C.gold, C.blue][index % 3] }]}><View style={s.alertHeading}><Text style={s.alertIcon}>△</Text><Text style={s.label}>{item.label}</Text><Text style={s.badge}>SAMPLE</Text></View><Text style={s.rowTitle}>{item.title}</Text><Text style={s.sub}>{item.body}</Text><Text style={s.rowSub}>{item.area} · illustrative notice</Text></View>)}</>}</>}</>}

    {screen === 'profile' && <><View style={s.profile}><View style={s.profileTop}><View style={s.avatar}><Text style={s.white}>{riderName ? riderName.trim().slice(0, 1).toUpperCase() : 'G'}</Text></View><View style={s.profileIdentity}><Text style={s.profileName}>{riderName || 'Guest commuter'}</Text><Text style={s.profileHint}>Saved on this device</Text></View><Text style={s.profileBadge}>GUEST</Text></View><View style={s.profileStats}><View style={s.profileStat}><Text style={s.statValue}>{savedItems.filter((item) => item.kind === 'route').length}</Text><Text style={s.statLabel}>saved routes</Text></View><View style={s.profileStat}><Text style={s.statValue}>{savedItems.filter((item) => item.kind === 'terminal').length}</Text><Text style={s.statLabel}>saved stops</Text></View><View style={s.profileStat}><Text style={s.statValue}>{recentTrips.length}</Text><Text style={s.statLabel}>recent trips</Text></View></View><Link href={{ pathname: '/account', params: { returnTo: 'profile' } }} asChild><Pressable accessibilityRole="link" style={s.profileAction}><Text style={s.profileActionText}>Edit rider profile</Text></Pressable></Link></View><Text style={s.h2}>Travel preferences</Text><View style={s.card}><Text style={s.label}>DEFAULT RIDE TYPES</Text><View style={s.pills}>{(['All', 'Jeepney', 'Bus', 'Tricycle', 'Walk'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: defaultRide === type }} onPress={() => chooseDefaultRide(type)} style={[s.chip, defaultRide === type && s.active]}><Text style={[s.chipText, defaultRide === type && s.white]}>{rideGlyph(type)}  {type}</Text></Pressable>)}</View><View style={s.cardDivider}/><Text style={s.label}>ROUTE PREFERENCE</Text><View style={s.segment}>{(['Fewest transfers', 'Lowest sample fare', 'Shortest estimate'] as const).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: preference === item }} onPress={() => chooseTripPreference(item)} style={[s.segmentItem, preference === item && s.segmentSelected]}><Text style={s.chipText}>{item}</Text></Pressable>)}</View><View style={s.setting}><View style={s.preferenceCopy}><Text style={s.rowTitle}>Show sample service notices</Text><Text style={s.rowSub}>Controls example cards in Alerts. No push notifications are sent.</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: showSampleAlerts }} onPress={() => { const next = !showSampleAlerts; setShowSampleAlerts(next); setPreference('showSampleAlerts', next); }} style={[s.toggle, showSampleAlerts && s.toggleOn]}><View style={[s.toggleKnob, showSampleAlerts && s.toggleKnobOn]}/></Pressable></View></View><View style={s.card}><Text style={s.label}>ABOUT THIS GUIDE</Text><Text style={s.sub}>{networkDisclaimer}</Text></View></>}
    <Modal visible={showLocationRationale} transparent animationType="fade" onRequestClose={() => setShowLocationRationale(false)}>
      <View style={s.locationBackdrop}><View style={s.locationModal}>
        <View style={s.locationModalIcon}><Text style={s.locationModalGlyph}>⌖</Text></View>
        <Text style={s.emptyResultsTitle}>Use your location?</Text>
        <Text style={s.emptyResultsCopy}>Cavite Commute Guide uses your approximate area to sort nearby terminals and suggest a starting point. Your coordinates are not saved.</Text>
        <Pressable accessibilityRole="button" disabled={isRequestingLocation} onPress={requestNearbyLocation} style={s.emptyResultsPrimary}><Text style={s.white}>{isRequestingLocation ? 'Checking permission...' : 'Allow while using'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setShowLocationRationale(false)} style={s.departureRetry}><Text style={s.outlineText}>Not now</Text></Pressable>
        <Text style={s.rowSub}>You can change this later in Profile.</Text>
      </View></View>
    </Modal>
  </ScrollView></SafeAreaView>;
}

function setStoredNearbyRide(type: Ride | 'All') {
  setPreference('nearbyRide', type);
}

function tripSaveId(trip: Trip, from: string, to: string) {
  return `route:${trip.id}:${from}->${to}`;
}

function tripFareLabel(trip: Trip) {
  return trip.fareRange ? `₱${trip.fareRange[0]}–${trip.fareRange[1]}` : `₱${trip.fare}`;
}

type AlertItem = { kind: 'update' | 'schedule'; area: string; label: string; title: string; body: string; time?: string; mode?: Ride };

function locationRides(location: (typeof networkLocations)[number]): Ride[] {
  const modes = location.kind === 'terminal' && location.terminalId
    ? ridesForTerminal(location.terminalId)
    : modeLabelsForStop(location.nearestStopId ?? location.id);
  return modes as Ride[];
}

function getAlerts(): AlertItem[] {
  const routeAlerts = generalTrias.routes.flatMap((route) => {
    const localStop = route.stopIds.map((id) => generalTrias.stops.find((stop) => stop.id === id)).find((stop) => stop && !stop.external);
    const area = getBarangayName(localStop?.barangayId);
    const mode = rideLabel(route.mode as 'jeepney' | 'bus' | 'uv_express' | 'tricycle');
    return [
      { kind: 'schedule' as const, area, label: route.code, title: route.name, body: `Every ${route.headwayMin} min · first ${route.firstTrip} · last ${route.lastTrip}. ${route.roadNotes}`, time: route.firstTrip, mode },
      { kind: 'update' as const, area, label: route.code, title: 'Route note', body: route.roadNotes },
    ];
  });
  const todaAlerts = generalTrias.tricycleZones.map((zone) => ({
    kind: 'schedule' as const,
    area: getBarangayName(zone.barangayIds[0]),
    label: zone.id.toUpperCase(),
    title: zone.todaName,
    body: `Fare ₱${zone.fareRange[0]}–${zone.fareRange[1]} · operating hours ${zone.hours}.`,
    time: zone.hours.split(/[–-]/)[0],
    mode: 'Tricycle' as const,
  }));
  return [...routeAlerts, ...todaAlerts];
}
function shortTerminal(name: string) {
  return name.replace(' Terminal', '').replace(' Transport Bay', '').replace(' Stop', '');
}

function rideGlyph(type: Ride | 'All') {
  return ({ All: '◉', Jeepney: '⌘', Bus: '▣', Tricycle: '♧', Walk: '♙', 'UV Express': '▣' })[type];
}

const legacyStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper }, head: { paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderColor: C.line }, headInner: { width: '100%', maxWidth: 760, alignSelf: 'center' }, title: { fontSize: 24, fontWeight: '900', color: C.ink }, sub: { fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 4 }, body: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 }, card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 14, marginBottom: 13 }, label: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: C.muted, marginTop: 7 }, input: { height: 43, borderBottomWidth: 1, borderColor: C.line, color: C.ink, fontSize: 14 }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 10 }, chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, chipChosen: { backgroundColor: '#E9E2D3' }, chipText: { fontSize: 11, fontWeight: '700', color: C.ink }, active: { backgroundColor: C.ink, borderColor: C.ink }, selected: { backgroundColor: C.orange, borderColor: C.orange }, white: { color: '#fff', fontSize: 12, fontWeight: '800' }, h2: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 12, marginBottom: 2 }, segment: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#E8E0CF', borderRadius: 12, padding: 4, marginTop: 8, marginBottom: 14 }, segmentItem: { flex: 1, minWidth: 95, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 9 }, segmentSelected: { backgroundColor: C.card }, row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginTop: 7, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, rowTitle: { fontSize: 13, fontWeight: '700', color: C.ink }, rowSub: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 4 }, badge: { borderWidth: 1, borderColor: C.line, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, fontSize: 8, fontWeight: '800', color: C.ink }, button: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: C.orange, borderRadius: 10, marginTop: 10 }, outline: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink, borderRadius: 10, marginTop: 7 }, outlineText: { color: C.ink, fontWeight: '700', fontSize: 12 }, notice: { fontSize: 12, lineHeight: 18, color: C.ink, marginTop: 8, padding: 10, backgroundColor: '#E5EAD9', borderRadius: 8 }, search: { height: 48, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.card, paddingHorizontal: 13, marginTop: 12, color: C.ink }, empty: { alignItems: 'center', padding: 24, marginTop: 14, borderWidth: 1, borderRadius: 14, borderColor: C.line, backgroundColor: C.card }, save: { color: C.ink, fontSize: 16, padding: 8 }, saveButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, removeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 }, removeText: { color: C.orange, fontSize: 11, fontWeight: '800' }, note: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 12 }, alert: { borderLeftWidth: 4, borderRadius: 12, padding: 14, backgroundColor: C.card, marginTop: 9 }, profile: { backgroundColor: C.ink, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' }, profileEdit: { minWidth: 46, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#91A59C', borderRadius: 9 }, profileEditText: { color: C.card, fontWeight: '800', fontSize: 12 }, preferenceCheck: { color: C.green, fontSize: 18, paddingHorizontal: 8 }, setting: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line, paddingVertical: 8 }, terminalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEE5D2', alignItems: 'center', justifyContent: 'center' }, recent: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 12 }, recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }, recentItem: { paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }, mapDirections: { alignSelf: 'flex-start', paddingVertical: 8 }, mapDirectionsText: { color: C.green, fontSize: 11, fontWeight: '800' },
});

const s = StyleSheet.create({
  ...legacyStyles,
  safe: { flex: 1, backgroundColor: C.paper },
  planHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  planBack: { width: 28, height: 40, justifyContent: 'center' },
  planBackGlyph: { color: C.ink, fontSize: 29, lineHeight: 32 },
  planHeading: { flex: 1 },
  planTitle: { color: C.ink, fontSize: 14, fontWeight: '900' },
  planSubtitle: { color: C.muted, fontSize: 9, marginTop: 2 },
  planHeaderAction: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  planHeaderActionText: { color: C.muted, fontSize: 19 },
  planContent: { width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 178, gap: 8 },
  planLocationCard: { position: 'relative', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  planPlaceRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 9 },
  planOriginDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.card },
  planDestinationDiamond: { width: 8, height: 8, borderRadius: 1, backgroundColor: C.orange, transform: [{ rotate: '45deg' }] },
  planPlaceCopy: { flex: 1, paddingRight: 38 },
  planFieldLabel: { color: '#7A8981', fontSize: 7, fontWeight: '900', letterSpacing: 0.55 },
  planInput: { height: 20, padding: 0, color: C.ink, fontSize: 11 },
  placePickerRow: { gap: 6, paddingVertical: 2 },
  placePickerChip: { minHeight: 27, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  placePickerChipText: { color: C.ink, fontSize: 8, fontWeight: '700' },
  planPlaceDivider: { height: 1, marginLeft: 17, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#E3DED3' },
  planSwap: { position: 'absolute', right: 10, top: 35, zIndex: 2, width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  planSwapGlyph: { color: C.green, fontSize: 14, fontWeight: '800' },
  addStopRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addStopButton: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  addStopPlus: { color: C.green, fontSize: 14 },
  addStopText: { color: C.ink, fontSize: 9, fontWeight: '700' },
  optionalLabel: { color: '#89958E', fontSize: 8 },
  optionalStopRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: C.line, borderRadius: 9, backgroundColor: C.card },
  optionalStopInput: { flex: 1, color: C.ink, fontSize: 10, paddingVertical: 7 },
  planSectionHeading: { minHeight: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 1 },
  planSectionTitle: { color: C.ink, fontSize: 11, fontWeight: '900' },
  planSectionMeta: { color: '#85928B', fontSize: 8 },
  planRides: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  planRideChip: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 15, borderWidth: 1, borderColor: '#D8D7CE', backgroundColor: '#E9E8E0' },
  planRideChipSelected: { borderColor: C.ink, backgroundColor: C.ink },
  planRideGlyph: { color: C.muted, fontSize: 9 },
  planRideGlyphSelected: { color: '#FFFFFF' },
  planRideText: { color: C.ink, fontSize: 8, fontWeight: '800' },
  planRideTextSelected: { color: '#FFFFFF' },
  planPreferenceBar: { minHeight: 31, flexDirection: 'row', alignItems: 'stretch', gap: 2, padding: 3, borderRadius: 10, backgroundColor: '#EAE7DE' },
  planPreference: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 7 },
  planPreferenceActive: { backgroundColor: C.card, borderWidth: 1, borderColor: '#E3DED3' },
  planPreferenceText: { color: '#7B8981', fontSize: 7, fontWeight: '700', textAlign: 'center' },
  planPreferenceTextActive: { color: C.ink, fontWeight: '900' },
  planPreferenceHint: { color: '#8A958E', fontSize: 7, lineHeight: 10, marginTop: -3 },
  tripSettingsCard: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, marginTop: 2 },
  tripSettingRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E8E6DE' },
  tripSettingRowLast: { borderBottomWidth: 0 },
  settingGlyph: { width: 14, color: C.muted, fontSize: 11, textAlign: 'center' },
  settingLabel: { flex: 1, color: '#5E6C65', fontSize: 8 },
  settingValue: { color: C.ink, fontSize: 8, fontWeight: '700' },
  settingChevron: { color: '#94A097', fontSize: 16, marginLeft: 3 },
  departureChoices: { flexDirection: 'row', gap: 6, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E8E6DE' },
  departureChoice: { minHeight: 26, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 7, backgroundColor: '#F1F0E9' },
  departureChoiceText: { color: C.muted, fontSize: 8 },
  departureChoiceTextSelected: { color: C.ink, fontWeight: '900' },
  resultsHeading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  illustrativeBadge: { overflow: 'hidden', color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.4, borderWidth: 1, borderColor: C.line, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 },
  planFooterNote: { color: C.muted, fontSize: 8, lineHeight: 12, textAlign: 'center', marginTop: 3, marginBottom: 8 },
  planDock: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 5, borderTopWidth: 1, borderColor: '#E8E6DE', backgroundColor: '#FCFBF7' },
  planDockWeb: { bottom: 68 },
  planFindButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: C.ink },
  planFindText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  planDockNote: { color: '#929B95', fontSize: 7, textAlign: 'center', marginTop: 5 },
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
  searchLoadingCard: { padding: 13, marginTop: 8, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.card },
  searchLoadingHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchPercent: { color: C.green, fontSize: 10, fontWeight: '900' },
  searchProgressTrack: { height: 5, overflow: 'hidden', borderRadius: 4, backgroundColor: '#E5EAE5', marginTop: 9 },
  searchProgressFill: { height: 5, borderRadius: 4, backgroundColor: C.green },
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
  detailsToggle: { minHeight: 34, alignItems: 'flex-end', justifyContent: 'center', borderTopWidth: 1, borderColor: '#EEEAE0', marginTop: 5 },
  detailsToggleText: { color: C.ink, fontSize: 10, fontWeight: '900' },
  tripDetail: { marginTop: 7, padding: 10, borderRadius: 12, backgroundColor: '#F7F6F0', borderWidth: 1, borderColor: '#EEEAE0' },
  detailMap: { minHeight: 76, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#E6ECE4' },
  detailMapTitle: { color: C.ink, fontSize: 9, fontWeight: '900' },
  detailRoute: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 5 },
  detailStop: { width: 9, height: 9, borderWidth: 2, borderColor: C.green, borderRadius: 5, backgroundColor: C.card },
  detailStopEnd: { borderColor: C.orange, backgroundColor: C.orange },
  detailDash: { width: 92, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#92A69A', marginHorizontal: 5 },
  detailRoad: { color: C.muted, fontSize: 8 },
  detailStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E5E2D8' },
  detailStat: { flex: 1 },
  detailStatValue: { color: C.ink, fontSize: 11, fontWeight: '900' },
  detailStatLabel: { color: C.muted, fontSize: 7, marginTop: 2 },
  detailHeading: { color: C.ink, fontSize: 12, fontWeight: '900', marginTop: 9, marginBottom: 4 },
  detailStep: { flexDirection: 'row', gap: 9, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E2D8' },
  detailStepIcon: { width: 15, color: C.green, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  detailStepCopy: { flex: 1 },
  detailStepLabel: { color: C.green, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  detailStepTitle: { color: C.ink, fontSize: 9, fontWeight: '900', marginTop: 2 },
  detailStepText: { color: C.muted, fontSize: 8, lineHeight: 12, marginTop: 2 },
  emptyIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#E8EEE8', marginBottom: 10 },
  emptyGlyph: { color: C.green, fontSize: 26 },
  emptyTitle: { color: C.ink, fontSize: 15, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  emptyResults: { alignItems: 'center', padding: 15, marginTop: 8, borderWidth: 1, borderColor: C.line, borderRadius: 15, backgroundColor: C.card },
  emptyResultsIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#E8EEE8', marginBottom: 10 },
  emptyResultsGlyph: { color: C.ink, fontSize: 27 },
  emptyResultsTitle: { color: C.ink, fontSize: 14, lineHeight: 19, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  emptyResultsCopy: { color: C.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginBottom: 10 },
  emptyResultsPrimary: { minHeight: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: C.ink, marginTop: 3, marginBottom: 7 },
  departureUnavailable: { alignItems: 'center', paddingHorizontal: 15, paddingTop: 13, paddingBottom: 11, borderRadius: 14, backgroundColor: C.paper },
  departureUnavailableIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#F8EDD8', marginBottom: 9 },
  departureUnavailableGlyph: { color: '#C88319', fontSize: 25 },
  departureRetry: { minHeight: 39, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 9, backgroundColor: C.card, marginTop: 6 },
  locationNotice: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 5, padding: 9, borderRadius: 9, backgroundColor: '#E8EEE8' },
  locationBackdrop: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: 'rgba(16,36,31,0.58)' },
  locationModal: { alignItems: 'center', padding: 16, borderRadius: 15, backgroundColor: C.card },
  locationModalIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#E8EEE8', marginBottom: 10 },
  locationModalGlyph: { color: C.ink, fontSize: 21 },
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
