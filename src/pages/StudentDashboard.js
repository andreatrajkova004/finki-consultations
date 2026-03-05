// src/pages/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import {
  collection, query, onSnapshot, orderBy,
  doc, updateDoc, where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/AuthContext';
import {
  format, addDays, startOfWeek,
  isSameDay, addWeeks, subWeeks, isToday,
  parseISO, getHours, getMinutes, addMinutes
} from 'date-fns';
import { mk } from 'date-fns/locale';

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 64;

function findFirstFreeOffset(slotDuration, existingBookings, requestedMins) {
  const sorted = [...existingBookings].sort((a, b) => a.startOffset - b.startOffset);
  let cursor = 0;
  for (const b of sorted) {
    if (b.startOffset - cursor >= requestedMins) return cursor;
    cursor = Math.max(cursor, b.startOffset + b.durationMins);
  }
  if (slotDuration - cursor >= requestedMins) return cursor;
  return null;
}

export default function StudentDashboard() {
  const { currentUser, userProfile } = useAuth();
  const [allSlots, setAllSlots] = useState([]);
  const [professors, setProfessors] = useState({});
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedProfessor, setSelectedProfessor] = useState('all');
  const [detailSlot, setDetailSlot] = useState(null);
  const [bookingDuration, setBookingDuration] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // All slots — every student sees all
  useEffect(() => {
    const q = query(collection(db, 'slots'));
    const unsub = onSnapshot(q, snap => {
      const loaded = snap.docs.map(d => {
        const data = d.data();
        if (!Array.isArray(data.bookings)) data.bookings = [];
        return { id: d.id, ...data };
      });
      loaded.sort((a, b) => a.startTime > b.startTime ? 1 : -1);
      setAllSlots(loaded);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Professors for filter
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'professor'));
    const unsub = onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setProfessors(map);
    });
    return unsub;
  }, []);

  function getFreeMinutes(slot) {
    const used = (slot.bookings || []).reduce((sum, b) => sum + b.durationMins, 0);
    return slot.duration - used;
  }

  function myBookingInSlot(slot) {
    return (slot.bookings || []).find(b => b.studentId === currentUser.uid);
  }

  async function bookSlot() {
    setBookingError('');
    const mins = parseInt(bookingDuration, 10);
    if (!mins || mins < 1) { setBookingError('Внеси барем 1 минута.'); return; }

    const freeMin = getFreeMinutes(detailSlot);
    if (mins > freeMin) {
      setBookingError(`Максимум ${freeMin} мин слободно.`);
      return;
    }
    if (myBookingInSlot(detailSlot)) {
      setBookingError('Веќе имате резервација во овој термин.');
      return;
    }

    const existing = detailSlot.bookings || [];
    const startOffset = findFirstFreeOffset(detailSlot.duration, existing, mins);
    if (startOffset === null) {
      setBookingError('Нема доволно слободен простор. Пробај помало времетраење.');
      return;
    }

    setSaving(true);
    try {
      const newBooking = {
        studentId: currentUser.uid,
        studentName: userProfile?.name || currentUser.email,
        startOffset,
        durationMins: mins,
        bookedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'slots', detailSlot.id), {
        bookings: [...existing, newBooking]
      });
      setDetailSlot(null);
      setBookingDuration('');
    } catch (err) {
      setBookingError('Грешка: ' + err.message);
    }
    setSaving(false);
  }

  async function cancelBooking(slot) {
    if (!window.confirm('Откажи ја оваа резервација?')) return;
    const updated = (slot.bookings || []).filter(b => b.studentId !== currentUser.uid);
    await updateDoc(doc(db, 'slots', slot.id), { bookings: updated });
  }

  const now = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const visibleSlots = allSlots.filter(s => {
    const future = new Date(s.endTime) >= now;
    const matchProf = selectedProfessor === 'all' || s.professorId === selectedProfessor;
    const hasFree = getFreeMinutes(s) > 0;
    const isMine = !!myBookingInSlot(s);
    return future && matchProf && (hasFree || isMine);
  });

  const myUpcomingBookings = allSlots
    .filter(s => new Date(s.endTime) >= now && myBookingInSlot(s))
    .map(s => ({ slot: s, booking: myBookingInSlot(s) }));

  function getSlotsForDay(day) {
    return visibleSlots.filter(s => isSameDay(parseISO(s.startTime), day));
  }

  function getSlotStyle(slot) {
    const start = parseISO(slot.startTime);
    const h = getHours(start) - HOUR_START;
    const m = getMinutes(start);
    const top = h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
    const height = Math.max((slot.duration / 60) * HOUR_HEIGHT, 26);
    return { top: `${top}px`, height: `${height}px` };
  }

  function getMyBookingStyle(slot, booking) {
    const bookStart = addMinutes(parseISO(slot.startTime), booking.startOffset);
    const h = getHours(bookStart) - HOUR_START;
    const m = getMinutes(bookStart);
    const top = h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
    const height = Math.max((booking.durationMins / 60) * HOUR_HEIGHT, 18);
    return { top: `${top}px`, height: `${height}px` };
  }

  return (
    <div className="cal-page">
      <div className="cal-topbar">
        <div className="cal-topbar-left">
          <h1 className="cal-month-title">
            {format(weekStart, 'MMMM yyyy', { locale: mk })}
          </h1>
          <div className="cal-nav-group">
            <button className="cal-nav-btn" onClick={() => setWeekStart(w => subWeeks(w, 1))}>‹</button>
            <button className="cal-today-btn" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Денес</button>
            <button className="cal-nav-btn" onClick={() => setWeekStart(w => addWeeks(w, 1))}>›</button>
          </div>
        </div>
        <div className="cal-topbar-right">
          <select className="prof-filter" value={selectedProfessor}
            onChange={e => setSelectedProfessor(e.target.value)}>
            <option value="all">Сите професори</option>
            {Object.entries(professors).map(([id, p]) => (
              <option key={id} value={id}>{p.name}</option>
            ))}
          </select>
          <div className="cal-chip free-chip">
            <span className="chip-dot free-dot" />
            {visibleSlots.filter(s => getFreeMinutes(s) > 0).length} достапни
          </div>
          <div className="cal-chip">
            <span className="chip-dot mine-dot" />
            {myUpcomingBookings.length} мои
          </div>
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
                      style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }} />
                  ))}
                  {isToday(day) && <NowLine />}

                  {getSlotsForDay(day).map(slot => {
                    const myBooking = myBookingInSlot(slot);
                    const freeMin = getFreeMinutes(slot);
                    return (
                      <React.Fragment key={slot.id}>
                        {/* Full slot — clickable */}
                        <div
                          className="cal-event ev-free"
                          style={{ ...getSlotStyle(slot), zIndex: 1, cursor: 'pointer' }}
                          onClick={() => {
                            setDetailSlot(slot);
                            setBookingDuration('');
                            setBookingError('');
                          }}
                          title={`${slot.professorName} — ${freeMin} мин слободно`}
                        >
                          <div className="ev-time">
                            {format(parseISO(slot.startTime), 'HH:mm')}–{format(parseISO(slot.endTime), 'HH:mm')}
                          </div>
                          <div className="ev-label">
                            {slot.professorName?.split(' ').slice(-1)[0]} · {freeMin} мин
                          </div>
                        </div>

                        {/* My booking segment */}
                        {myBooking && (
                          <div
                            className="cal-event ev-mine"
                            style={{ ...getMyBookingStyle(slot, myBooking), zIndex: 3, left: '5px', right: '5px' }}
                            title="Твоја резервација"
                          >
                            <div className="ev-time">
                              {format(addMinutes(parseISO(slot.startTime), myBooking.startOffset), 'HH:mm')}–
                              {format(addMinutes(parseISO(slot.startTime), myBooking.startOffset + myBooking.durationMins), 'HH:mm')}
                            </div>
                            <div className="ev-label">✓ {myBooking.durationMins} мин</div>
                          </div>
                        )}
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
          <h3 className="sidebar-title">Мои резервации</h3>
          {myUpcomingBookings.length === 0 ? (
            <p className="sidebar-empty">
              Немате резервации.<br /><br />
              Кликнете на <strong>зелен термин</strong> за резервација.
            </p>
          ) : (
            myUpcomingBookings.map(({ slot, booking }, i) => {
              const bookStart = addMinutes(parseISO(slot.startTime), booking.startOffset);
              const bookEnd = addMinutes(bookStart, booking.durationMins);
              return (
                <div key={i} className="sidebar-card mine-card">
                  <div className="sidebar-card-date">
                    {format(bookStart, 'EEE d MMM', { locale: mk })}
                  </div>
                  <div className="sidebar-card-time">
                    {format(bookStart, 'HH:mm')} – {format(bookEnd, 'HH:mm')}
                    <span className="sidebar-dur">{booking.durationMins} мин</span>
                  </div>
                  <div className="sidebar-card-student">👩‍🏫 {slot.professorName}</div>
                  {slot.location && <div className="sidebar-card-loc">📍 {slot.location}</div>}
                  {slot.notes && <div className="sidebar-card-notes">💬 {slot.notes}</div>}
                  <button className="btn-cancel-sm" style={{ marginTop: '.5rem' }}
                    onClick={() => cancelBooking(slot)}>
                    Откажи
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Booking modal */}
      {detailSlot && (
        <div className="modal-overlay" onClick={() => setDetailSlot(null)}>
          <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{myBookingInSlot(detailSlot) ? 'Твоја резервација' : 'Резервирај консултација'}</h3>
              <button className="modal-close" onClick={() => setDetailSlot(null)}>✕</button>
            </div>
            <div className="detail-body">
              <div className="detail-row">
                <span className="detail-icon">📅</span>
                <span>{format(parseISO(detailSlot.startTime), 'EEEE, d MMMM yyyy', { locale: mk })}</span>
              </div>
              <div className="detail-row">
                <span className="detail-icon">🕐</span>
                <span>{format(parseISO(detailSlot.startTime), 'HH:mm')} – {format(parseISO(detailSlot.endTime), 'HH:mm')} ({detailSlot.duration} мин)</span>
              </div>
              <div className="detail-row">
                <span className="detail-icon">👩‍🏫</span>
                <span>{detailSlot.professorName}</span>
              </div>
              {detailSlot.location && (
                <div className="detail-row">
                  <span className="detail-icon">📍</span>
                  <span>{detailSlot.location}</span>
                </div>
              )}
              {detailSlot.notes && (
                <div className="detail-row">
                  <span className="detail-icon">💬</span>
                  <span>{detailSlot.notes}</span>
                </div>
              )}
              <div className="detail-row" style={{ background: '#f0fdf4', borderRadius: '8px', padding: '.45rem .7rem' }}>
                <span className="detail-icon">⏳</span>
                <span><strong>{getFreeMinutes(detailSlot)} мин</strong> слободно</span>
              </div>

              {myBookingInSlot(detailSlot) ? (
                (() => {
                  const bk = myBookingInSlot(detailSlot);
                  const bs = addMinutes(parseISO(detailSlot.startTime), bk.startOffset);
                  const be = addMinutes(bs, bk.durationMins);
                  return (
                    <div className="detail-row" style={{ background: '#dbeafe', borderRadius: '8px', padding: '.45rem .7rem' }}>
                      <span className="detail-icon">✅</span>
                      <span>Резервирано: <strong>{format(bs, 'HH:mm')}–{format(be, 'HH:mm')}</strong> ({bk.durationMins} мин)</span>
                    </div>
                  );
                })()
              ) : (
                <div className="booking-duration-block">
                  <label className="dur-label">Колку минути ти требаат?</label>
                  <div className="dur-input-row">
                    <input type="number" className="dur-input"
                      value={bookingDuration}
                      onChange={e => { setBookingDuration(e.target.value); setBookingError(''); }}
                      placeholder="пр. 20" min={1} max={getFreeMinutes(detailSlot)} />
                    <span className="dur-suffix">минути</span>
                    <span className="dur-hint">(макс {getFreeMinutes(detailSlot)} мин)</span>
                  </div>
                  <div className="dur-presets">
                    {[10, 15, 20, 30, 45, 60]
                      .filter(d => d <= getFreeMinutes(detailSlot))
                      .map(d => (
                        <button key={d} type="button"
                          className={`dur-preset-btn ${bookingDuration == d ? 'active' : ''}`}
                          onClick={() => { setBookingDuration(String(d)); setBookingError(''); }}>
                          {d} мин
                        </button>
                      ))}
                  </div>
                  {bookingError && <div className="error-banner" style={{ marginTop: '.5rem' }}>{bookingError}</div>}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDetailSlot(null)}>Затвори</button>
              {myBookingInSlot(detailSlot) ? (
                <button className="btn-cancel-sm"
                  onClick={() => { cancelBooking(detailSlot); setDetailSlot(null); }}>
                  Откажи резервација
                </button>
              ) : (
                <button className="btn-primary"
                  disabled={!bookingDuration || saving}
                  onClick={bookSlot}>
                  {saving ? 'Се резервира...' : 'Резервирај'}
                </button>
              )}
            </div>
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