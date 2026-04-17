const { useEffect, useMemo, useState } = React;

const API_BASE = window.location.port === '9000' ? '' : 'http://127.0.0.1:9000';
const TOKEN_STORAGE_KEY = 'event_ui_tokens';
const USER_STORAGE_KEY = 'event_ui_user';

function buildUrl(path) {
    return `${API_BASE}${path}`;
}

function readJson(res) {
    return res.text().then((text) => {
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { detail: text || 'Unexpected response from server.' };
        }
    });
}

async function apiRequest(path, options = {}, token) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(buildUrl(path), {
        ...options,
        headers,
    });

    const payload = await readJson(res);
    if (!res.ok) {
        const message = payload.detail || payload.error || JSON.stringify(payload);
        throw new Error(message);
    }
    return payload;
}

function formatDate(isoDate) {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function eventVenue(event) {
    const chunks = [event.building, event.floor != null ? `Floor ${event.floor}` : null, event.room].filter(Boolean);
    return chunks.length ? chunks.join(' / ') : 'No location details';
}

function App() {
    const [tokens, setTokens] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY)) || null;
        } catch {
            return null;
        }
    });
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(USER_STORAGE_KEY)) || null;
        } catch {
            return null;
        }
    });

    const [authView, setAuthView] = useState('login');
    const [pendingEmail, setPendingEmail] = useState('');
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [globalError, setGlobalError] = useState('');
    const [globalSuccess, setGlobalSuccess] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [joinedEventIds, setJoinedEventIds] = useState([]);

    const accessToken = tokens?.access || null;

    useEffect(() => {
        if (tokens) {
            localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    }, [tokens]);

    useEffect(() => {
        if (user) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_STORAGE_KEY);
        }
    }, [user]);

    useEffect(() => {
        if (!accessToken) return;
        loadEvents();
    }, [accessToken]);

    async function loadEvents() {
        setLoadingEvents(true);
        setGlobalError('');
        try {
            const data = await apiRequest('/api/events/', {}, accessToken);
            setEvents(Array.isArray(data) ? data : []);
        } catch (err) {
            setGlobalError(`Could not load events. ${err.message}`);
        } finally {
            setLoadingEvents(false);
        }
    }

    async function handleLogin(username, password) {
        setGlobalError('');
        setGlobalSuccess('');
        try {
            const data = await apiRequest('/api/login/', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            setUser({ username });
            setTokens(data.tokens);
        } catch (err) {
            setGlobalError(`Login failed. ${err.message}`);
        }
    }

    async function handleRegister(payload) {
        setGlobalError('');
        setGlobalSuccess('');
        try {
            const data = await apiRequest('/api/register/', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setPendingEmail(data.email || payload.email);
            setAuthView('verify-otp');
            setGlobalSuccess('Registration successful. Check your email for OTP.');
        } catch (err) {
            setGlobalError(`Registration failed. ${err.message}`);
        }
    }

    async function handleVerifyOtp(otp) {
        setGlobalError('');
        setGlobalSuccess('');
        try {
            const data = await apiRequest('/api/verify-otp/', {
                method: 'POST',
                body: JSON.stringify({ email: pendingEmail, otp }),
            });
            setTokens(data.tokens);
            setUser({ username: pendingEmail.split('@')[0] });
            setPendingEmail('');
            setAuthView('login');
            setGlobalSuccess('Account verified and signed in.');
        } catch (err) {
            setGlobalError(`OTP verification failed. ${err.message}`);
        }
    }

    async function handleForgotPassword(email) {
        setGlobalError('');
        setGlobalSuccess('');
        try {
            await apiRequest('/api/forgot-password/', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            setPendingEmail(email);
            setAuthView('reset-password');
            setGlobalSuccess('Reset OTP sent to your email.');
        } catch (err) {
            setGlobalError(`Could not send reset OTP. ${err.message}`);
        }
    }

    async function handleResetPassword(otp, newPassword) {
        setGlobalError('');
        setGlobalSuccess('');
        try {
            await apiRequest('/api/reset-password/', {
                method: 'POST',
                body: JSON.stringify({ email: pendingEmail, otp, new_password: newPassword }),
            });
            setAuthView('login');
            setGlobalSuccess('Password reset complete. Please sign in.');
        } catch (err) {
            setGlobalError(`Password reset failed. ${err.message}`);
        }
    }

    async function handleLogout() {
        setGlobalError('');
        try {
            if (tokens?.refresh) {
                await apiRequest('/api/logout/', {
                    method: 'POST',
                    body: JSON.stringify({ refresh: tokens.refresh }),
                }, accessToken);
            }
        } catch {
            // Clear local session even if the refresh token is already invalid.
        }
        setTokens(null);
        setUser(null);
        setEvents([]);
        setJoinedEventIds([]);
        setSelectedEvent(null);
        setAuthView('login');
        setGlobalSuccess('Signed out successfully.');
    }

    async function handleJoin(eventId, groupName) {
        setGlobalError('');
        setGlobalSuccess('');
        try {
            await apiRequest('/api/allowed-participants/', {
                method: 'POST',
                body: JSON.stringify({ event: eventId, group_name: groupName || '' }),
            }, accessToken);
            if (!joinedEventIds.includes(eventId)) {
                setJoinedEventIds((prev) => prev.concat(eventId));
            }
            setGlobalSuccess('Joined event successfully.');
            loadEvents();
        } catch (err) {
            setGlobalError(`Could not join event. ${err.message}`);
        }
    }

    async function handleCreateEvent(payload) {
        setGlobalError('');
        setGlobalSuccess('');
        try {
            await apiRequest('/api/events/', {
                method: 'POST',
                body: JSON.stringify(payload),
            }, accessToken);
            setShowCreateModal(false);
            setGlobalSuccess('Event created.');
            loadEvents();
        } catch (err) {
            setGlobalError(`Could not create event. ${err.message}`);
        }
    }

    const filteredEvents = useMemo(() => {
        if (filter === 'all') return events;
        return events.filter((item) => item.visibility === filter);
    }, [events, filter]);

    if (!accessToken) {
        return (
            <div className="app-shell">
                <AuthScreen
                    authView={authView}
                    pendingEmail={pendingEmail}
                    onSwitchView={setAuthView}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    onVerifyOtp={handleVerifyOtp}
                    onForgotPassword={handleForgotPassword}
                    onResetPassword={handleResetPassword}
                    error={globalError}
                    success={globalSuccess}
                />
            </div>
        );
    }

    return (
        <div className="app-shell">
            <header className="topbar">
                <div>
                    <p className="eyebrow">Event Management</p>
                    <h1>LinkEvent</h1>
                </div>
                <div className="topbar-actions">
                    <p className="user-badge">{user?.username || 'User'}</p>
                    <button className="btn btn-ghost" onClick={loadEvents}>Refresh</button>
                    <button className="btn btn-outline" onClick={() => setShowCreateModal(true)}>Create Event</button>
                    <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            {globalError && <div className="alert alert-error">{globalError}</div>}
            {globalSuccess && <div className="alert alert-success">{globalSuccess}</div>}

            <section className="filters-panel">
                <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                <button className={`chip ${filter === 'public' ? 'active' : ''}`} onClick={() => setFilter('public')}>Public</button>
                <button className={`chip ${filter === 'private' ? 'active' : ''}`} onClick={() => setFilter('private')}>Private</button>
            </section>

            {loadingEvents ? (
                <div className="loading-box">Loading events...</div>
            ) : filteredEvents.length === 0 ? (
                <div className="empty-box">No events to show for this filter.</div>
            ) : (
                <section className="event-grid">
                    {filteredEvents.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            isJoined={joinedEventIds.includes(event.id)}
                            onOpen={() => setSelectedEvent(event)}
                            onJoin={handleJoin}
                        />
                    ))}
                </section>
            )}

            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    isJoined={joinedEventIds.includes(selectedEvent.id)}
                    onClose={() => setSelectedEvent(null)}
                    onJoin={handleJoin}
                />
            )}

            {showCreateModal && (
                <CreateEventModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateEvent}
                />
            )}
        </div>
    );
}

