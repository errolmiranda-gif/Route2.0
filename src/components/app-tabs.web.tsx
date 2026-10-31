import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="nearby" href="/nearby" asChild>
            <TabButton>Nearby</TabButton>
          </TabTrigger>
          <TabTrigger name="plan" href="/plan" asChild>
            <TabButton>Plan</TabButton>
          </TabTrigger>
          <TabTrigger name="saved" href="/saved" asChild>
            <TabButton>Saved</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  // TabTrigger provides an href and internal ref that this Pressable does not need.
  const { href: _href, ref: _ref, ...pressableProps } = props;
  const isPlan = String(children) === 'Plan';
  return (
    <Pressable {...pressableProps} style={({ pressed }) => [styles.tabButton, isFocused && (isPlan ? styles.planFocused : styles.tabFocused), pressed && styles.pressed]}>
      <View style={[styles.tabIcon, isFocused && (isPlan ? styles.planIconFocused : styles.tabIconFocused)]}><Text style={[styles.tabGlyph,isFocused&&styles.tabGlyphFocused]}>{tabGlyph(String(children))}</Text></View>
      <Text style={[styles.tabLabel,isFocused&&styles.tabLabelFocused, isFocused && isPlan && styles.planLabelFocused]}>{children}</Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3DED3',
  },
  innerContainer: {
    width: '100%',
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: MaxContentWidth,
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 9,
  },
  tabFocused: { backgroundColor: '#E8EEE8' },
  planFocused: { backgroundColor: '#10372E', borderRadius: 13, marginHorizontal: 7 },
  tabIcon: { width: 25, height: 25, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconFocused: { backgroundColor: '#D2E1D8' },
  planIconFocused: { backgroundColor: 'transparent' },
  tabGlyph: { color: '#777A74', fontSize: 17, fontWeight: '700' },
  tabGlyphFocused: { color: '#10372E' },
  tabLabel: { color: '#777A74', fontSize: 9, fontWeight: '700' },
  tabLabelFocused: { color: '#10372E' },
  planLabelFocused: { color: '#FFFFFF' },
  pressed: { opacity: 0.7,
  },
});

function tabGlyph(label:string) { return ({Home:'⌂',Nearby:'◉',Plan:'⌘',Saved:'♧',Profile:'♙'} as Record<string,string>)[label] ?? '•'; }
