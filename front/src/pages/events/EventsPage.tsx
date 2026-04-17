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

const EventsPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("-start_date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeMonth, setActiveMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");

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

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      const aStart = new Date(a.start_date).getTime();
      const bStart = new Date(b.start_date).getTime();
      return sortBy === "start_date" ? aStart - bStart : bStart - aStart;
    });

    return filtered;
  }, [data, search, sortBy, typeFilter, selectedDate, activeMonth]);

  const stats = useMemo(() => {
    const source = data || [];
    return {
      total: source.length,
      upcoming: source.filter((e) => new Date(e.start_date).getTime() >= Date.now()).length,
      joined: source.filter((e) => Boolean(e.is_joined)).length,
      privateCount: source.filter((e) => e.visibility === "private").length,
    };
  }, [data]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setSortBy("-start_date");
    setSelectedDate(null);
    setActiveMonth(new Date());
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-sky-50/65 via-background to-amber-50/35 pb-12">
      <style>{calendarStyles}</style>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-[32px] border border-sky-200/70 bg-gradient-to-br from-white via-sky-50/85 to-indigo-50/80 p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div>
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Event Directory
              </Badge>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold text-slate-900 sm:text-4xl">
                Discover events faster with a cleaner experience
              </h1>
              <div className="mt-6 flex flex-wrap gap-3">
                {user?.is_staff && (
                  <Button onClick={() => navigate("/events/create")} className="rounded-full bg-primary px-5 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4 mr-2" /> Create event
                  </Button>
                )}
                <Button variant="outline" onClick={clearFilters} className="rounded-full bg-white">
                  <X className="h-4 w-4 mr-2" /> Reset filters
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-white/50 p-4 backdrop-blur-sm">
              <div className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm text-center">
                <p className="text-[10px] uppercase font-bold text-sky-600">Total</p>
                <p className="text-xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-600">Upcoming</p>
                <p className="text-xl font-bold text-slate-800">{stats.upcoming}</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-sm text-center">
                <p className="text-[10px] uppercase font-bold text-violet-600">Joined</p>
                <p className="text-xl font-bold text-slate-800">{stats.joined}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-sm text-center">
                <p className="text-[10px] uppercase font-bold text-amber-600">Private</p>
                <p className="text-xl font-bold text-slate-800">{stats.privateCount}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          
          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <CalendarIcon className="h-4 w-4 text-primary" /> 
                  {selectedDate ? "Specific Day" : format(activeMonth, "MMMM yyyy")}
                </h3>
                
                {/* CALENDAR RESET BUTTON */}
                {(selectedDate || !isSameMonth(activeMonth, new Date())) && (
                  <button 
                    onClick={() => {
                      setSelectedDate(null);
                      setActiveMonth(new Date());
                    }}
                    className="text-[11px] font-bold text-primary hover:text-primary/80 bg-primary/5 px-2 py-1 rounded-md transition-colors"
                  >
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
                <Filter className="h-4 w-4 text-primary" /> Refine events
              </p>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search</label>
                  <Input
                    placeholder="Title, building..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-slate-100 bg-slate-50/50 pl-4 focus:bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {typeOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={typeFilter === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTypeFilter(opt.value)}
                        className={cn("h-8 text-[11px]", opt.value === "all" && "col-span-2")}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-slate-800">
                <LayoutGrid className="h-4 w-4 text-primary" />
                {isLoading ? "Fetching..." : `${events.length} Events found`}
              </h2>
              
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("agenda")}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === "agenda" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
                  )}
                  title="Agenda View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 py-20 text-center">
                <Search className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No events found</h3>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {events.map((event, index) => (
                  <div key={event.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <div 
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="group relative flex items-center gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer animate-in slide-in-from-right-3"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-primary/5 transition-colors">
                      <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-primary/70">{format(new Date(event.start_date), "MMM")}</span>
                      <span className="text-xl font-bold text-slate-800 group-hover:text-primary">{format(new Date(event.start_date), "dd")}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                         <Badge className={cn(
                           "text-[9px] uppercase font-bold text-white",
                           event.type === 'online' ? "bg-sky-500" : event.type === 'offline' ? "bg-orange-500" : "bg-purple-500"
                         )}>
                           {event.type}
                         </Badge>
                         <span className="text-[11px] text-slate-400 flex items-center gap-1">
                           <Clock className="h-3 w-3" /> {format(new Date(event.start_date), "hh:mm a")}
                         </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">{event.title}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {event.building || "Online Location"} {event.room && `· Room ${event.room}`}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      <Button variant="ghost" size="sm" className="rounded-full group-hover:bg-primary group-hover:text-white">
                        Details <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
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

export default EventsPage;