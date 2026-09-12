// The university's graduation weekend, as announced.
//
// The session descriptions are kept in the school's own Vietnamese wording on
// purpose: guests match this against the official announcement, and translated
// faculty names ("Trường Cơ khí", "Khoa KH&CN Giáo dục") would stop matching.
// The labels around them stay English, like the rest of the site.
//
// Exactly one entry should carry `mine: true` — that is the ceremony the page
// highlights, and the only one that shows a time and venue.
export const SCHEDULE = [
  {
    day: 'Sáng thứ Bảy',
    date: '26.09.2026',
    detail:
      'Khen thưởng sinh viên tốt nghiệp xếp hạng xuất sắc của tất cả các Trường/Khoa.',
    mine: true,
    time: '10:00 - 11:30',
    venue: 'Nhà C2',
  },
  {
    day: 'Chiều thứ Bảy',
    date: '26.09.2026',
    detail:
      'Khoa Toán - Tin, Trường Kinh tế và Trường Cơ khí.',
  },
  {
    day: 'Sáng Chủ nhật',
    date: '27.09.2026',
    detail:
      'Khoa Vật lý kỹ thuật, Trường Vật liệu và Trường CNTT&TT.',
  },
  {
    day: 'Chiều Chủ nhật',
    date: '27.09.2026',
    detail:
      'Khoa KH&CN Giáo dục, Khoa Ngoại ngữ và Trường Điện - Điện tử.',
  },
];
