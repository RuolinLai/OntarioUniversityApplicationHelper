import { Routes, Route } from 'react-router'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Programs from './pages/Programs.jsx'
import ProgramDetail from './pages/ProgramDetail.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="programs" element={<Programs />} />
        <Route path="programs/:id" element={<ProgramDetail />} />
        <Route path="for-you" element={<ComingSoon title="For You" description="Safety, match and reach programs based on your grades." />} />
        <Route path="calendar" element={<ComingSoon title="Calendar" description="Deadlines for your favourite programs, plus your own events." />} />
        <Route path="tips" element={<ComingSoon title="Tips" description="Interview, AIF and application advice collected from Reddit." />} />
        <Route path="profile" element={<ComingSoon title="Profile" description="Your courses, marks and extracurriculars." />} />
        <Route path="login" element={<ComingSoon title="Log in" description="Accounts are coming soon." />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
