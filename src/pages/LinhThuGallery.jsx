import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import GalleryPhotos from '../components/GalleryPhotos.jsx';
import Guestbook from '../components/Guestbook.jsx';
import LinhThuInvitation, { cleanGuestName } from '../components/LinhThuInvitation.jsx';
import Schedule from '../components/Schedule.jsx';
import SectionNav from '../components/SectionNav.jsx';
import Venue from '../components/Venue.jsx';
import { LINHTHU_SECTIONS } from '../data/sections.js';

export default function LinhThuGallery() {
  const { guestName = '' } = useParams();
  const displayName = cleanGuestName(guestName);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = displayName
      ? `${displayName} · Thiệp mời tốt nghiệp của Linh Thư`
      : 'Kỷ niệm tốt nghiệp · Linh Thư';

    return () => { document.title = previousTitle; };
  }, [displayName]);

  return (
    <main className="linhthu-gallery">
      <SectionNav sections={LINHTHU_SECTIONS} />
      <LinhThuInvitation guestName={guestName} />
      <GalleryPhotos dataFile="data/drive-photos-linhthu.json" />
      <Guestbook
        guestbookKey="linhthu"
        ownerName="Linh Thư"
      />
      <Venue />
      <Schedule ownerName="Linh Thư" />
    </main>
  );
}
