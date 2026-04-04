import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

export function FacilityCard({ facility }: FacilityCardProps) {
    const navigate = useNavigate();

    return (
        <Card
            className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate(`/venue/${facility.id}`)}
        >
            <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                {facility.venueImages.find((img) => img.type === 'COVER') ? (
                    <img
                        src={facility.venueImages.find((img) => img.type === 'COVER')!.url}
                        alt={facility.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No image
                    </div>
                )}
            </div>
            <div className="p-3">
                <h3 className="font-semibold text-foreground">
                    {facility.name}
                </h3>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{facility.address}, {facility.city}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                    {facility.availableSports.map(({ sport }) => (
                        <Badge
                            key={sport}
                            variant="secondary"
                            className="text-xs"
                        >
                            {sport}
                        </Badge>
                    ))}
                </div>
            </div>
        </Card>
    );
}
