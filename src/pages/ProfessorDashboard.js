// src/pages/ProfessorDashboard.js
import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/AuthContext';
import {
  format, addDays, startOfWeek,
  isSameDay, addWeeks, subWeeks, isToday,
  addMinutes, parseISO, getHours, getMinutes
} from 'date-fns';
import { mk } from 'date-fns/locale';

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 64;

export default function ProfessorDashboard() {
  const { currentUser, userProfile } = useAuth();
  const [slots, setSlots] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    // Load ALL slots, filter client-side to avoid Firestore index issues
    const unsub = onSnapshot(collection(db, 'slots'), snap => {
      const loaded = snap.docs
        .map(d => {
          const data = d.data();
          if (!Array.isArray(data.bookings)) data.bookings = [];
          return { id: d.id, ...data };
        })
        .filter(s => s.professorId === currentUser.uid)
        .sort((a, b) => a.startTime > b.startTime ? 1 : -1);
      setSlots(loaded);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  function getFreeMinutes(slot) {
    const used = (slot.bookings || []).reduce((sum, b) => sum + b.durationMins, 0);
    return slot.duration - used;
  }

  function openModalForHour(day, hour) {
    setSlotDate(format(day, 'yyyy-MM-dd'));
    setSlotTime(`${String(hour).padStart(2, '0')}:00`);
    setShowModal(true);
  }

  async function createSlot(e) {
    e.preventDefault();
    if (!slotDate || !slotTime) return;
    setCreating(true);
    try {
      const startISO = `${slotDate}T${slotTime}:00`;
      const endISO = format(addMinutes(new Date(startISO), duration), "yyyy-MM-dd'T'HH:mm:ss");
      await addDoc(collection(db, 'slots'), {
        professorId: currentUser.uid,
        professorName: userProfile?.name || '',
        startTime: startISO,
        endTime: endISO,
        duration,
        location,
        notes,
        bookings: [],
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert('Грешка: ' + err.message);
    }
    setCreating(false);
  }

  function resetForm() {
    setSlotDate(''); setSlotTime(''); setDuration(60); setLocation(''); setNotes('');
  }

  async function deleteSlot(slotId, e) {
    e.stopPropagation();
    if (!window.confirm('Избриши го овој слот?')) return;
    await deleteDoc(doc(db, 'slots', slotId));
  }

  async function removeBooking(slot, idx, e) {
    e.stopPropagation();
    if (!window.confirm('Откажи ја оваа резервација?')) return;
    const updated = [...(slot.bookings || [])];
    updated.splice(idx, 1);
    await updateDoc(doc(db, 'slots', slot.id), { bookings: updated });
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const now = new Date();

  function getSlotsForDay(day) {
    return slots.filter(s => isSameDay(parseISO(s.startTime), day));
  }

  function getSlotStyle(slot) {
    const start = parseISO(slot.startTime);
    const h = getHours(start) - HOUR_START;
    const m = getMinutes(start);
    const top = h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
    const height = Math.max((slot.duration / 60) * HOUR_HEIGHT, 26);
    return { top: `${top}px`, height: `${height}px` };
  }

  function getBookingStyle(slot, booking) {
    const bookStart = addMinutes(parseISO(slot.startTime), booking.startOffset);
    const h = getHours(bookStart) - HOUR_START;
    const m = getMinutes(bookStart);
    const top = h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
    const height = Math.max((booking.durationMins / 60) * HOUR_HEIGHT, 18);
    return { top: `${top}px`, height: `${height}px` };
  }

  const upcoming = slots.filter(s => new Date(s.endTime) >= now);
  const allUpcomingBookings = upcoming.flatMap(s =>
    (s.bookings || []).map(b => ({ ...b, slot: s }))
  );

  return (
    <div className="cal-page">
      <div className="cal-topbar">
        <div className="cal-topbar-left">
          <h1 className="cal-month-title">
            {format(weekStart, 'MMMM yyyy', { locale: mk })}
          </h1>
          <div className="cal-nav-group">
            <button className="cal-nav-btn" onClick={() => setWeekStart(w => subWeeks(w, 1))}>‹</button>
            <button className="cal-today-btn" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Денес
            </button>
            <button className="cal-nav-btn" onClick={() => setWeekStart(w => addWeeks(w, 1))}>›</button>
          </div>
        </div>
        <div className="cal-topbar-right">
          <div className="cal-chip free-chip">
            <span className="chip-dot free-dot" />
            {upcoming.filter(s => getFreeMinutes(s) > 0).length} слободни
          </div>
          <div className="cal-chip booked-chip">
            <span className="chip-dot booked-dot" />
            {allUpcomingBookings.length} резервации
          </div>
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            + Нов слот
          </button>
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal-main">
          <div className="cal-header-row">
            <div className="cal-gutter" />
            {weekDays.map(day => (
              <div key={day.toString()} className={`cal-day-hdr ${isToday(day) ? 'today' : ''}`}>
                <span className="cal-day-name-hdr">{format(day, 'EEE', { locale: mk })}</span>
                <span className={`cal-day-num-hdr ${isToday(day) ? 'today-circle' : ''}`}>
                  {format(day, 'd')}
                </span>
              </div>
            ))}
          </div>

          <div className="cal-body-scroll">
            <div className="cal-body-inner" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
              <div className="cal-hours-col">
                {hours.map(h => (
                  <div key={h} className="cal-hour-lbl" style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {weekDays.map(day => (
                <div key={day.toString()} className={`cal-day-col ${isToday(day) ? 'today-col' : ''}`}>
                  {hours.map(h => (
                    <div key={h} className="cal-hour-cell"
                      style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                      onClick={() => openModalForHour(day, h)}
                    />
                  ))}
                  {isToday(day) && <NowLine />}

                  {getSlotsForDay(day).map(slot => {
                    const isPast = new Date(slot.endTime) < now;
                    const bookings = slot.bookings || [];
                    const freeMin = getFreeMinutes(slot);
                    return (
                      <React.Fragment key={slot.id}>
                        {/* Full availability block */}
                        <div
                          className={`cal-event ev-free ${isPast ? 'ev-past' : ''}`}
                          style={{ ...getSlotStyle(slot), zIndex: 1 }}
                        >
                          <div className="ev-time">
                            {format(parseISO(slot.startTime), 'HH:mm')}–{format(parseISO(slot.endTime), 'HH:mm')}
                          </div>
                          <div className="ev-label">
                            {freeMin > 0 ? `${freeMin} мин слободно` : 'Пополнето'}
                          </div>
                          {slot.location && <div className="ev-loc">📍 {slot.location}</div>}
                          {!isPast && (
                            <button className="ev-del-btn" onClick={e => deleteSlot(slot.id, e)}>✕</button>
                          )}
                        </div>

                        {/* Booking segments */}
                        {bookings.map((booking, idx) => {
                          const bookStart = addMinutes(parseISO(slot.startTime), booking.startOffset);
                          const bookEnd = addMinutes(bookStart, booking.durationMins);
                          return (
                            <div key={idx}
                              className="cal-event ev-booked"
                              style={{ ...getBookingStyle(slot, booking), zIndex: 3, left: '5px', right: '5px' }}
                              title={`${booking.studentName} — ${booking.durationMins} мин`}
                            >
                              <div className="ev-time">
                                {format(bookStart, 'HH:mm')}–{format(bookEnd, 'HH:mm')}
                              </div>
                              <div className="ev-label">👤 {booking.studentName}</div>
                              {!isPast && (
                                <button className="ev-del-btn" onClick={e => removeBooking(slot, idx, e)}>✕</button>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="cal-sidebar">
          <h3 className="sidebar-title">Резервирани</h3>
          {allUpcomingBookings.length === 0 ? (
            <p className="sidebar-empty">Нема резервации</p>
          ) : (
            allUpcomingBookings.map((b, i) => {
              const bookStart = addMinutes(parseISO(b.slot.startTime), b.startOffset);
              const bookEnd = addMinutes(bookStart, b.durationMins);
              return (
                <div key={i} className="sidebar-card">
                  <div className="sidebar-card-date">
                    {format(bookStart, 'EEE d MMM', { locale: mk })}
                  </div>
                  <div className="sidebar-card-time">
                    {format(bookStart, 'HH:mm')} – {format(bookEnd, 'HH:mm')}
                    <span className="sidebar-dur">{b.durationMins} мин</span>
                  </div>
                  <div className="sidebar-card-student">👤 {b.studentName}</div>
                  {b.slot.location && <div className="sidebar-card-loc">📍 {b.slot.location}</div>}
                </div>
              );
            })
          )}

          <h3 className="sidebar-title" style={{ marginTop: '1.5rem' }}>Слободни</h3>
          {upcoming.filter(s => getFreeMinutes(s) > 0).length === 0 ? (
            <p className="sidebar-empty">Нема слободни</p>
          ) : (
            upcoming.filter(s => getFreeMinutes(s) > 0).slice(0, 5).map(slot => (
              <div key={slot.id} className="sidebar-card free-card">
                <div className="sidebar-card-date">
                  {format(parseISO(slot.startTime), 'EEE d MMM', { locale: mk })}
                </div>
                <div className="sidebar-card-time">
                  {format(parseISO(slot.startTime), 'HH:mm')} – {format(parseISO(slot.endTime), 'HH:mm')}
                  <span className="sidebar-dur">{getFreeMinutes(slot)} мин</span>
                </div>
                {slot.location && <div className="sidebar-card-loc">📍 {slot.location}</div>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Нов слот за консултација</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={createSlot} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Датум</label>
                  <input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')} required />
                </div>
                <div className="form-group">
                  <label>Час</label>
                  <input type="time" value={slotTime} onChange={e => setSlotTime(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Времетраење на достапност</label>
                <div className="duration-options">
                  {[30, 60, 90, 120].map(d => (
                    <button key={d} type="button"
                      className={`duration-btn ${duration === d ? 'active' : ''}`}
                      onClick={() => setDuration(d)}>
                      {d} мин
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Локација / Соба</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="пр. Кабинет 215, ФИНКИ" />
              </div>
              <div className="form-group">
                <label>Напомена (опционално)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="пр. Носете го проектот" rows={2} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Откажи</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Се зачувува...' : 'Креирај слот'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NowLine() {
  const now = new Date();
  const h = getHours(now) - HOUR_START;
  const m = getMinutes(now);
  if (h < 0 || h >= (HOUR_END - HOUR_START)) return null;
  const top = h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  return <div className="cal-now-line" style={{ top: `${top}px` }} />;
}