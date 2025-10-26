import BlessingDisplay from '@/components/BlessingDisplay';
import { blessings } from '@/lib/blessings';

export default function Home() {
  return (
    <div className="w-full">
      <BlessingDisplay blessings={blessings} />
    </div>
  );
}
