import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Gallery from './pages/Gallery.jsx';
import Login from './pages/Login.jsx';
import InviteMaker from './pages/InviteMaker.jsx';
import Invite from './pages/Invite.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/login" element={<Login />} />

        {/* Making a card is admin-only… */}
        <Route
          path="/invite-maker"
          element={
            <RequireAuth>
              <InviteMaker />
            </RequireAuth>
          }
        />
        {/* …but reading one must stay public: guests have no account. */}
        <Route path="/invite" element={<Invite />} />

        {/* "/" deliberately has no route: the gallery lives at /gallery,
            so the bare root falls through to the 404 screen below. */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
