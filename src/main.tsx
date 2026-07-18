import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { App } from './App';
import './styles/index.css';

// Initialize i18n
import './lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s: long enough to dedupe a burst of mounts, short enough that
      // returning to a screen shows current data.
      staleTime: 1000 * 30,
      retry: 1,
      // Focus + reconnect refetching is the safety net that heals the cache
      // when a mutation forgets to invalidate. Do not disable globally again;
      // opt individual noisy queries out instead.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
