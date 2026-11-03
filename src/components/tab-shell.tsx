import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
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
    const animation = Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [options.isFocused, progress]);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [7, 0] });
  const skeletonOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <View pointerEvents={options.isFocused ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { display: options.isFocused ? 'flex' : 'none' }]}>
    <Animated.View style={[styles.tabScreen, { opacity, transform: [{ translateY }] }]}>{descriptor.render()}</Animated.View>
    <Animated.View pointerEvents="none" accessibilityRole="progressbar" accessibilityLabel="Loading screen" style={[styles.skeletonScreen, { opacity: skeletonOpacity }]}>
      <View style={styles.progressTrack}><Animated.View style={[styles.progressLine, { width: progressWidth }]}/></View>
      <Text style={styles.loadingLabel}>Loading</Text>
      <View style={styles.skeletonTitle}/><View style={styles.skeletonSubtitle}/>
      <View style={styles.skeletonCard}><View style={styles.skeletonLineWide}/><View style={styles.skeletonLine}/><View style={styles.skeletonLineShort}/></View>
      <View style={styles.skeletonCard}><View style={styles.skeletonLineWide}/><View style={styles.skeletonLine}/></View>
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
  skeletonScreen: { ...StyleSheet.absoluteFill, zIndex: 20, backgroundColor: '#F4F2EA', paddingHorizontal: 22, paddingTop: 42 },
  progressTrack: { height: 4, width: '100%', overflow: 'hidden', borderRadius: 3, backgroundColor: '#DDE3DD' },
  progressLine: { height: 4, borderRadius: 3, backgroundColor: '#10372E' },
  loadingLabel: { color: '#66736E', fontSize: 10, fontWeight: '700', marginTop: 10 },
  skeletonTitle: { width: '63%', height: 23, borderRadius: 7, backgroundColor: '#E2E5DE', marginTop: 28 },
  skeletonSubtitle: { width: '84%', height: 11, borderRadius: 6, backgroundColor: '#E8E9E3', marginTop: 9 },
  skeletonCard: { height: 94, borderRadius: 15, backgroundColor: '#FCFBF7', borderWidth: 1, borderColor: '#E8E5DC', padding: 14, marginTop: 17, gap: 10 },
  skeletonLineWide: { width: '71%', height: 11, borderRadius: 5, backgroundColor: '#E2E5DE' },
  skeletonLine: { width: '91%', height: 8, borderRadius: 5, backgroundColor: '#E8E9E3' },
  skeletonLineShort: { width: '48%', height: 8, borderRadius: 5, backgroundColor: '#E8E9E3' },
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
