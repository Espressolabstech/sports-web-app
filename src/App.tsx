import './App.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster as Sonner, Toaster } from './components/ui/sonner';
import { RouterProvider } from 'react-router-dom';
import { router } from './navigation/router';

const queryClient = new QueryClient();

function App() {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <RouterProvider router={router} />{' '}
                </TooltipProvider>
            </QueryClientProvider>
        </>
    );
}

export default App;
