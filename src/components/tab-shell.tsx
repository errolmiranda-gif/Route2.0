import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, type TabListProps, type TabSlotProps, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaxContentWidth } from '@/constants/theme';

type SlotRenderer = NonNullable<TabSlotProps['renderFn']>;
type SlotDescriptor = Parameters<SlotRenderer>[0];
type SlotOptions = Parameters<SlotRenderer>[1];

export default function AppTabs() {
  return <Tabs>
    <TabSlot style={{ flex: 1 }} renderFn={renderAnimatedTab}/>
    <TabList asChild>
      <CustomTabList>
        <TabTrigger name="index" href={'/' as Href} asChild><TabButton>Home</TabButton></TabTrigger>
        <TabTrigger name="nearby" href="/nearby" asChild><TabButton>Nearby</TabButton></TabTrigger>
        <TabTrigger name="plan" href="/plan" asChild><TabButton>Plan</TabButton></TabTrigger>
        <TabTrigger name="saved" href="/saved" asChild><TabButton>Saved</TabButton></TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild><TabButton>Profile</TabButton></TabTrigger>
      </CustomTabList>
    </TabList>
  </Tabs>;
}

function renderAnimatedTab(descriptor: Parameters<SlotRenderer>[0], options: SlotOptions) {
  if (!options.loaded && !options.isFocused) return null;
  return <AnimatedTabScreen key={descriptor.route.key} descriptor={descriptor} options={options}/>;
}

function AnimatedTabScreen({ descriptor, options }: { descriptor: SlotDescriptor; options: SlotOptions }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!options.isFocused) return;
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(450),
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [options.isFocused, progress]);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [7, 0] });
  const loadingOpacity = progress.interpolate({ inputRange: [0, 0.99, 1], outputRange: [1, 1, 0] });
  return <View pointerEvents={options.isFocused ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { display: options.isFocused ? 'flex' : 'none' }]}>
    <Animated.View style={[styles.tabScreen, { opacity, transform: [{ translateY }] }]}>{descriptor.render()}</Animated.View>
    <Animated.View pointerEvents="none" accessibilityRole="progressbar" accessibilityLabel="Finding your way" style={[styles.loadingScreen, { opacity: loadingOpacity }]}>
      <View style={styles.brandMark}><Text style={styles.brandGlyph}>⇄</Text></View>
      <Text style={styles.brand}>CAVITE COMMUTE GUIDE</Text>
      <View style={styles.routeLine}><View style={styles.routeStop}/><View style={styles.routeDash}/><View style={[styles.routeStop, styles.routeDestination]}/></View>
      <ActivityIndicator color="#F05A2A" size="small" />
      <Text style={styles.loadingLabel}>Finding your way</Text>
    </Animated.View>
  </View>;
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const { href, ref: _ref, ...pressableProps } = props;
  const label = String(children);
  const isPlan = label === 'Plan';
  const route = ({ Home: '/' as Href, Nearby: '/nearby', Plan: '/plan', Saved: '/saved', Profile: '/profile' } as const)[label as 'Home' | 'Nearby' | 'Plan' | 'Saved' | 'Profile'];
  const [focusProgress] = useState(() => new Animated.Value(isFocused ? 1 : 0));

  useEffect(() => {
    Animated.spring(focusProgress, { toValue: isFocused ? 1 : 0, speed: 22, bounciness: 7, useNativeDriver: false }).start();
  }, [focusProgress, isFocused]);

  const iconScale = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const iconLift = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [0, isPlan ? -4 : -1] });
  const iconBackground = focusProgress.interpolate({ inputRange: [0, 1], outputRange: ['#00000000', isPlan ? '#10372E' : '#E8EEE9'] });
  return <Pressable {...pressableProps} {...(href ? { href } as any : {})} onPress={() => { if (route) router.navigate(route); }} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
    <Animated.View style={[styles.tabIcon, { transform: [{ scale: iconScale }, { translateY: iconLift }], backgroundColor: iconBackground }, isPlan && isFocused && styles.planIcon]}>
      <Text style={[styles.tabGlyph, isFocused && styles.tabGlyphFocused, isPlan && isFocused && styles.planGlyph]}>{tabGlyph(label)}</Text>
    </Animated.View>
    <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>{children}</Text>
  </Pressable>;
}

function CustomTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();
  return <View {...props} style={[styles.tabListContainer, { paddingBottom: Math.max(insets.bottom, 7) }]}>
    <View style={styles.innerContainer}>{props.children}</View>
  </View>;
}

const styles = StyleSheet.create({
  tabScreen: { flex: 1, width: '100%' },
  loadingScreen: { ...StyleSheet.absoluteFill, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B2923' },
  brandMark: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F05A2A' },
  brandGlyph: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  brand: { color: '#F4F2EA', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 13 },
  routeLine: { width: 96, height: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 29, marginBottom: 25 },
  routeStop: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F4F2EA', borderWidth: 2, borderColor: '#F05A2A' },
  routeDestination: { backgroundColor: '#F05A2A' },
  routeDash: { flex: 1, height: 1, marginHorizontal: 7, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#789087' },
  loadingLabel: { color: '#AFC0B8', fontSize: 10, fontWeight: '700', marginTop: 9 },
  tabListContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingTop: 6, backgroundColor: '#FCFBF7', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E3DED3', shadowColor: '#102D27', shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, zIndex: 100, elevation: 12 },
  innerContainer: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  tabButton: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: 13 },
  tabIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  planIcon: { width: 38, height: 38, borderRadius: 12 },
  tabGlyph: { color: '#74817B', fontSize: 18, fontWeight: '700' },
  tabGlyphFocused: { color: '#10372E' },
  planGlyph: { color: '#FFFFFF' },
  tabLabel: { color: '#74817B', fontSize: 9, fontWeight: '700' },
  tabLabelFocused: { color: '#10372E' },
  pressed: { opacity: 0.75 },
});

function tabGlyph(label: string) {
  return ({ Home: '⌂', Nearby: '◎', Plan: '⌘', Saved: '▱', Profile: '♙' } as Record<string, string>)[label] ?? '•';
}
