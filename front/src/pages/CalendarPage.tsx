import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { eventService } from "@/services/eventService";
import { useAuthStore } from "@/store/authStore";
import EventCard from "@/components/events/EventCard.tsx";
import EventCardSkeleton from "@/components/events/EventCardSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  ArrowUpRight,
  Calendar as CalendarIcon,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  X,
  Clock,
  MapPin
} from "lucide-react";
import { format, isSameDay, isSameMonth } from "date-fns";
import type { Event } from "@/types";

const calendarStyles = `
  .mini-calendar .react-calendar { width: 100% !important; border: none !important; background: transparent !important; font-family: inherit !important; }
  .mini-calendar .react-calendar__tile { font-size: 11px !important; padding: 10px 5px !important; border-radius: 8px !important; }
  .mini-calendar .react-calendar__tile--active { background: #4f46e5 !important; color: white !important; }
  .mini-calendar .react-calendar__navigation button { font-weight: 600 !important; color: #1e293b !important; }
`;

const typeOptions = [
  { value: "all", label: "All events" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "hybrid", label: "Hybrid" },
];

const CalendarPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeMonth, setActiveMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("agenda");

  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await eventService.getAll();
      return (res.data.results || res.data) as Event[];
    },
  });

  const events = useMemo(() => {
    const source = data || [];
    const normalizedSearch = search.trim().toLowerCase();

    let filtered = source.filter((event) => {
      const eventDate = new Date(event.start_date);
      if (typeFilter !== "all" && event.type !== typeFilter) return false;
      
      if (selectedDate) {
        if (!isSameDay(eventDate, selectedDate)) return false;
      } else {
        if (!isSameMonth(eventDate, activeMonth)) return false;
      }

      if (!normalizedSearch) return true;
      const haystack = [event.title, event.desc, event.organizer_side, event.building, event.room]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    return filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [data, search, typeFilter, selectedDate, activeMonth]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setSelectedDate(null);
    setActiveMonth(new Date());
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-50/65 via-background to-amber-50/35 pb-12">
      <style>{calendarStyles}</style>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        <section className="mt-8 grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
          
          {/* Sidebar: Calendar & Filters */}
          <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <CalendarIcon className="h-4 w-4 text-primary" /> 
                  {selectedDate ? format(selectedDate, "MMM d, yyyy") : format(activeMonth, "MMMM yyyy")}
                </h3>
                {(selectedDate || !isSameMonth(activeMonth, new Date())) && (
                  <button onClick={clearFilters} className="text-[11px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                    Reset
                  </button>
                )}
              </div>
              <div className="mini-calendar overflow-hidden rounded-xl bg-slate-50/50 p-2 border border-slate-100">
                <Calendar
                  onChange={(val) => setSelectedDate(val as Date)}
                  onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setActiveMonth(activeStartDate)}
                  value={selectedDate || activeMonth}
                  locale="en-US"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Filter className="h-4 w-4 text-primary" /> Refine
              </p>
              <div className="space-y-4">
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-50/50"
                />
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={typeFilter === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter(opt.value)}
                      className="h-7 text-[10px]"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-bold text-slate-800">
                {isLoading ? "Loading..." : `${events.length} Events`}
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-lg", viewMode === "grid" ? "bg-white shadow-sm" : "text-slate-500")}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode("agenda")} className={cn("p-1.5 rounded-lg", viewMode === "agenda" ? "bg-white shadow-sm" : "text-slate-500")}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 py-20 text-center">
                <Search className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                <p className="text-slate-500">No events found for this selection.</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {events.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div 
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="group flex items-center gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/50 cursor-pointer"
                  >
                    <div className="flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-xl bg-slate-50 border group-hover:bg-primary/5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">{format(new Date(event.start_date), "MMM")}</span>
                      <span className="text-xl font-bold text-slate-800">{format(new Date(event.start_date), "dd")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary">{event.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(event.start_date), "hh:mm a")}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.building || "Online"}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-primary" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CalendarPage;