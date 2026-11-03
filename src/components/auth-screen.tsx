import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, router } from 'expo-router';
import type { Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPreference, setPreference } from '@/lib/saved-items';

type AuthMode = 'login' | 'register';
const C = { paper: '#F4F2EA', card: '#FFFFFF', ink: '#10372E', muted: '#66736E', line: '#E3DED3', orange: '#F05A2A', green: '#315C50' };

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => getPreference('riderEmail', ''));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consented, setConsented] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!getPreference('completedWelcomeOnboarding', false)) router.replace('/welcome' as Href);
  }, []);

  function submit() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setMessage('Use at least 8 characters for your password.');
      return;
    }
    if (isRegister && name.trim().length < 2) {
      setMessage('Enter your name to create your rider profile.');
      return;
    }
    if (isRegister && !consented) {
      setMessage('Please accept the prototype notice to continue.');
      return;
    }

    setPreference('riderEmail', cleanEmail);
    if (isRegister) setPreference('riderName', name.trim().slice(0, 40));
    setMessage('');
    router.replace('/' as Href);
  }

  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <View style={s.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.back}><Text style={s.backGlyph}>‹</Text></Pressable>
        <Text style={s.eyebrow}>{isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
        <View style={s.topSpacer}/>
      </View>

      <Text style={s.title}>{isRegister ? 'Start commuting smarter' : 'Welcome back'}</Text>
      <Text style={s.subtitle}>{isRegister ? 'Keep your routes and terminals together on this device.' : 'Sign in to continue with your saved routes and preferences.'}</Text>

      {isRegister && <Field label="Name" icon="♙">
        <TextInput value={name} onChangeText={(value) => { setName(value); setMessage(''); }} autoCapitalize="words" autoCorrect={false} placeholder="Ana Reyes" placeholderTextColor="#89938D" style={s.input} returnKeyType="next" />
      </Field>}

      <Field label="Email or mobile number" icon="✉">
        <TextInput value={email} onChangeText={(value) => { setEmail(value); setMessage(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" placeholder="ana@email.com" placeholderTextColor="#89938D" style={s.input} returnKeyType="next" />
      </Field>

      <Field label="Password" icon="♙">
        <TextInput value={password} onChangeText={(value) => { setPassword(value); setMessage(''); }} autoCapitalize="none" secureTextEntry={!showPassword} placeholder="At least 8 characters" placeholderTextColor="#89938D" style={s.inputWithAction} returnKeyType="done" onSubmitEditing={submit} />
        <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)} style={s.fieldAction}><Text style={s.fieldActionText}>{showPassword ? 'Hide' : '◉'}</Text></Pressable>
      </Field>

      {isRegister ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consented }} onPress={() => { setConsented((value) => !value); setMessage(''); }} style={s.consentRow}>
        <View style={[s.checkbox, consented && s.checkboxChecked]}><Text style={s.checkmark}>{consented ? '✓' : ''}</Text></View>
        <Text style={s.consentText}>I understand this is a student prototype. Routes, fares, and schedules shown are illustrative samples.</Text>
      </Pressable> : <View style={s.loginOptions}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: keepSignedIn }} onPress={() => setKeepSignedIn((value) => !value)} style={s.keepRow}>
          <View style={[s.checkbox, keepSignedIn && s.checkboxChecked]}><Text style={s.checkmark}>{keepSignedIn ? '✓' : ''}</Text></View><Text style={s.keepText}>Keep me signed in</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setMessage('Password recovery is not connected in this prototype.')}><Text style={s.forgot}>Forgot password?</Text></Pressable>
      </View>}

      <Pressable accessibilityRole="button" onPress={submit} style={({ pressed }) => [s.primary, pressed && s.pressed]}>
        <Text style={s.primaryText}>{isRegister ? 'Create account' : 'Sign in'}  →</Text>
      </Pressable>
      <Text style={s.prototypeNote}>{isRegister ? 'Prototype only — your profile is saved on this device.' : 'Prototype only — any email and an 8+ character password continues.'}</Text>

      {message ? <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text> : null}

      {!isRegister && <>
        <View style={s.orDivider}><View style={s.divider}/><Text style={s.orText}>OR</Text><View style={s.divider}/></View>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/' as Href)} style={s.guestButton}><Text style={s.guestText}>Continue as guest</Text></Pressable>
      </>}

      <View style={s.bottomLinks}>
        {isRegister ? <><Text style={s.bottomText}>Already have an account? </Text><Link href="/login" asChild><Pressable accessibilityRole="link"><Text style={s.linkText}>Sign in</Text></Pressable></Link></> : <><Text style={s.bottomText}>New to Cavite Commute Guide? </Text><Link href="/register" asChild><Pressable accessibilityRole="link"><Text style={s.linkText}>Create an account</Text></Pressable></Link></>}
        {isRegister && <Link href={'/' as Href} asChild><Pressable accessibilityRole="link" style={s.skipLink}><Text style={s.linkText}>Skip and explore as guest</Text></Pressable></Link>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function Field({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={s.fieldBox}><Text style={s.fieldIcon}>{icon}</Text><View style={s.fieldContent}>{children}</View></View>
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  page: { width: '100%', maxWidth: 520, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 22, paddingTop: 9, paddingBottom: 22 },
  topBar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  back: { width: 38, height: 38, justifyContent: 'center' },
  backGlyph: { color: C.ink, fontSize: 29, lineHeight: 34 },
  eyebrow: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  topSpacer: { width: 38 },
  title: { color: C.ink, fontSize: 25, lineHeight: 30, letterSpacing: -0.6, fontWeight: '900', marginTop: 5 },
  subtitle: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 12 },
  field: { marginTop: 8 },
  fieldLabel: { color: C.ink, fontSize: 10, fontWeight: '700', marginBottom: 5 },
  fieldBox: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  fieldIcon: { width: 15, color: '#8A9991', fontSize: 14, textAlign: 'center' },
  fieldContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, paddingVertical: 10, color: C.ink, fontSize: 12 },
  inputWithAction: { flex: 1, minWidth: 0, paddingVertical: 10, color: C.ink, fontSize: 12 },
  fieldAction: { minWidth: 34, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  fieldActionText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 11, paddingRight: 4 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#AEB6B0', backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { borderColor: C.ink, backgroundColor: C.ink },
  checkmark: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  consentText: { flex: 1, color: C.muted, fontSize: 9, lineHeight: 13 },
  loginOptions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  keepRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 6 },
  keepText: { color: C.muted, fontSize: 9 },
  forgot: { color: C.ink, fontSize: 9, fontWeight: '800', padding: 6 },
  primary: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: C.ink, marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.82 },
  prototypeNote: { color: C.muted, fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 8 },
  message: { color: '#9A3A24', fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 7 },
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  orText: { color: C.muted, fontSize: 8, fontWeight: '700' },
  guestButton: { minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D9D3C7', backgroundColor: C.card },
  guestText: { color: C.ink, fontSize: 11, fontWeight: '800' },
  bottomLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 'auto', paddingTop: 27 },
  bottomText: { color: '#77827C', fontSize: 9 },
  linkText: { color: C.ink, fontSize: 9, fontWeight: '900' },
  skipLink: { width: '100%', alignItems: 'center', paddingTop: 9 },
});
