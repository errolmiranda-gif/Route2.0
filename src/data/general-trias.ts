import network from './general-trias-mock-data.json';

export const generalTrias = network;
export const networkDisclaimer = network.disclaimer;
export type RideMode = 'jeepney' | 'bus' | 'uv_express' | 'tricycle' | 'walk';
export type RideLabel = 'Jeepney' | 'Bus' | 'UV Express' | 'Tricycle' | 'Walk';

export type NetworkLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: 'terminal' | 'stop' | 'place' | 'barangay';
  barangayId?: string;
  terminalId?: string;
  nearestStopId?: string;
};

export function rideLabel(mode: RideMode): RideLabel {
  return mode === 'uv_express' ? 'UV Express' : mode === 'walk' ? 'Walk' : mode[0].toUpperCase() + mode.slice(1) as RideLabel;
}

export function ridesForTerminal(terminalId: string): RideLabel[] {
  const terminal = network.terminals.find((item) => item.id === terminalId);
  return terminal?.modes.map((mode) => rideLabel(mode as RideMode)) ?? [];
}

const stopById = new Map(network.stops.map((stop) => [stop.id, stop]));

export function getNetworkLocations(): NetworkLocation[] {
  const locations: NetworkLocation[] = [];
  const add = (location: NetworkLocation) => {
    if (!locations.some((existing) => existing.name.toLocaleLowerCase() === location.name.toLocaleLowerCase())) locations.push(location);
  };

  network.terminals.forEach((terminal) => {
    const nearestStop = network.stops.find((stop) => stop.terminalId === terminal.id);
    add({ id: terminal.id, name: terminal.name, lat: terminal.lat, lng: terminal.lng, kind: 'terminal', barangayId: terminal.barangayId, terminalId: terminal.id, nearestStopId: nearestStop?.id });
  });
  network.stops.forEach((stop) => add({ id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng, kind: 'stop', barangayId: stop.barangayId, terminalId: stop.terminalId, nearestStopId: stop.id }));
  network.places.forEach((place) => add({ id: place.id, name: place.name, lat: place.lat, lng: place.lng, kind: 'place', barangayId: place.barangayId, terminalId: place.nearestTerminalId, nearestStopId: place.nearestStopId }));
  network.barangays.forEach((barangay) => add({ id: barangay.id, name: barangay.name, lat: barangay.lat, lng: barangay.lng, kind: 'barangay' }));
  return locations;
}

export const networkLocations = getNetworkLocations();
export const terminalLocations = networkLocations.filter((location) => location.kind === 'terminal');
export const mappedLocations = networkLocations.filter((location) => location.kind === 'terminal' || (location.kind === 'stop' && !network.stops.find((stop) => stop.id === location.id)?.external));

