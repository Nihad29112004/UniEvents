import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventService } from "@/services/eventService";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CalendarClock, Loader2, MapPin, Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Role, Event } from "@/types";
import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

const toLocalInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const addHoursToLocalDateTime = (value: string, hours: number) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(date.getHours() + hours);
  return toLocalInputValue(date);
};

const getInitialForm = () => {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  base.setHours(base.getHours() + 1);
  const start = toLocalInputValue(base);

  return {
    title: "",
    description: "",
    type: "offline" as Event["type"],
    visibility: "public" as Event["visibility"],
    building: "",
    floor: "",
    room: "",
    organizer: "",
    start_date: start,
    end_date: addHoursToLocalDateTime(start, 2),
    max_participants: 50,
    allowed_roles_ids: [] as number[],
  };
};

const getApiErrorMessage = (data: unknown) => {
  if (!data) return "Failed to save event";
  if (typeof data === "string") return data;
  if (typeof data !== "object") return "Failed to save event";

  const values = Object.values(data as Record<string, unknown>).flatMap((value) => {
    if (Array.isArray(value)) return value.map(String);
    if (value == null) return [];
    return [String(value)];
  });

  return values.length > 0 ? values.join(", ") : "Failed to save event";
};

const CreateEventPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(getInitialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await authService.getRoles();
      return (res.data.results || res.data) as Role[];
    },
  });

  // Load existing event for edit
  const { data: editableEvent } = useQuery({
    queryKey: ["event-edit", id],
    queryFn: async () => {
      const res = await eventService.getById(Number(id));
      const e = res.data as Event;
      setForm({
        title: e.title,
        description: e.description,
        type: e.type,
        visibility: e.visibility,
        building: e.building || "",
        floor: e.floor || "",
        room: e.room || "",
        organizer: e.organizer,
        start_date: e.start_date?.slice(0, 16) || "",
        end_date: e.end_date?.slice(0, 16) || "",
        max_participants: e.max_participants || 50,
        allowed_roles_ids: e.allowed_roles?.map((r) => r.id) || [],
      });
      return e;
    },
    enabled: isEdit,
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const eventResponse = isEdit
        ? await eventService.update(Number(id), data)
        : await eventService.create(data);

      let imageUploadError: string | null = null;
      const savedEvent = eventResponse.data as Event;

      if (imageFile && savedEvent.id) {
        try {
          await eventService.uploadImage(savedEvent.id, imageFile);
        } catch (uploadErr) {
          const uploadAxiosError = uploadErr as AxiosError<ApiError>;
          imageUploadError = getApiErrorMessage(uploadAxiosError.response?.data);
        }
      }

      return { savedEvent, imageUploadError };
    },
    onSuccess: ({ imageUploadError }) => {
      if (imageUploadError) {
        toast.error(`Event saved but image upload failed: ${imageUploadError}`);
      } else {
        toast.success(isEdit ? "Event updated" : "Event created");
      }

      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate("/events");
    },
    onError: (err: AxiosError<ApiError>) => {
      const status = err.response?.status;
      if (status === 403) {
        toast.error("Only staff/admin users can create or edit events");
        return;
      }

      toast.error(getApiErrorMessage(err.response?.data));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventService.delete(Number(id)),
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate("/events");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.start_date || !form.end_date) {
      toast.error("Please select both start and end date/time");
      return;
    }

    if (new Date(form.end_date) <= new Date(form.start_date)) {
      toast.error("End date/time must be after start date/time");
      return;
    }

    saveMutation.mutate(form);
  };

  const handleStartDateChange = (value: string) => {
    setForm((current) => {
      const currentEnd = current.end_date;
      if (!value) {
        return { ...current, start_date: value };
      }

      const shouldRecalculateEnd = !currentEnd || new Date(currentEnd) <= new Date(value);
      return {
        ...current,
        start_date: value,
        end_date: shouldRecalculateEnd ? addHoursToLocalDateTime(value, 2) : currentEnd,
      };
    });
  };

  const toggleRole = (roleId: number) => {
    setForm((f) => ({
      ...f,
      allowed_roles_ids: f.allowed_roles_ids.includes(roleId)
        ? f.allowed_roles_ids.filter((r) => r !== roleId)
        : [...f.allowed_roles_ids, roleId],
    }));
  };

  return (
    <div className="container py-8 max-w-6xl animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate("/events")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="mb-6 rounded-xl border bg-card p-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Refine Event Details" : "Create A New Event"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details below. Start and end times are in your local timezone.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary" /> Basics
              </CardTitle>
              <CardDescription>
                Core event information your attendees will see first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={update("title")} placeholder="Ex: AI Career Night" required />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={update("description")}
                  placeholder="Describe what attendees can expect from this event"
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-image">Event image</Label>
                <Input
                  id="event-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  {imageFile
                    ? `Selected: ${imageFile.name}`
                    : "Optional. This image will be uploaded right after saving the event."}
                </p>
                {isEdit && editableEvent?.images?.length ? (
                  <p className="text-xs text-muted-foreground">
                    This event currently has {editableEvent.images.length} uploaded image(s).
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as Event["type"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organizer</Label>
                  <Input value={form.organizer} onChange={update("organizer")} placeholder="Ex: Student Affairs Office" required />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary" /> Schedule
              </CardTitle>
              <CardDescription>
                Set the event window. End time must be after the start time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start date & time</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date & time</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={update("end_date")}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, end_date: addHoursToLocalDateTime(f.start_date, 1) }))}>
                  End +1h
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, end_date: addHoursToLocalDateTime(f.start_date, 2) }))}>
                  End +2h
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, end_date: addHoursToLocalDateTime(f.start_date, 3) }))}>
                  End +3h
                </Button>
              </div>
            </CardContent>
          </Card>

          {(form.type === "offline" || form.type === "hybrid") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-primary" /> Location
                </CardTitle>
                <CardDescription>
                  Add physical venue details for offline or hybrid events.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Building</Label>
                  <Input value={form.building} onChange={update("building")} placeholder="Main Building" />
                </div>
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Input value={form.floor} onChange={update("floor")} placeholder="3" />
                </div>
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Input value={form.room} onChange={update("room")} placeholder="302" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" /> Access & Capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={form.visibility} onValueChange={(v) => setForm((f) => ({ ...f, visibility: v as Event["visibility"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" /> Max participants
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_participants}
                  onChange={(e) => setForm((f) => ({ ...f, max_participants: parseInt(e.target.value, 10) || 1 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Allowed roles</Label>
                {rolesLoading && <p className="text-sm text-muted-foreground">Loading roles...</p>}
                {roles && roles.length > 0 && (
                  <div className="space-y-2 rounded-md border p-3">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.allowed_roles_ids.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        {role.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Save changes" : "Create event"}
              </Button>

              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete event
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
