import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-primary/10 to-background transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-4 animate-scale-in">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-primary blur-2xl opacity-50 animate-pulse"></div>
          <div className="relative w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow-violet">
            <Music className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          SoulSync
        </h1>
      </div>
    </div>
  );
}
