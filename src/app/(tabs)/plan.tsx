import GuideScreen from '@/components/guide-screen';
import { useLocalSearchParams } from 'expo-router';

export default function PlanScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const routeKey = `${String(params.from ?? '')}:${String(params.to ?? '')}`;
  return <GuideScreen key={routeKey} screen="plan" />;
}
