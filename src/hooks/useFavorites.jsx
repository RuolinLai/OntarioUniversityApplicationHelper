import { createContext, useContext, useMemo } from 'react'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useUserCollection } from './useUserData.js'

const FavoritesContext = createContext({ ids: new Set(), loading: false })

// One Firestore listener for the whole app, so every heart on a page shares it.
export function FavoritesProvider({ children }) {
  const { items, loading } = useUserCollection('favorites')
  const value = useMemo(() => ({ ids: new Set(items.map((f) => f.id)), items, loading }), [items, loading])
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

// { ids: Set of program ids, items: [{ id, addedAt }], loading }
export function useFavorites() {
  return useContext(FavoritesContext)
}

export function setFavorite(uid, programId, on) {
  const ref = doc(db, 'users', uid, 'favorites', programId)
  return on ? setDoc(ref, { addedAt: serverTimestamp() }) : deleteDoc(ref)
}