export function getBarangayName(id?: string) {
  return id ? network.barangays.find((item) => item.id === id)?.name ?? 'General Trias' : 'General Trias';
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = toRadians(b.lat - a.lat);
  const lngDelta = toRadians(b.lng - a.lng);
  const h = Math.sin(latDelta / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearestStopId(location: NetworkLocation) {
  if (location.nearestStopId && stopById.has(location.nearestStopId)) return location.nearestStopId;
  return network.stops.reduce((best, stop) => {
    const current = stopById.get(best)!;
    return distanceKm(location, stop) < distanceKm(location, current) ? stop.id : best;
  }, network.stops[0].id);
}

export type NetworkTrip = {
  id: string;
  routeCodes: string[];
  routeNames: string[];
  operators: string[];
  road: string;
  fare: number;
  fareRange?: [number, number];
  minutes: number;
  rides: RideLabel[];
  transfers: number;
  stopNames: string[];
  headwayMin: number;
  firstTrip: string;
  lastTrip: string;
};

function routeSegment(route: typeof network.routes[number], fromStopId: string, toStopId: string) {
  const fromIndex = route.stopIds.indexOf(fromStopId);
  const toIndex = route.stopIds.indexOf(toStopId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
  if (fromIndex > toIndex && !route.bidirectional) return null;
  const ids = route.stopIds.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1);
  if (fromIndex > toIndex) ids.reverse();
  const distance = ids.slice(1).reduce((sum, id, index) => sum + distanceKm(stopById.get(ids[index])!, stopById.get(id)!), 0);
  const fare = route.fare.base + Math.max(0, distance - route.fare.baseKm) * route.fare.perKm;
  const minutes = distance / route.avgSpeedKph * 60 + route.headwayMin / 2;
  return { ids, distance, fare, minutes };
}

export function findNetworkTrips(fromLocation: NetworkLocation, toLocation: NetworkLocation, ride: RideLabel | 'All' = 'All'): NetworkTrip[] {
  const fromId = nearestStopId(fromLocation);
  const toId = nearestStopId(toLocation);
  if (fromId === toId) return [];
  const routes = network.routes.filter((route) => ride === 'All' || rideLabel(route.mode as RideMode) === ride);
  const results: NetworkTrip[] = [];
  const append = (routeList: typeof routes, legs: { ids: string[]; fare: number; minutes: number }[], transferWalk = 0) => {
    const stopIds = legs.flatMap((leg, index) => index === 0 ? leg.ids : leg.ids.slice(1));
    const distinctStops = stopIds.filter((id, index) => index === 0 || id !== stopIds[index - 1]);
    const id = routeList.map((route) => route.id).join('+');
    if (results.some((result) => result.id === id)) return;
    const trip: NetworkTrip = {
      id,
      routeCodes: routeList.map((route) => route.code),
      routeNames: routeList.map((route) => route.name),
      operators: routeList.map((route) => route.operator),
      road: routeList.map((route) => route.roadNotes).join(' · '),
      fare: Math.ceil(legs.reduce((sum, leg) => sum + leg.fare, 0)),
      minutes: Math.ceil(legs.reduce((sum, leg) => sum + leg.minutes, 0) + transferWalk),
      rides: routeList.map((route) => rideLabel(route.mode as RideMode)),
      transfers: routeList.length - 1,
      stopNames: distinctStops.map((stopId) => stopById.get(stopId)?.name ?? stopId),
      headwayMin: Math.max(...routeList.map((route) => route.headwayMin)),
      firstTrip: routeList.map((route) => route.firstTrip).sort()[0],
      lastTrip: routeList.map((route) => route.lastTrip).sort().at(-1)!,
    };
    results.push(trip);
  };

  for (const route of routes) {
    const leg = routeSegment(route, fromId, toId);
    if (leg) append([route], [leg]);
  }
  for (const first of routes) {
    const firstLegOptions = first.stopIds.map((transferId) => ({ transferId, leg: routeSegment(first, fromId, transferId) })).filter((item) => item.leg !== null);
    for (const second of routes) {
      if (first.id === second.id) continue;
      for (const firstOption of firstLegOptions) {
        for (const secondTransferId of second.stopIds) {
          const transfer = firstOption.transferId === secondTransferId ? null : network.transfers.find((item) => item.fromStopId === firstOption.transferId && item.toStopId === secondTransferId);
          if (firstOption.transferId !== secondTransferId && !transfer) continue;
          const secondLeg = routeSegment(second, secondTransferId, toId);
          if (secondLeg && firstOption.leg) append([first, second], [firstOption.leg, secondLeg], transfer?.walkMin ?? 0);
        }
      }
    }
  }
  if (ride === 'All' || ride === 'Tricycle') {
    for (const zone of network.tricycleZones) {
      if (!fromLocation.barangayId || !toLocation.barangayId || !zone.barangayIds.includes(fromLocation.barangayId) || !zone.barangayIds.includes(toLocation.barangayId)) continue;
      const hours = zone.hours.split(/[–-]/);
      const fareRange: [number, number] = [zone.fareRange[0], zone.fareRange[1]];
      const distance = distanceKm(fromLocation, toLocation);
      results.push({
        id: `toda:${zone.id}`,
        routeCodes: [zone.id.toUpperCase()],
        routeNames: [zone.todaName],
        operators: [zone.todaName],
        road: `${zone.todaName} · ${zone.hours}`,
        fare: Math.round((fareRange[0] + fareRange[1]) / 2),
        fareRange,
        minutes: Math.max(5, Math.ceil(distance * 6)),
        rides: ['Tricycle'],
        transfers: 0,
        stopNames: [fromLocation.name, toLocation.name],
        headwayMin: 0,
        firstTrip: hours[0] ?? 'Not listed',
        lastTrip: hours[1] ?? 'Not listed',
      });
    }
  }
  return results;
}

export function findNetworkTripsViaMany(from: NetworkLocation, vias: NetworkLocation[], to: NetworkLocation, ride: RideLabel | 'All' = 'All'): NetworkTrip[] {
  const waypoints = [from, ...vias, to];
  let combined: NetworkTrip[] = [];
  for (let index = 0; index < waypoints.length - 1; index++) {
    const legOptions = findNetworkTrips(waypoints[index], waypoints[index + 1], ride)
      .sort((a, b) => a.minutes - b.minutes)
      .slice(0, 5);
    if (index === 0) {
      combined = legOptions;
      continue;
    }
    combined = combined.flatMap((first) => legOptions.map((second) => ({
      ...first,
      id: first.id + '+via:' + waypoints[index].id + '+' + second.id,
      routeCodes: [...first.routeCodes, ...second.routeCodes],
      routeNames: [...first.routeNames, ...second.routeNames],
      operators: [...first.operators, ...second.operators],
      road: [first.road, second.road].filter(Boolean).join(' · '),
      fare: first.fare + second.fare,
      fareRange: first.fareRange || second.fareRange
        ? ([
          (first.fareRange?.[0] ?? first.fare) + (second.fareRange?.[0] ?? second.fare),
          (first.fareRange?.[1] ?? first.fare) + (second.fareRange?.[1] ?? second.fare),
        ] as [number, number])
        : undefined,
      minutes: first.minutes + second.minutes,
      rides: [...new Set([...first.rides, ...second.rides])],
      transfers: first.transfers + second.transfers + 1,
      stopNames: [...first.stopNames, ...second.stopNames.slice(1)],
      headwayMin: Math.max(first.headwayMin, second.headwayMin),
      firstTrip: first.firstTrip < second.firstTrip ? first.firstTrip : second.firstTrip,
      lastTrip: first.lastTrip > second.lastTrip ? first.lastTrip : second.lastTrip,
    }))).sort((a, b) => a.minutes - b.minutes).slice(0, 125);
    if (combined.length === 0) break;
  }
  return combined;
}

export function findNetworkTripsVia(from: NetworkLocation, via: NetworkLocation, to: NetworkLocation, ride: RideLabel | 'All' = 'All'): NetworkTrip[] {
  return findNetworkTripsViaMany(from, [via], to, ride);
}

export function getRouteEndpointNames(route: typeof network.routes[number]) {
  return route.stopIds.map((id) => stopById.get(id)?.name ?? id);
}

export function getRoutePreview(route: typeof network.routes[number]) {
  const stopSequence = getRouteEndpointNames(route);
  const distance = route.stopIds.slice(1).reduce((sum, id, index) => sum + distanceKm(stopById.get(route.stopIds[index])!, stopById.get(id)!), 0);
  return {
    from: stopSequence[0],
    to: stopSequence[stopSequence.length - 1],
    fare: Math.ceil(route.fare.base + Math.max(0, distance - route.fare.baseKm) * route.fare.perKm),
    minutes: Math.ceil(distance / route.avgSpeedKph * 60 + route.headwayMin / 2),
  };
}

export function coordinatePosition(location: { lat: number; lng: number }) {
  const minLat = Math.min(...network.barangays.map((item) => item.lat));
  const maxLat = Math.max(...network.barangays.map((item) => item.lat));
  const minLng = Math.min(...network.barangays.map((item) => item.lng));
  const maxLng = Math.max(...network.barangays.map((item) => item.lng));
  return {
    x: 10 + ((location.lng - minLng) / (maxLng - minLng)) * 80,
    y: 10 + ((maxLat - location.lat) / (maxLat - minLat)) * 80,
  };
}

export function modeLabelsForStop(stopId: string): RideLabel[] {
  const ids = network.routes.filter((route) => route.stopIds.includes(stopId)).map((route) => route.mode as RideMode);
  return Array.from(new Set(ids.map(rideLabel)));
}
