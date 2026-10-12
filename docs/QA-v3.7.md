# SunReminder Web/PWA 3.7 — đồng hồ nền, chuông và khôi phục tài khoản

## Thay đổi

- Cập nhật tiêu đề tab theo deadline kể cả khi trang ẩn. Tạm dừng chủ động vẫn giữ nguyên thời gian còn lại. Không thay logic ghi check-in.
- Nút Bật chuông & nhắc nền và Thử thông báo đặt ngay màn hình đồng hồ. Chuông ba nốt; nhắc hết giờ nghỉ có âm thanh; thông báo hệ thống yêu cầu giữ banner và cho phép âm thanh/rung khi bật Sound.
- Giữ Web Push hiện có, chống thông báo lặp và hủy lịch theo revision. Không tự bật gửi đăng ký thông báo hoặc thu thập vị trí/thống kê.
- Email khôi phục được thêm bằng mật khẩu hiện tại và xác minh qua thư. Mã 256 bit, chỉ lưu băm, hạn 15 phút, một lần dùng, thư mới thay mã cũ; reset nguyên tử trên SQLite/D1 và thu hồi mọi phiên người dùng cũ. Đăng nhập bằng mật khẩu cũ đang xử lý dở không tạo phiên mới sau reset.
- Giới hạn yêu cầu theo IP/tài khoản/email; không tiết lộ tài khoản qua phản hồi quên mật khẩu. Không khôi phục admin bằng luồng người dùng.
- Link dùng fragment, được bỏ khỏi thanh địa chỉ khi đọc; không tự tiêu thụ mã khi mở trang. Tab email không chiếm đồng hồ nếu đã có app đang mở ở tab khác.
- Thêm tài liệu EMAIL-KHOI-PHUC.md cho Brevo Free và quyền thông báo từng thiết bị. Secret gửi thư chỉ ở máy chủ, không đóng gói ra web.

## Kiểm chứng

- npm test: 107/107 đạt; gồm SQLite, D1/Miniflare, mã giao diện thật với DOM giả lập, Service Worker giả lập.
- Kiểm thử xác minh email, mã hết hạn/thay mới/dùng lại, hai reset đồng thời chỉ một thành công, mật khẩu cũ không đăng nhập, phiên cũ hết hiệu lực, lỗi nhà cung cấp không đổi tài khoản.
- Kiểm thử link email trong tab phụ, xóa token khỏi URL, xác nhận thủ công, mật khẩu nhập lại không khớp, xóa mật khẩu sau xử lý.
- Kiểm thử title tab ẩn theo thời gian thực và giữ nguyên khi Pause; payload thông báo có/không âm thanh đúng tùy chọn.
- API bảo vệ origin và xác thực; module máy chủ trả 404; thiếu cấu hình gửi thư báo rõ 503. Kiểm thử hồi quy toàn bộ dashboard, GPS/consent, lịch sử, check-in, sao lưu admin và Web Push hiện có.
- npm run check:deploy: đạt; 25 tài nguyên công khai, bindings DB / REMINDERS / ASSETS.

## Giới hạn thực tế

Chưa cấu hình tài khoản Brevo/API key/người gửi nên chưa kiểm thử gửi email thật. Không báo đã giao thư khi mới có cấu hình. Người dùng cũ phải thêm email khi còn nhớ mật khẩu; tài khoản không có email xác minh không thể tự phục hồi bằng email.

Chưa kiểm thử bằng màn hình khóa/thiết bị thật hoặc kiểm tra bố cục trong trình duyệt thật trong lượt này. JavaScript tab nền có thể bị trình duyệt giảm tần suất hoặc đình chỉ; app dùng deadline nên bắt kịp thời gian khi được chạy lại, không hứa cập nhật title từng giây lúc hệ điều hành đình chỉ. Web Push/âm thanh hệ thống phụ thuộc mạng, quyền thông báo, Không làm phiền và hệ điều hành; không thể ép chuông riêng khi trang đã đóng. iPhone/iPad cần PWA trên Màn hình chính.