function AuthScreen({
    authView,
    pendingEmail,
    onSwitchView,
    onLogin,
    onRegister,
    onVerifyOtp,
    onForgotPassword,
    onResetPassword,
    error,
    success,
}) {
    return (
        <main className="auth-layout">
            <section className="auth-hero">
                <p className="eyebrow">Backend-Integrated UI</p>
                <h1>From registration to event participation</h1>
                <p>
                    This frontend is fully connected to your Django REST backend.
                    Register, verify OTP, sign in, and access real events.
                </p>
            </section>

            <section className="auth-card">
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {authView === 'login' && (
                    <LoginForm
                        onLogin={onLogin}
                        onOpenRegister={() => onSwitchView('register')}
                        onOpenForgot={() => onSwitchView('forgot-password')}
                    />
                )}

                {authView === 'register' && (
                    <RegisterForm
                        onRegister={onRegister}
                        onBack={() => onSwitchView('login')}
                    />
                )}

                {authView === 'verify-otp' && (
                    <VerifyOtpForm
                        email={pendingEmail}
                        onVerify={onVerifyOtp}
                        onBack={() => onSwitchView('login')}
                    />
                )}

                {authView === 'forgot-password' && (
                    <ForgotPasswordForm
                        onSubmit={onForgotPassword}
                        onBack={() => onSwitchView('login')}
                    />
                )}

                {authView === 'reset-password' && (
                    <ResetPasswordForm
                        email={pendingEmail}
                        onSubmit={onResetPassword}
                        onBack={() => onSwitchView('login')}
                    />
                )}
            </section>
        </main>
    );
}

