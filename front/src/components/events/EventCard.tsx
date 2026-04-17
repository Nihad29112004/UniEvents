import { Link } from "react-router-dom";
import type { Event } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  CalendarDays,
  Globe,
  Building2,
  MapPin,
  Monitor,
  Users,
  Star,
} from "lucide-react";
import { format } from "date-fns";

const typeIcons: Record<Event["type"], typeof Globe> = {
  online: Monitor,
  offline: Building2,
  hybrid: Globe,
};

const typeStyles: Record<Event["type"], { pill: string; surface: string; ribbon: string }> = {
  online: {
    pill: "border-sky-200 bg-sky-50 text-sky-700",
    surface: "from-sky-600/90 via-cyan-500/75 to-indigo-500/60",
    ribbon: "from-sky-500 via-cyan-500 to-indigo-500",
  },
  offline: {
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    surface: "from-amber-500/90 via-orange-500/75 to-rose-400/60",
    ribbon: "from-amber-500 via-orange-500 to-rose-400",
  },
  hybrid: {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    surface: "from-emerald-500/90 via-teal-500/75 to-cyan-500/60",
    ribbon: "from-emerald-500 via-teal-500 to-cyan-500",
  },
};

const EventCard = ({ event }: { event: Event }) => {
  const TypeIcon = typeIcons[event.type] || Globe;
  const isFull = event.participant_count >= event.max_participants;
  const safeCapacity = Math.max(event.max_participants, 1);
  const capacityPercent = Math.min(100, Math.round((event.participant_count / safeCapacity) * 100));
  const spotsLeft = Math.max(event.max_participants - event.participant_count, 0);
  const primaryImage = event.images?.[0]?.image;
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);

  // REAL DATA: Artıq backend-dən gələn real dəyərləri istifadə edirik
  const rating = event.average_rating || 0;
  const reviewsCount = event.reviews_count || 0;

  const location = [
    event.building,
    event.floor ? `Floor ${event.floor}` : null,
    event.room ? `Room ${event.room}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link to={`/events/${event.id}`} className="block h-full">
      <Card className="group h-full overflow-hidden border border-border/70 bg-gradient-to-b from-white to-slate-50/60 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-28px_rgba(37,99,235,0.45)]">
        <div className={cn("h-1.5 w-full bg-gradient-to-r", typeStyles[event.type].ribbon)} />
        
        <div className="relative aspect-[16/8] overflow-hidden border-b border-border/70">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={`${event.title} cover`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className={cn("h-full w-full bg-gradient-to-br", typeStyles[event.type].surface)}>
              <div className="flex h-full items-center justify-center">
                <div className="rounded-full border border-white/45 bg-white/25 p-4 text-white shadow-sm backdrop-blur-sm">
                  <TypeIcon className="h-7 w-7" />
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-900/10 to-transparent" />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <Badge variant="outline" className={cn("border backdrop-blur-sm", typeStyles[event.type].pill)}>
              <TypeIcon className="mr-1 h-3.5 w-3.5" />
              {event.type}
            </Badge>
            <Badge variant="secondary" className="bg-white/90 text-slate-700 capitalize">
              {event.visibility}
            </Badge>
          </div>

          <div className="absolute right-4 top-4 rounded-lg border border-white/40 bg-white/90 px-3 py-2 text-center shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
              {format(startDate, "MMM")}
            </p>
            <p className="text-lg font-semibold leading-none text-slate-900">{format(startDate, "dd")}</p>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white">
            <p className="line-clamp-1 text-sm font-medium text-white/95">{event.organizer_side}</p>
            {event.is_joined && (
              <Badge className="bg-emerald-500 text-white shadow-sm">Joined</Badge>
            )}
            {isFull && !event.is_joined && (
              <Badge variant="destructive">Full</Badge>
            )}
          </div>
        </div>

        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            
            {/* Ulduzlar bölməsi - İndi real datadan asılıdır */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      i < Math.floor(rating) 
                        ? "fill-amber-400 text-amber-400" 
                        : "fill-slate-200 text-slate-200"
                    )}
                  />
                ))}
              </div>
              <span className="text-[12px] font-bold text-slate-600">
                {rating > 0 ? rating.toFixed(1) : "0.0"}
                <span className="ml-1 font-medium text-slate-400 text-[10px]">
                  ({reviewsCount} reviews)
                </span>
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 pt-1">
              <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-slate-900 transition-colors group-hover:text-primary">
                {event.title}
              </h3>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{event.desc}</p>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 inline-flex items-center gap-1.5 font-medium uppercase tracking-wide text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" /> Schedule
              </p>
              <p className="text-slate-900">{format(startDate, "EEE, MMM d · h:mm a")}</p>
              <p className="text-slate-500">to {format(endDate, "h:mm a")}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 inline-flex items-center gap-1.5 font-medium uppercase tracking-wide text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> Location
              </p>
              <p className="line-clamp-2 text-slate-900">
                {location || (event.type === "online" ? "Online event" : "To be announced")}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 flex items-center justify-between text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Capacity
              </span>
              <span className="font-semibold text-slate-900">
                {event.participant_count}/{event.max_participants}
              </span>
            </p>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isFull ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              {isFull ? "No spots left" : `${spotsLeft} spots left`}
            </p>
          </div>

          {event.allowed_roles && event.allowed_roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.allowed_roles.slice(0, 4).map((role) => (
                <Badge
                  key={role.id}
                  variant="outline"
                  className="rounded-full bg-white text-[10px] font-medium text-slate-600"
                >
                  {role.name}
                </Badge>
              ))}
              {event.allowed_roles.length > 4 && (
                <Badge
                  variant="outline"
                  className="rounded-full bg-white text-[10px] font-medium text-slate-600"
                >
                  +{event.allowed_roles.length - 4} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default EventCard;