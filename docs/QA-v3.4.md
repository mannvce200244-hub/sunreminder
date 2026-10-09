# SunReminder Web/PWA 3.4 — kiểm chứng

Ngày: 2026-10-09. Phạm vi: Web/PWA và Cloudflare; Windows EXE giữ bản v3 hiện có.

## Đã kiểm tra tự động

- `npm test`: 74/74 đạt, gồm 58 kiểm thử cũ và 16 kiểm thử mới.
- Đồng hồ giữ deadline khi chậm tick; khôi phục lần nghỉ hết giờ với đúng thời điểm, không tạo chuỗi check-in bù; tạm dừng giữ thời gian còn lại.
- Lịch mới/cancellation thắng yêu cầu cũ; offline giữ hàng đợi; lịch quá hạn chuyển thành hủy; lỗi lưu không làm mất khả năng thử lại.
- Local notification và Web Push dùng cùng khóa chống trùng; bỏ qua phase đã hủy, quyền nhắc đã tắt hoặc thông báo quá hạn.
- Classic service worker tải bộ lưu IndexedDB không xung đột biến, tương thích đường cập nhật từ bản worker cũ.
- Cloudflare Miniflare: Durable Object SQLite, tạo khóa VAPID, API chỉ trả khóa công khai; origin/token bắt buộc; lên lịch và hủy thật qua binding.
- Mã hóa payload Web Push bằng khóa P-256 thật; kiểm tra VAPID, aes128gcm, job dùng một lần, tối đa hai lần thử lại, bỏ đăng ký hết hạn. Mạng push được giả lập, không gửi thông báo tới người dùng trong test.
- Đăng nhập, quản trị, đồng ý chia sẻ, GPS, dữ liệu, usage, CSV và thu hồi thống kê tiếp tục đạt kiểm thử cũ.
- `npm run check:deploy`: đạt; 23 tài sản công khai; bindings REMINDERS, DB và ASSETS; không bao gồm dữ liệu riêng.
- `node --check` cho app.js, background.js, sw.js và `git diff --check`: đạt.
- Dependency production mới @block65/webcrypto-web-push 2.0.0 được khóa phiên bản; audit production không báo lỗ hổng. Audit toàn bộ còn 4 cảnh báo high của chuỗi công cụ phát triển, chưa dùng cập nhật phá vỡ tương thích để xử lý trong thay đổi này.

## Giới hạn và kiểm tra trên thiết bị

Chưa kiểm tra trực quan hoặc xác nhận thông báo thực trên Windows/macOS/Android/iPhone. Bộ test mô phỏng logic và mạng push, không thay thế kiểm tra quyền hệ điều hành, âm thanh, màn hình khóa hoặc chế độ tiết kiệm pin.

1. Đóng các cửa sổ SunReminder cũ, mở bản 3.4 từ HTTPS.
2. Cài đặt → Bật nhắc khi chạy nền → Cho phép. Trên iPhone/iPad 16.4+, dùng app đã thêm vào Màn hình chính.
3. Nghỉ ngay, đợi trạng thái Máy chủ đã nhận lịch, chuyển app/khóa màn hình và chờ hết thời gian nghỉ.
4. Chạm thông báo, kiểm tra đúng một check-in; tải lại không thêm trùng.
5. Thử Tạm dừng, Kết thúc, Tắt nhắc và mất mạng; khi có mạng, trạng thái phải xác nhận đã hủy lịch.

Thông báo chỉ cho phase đã đặt, cần mạng và quyền; có thể trễ hoặc không đến khi hệ điều hành chặn, máy tắt hoặc trình duyệt bị buộc dừng. Check-in và thống kê của phiên hết giờ khi app đóng được lưu/gửi khi mở lại. Nhắc buổi sáng chưa dùng Web Push. Thời gian sử dụng tiếp tục chỉ tính lúc app hiển thị và đã có đồng ý riêng. Bản Node cục bộ không cung cấp máy chủ Web Push.
