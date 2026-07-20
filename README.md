# Kí ức đại học — vanbao985.github.io

Website tĩnh lưu giữ ảnh và kỉ niệm thời sinh viên, chạy trên GitHub Pages.

## Kiến trúc

Không có server riêng. Toàn bộ hệ thống gồm hai lớp:

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | HTML + CSS + Vanilla JS (ES Modules) | Thư viện ảnh công khai, không cần đăng nhập |
| **Backend / Storage** | GitHub Contents API | Lưu ảnh và metadata ngay trong repo |

Trang admin ghi dữ liệu bằng cách **commit trực tiếp qua REST API** của GitHub,
dùng Personal Access Token (PAT) do bạn nhập ở trình duyệt. Mỗi lần upload là
một commit; GitHub Pages tự động build lại site sau 1–2 phút.

**Vì sao không dùng Supabase/Firebase?** Free tier của các dịch vụ đó tự động
pause project khi không hoạt động, và có rate limit theo lượt truy cập. GitHub
Pages phục vụ file tĩnh qua CDN, không cold start, uptime cao hơn cho nhu cầu
~100 ảnh.

## Cấu trúc thư mục

```
├── index.html            # Thư viện ảnh (public)
├── admin.html            # Giao diện quản lí (cần token)
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── github.js     # Storage adapter — GitHub Contents API
│       ├── app.js        # Logic thư viện: lọc, tìm kiếm, lightbox
│       └── admin.js      # Nén ảnh, upload, xoá
├── data/memories.json    # "Database" — metadata của toàn bộ ảnh
├── images/               # Ảnh đã upload
└── .nojekyll             # Tắt Jekyll, phục vụ file nguyên trạng
```

## Schema của `data/memories.json`

```jsonc
{
  "albums": [
    { "id": "nam-nhat", "name": "Năm nhất", "order": 1 }
  ],
  "photos": [
    {
      "id": "uuid",
      "src": "images/2024-06-15-le-tot-nghiep-a1b2c3.jpg",
      "title": "Lễ tốt nghiệp",
      "description": "…",
      "date": "2024-06-15",
      "album": "tot-nghiep",
      "location": "Sân trường",
      "people": ["Bảo", "Minh"],
      "width": 2000,
      "height": 1333,
      "uploadedAt": "2024-06-16T10:00:00.000Z"
    }
  ]
}
```

`width`/`height` được lưu để đặt sẵn `aspect-ratio` cho ảnh, tránh layout shift
(CLS) khi trang đang tải.

## Bảo mật

- Repo là **public** (bắt buộc với GitHub Pages free) nhưng **không chứa token nào**.
- PAT chỉ nằm trong `localStorage` của trình duyệt bạn dùng.
- Dùng **fine-grained PAT** giới hạn đúng repo này, chỉ cấp quyền `Contents: Read and write`.
- Khách vào xem không cần token và không thể ghi bất cứ thứ gì.
- Nếu nghi ngờ lộ token: vào GitHub → Settings → Developer settings → thu hồi (revoke) rồi tạo lại.

## Chạy thử ở máy

ES Modules không hoạt động qua `file://` (bị chặn bởi CORS policy), phải chạy
qua HTTP server:

```bash
python -m http.server 8000
# rồi mở http://localhost:8000
```

## Tinh chỉnh nén ảnh

Sửa hằng số `COMPRESS` trong `assets/js/admin.js`:

```js
const COMPRESS = {
  maxDimension: 2000,     // cạnh dài nhất (px)
  quality: 0.82,          // chất lượng JPEG 0–1
  skipUnder: 300 * 1024,  // file nhỏ hơn ngưỡng này giữ nguyên
};
```

## Giới hạn cần biết

| Hạng mục | Giới hạn |
|---|---|
| Dung lượng repo | 1 GB (khuyến nghị) |
| Băng thông | 100 GB/tháng |
| Số lần build | 10 lần/giờ |
| GitHub API | 5.000 request/giờ |

Giới hạn build 10 lần/giờ đáng lưu ý nhất: mỗi ảnh upload là một commit, nên
tránh upload quá nhiều ảnh liên tục trong thời gian ngắn.
