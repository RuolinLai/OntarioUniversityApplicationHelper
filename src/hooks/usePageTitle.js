import { useEffect } from 'react'

const SITE = 'OntarioU Helper'

// Sets the browser tab title, e.g. "Programs · OntarioU Helper".
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
  }, [title])
}
