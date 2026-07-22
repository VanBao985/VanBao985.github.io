import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Gallery from './pages/Gallery.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/gallery" element={<Gallery />} />
        {/* "/" deliberately has no route: the gallery lives at /gallery,
            so the bare root falls through to the 404 screen below. */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
