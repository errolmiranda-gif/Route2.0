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
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Nearby</TabButton>
          </TabTrigger>
          <TabTrigger name="alerts" href="/alerts" asChild>
            <TabButton>Alerts</TabButton>
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
  return (
    <Pressable {...pressableProps} style={({ pressed }) => [styles.tabButton, isFocused && styles.tabFocused, pressed && styles.pressed]}>
      <View style={[styles.tabIcon, isFocused && styles.tabIconFocused]}><Text style={[styles.tabGlyph,isFocused&&styles.tabGlyphFocused]}>{tabGlyph(String(children))}</Text></View>
      <Text style={[styles.tabLabel,isFocused&&styles.tabLabelFocused]}>{children}</Text>
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
    backgroundColor: '#FBF8EF',
    borderTopWidth: 1,
    borderTopColor: '#D7CBB4',
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
  tabFocused: { backgroundColor: '#F2EACF' },
  tabIcon: { width: 25, height: 25, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconFocused: { backgroundColor: '#F5D96F' },
  tabGlyph: { color: '#777A74', fontSize: 17, fontWeight: '700' },
  tabGlyphFocused: { color: '#17372F' },
  tabLabel: { color: '#7B7B76', fontSize: 9, fontWeight: '700' },
  tabLabelFocused: { color: '#17372F' },
  pressed: { opacity: 0.7,
  },
});

function tabGlyph(label:string) { return ({Home:'⌂',Nearby:'⌖',Alerts:'♧',Saved:'♧',Profile:'♙'} as Record<string,string>)[label] ?? '•'; }
