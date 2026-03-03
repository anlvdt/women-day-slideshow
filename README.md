# Women Day Slideshow

Ứng dụng trình chiếu slideshow cho ngày Quốc tế Phụ nữ 8/3 (và 20/10). Được thiết kế để chiếu trên màn hình lớn tại công ty, kết hợp ảnh team nữ với lời chúc từ đồng nghiệp.

## Demo

**Live:** [https://welovedladies.web.app](https://welovedladies.web.app)

| Trang | Mô tả |
|-------|-------|
| [Trình chiếu](https://welovedladies.web.app/index.html) | Slideshow fullscreen với hiệu ứng Ken Burns, transition, particles, petals |
| [Gửi lời chúc](https://welovedladies.web.app/submit.html) | Form gửi lời chúc với SVG icon picker |
| [Admin](https://welovedladies.web.app/admin.html) | Quản lý ảnh, nhạc, cài đặt slideshow, lời chúc |

## Tính năng

- Slideshow fullscreen với 8 hiệu ứng chuyển cảnh + 8 hiệu ứng Ken Burns
- Animated intro/outro slides với gradient background và sparkle particles
- Heart particles (Canvas) + falling petals (CSS animation)
- Playlist nhạc nền (YouTube + MP3), drag reorder
- Upload ảnh với auto-compression (Canvas API, max 1920px, JPEG 80%)
- Drag & drop sắp xếp thứ tự ảnh
- Tìm và xóa ảnh trùng lặp
- Bulk select/delete ảnh
- Realtime sync (Firestore onSnapshot) — ảnh/lời chúc mới tự động xuất hiện
- QR code overlay trên slideshow để mọi người gửi lời chúc
- Xuất video (WebM via captureStream)
- SVG icon picker cho lời chúc (thay emoji)
- Responsive, hoạt động trên mobile

## Tech Stack

- Vanilla JS (ES Modules, no bundler)
- Firebase Hosting + Firestore + Storage
- Google Fonts (Great Vibes, Dancing Script)
- Vitest + fast-check (unit + property-based tests)

## Cài đặt

```bash
# Clone repo
git clone https://github.com/anlvdt/women-day-slideshow.git
cd women-day-slideshow

# Install dependencies (chỉ cần cho testing)
npm install

# Cấu hình Firebase
cp public/js/firebase-config.example.js public/js/firebase-config.js
# Sửa firebase-config.js với thông tin project Firebase của bạn

# Cấu hình admin password
cp public/js/admin-config.example.js public/js/admin-config.js
# Sửa admin-config.js với mật khẩu admin

# Cấu hình Firebase project
firebase use --add
# Chọn project Firebase của bạn

# Deploy
npx firebase deploy

# Chạy tests
npm test
```

## Cấu trúc project

```
public/
├── index.html          # Trang slideshow (fullscreen)
├── submit.html         # Trang gửi lời chúc
├── admin.html          # Trang quản lý
├── css/
│   ├── slideshow.css   # Styles slideshow + effects
│   ├── admin.css       # Styles admin page
│   ├── submit.css      # Styles submit page
│   └── nav.css         # Shared navigation
└── js/
    ├── main-slideshow.js    # Entry point slideshow page
    ├── slideshow.js         # Slideshow engine + sanitizer
    ├── music.js             # Playlist music (YT + MP3)
    ├── particles.js         # Heart/star particle engine
    ├── petals.js            # CSS falling petals
    ├── admin.js             # Admin panel logic
    ├── submit.js            # Submit form logic
    ├── validator.js         # Input validation
    ├── firebase-config.example.js
    └── admin-config.example.js
```

## Firestore Collections

| Collection | Mô tả |
|-----------|-------|
| `photos` | Ảnh upload (photoUrl, caption, filename, createdAt) |
| `wishes` | Lời chúc (senderName, message, createdAt) |
| `config/music` | Playlist nhạc nền |
| `config/slideshow` | Cài đặt thời gian, hiệu ứng |
| `config/event` | Nội dung intro/outro |
| `config/photoOrder` | Thứ tự ảnh tùy chỉnh |

## License

MIT
