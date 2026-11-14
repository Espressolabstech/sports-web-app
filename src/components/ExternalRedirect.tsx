import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

/** Client-side redirect to another app; `:slug` in `to` is filled from the route. */
export default function ExternalRedirect({ to }: { to: string }) {
    const { slug } = useParams();
    const url = slug ? to.replace(':slug', slug) : to;
    useEffect(() => {
        window.location.replace(url);
    }, [url]);
    return null;
}
