import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

const C = {
  bg: '#0B2923', road: 'rgba(255,255,255,0.09)', dots: '#FF6B3D',
  brand: '#FF5A1F', title: '#8FA3A0', label: '#9FB3AF', white: '#FFFFFF', amber: '#F5A524', blue: '#3B6CF0',
};

type Stop = {
  id: string; label?: string; x: number; y: number;
  type: 'start' | 'stop' | 'destination'; dotColor?: string; labelDx?: number; labelDy?: number;
};

const stops: Stop[] = [
  { id: 'dasma', label: 'DASMARIÑAS', x: 57, y: 80, type: 'start', labelDx: 11, labelDy: -14 },
  { id: 'tejero', label: 'TEJERO', x: 156, y: 35, type: 'stop', dotColor: C.amber, labelDx: 10, labelDy: -11 },
  { id: 'manggahan', label: 'MANGGAHAN', x: 266, y: 59, type: 'stop', dotColor: C.blue, labelDx: -35, labelDy: 25 },
  { id: 'destination', x: 326, y: 26, type: 'destination' },
];

const W = 377;
const H = 120;
function routePath(points: Stop[]) {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const middleX = a.x + (b.x - a.x) / 2;
    d += ` C${middleX},${a.y} ${middleX},${b.y} ${b.x},${b.y}`;
  }
  return d;
}

function routeSamples(points: Stop[], stepsPerLeg = 8) {
  const samples: { x: number; y: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const middleX = a.x + (b.x - a.x) / 2;
    for (let step = i === 1 ? 0 : 1; step <= stepsPerLeg; step++) {
      const t = step / stepsPerLeg;
      const u = 1 - t;
      samples.push({
        x: u ** 3 * a.x + 3 * u ** 2 * t * middleX + 3 * u * t ** 2 * middleX + t ** 3 * b.x,
        y: u ** 3 * a.y + 3 * u ** 2 * t * a.y + 3 * u * t ** 2 * b.y + t ** 3 * b.y,
      });
    }
  }
  return samples;
}

function BrandMark() {
  return <Svg width={26} height={26} viewBox="0 0 26 26" accessibilityLabel="Cavite Commute Guide">
    <Rect width={26} height={26} rx={7} fill={C.brand}/>
    <G stroke={C.white} strokeWidth={1.8} strokeLinecap="round" fill="none">
      <Circle cx={8} cy={9} r={2.2}/><Circle cx={18} cy={17} r={2.2}/>
      <Path d="M10.4 9 H15 a2.6 2.6 0 0 1 0 5.2 H11 a2.6 2.6 0 0 0 0 5.2 H15.6"/>
    </G>
  </Svg>;
}

function RouteNode({ stop }: { stop: Stop }) {
  if (stop.type === 'destination') return <G>
    <Polygon
      points={`${stop.x},${stop.y - 13} ${stop.x + 13},${stop.y} ${stop.x},${stop.y + 13} ${stop.x - 13},${stop.y}`}
      fill={C.brand}
      opacity={0.18}
    />
    <Polygon
      points={`${stop.x},${stop.y - 8} ${stop.x + 8},${stop.y} ${stop.x},${stop.y + 8} ${stop.x - 8},${stop.y}`}
      fill={C.brand}
      strokeLinejoin="round"
    />
  </G>;
  if (stop.type === 'start') return <G>
    <Circle cx={stop.x} cy={stop.y} r={10} fill={C.white}/><Circle cx={stop.x} cy={stop.y} r={7} fill={C.bg}/><Circle cx={stop.x} cy={stop.y} r={3} fill={C.white}/>
  </G>;
  return <G>
    <Circle cx={stop.x} cy={stop.y} r={11} fill={C.bg} opacity={0.55}/><Circle cx={stop.x} cy={stop.y} r={9} fill={C.white}/><Circle cx={stop.x} cy={stop.y} r={3.6} fill={stop.dotColor ?? C.amber}/>
  </G>;
}

export default function CommuteHeader() {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(progress, {
      toValue: 1,
      duration: 4200,
      easing: Easing.linear,
      useNativeDriver: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [progress]);
  const d = routePath(stops);
  const samples = routeSamples(stops);
  const inputRange = samples.map((_, index) => index / (samples.length - 1));
  const movingLeft = progress.interpolate({ inputRange, outputRange: samples.map(({ x }) => `${(x / W) * 100}%`) });
  const movingTop = progress.interpolate({ inputRange, outputRange: samples.map(({ y }) => `${(y / H) * 100}%`) });

  return <View style={styles.wrap}>
    <View style={styles.brand}><BrandMark/><Text style={styles.brandTitle}>CAVITE COMMUTE GUIDE</Text></View>
    <View style={styles.route} accessible accessibilityLabel={`Route: ${stops.filter((stop) => stop.label).map((stop) => stop.label).join(', then ')}`}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Path d={d} stroke={C.road} strokeWidth={16} strokeLinecap="round" fill="none"/>
        <Path d={d} stroke={C.dots} strokeWidth={2} strokeLinecap="round" strokeDasharray="0.1 7" fill="none"/>
        {stops.map((stop) => <RouteNode key={stop.id} stop={stop}/>)}
        {stops.map((stop) => stop.label ? <SvgText key={`${stop.id}-label`} x={stop.x + (stop.labelDx ?? 0)} y={stop.y + (stop.labelDy ?? 0)} fill={C.label} fontSize={7.5} fontWeight="700" letterSpacing={1}>{stop.label}</SvgText> : null)}
      </Svg>
      <Animated.View pointerEvents="none" style={[styles.movingDot, { left: movingLeft, top: movingTop }]}/>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.bg, overflow: 'hidden', position: 'relative' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandTitle: { color: C.title, fontSize: 9, fontWeight: '800', letterSpacing: 1.7 },
  route: { width: '100%', aspectRatio: W / H, marginTop: 5, position: 'relative' },
  movingDot: { position: 'absolute', width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5, borderRadius: 3, backgroundColor: '#FFB24D', borderWidth: 1, borderColor: C.bg, shadowColor: '#FF6B3D', shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
});

