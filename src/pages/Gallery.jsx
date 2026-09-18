import Achievements from '../components/Achievements.jsx';
import GalleryPhotos from '../components/GalleryPhotos.jsx';
import Guestbook from '../components/Guestbook.jsx';
import Schedule from '../components/Schedule.jsx';
import Venue from '../components/Venue.jsx';
import SectionNav from '../components/SectionNav.jsx';

export default function Gallery() {
  return (
    <main>
      <SectionNav />
      <Achievements />
      <GalleryPhotos />
      <Guestbook />
      <Venue />
      <Schedule />
    </main>
  );
}
