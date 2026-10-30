import { Routes, Route } from 'react-router'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Programs from './pages/Programs.jsx'
import ProgramDetail from './pages/ProgramDetail.jsx'
import Tips from './pages/Tips.jsx'
import Login from './pages/Login.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Profile from './pages/Profile.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import ForYou from './pages/ForYou.jsx'
import Calendar from './pages/Calendar.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="programs" element={<Programs />} />
        <Route path="programs/:id" element={<ProgramDetail />} />
        <Route path="for-you" element={<RequireAuth><ForYou /></RequireAuth>} />
        <Route path="calendar" element={<RequireAuth><Calendar /></RequireAuth>} />
        <Route path="tips" element={<Tips />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Login mode="signup" />} />
        <Route path="onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="profile/courses/:courseId" element={<RequireAuth><CourseDetail /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
