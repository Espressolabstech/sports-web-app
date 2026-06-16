import { MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSportLabel } from '../utils/sports';

export function FacilityCard({ facility }: FacilityCardProps) {
    const navigate = useNavigate();
    const coverImage = facility.venueImages.find((img) => img.type === 'COVER');
    const location = [facility.area, facility.city].filter(Boolean).join(', ');

    return (
        <button
            onClick={() => navigate(`/venue/${facility.id}`)}
            className="group block w-full overflow-hidden rounded-2xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
        >
            <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                {coverImage ? (
                    <img
                        src={coverImage.url}
                        alt={facility.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No image
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                <div className="absolute left-3 right-3 bottom-3 flex flex-wrap gap-1.5">
                    {facility.availableSports.map(({ sport }) => (
                        <span
                            key={sport}
                            className="rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm"
                        >
                            {getSportLabel(sport)}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                        {facility.name}
                    </h3>
                    {location && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{location}</span>
                        </div>
                    )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
        </button>
    );
}