function LoginForm({ onLogin, onOpenRegister, onOpenForgot }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    function submit(e) {
        e.preventDefault();
        onLogin(username, password);
    }

    return (
        <form onSubmit={submit} className="form-stack">
            <h2>Sign In</h2>
            <label>
                Username or Email
                <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn btn-primary" type="submit">Login</button>
            <p className="switch-row">No account? <a onClick={onOpenRegister}>Register</a></p>
            <p className="switch-row"><a onClick={onOpenForgot}>Forgot password</a></p>
        </form>
    );
}

function RegisterForm({ onRegister, onBack }) {
    const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' });

    function change(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function submit(e) {
        e.preventDefault();
        onRegister(form);
    }

    return (
        <form onSubmit={submit} className="form-stack">
            <h2>Create Account</h2>
            <label>
                Username
                <input name="username" value={form.username} onChange={change} required />
            </label>
            <label>
                Email
                <input type="email" name="email" value={form.email} onChange={change} required />
            </label>
            <label>
                Phone
                <input name="phone" value={form.phone} onChange={change} required />
            </label>
            <label>
                Password
                <input type="password" name="password" value={form.password} onChange={change} required />
            </label>
            <button className="btn btn-primary" type="submit">Register</button>
            <p className="switch-row"><a onClick={onBack}>Back to login</a></p>
        </form>
    );
}

function VerifyOtpForm({ email, onVerify, onBack }) {
    const [otp, setOtp] = useState('');

    function submit(e) {
        e.preventDefault();
        onVerify(otp);
    }

    return (
        <form onSubmit={submit} className="form-stack">
            <h2>Verify OTP</h2>
            <p className="muted">Verification email: {email || '-'}</p>
            <label>
                6-digit OTP
                <input value={otp} maxLength={6} onChange={(e) => setOtp(e.target.value)} required />
            </label>
            <button className="btn btn-primary" type="submit">Verify</button>
            <p className="switch-row"><a onClick={onBack}>Back to login</a></p>
        </form>
    );
}

function ForgotPasswordForm({ onSubmit, onBack }) {
    const [email, setEmail] = useState('');

    function submit(e) {
        e.preventDefault();
        onSubmit(email);
    }

    return (
        <form onSubmit={submit} className="form-stack">
            <h2>Forgot Password</h2>
            <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button className="btn btn-primary" type="submit">Send OTP</button>
            <p className="switch-row"><a onClick={onBack}>Back to login</a></p>
        </form>
    );
}

function ResetPasswordForm({ email, onSubmit, onBack }) {
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    function submit(e) {
        e.preventDefault();
        onSubmit(otp, newPassword);
    }

    return (
        <form onSubmit={submit} className="form-stack">
            <h2>Reset Password</h2>
            <p className="muted">Reset email: {email || '-'}</p>
            <label>
                OTP
                <input value={otp} maxLength={6} onChange={(e) => setOtp(e.target.value)} required />
            </label>
            <label>
                New Password
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </label>
            <button className="btn btn-primary" type="submit">Update password</button>
            <p className="switch-row"><a onClick={onBack}>Back to login</a></p>
        </form>
    );
}

function EventCard({ event, isJoined, onOpen, onJoin }) {
    const [groupName, setGroupName] = useState('');

    return (
        <article className="event-card">
            <header className="event-card-header" onClick={onOpen}>
                <p className="event-type">{event.type}</p>
                <h3>{event.title}</h3>
                <span className={`visibility ${event.visibility}`}>{event.visibility}</span>
            </header>
            <div className="event-card-body">
                <p>{event.desc}</p>
                <dl>
                    <div><dt>Starts:</dt><dd>{formatDate(event.start_date)}</dd></div>
                    <div><dt>Ends:</dt><dd>{formatDate(event.end_date)}</dd></div>
                    <div><dt>Venue:</dt><dd>{eventVenue(event)}</dd></div>
                    <div><dt>Participants:</dt><dd>{event.participant_count}{event.max_participants ? ` / ${event.max_participants}` : ''}</dd></div>
                </dl>

                <div className="join-panel">
                    <input
                        placeholder="Group name (optional)"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                    />
                    <button
                        className={`btn ${isJoined ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={() => onJoin(event.id, groupName)}
                    >
                        {isJoined ? 'Joined' : 'Join Event'}
                    </button>
                </div>
            </div>
        </article>
    );
}

function EventModal({ event, isJoined, onClose, onJoin }) {
    const [groupName, setGroupName] = useState('');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>{event.title}</h3>
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
                <p>{event.desc}</p>
                <ul className="detail-list">
                    <li>Type: {event.type}</li>
                    <li>Visibility: {event.visibility}</li>
                    <li>Organizer: {event.organizer_side || '-'}</li>
                    <li>Starts: {formatDate(event.start_date)}</li>
                    <li>Ends: {formatDate(event.end_date)}</li>
                    <li>Location: {eventVenue(event)}</li>
                </ul>

                {Array.isArray(event.agendas) && event.agendas.length > 0 && (
                    <>
                        <h4>Agenda</h4>
                        <ul className="detail-list">
                            {event.agendas.map((item, idx) => (
                                <li key={`${item.time_slot}-${idx}`}>{item.time_slot} - {item.action}</li>
                            ))}
                        </ul>
                    </>
                )}

                <div className="join-panel">
                    <input
                        placeholder="Group name (optional)"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                    />
                    <button
                        className={`btn ${isJoined ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={() => onJoin(event.id, groupName)}
                    >
                        {isJoined ? 'Joined' : 'Join Event'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreateEventModal({ onClose, onCreate }) {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
    const nextTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

    const [form, setForm] = useState({
        title: '',
        desc: '',
        type: 'offline',
        visibility: 'public',
        building: '',
        floor: '',
        room: '',
        organizer_side: '',
        max_participants: '',
        start_date: nextHour,
        end_date: nextTwoHours,
    });

    function change(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function submit(e) {
        e.preventDefault();
        const payload = {
            ...form,
            floor: form.floor === '' ? null : Number(form.floor),
            max_participants: form.max_participants === '' ? null : Number(form.max_participants),
        };
        onCreate(payload);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Create Event</h3>
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>

                <form onSubmit={submit} className="form-grid">
                    <label>
                        Title
                        <input name="title" value={form.title} onChange={change} required />
                    </label>

                    <label>
                        Type
                        <select name="type" value={form.type} onChange={change}>
                            <option value="online">online</option>
                            <option value="offline">offline</option>
                            <option value="hybrid">hybrid</option>
                        </select>
                    </label>

                    <label>
                        Visibility
                        <select name="visibility" value={form.visibility} onChange={change}>
                            <option value="public">public</option>
                            <option value="private">private</option>
                        </select>
                    </label>

                    <label className="full">
                        Description
                        <textarea name="desc" value={form.desc} onChange={change} rows={4} required />
                    </label>

                    <label>
                        Start
                        <input type="datetime-local" name="start_date" value={form.start_date} onChange={change} required />
                    </label>

                    <label>
                        End
                        <input type="datetime-local" name="end_date" value={form.end_date} onChange={change} />
                    </label>

                    <label>
                        Building
                        <input name="building" value={form.building} onChange={change} />
                    </label>

                    <label>
                        Floor
                        <input name="floor" type="number" value={form.floor} onChange={change} />
                    </label>

                    <label>
                        Room
                        <input name="room" value={form.room} onChange={change} />
                    </label>

                    <label>
                        Organizer Side
                        <input name="organizer_side" value={form.organizer_side} onChange={change} />
                    </label>

                    <label>
                        Max Participants
                        <input name="max_participants" type="number" value={form.max_participants} onChange={change} />
                    </label>

                    <div className="full create-actions">
                        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" type="submit">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
