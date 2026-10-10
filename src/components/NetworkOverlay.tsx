import { useEffect, useState } from 'react';
import { WifiOff, ServerOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NetworkOverlay() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setServerDown(false); // Reset server down state when back online, assuming it might be transient
    };
    
    const handleOffline = () => setIsOffline(true);

    const handleNetworkError = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.isOffline) {
        setIsOffline(true);
      } else {
        setServerDown(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('network-error', handleNetworkError);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-error', handleNetworkError);
    };
  }, []);

  if (!isOffline && !serverDown) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center flex flex-col items-center">
        {isOffline ? (
          <>
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
              <WifiOff className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('network.noInternet', 'No Internet Connection')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t('network.noInternetDesc', 'Please check your network connection. The application will resume automatically once you\'re back online.')}
            </p>
          </>
        ) : (
          <>
            <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full mb-4">
              <ServerOff className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('network.serverDown', 'Cannot Connect to Server')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t('network.serverDownDesc', 'The server appears to be unreachable. We are trying to reconnect...')}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
