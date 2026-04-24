import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [activeStartupId, setActiveStartupId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {!user ? (
        <Landing />
      ) : (
        <Dashboard 
          user={user} 
          activeStartupId={activeStartupId} 
          setActiveStartupId={setActiveStartupId} 
        />
      )}
    </div>
  );
}
