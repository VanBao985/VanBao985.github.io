import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  const isLinhThuGallery = pathname === '/gallery/linhthu' || pathname.startsWith('/gallery/linhthu/');

  return (
    <div className={isLinhThuGallery ? 'site-layout site-layout--linhthu' : 'site-layout'}>
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
