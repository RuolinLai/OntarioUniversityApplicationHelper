import { useMemo } from 'react'
import ouacDates from '../data/dates.json'
import { getProgram } from '../lib/data.js'
import { buildCalendarEvents } from '../lib/calendar.js'
import { useFavorites } from './useFavorites.jsx'
import { useEvents } from './useUserData.js'

// OUAC dates + key dates of favourite programs + the student's own events, sorted by date.
// Unhearting a program removes its dates, since they come straight from the favourites list.
export function useCalendarEvents() {
  const favorites = useFavorites()
  const userEvents = useEvents()
  const events = useMemo(() => {
    const programs = favorites.items.map((f) => getProgram(f.id)).filter(Boolean)
    return buildCalendarEvents({ ouacDates, programs, userEvents: userEvents.items })
  }, [favorites.items, userEvents.items])
  return { events, loading: favorites.loading || userEvents.loading }
}
